"""
Modal endpoint for generating Cloudflare R2 presigned URLs.

Setup:
1. Create R2 bucket in Cloudflare Dashboard
2. Create API token with read/write access to the bucket
3. Create Modal secret:
   modal secret create r2-credentials \
     R2_ACCOUNT_ID=your_account_id \
     R2_ACCESS_KEY_ID=your_access_key \
     R2_SECRET_ACCESS_KEY=your_secret_key \
     R2_BUCKET_NAME=orienteering-maps

4. Deploy: modal deploy docs/modal-r2-presigned.py
"""

import modal
from pydantic import BaseModel
from typing import Optional

app = modal.App("r2-presigned-urls")

image = modal.Image.debian_slim(python_version="3.11").pip_install("boto3", "fastapi")


class PresignedUrlRequest(BaseModel):
    user_id: str
    map_name: str


class PresignedUrlResponse(BaseModel):
    upload_id: str
    color_presigned_url: str
    color_key: str
    bw_presigned_url: str
    bw_key: str
    bucket: str


@app.function(
    image=image,
    secrets=[modal.Secret.from_name("r2-credentials")],
)
@modal.fastapi_endpoint(method="POST")
def get_presigned_urls(payload: PresignedUrlRequest) -> PresignedUrlResponse:
    """Generate presigned URLs for uploading TIF files to R2."""
    import os
    import uuid
    import boto3
    from botocore.config import Config

    account_id = os.environ["R2_ACCOUNT_ID"]
    access_key = os.environ["R2_ACCESS_KEY_ID"]
    secret_key = os.environ["R2_SECRET_ACCESS_KEY"]
    bucket_name = os.environ["R2_BUCKET_NAME"]

    # Create S3 client configured for R2
    s3 = boto3.client(
        "s3",
        endpoint_url=f"https://{account_id}.r2.cloudflarestorage.com",
        aws_access_key_id=access_key,
        aws_secret_access_key=secret_key,
        config=Config(signature_version="s3v4"),
        region_name="auto",
    )

    # Generate unique upload ID
    upload_id = str(uuid.uuid4())[:8]
    
    # Sanitize map name for use in path
    safe_map_name = "".join(c if c.isalnum() or c in "-_" else "_" for c in payload.map_name)
    base_path = f"{payload.user_id}/{safe_map_name}_{upload_id}"

    color_key = f"{base_path}/color.tif"
    bw_key = f"{base_path}/bw.tif"

    # Generate presigned PUT URLs (valid for 1 hour)
    color_url = s3.generate_presigned_url(
        "put_object",
        Params={
            "Bucket": bucket_name,
            "Key": color_key,
            "ContentType": "image/tiff",
        },
        ExpiresIn=3600,
    )

    bw_url = s3.generate_presigned_url(
        "put_object",
        Params={
            "Bucket": bucket_name,
            "Key": bw_key,
            "ContentType": "image/tiff",
        },
        ExpiresIn=3600,
    )

    return PresignedUrlResponse(
        upload_id=upload_id,
        color_presigned_url=color_url,
        color_key=color_key,
        bw_presigned_url=bw_url,
        bw_key=bw_key,
        bucket=bucket_name,
    )
