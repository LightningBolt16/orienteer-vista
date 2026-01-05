"""
Modal.com Map Processing Template
================================

This is a template for processing orienteering maps using Modal.com.
Replace the route generation logic with your actual algorithm.

Setup:
1. Install Modal: pip install modal
2. Authenticate: modal token new
3. Set your secrets in Modal dashboard:
   - SUPABASE_URL
   - MAP_PROCESSING_WEBHOOK_SECRET
4. Deploy: modal deploy modal-processor-template.py

Usage:
- The web endpoint receives job payloads from the trigger-map-processing edge function
- It downloads TIF files, processes them, and uploads results back via webhook
"""

import modal
import os
import json
import tempfile
import requests
from pathlib import Path

# Create Modal app
app = modal.App("map-processor")

# Define the image with required dependencies
image = modal.Image.debian_slim(python_version="3.11").pip_install(
    "requests",
    "numpy",
    "pillow",
    # Add your route generation dependencies here:
    # "opencv-python",
    # "scikit-image",
    # etc.
)


@app.function(
    image=image,
    secrets=[modal.Secret.from_name("map-processing-secrets")],
    timeout=3600,  # 1 hour timeout for long processing
)
def process_map(job_payload: dict):
    """
    Process a single map and generate routes.
    
    job_payload contains:
    - map_id: UUID of the map
    - name: Map name
    - color_tif_url: Signed URL for color TIF
    - bw_tif_url: Signed URL for B&W TIF
    - roi_coordinates: List of {x, y} points
    - processing_parameters: Dict of parameters
    - webhook_url: URL to report back to
    - webhook_secret: Secret for authentication
    """
    webhook_url = job_payload["webhook_url"]
    webhook_secret = job_payload["webhook_secret"]
    map_id = job_payload["map_id"]
    
    def update_status(status: str, message: str = None, error: str = None):
        """Helper to update processing status via webhook"""
        try:
            requests.post(
                f"{webhook_url}/update-status",
                headers={
                    "Content-Type": "application/json",
                    "x-webhook-secret": webhook_secret,
                },
                json={
                    "map_id": map_id,
                    "status": status,
                    "message": message,
                    "error_message": error,
                },
            )
        except Exception as e:
            print(f"Failed to update status: {e}")
    
    try:
        update_status("processing", "Downloading map files...")
        
        # Create temp directory for processing
        with tempfile.TemporaryDirectory() as tmpdir:
            tmpdir = Path(tmpdir)
            
            # Download TIF files
            color_path = tmpdir / "color.tif"
            bw_path = tmpdir / "bw.tif"
            
            print("Downloading color TIF...")
            r = requests.get(job_payload["color_tif_url"])
            r.raise_for_status()
            color_path.write_bytes(r.content)
            
            print("Downloading B&W TIF...")
            r = requests.get(job_payload["bw_tif_url"])
            r.raise_for_status()
            bw_path.write_bytes(r.content)
            
            # Convert ROI coordinates to your format
            roi = job_payload["roi_coordinates"]
            params = job_payload["processing_parameters"]
            
            update_status("processing", "Generating routes...")
            
            # ========================================
            # YOUR ROUTE GENERATION CODE GOES HERE
            # ========================================
            # 
            # Example pseudocode:
            # from your_route_generator import generate_routes
            # 
            # routes = generate_routes(
            #     color_map=color_path,
            #     bw_map=bw_path,
            #     roi=roi,
            #     num_routes=params.get("num_output_routes", 50),
            #     min_dist=params.get("candidate_min_dist", 300),
            #     max_dist=params.get("candidate_max_dist", 1500),
            #     ...
            # )
            #
            # For now, we'll simulate with placeholder data
            
            # Simulate route generation (REPLACE THIS)
            import time
            time.sleep(5)  # Simulate processing time
            
            # Simulated output - replace with actual route images
            generated_routes = []
            num_routes = params.get("num_output_routes", 50)
            
            # In reality, you'd generate actual route images here
            # For each route, you'd have:
            # - An image file (PNG/JPG)
            # - Route metadata (start/end points, distance, etc.)
            
            print(f"Would generate {num_routes} routes")
            
            # ========================================
            # UPLOAD RESULTS
            # ========================================
            
            update_status("processing", "Uploading results...")
            
            # If you have actual route images, upload them:
            # for i, route in enumerate(generated_routes):
            #     with open(route["image_path"], "rb") as f:
            #         image_data = base64.b64encode(f.read()).decode()
            #     
            #     requests.post(
            #         f"{webhook_url}/upload-image",
            #         headers={
            #             "Content-Type": "application/json",
            #             "x-webhook-secret": webhook_secret,
            #         },
            #         json={
            #             "map_id": map_id,
            #             "image_index": i,
            #             "image_data": image_data,
            #             "content_type": "image/png",
            #         },
            #     )
            
            # Mark as complete
            complete_response = requests.post(
                f"{webhook_url}/complete",
                headers={
                    "Content-Type": "application/json",
                    "x-webhook-secret": webhook_secret,
                },
                json={
                    "map_id": map_id,
                    "route_count": num_routes,
                    # Include actual route data here:
                    # "routes": [
                    #     {
                    #         "index": 0,
                    #         "image_url": "...",  # or image_data for base64
                    #     },
                    #     ...
                    # ]
                },
            )
            complete_response.raise_for_status()
            
            print(f"Processing complete for map {map_id}")
            return {"success": True, "routes_generated": num_routes}
            
    except Exception as e:
        print(f"Processing failed: {e}")
        update_status("failed", error=str(e))
        return {"success": False, "error": str(e)}


@app.function(image=image)
@modal.web_endpoint(method="POST")
def trigger(payload: dict):
    """
    Web endpoint to trigger map processing.
    Called by the trigger-map-processing edge function.
    """
    print(f"Received processing request for map: {payload.get('map_id')}")
    
    # Spawn the processing function asynchronously
    process_map.spawn(payload)
    
    return {"status": "processing_started", "map_id": payload.get("map_id")}


# Optional: Polling endpoint for checking pending jobs
@app.function(
    image=image,
    secrets=[modal.Secret.from_name("map-processing-secrets")],
    schedule=modal.Cron("*/5 * * * *"),  # Every 5 minutes
)
def poll_pending_jobs():
    """
    Poll for pending jobs (backup mechanism if direct triggering fails).
    """
    webhook_url = os.environ.get("SUPABASE_URL") + "/functions/v1/map-processing-webhook"
    webhook_secret = os.environ.get("MAP_PROCESSING_WEBHOOK_SECRET")
    
    try:
        response = requests.get(
            f"{webhook_url}/pending",
            headers={"x-webhook-secret": webhook_secret},
        )
        response.raise_for_status()
        
        jobs = response.json().get("jobs", [])
        print(f"Found {len(jobs)} pending jobs")
        
        for job in jobs:
            print(f"Spawning processing for map: {job['map_id']}")
            process_map.spawn(job)
            
    except Exception as e:
        print(f"Failed to poll for jobs: {e}")


if __name__ == "__main__":
    # For local testing
    print("Deploy with: modal deploy modal-processor-template.py")
