"""
ORIENTEERING ROUTE CHOICE GENERATOR - MODAL.COM VERSION
===========================================================================
This is a complete, copy-paste ready Modal script that wraps the route
generation algorithm for cloud processing.

SETUP:
1. pip install modal
2. modal token new
3. modal secret create map-processing-secrets SUPABASE_URL=https://your-project.supabase.co MAP_PROCESSING_WEBHOOK_SECRET=your-secret
4. modal secret create r2-credentials R2_ACCOUNT_ID=xxx R2_ACCESS_KEY_ID=xxx R2_SECRET_ACCESS_KEY=xxx R2_BUCKET_NAME=xxx
5. modal deploy map_processor.py

The endpoint URL will be printed after deployment.
"""

import modal

# =============================================================================
# MODAL APP CONFIGURATION
# =============================================================================
app = modal.App("map-processor")

# Docker image with all required dependencies
image = modal.Image.debian_slim(python_version="3.11").pip_install(
    "numpy",
    "matplotlib",
    "networkx",
    "Pillow",
    "scikit-image",
    "scikit-learn",
    "scipy",
    "requests",
    "fastapi",
    "boto3",  # Added for R2/S3 access
)

# =============================================================================
# HELPER FUNCTIONS (defined inside the Modal function for proper serialization)
# =============================================================================

@app.function(
    image=image,
    timeout=3600,  # 1 hour timeout for large maps
    memory=8192,   # 8GB RAM
    secrets=[
        modal.Secret.from_name("map-processing-secrets"),
        modal.Secret.from_name("r2-credentials"),
    ],
)
def process_map(job_payload: dict):
    """
    Main processing function - runs your exact algorithm.
    
    job_payload contains:
    - map_id: UUID of the map
    - name: Map name
    - storage_provider: 'supabase' or 'r2'
    
    For Supabase storage:
    - color_tif_url: Signed URL to download color TIF
    - bw_tif_url: Signed URL to download BW TIF
    
    For R2 storage:
    - r2_color_key: R2 object key for color TIF
    - r2_bw_key: R2 object key for BW TIF
    
    Common:
    - roi_coordinates: Array of {x, y} points
    - processing_parameters: Dict with algorithm settings
    - webhook_url: URL to send results
    - webhook_secret: Secret for webhook auth
    """
    import os
    import math
    import csv
    import numpy as np
    import matplotlib
    matplotlib.use('Agg')  # Non-interactive backend
    import matplotlib.pyplot as plt
    import networkx as nx
    from PIL import Image, ImageDraw
    from skimage.morphology import skeletonize
    from skimage.graph import route_through_array
    from matplotlib.path import Path
    from scipy.spatial import KDTree
    from sklearn.cluster import DBSCAN
    import random
    import requests
    import base64
    from concurrent.futures import ProcessPoolExecutor, as_completed
    from matplotlib.patches import Circle
    import boto3
    from botocore.config import Config
    
    # --- SAFETY FOR LARGE TIFF FILES ---
    Image.MAX_IMAGE_PIXELS = None
    
    # =============================================================================
    # HELPER FUNCTIONS
    # =============================================================================
    def download_file(url: str, local_path: str) -> str:
        """Download a file from URL to local path."""
        print(f"Downloading {url[:100]}... to {local_path}")
        response = requests.get(url, stream=True)
        response.raise_for_status()
        os.makedirs(os.path.dirname(local_path), exist_ok=True)
        with open(local_path, 'wb') as f:
            for chunk in response.iter_content(chunk_size=8192):
                f.write(chunk)
        print(f"Downloaded {local_path}")
        return local_path
    
    def download_from_r2(r2_key: str, local_path: str) -> str:
        """Download a file from Cloudflare R2."""
        account_id = os.environ["R2_ACCOUNT_ID"]
        access_key = os.environ["R2_ACCESS_KEY_ID"]
        secret_key = os.environ["R2_SECRET_ACCESS_KEY"]
        bucket_name = os.environ["R2_BUCKET_NAME"]
        
        print(f"Downloading from R2: {r2_key} to {local_path}")
        
        s3 = boto3.client(
            's3',
            endpoint_url=f'https://{account_id}.r2.cloudflarestorage.com',
            aws_access_key_id=access_key,
            aws_secret_access_key=secret_key,
            config=Config(signature_version='s3v4'),
        )
        
        os.makedirs(os.path.dirname(local_path), exist_ok=True)
        s3.download_file(bucket_name, r2_key, local_path)
        print(f"Downloaded from R2: {local_path}")
        return local_path
    
    def download_and_stitch_tiles(tile_urls: list, grid_config: dict, output_path: str) -> str:
        """
        Download tiles and stitch them back into a single image.
        Uses identical grid configuration that was used for splitting.
        """
        rows = grid_config["rows"]
        cols = grid_config["cols"]
        tile_w = grid_config["tileWidth"]
        tile_h = grid_config["tileHeight"]
        orig_w = grid_config["originalWidth"]
        orig_h = grid_config["originalHeight"]
        
        print(f"Stitching {len(tile_urls)} tiles into {orig_w}x{orig_h} image...")
        
        # Create empty canvas at original dimensions
        result = Image.new("RGB", (orig_w, orig_h))
        
        # Create temp directory for tiles
        os.makedirs("/tmp/tiles", exist_ok=True)
        
        # Download and paste each tile in row-major order
        idx = 0
        for row in range(rows):
            for col in range(cols):
                tile_path = f"/tmp/tiles/tile_{row}_{col}.png"
                download_file(tile_urls[idx], tile_path)
                tile_img = Image.open(tile_path).convert("RGB")
                
                x = col * tile_w
                y = row * tile_h
                result.paste(tile_img, (x, y))
                
                # Clean up tile after pasting
                os.remove(tile_path)
                idx += 1
        
        # Save stitched result
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        result.save(output_path)
        print(f"Stitched image saved to {output_path}")
        return output_path
    
    def update_status(status: str, message: str = None, error: str = None):
        """Send status update to webhook."""
        webhook_url = job_payload["webhook_url"]
        webhook_secret = job_payload["webhook_secret"]
        map_id = job_payload["map_id"]
        
        payload = {
            "map_id": map_id,
            "status": status,
        }
        if message:
            payload["message"] = message
        if error:
            payload["error"] = error
            
        try:
            response = requests.post(
                f"{webhook_url}/update-status",
                json=payload,
                headers={
                    "Content-Type": "application/json",
                    "X-Webhook-Secret": webhook_secret,
                }
            )
            response.raise_for_status()
            print(f"Status updated: {status}")
        except Exception as e:
            print(f"Failed to update status: {e}")
    
    def upload_image(file_path: str, storage_path: str, route_index: int, aspect_ratio: str):
        """Upload an image to the webhook as base64."""
        webhook_url = job_payload["webhook_url"]
        webhook_secret = job_payload["webhook_secret"]
        map_id = job_payload["map_id"]
        
        with open(file_path, "rb") as f:
            image_data = base64.b64encode(f.read()).decode("utf-8")
        
        payload = {
            "map_id": map_id,
            "image_data": image_data,
            "storage_path": storage_path,
            "route_index": route_index,
            "aspect_ratio": aspect_ratio,
            "content_type": "image/webp",
        }
        
        try:
            response = requests.post(
                f"{webhook_url}/upload-image",
                json=payload,
                headers={
                    "Content-Type": "application/json",
                    "X-Webhook-Secret": webhook_secret,
                }
            )
            response.raise_for_status()
            print(f"Uploaded {storage_path}")
        except Exception as e:
            print(f"Failed to upload {storage_path}: {e}")
    
    # =============================================================================
    # EXTRACT JOB PARAMETERS
    # =============================================================================
    map_id = job_payload["map_id"]
    map_name = job_payload.get("name", "Unknown")
    storage_provider = job_payload.get("storage_provider", "supabase")
    
    # Get processing parameters with defaults
    params = job_payload.get("processing_parameters", {})
    
    OUTPUT_NAME = map_name
    NUM_RANDOM_POINTS = params.get("num_random_points", 1000)
    CANDIDATE_MIN_DIST = params.get("candidate_min_dist", 300)
    CANDIDATE_MAX_DIST = params.get("candidate_max_dist", 1500)
    MAX_CANDIDATE_PAIRS_TO_CALCULATE = params.get("max_candidate_pairs", 2000)
    NUM_OUTPUT_ROUTES = params.get("num_output_routes", 50)
    MAX_OVERLAP_PERCENT = params.get("max_overlap_percent", 0.20)
    BATCH_SIZE = params.get("batch_size", 25)
    ZOOM_MARGIN = params.get("zoom_margin", 50)
    MARKER_RADIUS = params.get("marker_radius", 50)
    LINE_WIDTH = params.get("line_width", 8)
    LINE_ALPHA = params.get("line_alpha", 0.6)
    SMOOTHING_WINDOW = params.get("smoothing_window", 5)
    CORRIDOR_BASE_WIDTH = params.get("corridor_base_width", 50)
    CORRIDOR_SCALE_FACTOR = params.get("corridor_scale_factor", 0.5)
    DEBUG_EXPORT_COUNT = params.get("debug_export_count", 50)
    
    print(f"Processing map: {map_name} (ID: {map_id})")
    print(f"Storage provider: {storage_provider}")
    update_status("processing", "Starting route generation...")
    
    try:
        # =============================================================================
        # DOWNLOAD FILES (with R2 and tile stitching support)
        # =============================================================================
        if storage_provider == "r2":
            # Download directly from R2
            print("Downloading files from R2...")
            update_status("processing", "Downloading files from R2...")
            color_image_path = download_from_r2(
                job_payload["r2_color_key"],
                "/tmp/input/color.tif"
            )
            bw_image_path = download_from_r2(
                job_payload["r2_bw_key"],
                "/tmp/input/bw.tif"
            )
        else:
            # Supabase storage - use signed URLs
            is_tiled = job_payload.get("is_tiled", False)
            
            if is_tiled:
                # Tiled upload - download and stitch tiles
                tile_grid = job_payload["tile_grid"]
                print(f"Processing tiled upload: {tile_grid['rows']}x{tile_grid['cols']} grid")
                update_status("processing", "Downloading and stitching color tiles...")
                color_image_path = download_and_stitch_tiles(
                    job_payload["color_tile_urls"],
                    tile_grid,
                    "/tmp/input/color.tif"
                )
                update_status("processing", "Downloading and stitching B&W tiles...")
                bw_image_path = download_and_stitch_tiles(
                    job_payload["bw_tile_urls"],
                    tile_grid,
                    "/tmp/input/bw.tif"
                )
            else:
                # Single file upload - direct download
                color_image_path = download_file(job_payload["color_tif_url"], "/tmp/input/color.tif")
                bw_image_path = download_file(job_payload["bw_tif_url"], "/tmp/input/bw.tif")
        
        # =============================================================================
        # CONVERT ROI FROM JSON TO NUMPY ARRAY
        # =============================================================================
        # ROI comes as: [{"x": 123.4, "y": 567.8}, ...]
        # Convert to: [[123.4, 567.8], ...]
        roi_json = job_payload.get("roi_coordinates", [])
        if roi_json:
            roi_poly = np.array([[pt["x"], pt["y"]] for pt in roi_json])
        else:
            roi_poly = np.array([])
        
        print(f"ROI Loaded. Shape: {roi_poly.shape}")
        
        # =============================================================================
        # PART 1: Load Map & ROI
        # =============================================================================
        print(f"Loading images for {OUTPUT_NAME}...")
        update_status("processing", "Loading images...")
        
        try:
            color_image = Image.open(color_image_path).convert("RGB")
            bw_image = Image.open(bw_image_path).convert("L")
            w_full, h_full = color_image.size
        except Exception as e:
            print(f"Error loading images: {e}")
            update_status("failed", error=f"Failed to load images: {e}")
            return {"success": False, "error": str(e)}
        
        # Validate ROI
        if roi_poly.size == 0:
            print("WARNING: ROI is empty. Using full map bounds.")
            roi_poly = np.array([[0,0], [w_full,0], [w_full,h_full], [0,h_full]])
        
        # =============================================================================
        # PART 2: Crop & Points
        # =============================================================================
        roi_left = int(np.floor(np.min(roi_poly[:,0])))
        roi_top = int(np.floor(np.min(roi_poly[:,1])))
        roi_right = int(np.ceil(np.max(roi_poly[:,0])))
        roi_bottom = int(np.ceil(np.max(roi_poly[:,1])))
        
        roi_left = max(0, roi_left)
        roi_top = max(0, roi_top)
        roi_right = min(w_full, roi_right)
        roi_bottom = min(h_full, roi_bottom)
        
        print(f"Cropping map to ROI: {roi_left},{roi_top} to {roi_right},{roi_bottom}")
        
        color_crop = color_image.crop((roi_left, roi_top, roi_right, roi_bottom))
        bw_crop = bw_image.crop((roi_left, roi_top, roi_right, roi_bottom))
        w_crop, h_crop = color_crop.size
        roi_path_full = Path(roi_poly)
        
        def generate_random_points(poly_path, count, bounds):
            min_x, min_y, max_x, max_y = bounds
            points = []
            attempts = 0
            max_attempts = count * 100
            
            while len(points) < count and attempts < max_attempts:
                batch_size = (count - len(points)) * 2
                xs = np.random.uniform(min_x, max_x, batch_size)
                ys = np.random.uniform(min_y, max_y, batch_size)
                candidates = np.column_stack((xs, ys))
                
                mask = poly_path.contains_points(candidates)
                valid_candidates = candidates[mask]
                
                for pt in valid_candidates:
                    points.append(tuple(pt))
                    if len(points) >= count:
                        break
                attempts += batch_size
            
            return points[:count]
        
        print(f"Generating {NUM_RANDOM_POINTS} random points within ROI...")
        update_status("processing", "Generating random points...")
        roi_bounds = (roi_left, roi_top, roi_right, roi_bottom)
        generated_points = generate_random_points(roi_path_full, NUM_RANDOM_POINTS, roi_bounds)
        
        roi_csv_points = [(pt[1]-roi_top, pt[0]-roi_left) for pt in generated_points]
        print(f"Points generated: {len(roi_csv_points)}")
        
        # =============================================================================
        # PART 3: Skeleton Graph
        # =============================================================================
        print("Processing skeleton graph...")
        update_status("processing", "Building skeleton graph...")
        binary_crop = (np.array(bw_crop) > 128).astype(np.uint8)
        skeleton = skeletonize(binary_crop.astype(bool))
        fullG = nx.Graph()
        
        skeleton_coords = set(zip(*np.nonzero(skeleton)))
        neighbors = [(-1,0), (1,0), (0,-1), (0,1), (-1,-1), (-1,1), (1,-1), (1,1)]
        
        for (r, c) in skeleton_coords:
            fullG.add_node((r, c))
            for dr, dc in neighbors:
                nr, nc = r+dr, c+dc
                if (nr, nc) in skeleton_coords:
                    wt = 1 if abs(dr)+abs(dc)==1 else math.sqrt(2)
                    fullG.add_edge((r, c), (nr, nc), weight=wt)
        
        def simplify_graph(G):
            junctions = {n for n in G.nodes() if G.degree(n) != 2}
            Gs = nx.Graph()
            for n in junctions: Gs.add_node(n)
            visited = set()
            
            for n in junctions:
                for neigh in G.neighbors(n):
                    if (n, neigh) in visited or (neigh, n) in visited: continue
                    
                    chain = [n, neigh]
                    prev = n
                    current = neigh
                    
                    while current not in junctions:
                        nxts = list(G.neighbors(current))
                        if prev in nxts: nxts.remove(prev)
                        if not nxts: break
                        
                        nxt = nxts[0]
                        chain.append(nxt)
                        prev, current = current, nxt
                    
                    dist = sum(G[chain[i]][chain[i+1]]["weight"] for i in range(len(chain)-1))
                    u, v = chain[0], chain[-1]
                    
                    if Gs.has_edge(u, v):
                        if dist < Gs[u][v]["weight"]: Gs[u][v]["weight"] = dist
                    else:
                        Gs.add_edge(u, v, weight=dist)
                    
                    for k in range(len(chain)-1): visited.add((chain[k], chain[k+1]))
            
            return Gs
        
        Gs = simplify_graph(fullG)
        print(f"Graph simplified. Nodes: {len(Gs.nodes())}")
        
        # =============================================================================
        # PART 4: Snap & Cluster Points
        # =============================================================================
        gs_nodes = np.array(list(Gs.nodes()))
        if len(gs_nodes) == 0:
            print("WARNING: No navigable pixels found in ROI. Check BW image.")
            gs_nodes = np.array([[0,0]])
            Gs.add_node((0,0))
        
        kd_tree = KDTree(gs_nodes)
        
        def snap_point(pt, Gs, binarr, kd):
            nodes_arr = np.array(list(Gs.nodes()))
            dists = np.sum((nodes_arr - np.array(pt))**2, axis=1)
            idxs = np.argsort(dists)
            return tuple(nodes_arr[idxs[0]])
        
        snapped_pts = [snap_point(pt, Gs, binary_crop, kd_tree) for pt in roi_csv_points]
        
        if snapped_pts:
            db = DBSCAN(eps=5, min_samples=1).fit(snapped_pts)
            clusters = {}
            for spt, lbl in zip(snapped_pts, db.labels_):
                clusters.setdefault(lbl, []).append(spt)
            cluster_reps = [cluster[0] for cluster in clusters.values()]
        else:
            cluster_reps = []
        
        print(f"Unique clustered points: {len(cluster_reps)}")
        unique_points_arr = np.array(cluster_reps)
        
        # =============================================================================
        # PART 5: Pair Generation & Evaluation
        # =============================================================================
        print("Generating pairs...")
        update_status("processing", "Generating candidate pairs...")
        
        n = len(cluster_reps)
        all_pairs = []
        for i in range(n):
            for j in range(i+1, n):
                dist = np.linalg.norm(unique_points_arr[i] - unique_points_arr[j])
                if CANDIDATE_MIN_DIST <= dist <= CANDIDATE_MAX_DIST:
                    all_pairs.append((i, j, dist))
        
        print(f"Total pairs in distance range: {len(all_pairs)}")
        if len(all_pairs) > MAX_CANDIDATE_PAIRS_TO_CALCULATE:
            all_pairs = random.sample(all_pairs, MAX_CANDIDATE_PAIRS_TO_CALCULATE)
            print(f"Sampled to: {len(all_pairs)}")
        
        # =============================================================================
        # PART 6: Pathfinding
        # =============================================================================
        print("Pathfinding...")
        update_status("processing", "Finding paths between points...")
        
        cost_arr = 1.0 - binary_crop.astype(float)
        cost_arr[cost_arr == 0] = 0.001  # small nonzero for navigable
        cost_arr[cost_arr == 1] = 1e9    # huge for non-navigable
        
        def evaluate_pair(pair_data, Gs, cluster_reps, cost_arr, roi_left, roi_top, corridor_base, corridor_scale, batch_size, line_width):
            """Evaluate a single pair for route hardness using graph-only pathfinding."""
            i, j, dist = pair_data
            pA, pB = cluster_reps[i], cluster_reps[j]
            
            try:
                # Find main route using graph pathfinding (fast - uses simplified graph)
                path_main = nx.shortest_path(Gs, pA, pB, weight='weight')
                main_length = sum(Gs[path_main[k]][path_main[k+1]]['weight'] for k in range(len(path_main)-1))
                
                if main_length < 10:
                    return None
                
                # Find alternative route by temporarily removing main path edges from graph
                temp_Gs = Gs.copy()
                for k in range(len(path_main) - 1):
                    u, v = path_main[k], path_main[k+1]
                    if temp_Gs.has_edge(u, v):
                        temp_Gs.remove_edge(u, v)
                
                try:
                    path_alt = nx.shortest_path(temp_Gs, pA, pB, weight='weight')
                    alt_length = sum(temp_Gs[path_alt[k]][path_alt[k+1]]['weight'] for k in range(len(path_alt)-1))
                except nx.NetworkXNoPath:
                    # No alternative path exists - this is a highly constrained route (interesting!)
                    alt_length = main_length * 3  # High hardness score
                    path_alt = []
                
                # Calculate hardness score (ratio of alternative to main length)
                hardness = alt_length / main_length if main_length > 0 else 0
                
                return {
                    'i': i, 'j': j,
                    'pA': pA, 'pB': pB,
                    'main_path': list(path_main),      # Graph nodes as list of (row, col)
                    'alt_path': list(path_alt),        # Graph nodes as list of (row, col)
                    'main_length': main_length,
                    'alt_length': alt_length,
                    'hardness': hardness,
                }
            except Exception as e:
                return None
        
        evaluated = []
        for idx, pair in enumerate(all_pairs):
            if idx % 100 == 0:
                print(f"Evaluating pair {idx}/{len(all_pairs)}")
            result = evaluate_pair(
                pair, Gs, cluster_reps, cost_arr, roi_left, roi_top,
                CORRIDOR_BASE_WIDTH, CORRIDOR_SCALE_FACTOR, BATCH_SIZE, LINE_WIDTH
            )
            if result:
                evaluated.append(result)
        
        print(f"Evaluated routes: {len(evaluated)}")
        
        # =============================================================================
        # PART 7: Filter & Select Routes
        # =============================================================================
        print("Filtering routes...")
        update_status("processing", "Selecting best routes...")
        
        # Sort by hardness (higher is harder = more interesting)
        evaluated.sort(key=lambda x: x['hardness'], reverse=True)
        
        def check_overlap(route1, route2, max_overlap):
            """Check if two routes overlap too much."""
            set1 = set(route1['main_path'])
            set2 = set(route2['main_path'])
            intersection = len(set1 & set2)
            min_len = min(len(set1), len(set2))
            if min_len == 0:
                return False
            return (intersection / min_len) > max_overlap
        
        selected = []
        for route in evaluated:
            overlaps = False
            for sel in selected:
                if check_overlap(route, sel, MAX_OVERLAP_PERCENT):
                    overlaps = True
                    break
            if not overlaps:
                selected.append(route)
            if len(selected) >= NUM_OUTPUT_ROUTES:
                break
        
        print(f"Selected routes: {len(selected)}")
        
        # =============================================================================
        # PART 8: Export Routes
        # =============================================================================
        print("Exporting routes...")
        update_status("processing", "Generating route images...")
        
        os.makedirs("/tmp/output", exist_ok=True)
        
        color_crop_np = np.array(color_crop)
        
        for idx, route in enumerate(selected[:DEBUG_EXPORT_COUNT]):
            pA, pB = route['pA'], route['pB']
            main_path = route['main_path']
            alt_path = route['alt_path']
            
            # Calculate bounding box
            all_points = list(main_path) + list(alt_path)
            rows = [p[0] for p in all_points]
            cols = [p[1] for p in all_points]
            
            min_r, max_r = min(rows), max(rows)
            min_c, max_c = min(cols), max(cols)
            
            # Add margin
            min_r = max(0, min_r - ZOOM_MARGIN)
            max_r = min(h_crop, max_r + ZOOM_MARGIN)
            min_c = max(0, min_c - ZOOM_MARGIN)
            max_c = min(w_crop, max_c + ZOOM_MARGIN)
            
            # Extract crop
            crop_region = color_crop_np[min_r:max_r, min_c:max_c]
            
            # Export for both aspect ratios
            for aspect_name, target_ratio in [("16_9", 16/9), ("9_16", 9/16)]:
                fig, ax = plt.subplots(1, 1, figsize=(12, 12))
                ax.imshow(crop_region)
                ax.axis('off')
                
                # Draw paths (adjusted for crop region)
                main_coords = [(c - min_c, r - min_r) for r, c in main_path]
                alt_coords = [(c - min_c, r - min_r) for r, c in alt_path]
                
                if main_coords:
                    xs, ys = zip(*main_coords)
                    ax.plot(xs, ys, color='purple', linewidth=LINE_WIDTH, alpha=LINE_ALPHA)
                
                if alt_coords:
                    xs, ys = zip(*alt_coords)
                    ax.plot(xs, ys, color='red', linewidth=LINE_WIDTH, alpha=LINE_ALPHA)
                
                # Draw start/end markers
                ax.add_patch(Circle(
                    (pA[1] - min_c, pA[0] - min_r),
                    MARKER_RADIUS, fill=False, edgecolor='green', linewidth=3
                ))
                ax.add_patch(Circle(
                    (pB[1] - min_c, pB[0] - min_r),
                    MARKER_RADIUS, fill=False, edgecolor='red', linewidth=3
                ))
                
                plt.tight_layout()
                
                output_path = f"/tmp/output/route_{idx}_{aspect_name}.webp"
                plt.savefig(output_path, format='webp', dpi=100, bbox_inches='tight', pad_inches=0)
                plt.close(fig)
                
                # Upload to webhook
                storage_path = f"{map_id}/route_{idx}_{aspect_name}.webp"
                aspect_ratio = "16:9" if aspect_name == "16_9" else "9:16"
                upload_image(output_path, storage_path, idx, aspect_ratio)
        
        # =============================================================================
        # PART 9: Generate CSV Summary
        # =============================================================================
        csv_path = "/tmp/output/routes_summary.csv"
        with open(csv_path, 'w', newline='') as f:
            writer = csv.writer(f)
            writer.writerow(['index', 'start_r', 'start_c', 'end_r', 'end_c', 'main_length', 'alt_length', 'hardness'])
            for idx, route in enumerate(selected):
                writer.writerow([
                    idx,
                    route['pA'][0], route['pA'][1],
                    route['pB'][0], route['pB'][1],
                    route['main_length'], route['alt_length'],
                    route['hardness']
                ])
        
        # Upload CSV
        with open(csv_path, 'rb') as f:
            csv_data = base64.b64encode(f.read()).decode('utf-8')
        
        webhook_url = job_payload["webhook_url"]
        webhook_secret = job_payload["webhook_secret"]
        
        requests.post(
            f"{webhook_url}/upload-csv",
            json={
                "map_id": map_id,
                "csv_data": csv_data,
                "storage_path": f"{map_id}/routes_summary.csv",
            },
            headers={
                "Content-Type": "application/json",
                "X-Webhook-Secret": webhook_secret,
            }
        )
        
        # =============================================================================
        # DONE
        # =============================================================================
        update_status("completed", f"Generated {len(selected)} routes successfully!")
        print(f"Processing complete! Generated {len(selected)} routes.")
        
        return {
            "success": True,
            "routes_count": len(selected),
            "map_id": map_id,
        }
        
    except Exception as e:
        import traceback
        error_msg = f"{str(e)}\n{traceback.format_exc()}"
        print(f"Processing failed: {error_msg}")
        update_status("failed", error=str(e))
        return {"success": False, "error": str(e)}


# =============================================================================
# FASTAPI ENDPOINT TO TRIGGER PROCESSING
# =============================================================================
@app.function(image=image)
@modal.fastapi_endpoint(method="POST")
def trigger(payload: dict):
    """
    FastAPI endpoint to receive job payloads and start processing.
    This runs async so it returns immediately while processing continues.
    """
    print(f"Received job for map: {payload.get('map_id')}")
    
    # Spawn the processing function asynchronously
    process_map.spawn(payload)
    
    return {"status": "accepted", "map_id": payload.get("map_id")}
