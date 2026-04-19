"""
Modal.com Map Preview Generator
================================

Generates browser-safe full-map PNG previews from R2 source TIFFs and POSTs
them back to the Supabase `map-processing-webhook/register-previews` endpoint.

This solves the "browser cannot decode TIFF" problem reliably by doing the
TIFF -> PNG conversion server-side with Pillow (which handles every TIFF
compression we encounter from OCAD exports).

Setup:
  1. pip install modal pillow requests boto3
  2. modal token new
  3. Create a Modal secret named "map-processing-secrets" with:
        R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET
        SUPABASE_URL (used only for logging — webhook URL is in the payload)
  4. modal deploy modal-preview-generator.py
  5. Copy the resulting `.modal.run` URL and set it as the
     MODAL_PREVIEW_ENDPOINT_URL secret in the Supabase project.

Payload (sent by the generate-map-previews edge function):
  {
    "target_table": "user_maps" | "route_maps",
    "target_id": "<uuid>",
    "owner_id": "<uuid>" | null,
    "map_name": "...",
    "r2_color_key": "...",
    "r2_bw_key": "...",
    "webhook_url": "https://<project>.functions.supabase.co/map-processing-webhook",
    "webhook_secret": "..."
  }

It will POST back to {webhook_url}/register-previews with:
  {
    "target_table": "...",
    "target_id": "...",
    "color_preview_url": "https://...png" | None,
    "bw_preview_url": "https://...png" | None,
    "error": "..." | None
  }
"""

import base64
import io
import os
from typing import Optional

import modal

app = modal.App("map-preview-generator")

image = modal.Image.debian_slim(python_version="3.11").pip_install(
    "pillow",
    "requests",
    "boto3",
    "fastapi[standard]",
)

# Limit PIL's max image size to something reasonable
MAX_PREVIEW_SIDE = 4096


@app.function(
    image=image,
    secrets=[modal.Secret.from_name("map-processing-secrets"), modal.Secret.from_name("r2-credentials")],
    timeout=600,
)
@modal.web_endpoint(method="POST")
def generate_previews(payload: dict):
    import requests
    from PIL import Image

    # Allow large TIFFs
    Image.MAX_IMAGE_PIXELS = None

    target_table = payload["target_table"]
    target_id = payload["target_id"]
    map_name = payload.get("map_name", "preview")
    r2_color_key = payload.get("r2_color_key")
    r2_bw_key = payload.get("r2_bw_key")
    webhook_url = payload["webhook_url"]
    webhook_secret = payload["webhook_secret"]

    def post_back(
        color_url: Optional[str],
        bw_url: Optional[str],
        error: Optional[str] = None,
    ):
        try:
            requests.post(
                f"{webhook_url}/register-previews",
                headers={
                    "Content-Type": "application/json",
                    "x-webhook-secret": webhook_secret,
                },
                json={
                    "target_table": target_table,
                    "target_id": target_id,
                    "color_preview_url": color_url,
                    "bw_preview_url": bw_url,
                    "error": error,
                },
                timeout=30,
            )
        except Exception as e:
            print(f"Failed to post back to webhook: {e}")

    try:
        import boto3
        from botocore.client import Config

        r2 = boto3.client(
            "s3",
            endpoint_url=f"https://{os.environ['R2_ACCOUNT_ID']}.r2.cloudflarestorage.com",
            aws_access_key_id=os.environ["R2_ACCESS_KEY_ID"],
            aws_secret_access_key=os.environ["R2_SECRET_ACCESS_KEY"],
            config=Config(signature_version="s3v4"),
        )
        bucket = os.environ["R2_BUCKET"]

        def fetch_and_convert(key: str) -> bytes:
            """Download a TIFF from R2 and convert to a downsampled PNG.

            Uses download_fileobj (which retries chunks on IncompleteRead)
            and writes to a temp file so very large TIFFs (50MB+) don't get
            truncated by a broken response stream.
            """
            import tempfile
            from botocore.config import Config as BotoConfig

            # Per-call client with longer timeouts and retries for big objects
            big_r2 = boto3.client(
                "s3",
                endpoint_url=f"https://{os.environ['R2_ACCOUNT_ID']}.r2.cloudflarestorage.com",
                aws_access_key_id=os.environ["R2_ACCESS_KEY_ID"],
                aws_secret_access_key=os.environ["R2_SECRET_ACCESS_KEY"],
                config=BotoConfig(
                    signature_version="s3v4",
                    retries={"max_attempts": 5, "mode": "adaptive"},
                    read_timeout=300,
                    connect_timeout=60,
                ),
            )

            with tempfile.NamedTemporaryFile(suffix=".tif", delete=True) as tmp:
                big_r2.download_fileobj(bucket, key, tmp)
                tmp.flush()
                tmp.seek(0)
                with Image.open(tmp.name) as im:
                # Convert to RGB / L for PNG output
                if im.mode in ("RGBA", "LA", "P"):
                    im = im.convert("RGB")
                elif im.mode not in ("RGB", "L"):
                    im = im.convert("RGB")
                # Downscale if huge
                w, h = im.size
                scale = min(1.0, MAX_PREVIEW_SIDE / max(w, h))
                if scale < 1.0:
                    im = im.resize(
                        (int(w * scale), int(h * scale)),
                        Image.LANCZOS,
                    )
                buf = io.BytesIO()
                im.save(buf, format="PNG", optimize=True)
                return buf.getvalue()

        color_bytes = None
        bw_bytes = None
        err_parts = []

        if r2_color_key:
            try:
                color_bytes = fetch_and_convert(r2_color_key)
            except Exception as e:
                err_parts.append(f"color: {e}")
                print(f"Color preview failed: {e}")

        if r2_bw_key:
            try:
                bw_bytes = fetch_and_convert(r2_bw_key)
            except Exception as e:
                err_parts.append(f"bw: {e}")
                print(f"BW preview failed: {e}")

        # Upload PNGs back via the webhook so they end up in the right Supabase bucket
        def upload_via_webhook(image_bytes: bytes, kind: str) -> Optional[str]:
            """Upload through the existing upload-image webhook action."""
            storage_path = f"editor-previews/{target_table}/{target_id}/{kind}.png"
            try:
                resp = requests.post(
                    f"{webhook_url}/upload-public-image",
                    headers={
                        "Content-Type": "application/json",
                        "x-webhook-secret": webhook_secret,
                    },
                    json={
                        "bucket": "route-images",
                        "storage_path": storage_path,
                        "image_data": base64.b64encode(image_bytes).decode("ascii"),
                        "content_type": "image/png",
                    },
                    timeout=120,
                )
                resp.raise_for_status()
                data = resp.json()
                return data.get("public_url")
            except Exception as e:
                err_parts.append(f"{kind} upload: {e}")
                return None

        color_url = upload_via_webhook(color_bytes, "color") if color_bytes else None
        bw_url = upload_via_webhook(bw_bytes, "bw") if bw_bytes else None

        post_back(
            color_url=color_url,
            bw_url=bw_url,
            error="; ".join(err_parts) if err_parts else None,
        )

        return {"ok": True, "color": bool(color_url), "bw": bool(bw_url)}

    except Exception as e:
        print(f"Preview generation failed: {e}")
        post_back(None, None, error=str(e))
        return {"ok": False, "error": str(e)}
