"""
ROUTE FINDER CHALLENGE GENERATOR - MODAL VERSION (STANDALONE)
===========================================================================
Version: 1.1.0
- Generates skeleton graphs for Route Finder gamemode
- Creates base images (map + start/finish markers only)
- Creates answer images (map + optimal route overlay)
- Creates impassability masks for client-side validation
- Exports simplified graph JSON for client-side pathfinding
- Uses binary scoring: user's snapped path must match optimal path

This is a STANDALONE script separate from Route Choice processing.
Uses single-threaded path evaluation to avoid pickling issues.
"""

import modal
import math
import numpy as np
import networkx as nx

VERSION = "route-finder-processor-v1.1.0"

# =============================================================================
# MODAL APP CONFIGURATION - SEPARATE FROM ROUTE CHOICE
# =============================================================================
app = modal.App("route-finder-processor")

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
    "boto3",
)

# =============================================================================
# GLOBAL HELPER FUNCTIONS
# =============================================================================

def euclid(u, v):
    """Euclidean distance between two points."""
    return math.hypot(u[0]-v[0], u[1]-v[1])


def simplify_graph_for_challenge(full_graph, optimal_path, corridor_radius=300, bbox=None):
    """
    Simplify graph to only include nodes within corridor of optimal path.
    This reduces graph size for efficient client-side pathfinding.
    
    Args:
        full_graph: The full skeleton graph
        optimal_path: List of (row, col) tuples for the optimal path
        corridor_radius: Distance from path to include nodes
        bbox: Optional (left, top, right, bottom) to transform coordinates to be relative to a crop
    
    Returns: (nodes_list, edges_list, node_id_mapping)
    """
    from scipy.spatial import KDTree
    
    # Build KD-tree of optimal path points
    path_points = np.array(optimal_path)
    path_tree = KDTree(path_points)
    
    # Find all graph nodes within corridor
    all_nodes = list(full_graph.nodes())
    corridor_nodes = set()
    
    for node in all_nodes:
        dist, _ = path_tree.query(node)
        if dist <= corridor_radius:
            corridor_nodes.add(node)
    
    # Always include path nodes
    for node in optimal_path:
        corridor_nodes.add(tuple(node))
    
    # Create node ID mapping
    node_list = list(corridor_nodes)
    node_id_map = {node: f"n_{i}" for i, node in enumerate(node_list)}
    
    # Determine coordinate offset (for transforming to challenge image space)
    # bbox is (left, top, right, bottom) in (col, row) format
    # node coordinates are in (row, col) format
    offset_row = bbox[1] if bbox else 0  # top
    offset_col = bbox[0] if bbox else 0  # left
    
    # Build nodes JSON with coordinates relative to the challenge image crop
    nodes_json = [
        {
            "id": node_id_map[node], 
            "x": int(node[1] - offset_col),  # col -> x, offset by bbox left
            "y": int(node[0] - offset_row)   # row -> y, offset by bbox top
        }
        for node in node_list
    ]
    
    # Build edges JSON (only edges where both nodes are in corridor)
    edges_json = []
    seen_edges = set()
    
    for u, v, data in full_graph.edges(data=True):
        if u in corridor_nodes and v in corridor_nodes:
            edge_key = tuple(sorted([node_id_map[u], node_id_map[v]]))
            if edge_key not in seen_edges:
                edges_json.append({
                    "from": node_id_map[u],
                    "to": node_id_map[v],
                    "weight": round(data.get('weight', euclid(u, v)), 2)
                })
                seen_edges.add(edge_key)
    
    return nodes_json, edges_json, node_id_map


# =============================================================================
# MAIN PROCESSING FUNCTION
# =============================================================================

@app.function(
    image=image,
    timeout=3600,
    memory=8192,
    secrets=[
        modal.Secret.from_name("map-processing-secrets"),
        modal.Secret.from_name("r2-credentials"),
    ],
)
def process_route_finder(job_payload: dict):
    import os
    import matplotlib
    matplotlib.use('Agg')
    import matplotlib.pyplot as plt
    from PIL import Image, ImageDraw
    from skimage.morphology import skeletonize
    from matplotlib.path import Path
    from scipy.spatial import KDTree
    from sklearn.cluster import DBSCAN
    import random
    import requests
    import base64
    from matplotlib.patches import Circle
    import boto3
    from botocore.config import Config
    
    print(f"Route Finder Processor {VERSION} starting...")
    
    Image.MAX_IMAGE_PIXELS = None

    # --- INFRASTRUCTURE HELPERS ---
    def download_file(url: str, local_path: str) -> str:
        response = requests.get(url, stream=True)
        response.raise_for_status()
        os.makedirs(os.path.dirname(local_path), exist_ok=True)
        with open(local_path, 'wb') as f:
            for chunk in response.iter_content(chunk_size=8192):
                f.write(chunk)
        return local_path
    
    def download_from_r2(r2_key: str, local_path: str) -> str:
        s3 = boto3.client(
            's3',
            endpoint_url=f'https://{os.environ["R2_ACCOUNT_ID"]}.r2.cloudflarestorage.com',
            aws_access_key_id=os.environ["R2_ACCESS_KEY_ID"],
            aws_secret_access_key=os.environ["R2_SECRET_ACCESS_KEY"],
            config=Config(signature_version='s3v4'),
        )
        os.makedirs(os.path.dirname(local_path), exist_ok=True)
        s3.download_file(os.environ["R2_BUCKET_NAME"], r2_key, local_path)
        return local_path

    def update_status(status: str, message: str = None, error: str = None):
        try:
            payload = {"map_id": job_payload["map_id"], "status": status}
            if message: payload["message"] = message
            if error: payload["error"] = error
            requests.post(
                f"{job_payload['webhook_url']}/update-status",
                json=payload,
                headers={"Content-Type": "application/json", "X-Webhook-Secret": job_payload["webhook_secret"]}
            )
        except Exception as e:
            print(f"Status update failed: {e}")
    
    def upload_rf_image(file_path: str, storage_path: str, challenge_index: int, image_type: str, aspect_ratio: str):
        """Upload Route Finder image (base, answer, or mask)."""
        with open(file_path, "rb") as f:
            image_data = base64.b64encode(f.read()).decode("utf-8")
        
        # Determine content type based on file extension
        content_type = "image/png" if file_path.endswith(".png") else "image/webp"
        
        requests.post(
            f"{job_payload['webhook_url']}/rf-upload-image",
            json={
                "map_id": job_payload["map_id"],
                "image_data": image_data,
                "storage_path": storage_path,
                "challenge_index": challenge_index,
                "image_type": image_type,  # 'base', 'answer', or 'mask'
                "aspect_ratio": aspect_ratio,
                "content_type": content_type,
            },
            headers={"Content-Type": "application/json", "X-Webhook-Secret": job_payload["webhook_secret"]}
        )

    # --- CONFIGURATION ---
    map_id = job_payload["map_id"]
    map_name = job_payload.get("name", job_payload.get("map_name", "Unknown Map"))
    params = job_payload.get("processing_parameters", {})
    
    # Route Finder specific parameters
    MIN_ROUTE_LENGTH = params.get("min_route_length", 800)
    MAX_ROUTE_LENGTH = params.get("max_route_length", 2500)
    NUM_CHALLENGES = params.get("num_challenges", 20)
    GRAPH_SIMPLIFICATION_RADIUS = params.get("graph_simplification_radius", 300)
    
    NUM_RANDOM_POINTS = params.get("num_random_points", 1500)
    MARKER_PADDING = params.get("marker_padding", 200)  # Large padding around start/finish markers
    ROUTE_PADDING = params.get("route_padding", 120)    # Smaller padding around the route itself
    MARKER_RADIUS = params.get("marker_radius", 60)  # Increased default for better visibility
    LINE_WIDTH = params.get("line_width", 8)
    MASK_SCALE = 4  # Downscale factor for impassability masks
    
    print(f"Processing Route Finder for map: {map_name} (ID: {map_id})")
    print(f"Parameters: min_length={MIN_ROUTE_LENGTH}, max_length={MAX_ROUTE_LENGTH}, num_challenges={NUM_CHALLENGES}")
    print(f"Visual: marker_padding={MARKER_PADDING}, route_padding={ROUTE_PADDING}, marker_radius={MARKER_RADIUS}, line_width={LINE_WIDTH}")
    
    update_status("processing", f"Starting Route Finder generation. Target: {NUM_CHALLENGES} challenges.")

    try:
        # --- LOAD DATA ---
        if job_payload.get("storage_provider") == "r2":
            print("Loading from R2 storage...")
            color_path = download_from_r2(job_payload["r2_color_key"], "/tmp/color.tif")
            bw_path = download_from_r2(job_payload["r2_bw_key"], "/tmp/bw.tif")
        else:
            print("Loading from Supabase storage...")
            color_path = download_file(job_payload["color_tif_url"], "/tmp/color.tif")
            bw_path = download_file(job_payload["bw_tif_url"], "/tmp/bw.tif")

        color_image = Image.open(color_path).convert("RGB")
        bw_image = Image.open(bw_path).convert("L")
        print(f"Images loaded: color={color_image.size}, bw={bw_image.size}")
        
        # --- APPLY IMPASSABLE ANNOTATIONS ---
        impassable = job_payload.get("impassable_annotations")
        if impassable:
            areas = impassable.get("areas", [])
            lines = impassable.get("lines", [])
            print(f"Applying {len(areas)} impassable areas and {len(lines)} lines...")
            
            # Composite onto color image
            color_rgba = color_image.convert("RGBA")
            overlay = Image.new("RGBA", color_rgba.size, (0, 0, 0, 0))
            color_draw = ImageDraw.Draw(overlay)
            violet = (255, 0, 255, 180)
            violet_solid = (255, 0, 255, 255)
            
            for area in areas:
                points = [(p["x"], p["y"]) for p in area.get("points", [])]
                if len(points) >= 3:
                    color_draw.polygon(points, fill=violet, outline=violet_solid)
            for line in lines:
                start = line.get("start", {})
                end = line.get("end", {})
                if start and end:
                    color_draw.line(
                        [(start["x"], start["y"]), (end["x"], end["y"])],
                        fill=violet_solid, width=12
                    )
            
            color_image = Image.alpha_composite(color_rgba, overlay).convert("RGB")
            
            # Composite onto B&W image
            bw_draw = ImageDraw.Draw(bw_image)
            black = 0
            
            for area in areas:
                points = [(p["x"], p["y"]) for p in area.get("points", [])]
                if len(points) >= 3:
                    bw_draw.polygon(points, fill=black, outline=black)
            for line in lines:
                start = line.get("start", {})
                end = line.get("end", {})
                if start and end:
                    bw_draw.line(
                        [(start["x"], start["y"]), (end["x"], end["y"])],
                        fill=black, width=8
                    )
            
            print(f"Impassable annotations applied successfully")
        
        w_full, h_full = color_image.size
        
        # Load ROI
        roi_json = job_payload.get("roi_coordinates", [])
        if roi_json:
            roi_poly = np.array([[pt["x"], pt["y"]] for pt in roi_json])
        else:
            roi_poly = np.array([[0,0], [w_full,0], [w_full,h_full], [0,h_full]])
            
        roi_left = int(max(0, np.floor(np.min(roi_poly[:,0]))))
        roi_top = int(max(0, np.floor(np.min(roi_poly[:,1]))))
        roi_right = int(min(w_full, np.ceil(np.max(roi_poly[:,0]))))
        roi_bottom = int(min(h_full, np.ceil(np.max(roi_poly[:,1]))))
        
        color_crop = color_image.crop((roi_left, roi_top, roi_right, roi_bottom))
        bw_crop = bw_image.crop((roi_left, roi_top, roi_right, roi_bottom))
        w_crop, h_crop = color_crop.size
        print(f"Cropped to ROI: {w_crop}x{h_crop}")

        # --- GRAPH GENERATION ---
        update_status("processing", "Building skeleton graph...")
        
        def gen_points(poly, count, bounds):
            p = []
            while len(p) < count:
                cand = np.random.uniform(bounds[0], bounds[2], (count, 2))
                cand[:, 1] = np.random.uniform(bounds[1], bounds[3], count)
                valid = poly.contains_points(cand)
                for pt in cand[valid]:
                    p.append(tuple(pt))
                    if len(p) >= count: break
            return p
            
        roi_path_obj = Path(roi_poly)
        points_global = gen_points(roi_path_obj, NUM_RANDOM_POINTS, (roi_left, roi_top, roi_right, roi_bottom))
        roi_csv_points = [(pt[1]-roi_top, pt[0]-roi_left) for pt in points_global]

        binary_crop = (np.array(bw_crop) > 128).astype(np.uint8)
        skeleton = skeletonize(binary_crop.astype(bool))
        fullG = nx.Graph()
        skel_pts = list(zip(*np.nonzero(skeleton)))
        skel_set = set(skel_pts)
        
        print(f"Skeleton points: {len(skel_pts)}")
        
        for r, c in skel_pts:
            fullG.add_node((r, c))
            for dr, dc in [(-1,0), (1,0), (0,-1), (0,1), (-1,-1), (-1,1), (1,-1), (1,1)]:
                nr, nc = r+dr, c+dc
                if (nr, nc) in skel_set:
                    wt = 1 if abs(dr)+abs(dc)==1 else 1.414
                    fullG.add_edge((r, c), (nr, nc), weight=wt)
        
        # Simplify to junctions
        junctions = {n for n in fullG.nodes() if fullG.degree(n) != 2}
        Gs = nx.Graph()
        for n in junctions: Gs.add_node(n)
        visited_edges = set()
        for start_node in junctions:
            for neighbor in fullG.neighbors(start_node):
                if tuple(sorted((start_node, neighbor))) in visited_edges: continue
                path = [start_node, neighbor]
                curr = neighbor
                prev = start_node
                dist = fullG[start_node][neighbor]['weight']
                while curr not in junctions and fullG.degree(curr) == 2:
                    nhs = list(fullG.neighbors(curr))
                    nhs.remove(prev)
                    if not nhs: break
                    nxt = nhs[0]
                    dist += fullG[curr][nxt]['weight']
                    path.append(nxt)
                    prev, curr = curr, nxt
                if curr in junctions:
                    u, v = start_node, curr
                    if Gs.has_edge(u, v):
                        if dist < Gs[u][v]['weight']: Gs[u][v]['weight'] = dist
                    else:
                        Gs.add_edge(u, v, weight=dist)
                    visited_edges.add(tuple(sorted((start_node, neighbor))))

        print(f"Simplified graph: {len(Gs.nodes())} nodes, {len(Gs.edges())} edges")

        # Snap random points to graph
        gs_nodes = np.array(list(Gs.nodes()))
        if len(gs_nodes) == 0: 
            raise Exception("No navigable terrain found in the map.")
        tree = KDTree(gs_nodes)
        snapped_pts = [tuple(gs_nodes[tree.query(p)[1]]) for p in roi_csv_points]
        
        # Cluster to reduce duplicates
        db = DBSCAN(eps=5, min_samples=1).fit(snapped_pts)
        unique_pts = []
        labels = set(db.labels_)
        for l in labels:
            cluster = [snapped_pts[i] for i in range(len(snapped_pts)) if db.labels_[i] == l]
            unique_pts.append(cluster[0])
        
        print(f"Unique candidate points: {len(unique_pts)}")
            
        # --- FIND LONG ROUTE PAIRS ---
        update_status("processing", f"Finding route pairs (length {MIN_ROUTE_LENGTH}-{MAX_ROUTE_LENGTH}px)...")
        
        cand_tree = KDTree(unique_pts)
        pairs = []
        for i, p1 in enumerate(unique_pts):
            idxs = cand_tree.query_ball_point(p1, MAX_ROUTE_LENGTH)
            for j in idxs:
                if j <= i: continue
                p2 = unique_pts[j]
                straight_dist = np.linalg.norm(np.array(p1)-np.array(p2))
                if straight_dist >= MIN_ROUTE_LENGTH * 0.6:  # Allow some slack for path length
                    pairs.append((p1, p2))
        
        if len(pairs) > 10000: 
            pairs = random.sample(pairs, 10000)
        print(f"Found {len(pairs)} candidate pairs")
        
        # --- EVALUATE PAIRS (SINGLE-THREADED to avoid pickling issues) ---
        update_status("processing", f"Evaluating {len(pairs)} pairs (single-threaded)...")
        
        valid_routes = []
        evaluated = 0
        
        for pair in pairs:
            st, en = pair
            try:
                path = nx.astar_path(Gs, st, en, heuristic=euclid, weight="weight")
                path_length = nx.path_weight(Gs, path, weight="weight")
                
                if MIN_ROUTE_LENGTH <= path_length <= MAX_ROUTE_LENGTH:
                    valid_routes.append({
                        "start": st,
                        "end": en,
                        "path": path,
                        "length": path_length,
                    })
            except nx.NetworkXNoPath:
                pass
            
            evaluated += 1
            if evaluated % 1000 == 0:
                print(f"Evaluated {evaluated}/{len(pairs)} pairs, found {len(valid_routes)} valid routes")
        
        print(f"Valid routes found: {len(valid_routes)}")
        
        if len(valid_routes) == 0:
            raise Exception(f"No valid routes found in length range {MIN_ROUTE_LENGTH}-{MAX_ROUTE_LENGTH}px. Try adjusting parameters.")
        
        # Sort by length (prefer longer routes) and select diverse set
        valid_routes.sort(key=lambda x: x["length"], reverse=True)
        
        # Select diverse routes (not too close to each other)
        selected_routes = []
        MIN_START_END_DIST = 200
        
        for route in valid_routes:
            if len(selected_routes) >= NUM_CHALLENGES:
                break
                
            too_close = False
            for sel in selected_routes:
                d_start = math.hypot(route["start"][0] - sel["start"][0], route["start"][1] - sel["start"][1])
                d_end = math.hypot(route["end"][0] - sel["end"][0], route["end"][1] - sel["end"][1])
                if d_start < MIN_START_END_DIST or d_end < MIN_START_END_DIST:
                    too_close = True
                    break
            
            if not too_close:
                selected_routes.append(route)
        
        print(f"Selected {len(selected_routes)} diverse challenges")
        
        if len(selected_routes) == 0:
            raise Exception("Could not select any diverse routes. Try with a larger map or different parameters.")
        
        # --- GENERATE IMAGES AND GRAPH DATA ---
        update_status("processing", f"Generating {len(selected_routes)} challenge images...")
        
        os.makedirs("/tmp/rf_16_9", exist_ok=True)
        os.makedirs("/tmp/rf_9_16", exist_ok=True)
        
        challenges_data = []
        
        def adjust_bbox(min_c, min_r, max_c, max_r, ratio, w, h):
            bw = max_c - min_c
            bh = max_r - min_r
            curr_r = bw / bh if bh else ratio
            cent_c = (min_c + max_c) / 2
            cent_r = (min_r + max_r) / 2
            
            if curr_r < ratio:
                nw = bh * ratio
                nh = bh
            else:
                nw = bw
                nh = bw / ratio
            return (int(max(cent_c-nw/2,0)), int(max(cent_r-nh/2,0)), 
                    int(min(cent_c+nw/2,w)), int(min(cent_r+nh/2,h)))

        for i, route in enumerate(selected_routes, 1):
            st = route["start"]
            en = route["end"]
            path = route["path"]
            path_length = route["length"]
            
            # Calculate bounding box with separate padding for markers and route
            all_pts = path
            rs = [p[0] for p in all_pts]
            cs = [p[1] for p in all_pts]
            
            # Get start/finish positions
            st_row, st_col = st[0], st[1]
            en_row, en_col = en[0], en[1]
            
            # Calculate bounds with larger padding around start/finish markers
            # and smaller padding around the route itself
            rmin = max(0, min(
                min(rs) - ROUTE_PADDING,
                st_row - MARKER_PADDING,
                en_row - MARKER_PADDING
            ))
            rmax = min(h_crop, max(
                max(rs) + ROUTE_PADDING,
                st_row + MARKER_PADDING,
                en_row + MARKER_PADDING
            ))
            cmin = max(0, min(
                min(cs) - ROUTE_PADDING,
                st_col - MARKER_PADDING,
                en_col - MARKER_PADDING
            ))
            cmax = min(w_crop, max(
                max(cs) + ROUTE_PADDING,
                st_col + MARKER_PADDING,
                en_col + MARKER_PADDING
            ))
            
            b169 = adjust_bbox(cmin, rmin, cmax, rmax, 16/9, w_crop, h_crop)
            b916 = adjust_bbox(cmin, rmin, cmax, rmax, 9/16, w_crop, h_crop)
            
            # Calculate exact bbox dimensions for client-side coordinate scaling
            bbox_width = b169[2] - b169[0]
            bbox_height = b169[3] - b169[1]
            
            # Simplify graph for this challenge - use 16:9 bbox for coordinate transformation
            # since the default base_image_path uses 16:9 format
            nodes_json, edges_json, node_id_map = simplify_graph_for_challenge(
                Gs, path, GRAPH_SIMPLIFICATION_RADIUS, bbox=b169
            )
            
            # Map path to node IDs
            optimal_path_ids = [node_id_map[tuple(p)] for p in path]
            start_node_id = node_id_map[st]
            finish_node_id = node_id_map[en]
            
            def generate_impassability_mask(bbox, folder, challenge_index):
                """Generate a downscaled binary mask for the challenge area."""
                # Crop the B&W image to the bbox
                mask_region = bw_crop.crop(bbox)
                
                # Calculate downscaled dimensions
                orig_w = bbox[2] - bbox[0]
                orig_h = bbox[3] - bbox[1]
                small_w = max(1, orig_w // MASK_SCALE)
                small_h = max(1, orig_h // MASK_SCALE)
                
                # Downscale using NEAREST to preserve binary nature
                mask_small = mask_region.resize((small_w, small_h), Image.NEAREST)
                
                # Convert to pure black/white (threshold at 128)
                mask_binary = mask_small.point(lambda x: 255 if x > 128 else 0)
                
                # Save as PNG (smaller than WEBP for binary images)
                mask_path = f"/tmp/rf_{folder}/challenge_{challenge_index}_mask.png"
                mask_binary.save(mask_path, "PNG")
                
                return mask_path, small_w, small_h
            
            def generate_challenge_images(bbox, folder, ratio_str, is_primary=False):
                base = color_crop.copy()
                
                def off(pt): 
                    return (pt[1]-bbox[0], pt[0]-bbox[1])
                
                # --- BASE IMAGE (clean map + start/finish only) ---
                fig, ax = plt.subplots(figsize=((bbox[2]-bbox[0])/100, (bbox[3]-bbox[1])/100), dpi=100)
                ax.imshow(base.crop(bbox))
                
                s = off(st)
                e = off(en)
                
                # Start marker (triangle)
                start_marker = plt.Polygon([
                    (s[0], s[1] - MARKER_RADIUS),
                    (s[0] - MARKER_RADIUS * 0.866, s[1] + MARKER_RADIUS * 0.5),
                    (s[0] + MARKER_RADIUS * 0.866, s[1] + MARKER_RADIUS * 0.5),
                ], closed=True, ec='magenta', fc='none', lw=4)
                ax.add_patch(start_marker)
                
                # Finish marker (double circle)
                ax.add_patch(Circle(e, MARKER_RADIUS, ec="magenta", fc="none", lw=4))
                ax.add_patch(Circle(e, MARKER_RADIUS * 0.6, ec="magenta", fc="none", lw=3))
                
                ax.axis("off")
                base_path = f"/tmp/rf_{folder}/challenge_{i}_base.webp"
                plt.tight_layout(pad=0)
                plt.savefig(base_path, dpi=100, bbox_inches='tight', pad_inches=0, format='webp')
                plt.close(fig)
                
                upload_rf_image(base_path, f"{map_id}/route_finder/{folder}/challenge_{i}_base.webp", i, "base", ratio_str)
                
                # --- ANSWER IMAGE (with optimal route) ---
                fig, ax = plt.subplots(figsize=((bbox[2]-bbox[0])/100, (bbox[3]-bbox[1])/100), dpi=100)
                ax.imshow(base.crop(bbox))
                
                # Draw optimal route
                x = [off(p)[0] for p in path]
                y = [off(p)[1] for p in path]
                ax.plot(x, y, color='#E41A1C', lw=LINE_WIDTH, alpha=0.85, solid_capstyle='round')
                
                # Draw markers
                ax.add_patch(plt.Polygon([
                    (s[0], s[1] - MARKER_RADIUS),
                    (s[0] - MARKER_RADIUS * 0.866, s[1] + MARKER_RADIUS * 0.5),
                    (s[0] + MARKER_RADIUS * 0.866, s[1] + MARKER_RADIUS * 0.5),
                ], closed=True, ec='magenta', fc='none', lw=4))
                ax.add_patch(Circle(e, MARKER_RADIUS, ec="magenta", fc="none", lw=4))
                ax.add_patch(Circle(e, MARKER_RADIUS * 0.6, ec="magenta", fc="none", lw=3))
                
                ax.axis("off")
                answer_path = f"/tmp/rf_{folder}/challenge_{i}_answer.webp"
                plt.tight_layout(pad=0)
                plt.savefig(answer_path, dpi=100, bbox_inches='tight', pad_inches=0, format='webp')
                plt.close(fig)
                
                upload_rf_image(answer_path, f"{map_id}/route_finder/{folder}/challenge_{i}_answer.webp", i, "answer", ratio_str)
                
                # --- IMPASSABILITY MASK (only for primary aspect ratio) ---
                mask_storage_path = None
                if is_primary:
                    local_mask_path, mask_w, mask_h = generate_impassability_mask(bbox, folder, i)
                    mask_storage_path = f"{map_id}/route_finder/{folder}/challenge_{i}_mask.png"
                    upload_rf_image(local_mask_path, mask_storage_path, i, "mask", ratio_str)
                
                return (
                    f"{map_id}/route_finder/{folder}/challenge_{i}_base.webp",
                    f"{map_id}/route_finder/{folder}/challenge_{i}_answer.webp",
                    mask_storage_path
                )
            
            base_16_9, answer_16_9, mask_path = generate_challenge_images(b169, "16_9", "16:9", is_primary=True)
            base_9_16, answer_9_16, _ = generate_challenge_images(b916, "9_16", "9:16", is_primary=False)
            
            # Calculate difficulty score based on route complexity
            difficulty = min(10, (path_length / 200) + len(path) / 50)
            
            challenges_data.append({
                "challenge_index": i,
                "graph_data": {
                    "nodes": nodes_json,
                    "edges": edges_json,
                },
                "start_node_id": start_node_id,
                "finish_node_id": finish_node_id,
                "optimal_path": optimal_path_ids,
                "optimal_length": round(path_length, 2),
                "difficulty_score": round(difficulty, 2),
                "base_image_path": base_16_9,  # Default to 16:9
                "answer_image_path": answer_16_9,
                "impassability_mask_path": mask_path,
                "bbox_width": bbox_width,
                "bbox_height": bbox_height,
                "base_image_path_16_9": base_16_9,
                "answer_image_path_16_9": answer_16_9,
                "base_image_path_9_16": base_9_16,
                "answer_image_path_9_16": answer_9_16,
            })
            
            if i % 5 == 0:
                print(f"Generated challenge {i}/{len(selected_routes)}")
        
        # --- SEND COMPLETION WEBHOOK ---
        update_status("processing", f"Finalizing {len(challenges_data)} challenges...")
        
        print(f"Sending rf-complete webhook with {len(challenges_data)} challenges")
        
        response = requests.post(
            f"{job_payload['webhook_url']}/rf-complete",
            json={
                "map_id": map_id,
                "map_name": map_name,
                "user_id": job_payload.get("user_id"),
                "challenge_count": len(challenges_data),
                "challenges": challenges_data,
            },
            headers={"Content-Type": "application/json", "X-Webhook-Secret": job_payload["webhook_secret"]}
        )
        print(f"rf-complete webhook response: {response.status_code} - {response.text}")
        
        if response.status_code != 200:
            raise Exception(f"Webhook failed: {response.status_code} - {response.text}")
        
        update_status("completed", f"Done. Generated {len(challenges_data)} Route Finder challenges.")
        print(f"Route Finder processing complete: {len(challenges_data)} challenges generated")
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"Route Finder processing failed: {e}")
        update_status("failed", error=str(e))
        raise


# =============================================================================
# WEB ENDPOINT - SEPARATE FROM ROUTE CHOICE
# =============================================================================

@app.function(image=image)
@modal.fastapi_endpoint(method="POST")
def trigger_route_finder(payload: dict):
    """Trigger Route Finder processing."""
    print(f"Route Finder trigger received for map: {payload.get('map_id')}")
    process_route_finder.spawn(payload)
    return {"status": "accepted", "version": VERSION}
