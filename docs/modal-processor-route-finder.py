"""
ROUTE FINDER CHALLENGE GENERATOR - MODAL VERSION
===========================================================================
- Generates skeleton graphs for Route Finder gamemode
- Creates base images (map + start/finish markers only)
- Creates answer images (map + optimal route overlay)
- Exports simplified graph JSON for client-side pathfinding
- Uses binary scoring: user's snapped path must match optimal path
"""

import modal
import math
import numpy as np
import networkx as nx
import json
from concurrent.futures import ProcessPoolExecutor, as_completed

# =============================================================================
# MODAL APP CONFIGURATION
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


def simplify_graph_for_challenge(full_graph, optimal_path, corridor_radius=300):
    """
    Simplify graph to only include nodes within corridor of optimal path.
    This reduces graph size for efficient client-side pathfinding.
    
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
    
    # Build nodes JSON
    nodes_json = [
        {"id": node_id_map[node], "x": int(node[1]), "y": int(node[0])}  # Note: (row, col) -> (y, x)
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
    from matplotlib.patches import Circle, FancyBboxPatch
    import boto3
    from botocore.config import Config
    
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
        """Upload Route Finder image (base or answer)."""
        with open(file_path, "rb") as f:
            image_data = base64.b64encode(f.read()).decode("utf-8")
        requests.post(
            f"{job_payload['webhook_url']}/rf-upload-image",
            json={
                "map_id": job_payload["map_id"],
                "image_data": image_data,
                "storage_path": storage_path,
                "challenge_index": challenge_index,
                "image_type": image_type,  # 'base' or 'answer'
                "aspect_ratio": aspect_ratio,
                "content_type": "image/webp",
            },
            headers={"Content-Type": "application/json", "X-Webhook-Secret": job_payload["webhook_secret"]}
        )

    # --- CONFIGURATION ---
    map_id = job_payload["map_id"]
    map_name = job_payload.get("map_name", "Unknown Map")
    params = job_payload.get("processing_parameters", {})
    
    # Route Finder specific parameters
    MIN_ROUTE_LENGTH = params.get("min_route_length", 800)
    MAX_ROUTE_LENGTH = params.get("max_route_length", 2500)
    NUM_CHALLENGES = params.get("num_challenges", 20)
    GRAPH_SIMPLIFICATION_RADIUS = params.get("graph_simplification_radius", 300)
    
    NUM_RANDOM_POINTS = params.get("num_random_points", 1500)
    ZOOM_MARGIN = params.get("zoom_margin", 80)
    MARKER_RADIUS = params.get("marker_radius", 40)
    LINE_WIDTH = 8
    
    update_status("processing", f"Starting Route Finder generation. Target: {NUM_CHALLENGES} challenges.")

    try:
        # --- LOAD DATA ---
        if job_payload.get("storage_provider") == "r2":
            color_path = download_from_r2(job_payload["r2_color_key"], "/tmp/color.tif")
            bw_path = download_from_r2(job_payload["r2_bw_key"], "/tmp/bw.tif")
        else:
            color_path = download_file(job_payload["color_tif_url"], "/tmp/color.tif")
            bw_path = download_file(job_payload["bw_tif_url"], "/tmp/bw.tif")

        color_image = Image.open(color_path).convert("RGB")
        bw_image = Image.open(bw_path).convert("L")
        
        # --- APPLY IMPASSABLE ANNOTATIONS ---
        impassable = job_payload.get("impassable_annotations")
        if impassable:
            from PIL import ImageDraw
            
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

        # Snap random points to graph
        gs_nodes = np.array(list(Gs.nodes()))
        if len(gs_nodes) == 0: raise Exception("No navigable terrain found.")
        tree = KDTree(gs_nodes)
        snapped_pts = [tuple(gs_nodes[tree.query(p)[1]]) for p in roi_csv_points]
        
        # Cluster to reduce duplicates
        db = DBSCAN(eps=5, min_samples=1).fit(snapped_pts)
        unique_pts = []
        labels = set(db.labels_)
        for l in labels:
            cluster = [snapped_pts[i] for i in range(len(snapped_pts)) if db.labels_[i] == l]
            unique_pts.append(cluster[0])
            
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
        
        if len(pairs) > 10000: pairs = random.sample(pairs, 10000)
        print(f"Found {len(pairs)} candidate pairs")
        
        # --- EVALUATE PAIRS ---
        update_status("processing", f"Evaluating {len(pairs)} pairs...")
        
        def eval_route_pair(pair):
            st, en = pair
            try:
                path = nx.astar_path(Gs, st, en, heuristic=euclid, weight="weight")
                path_length = nx.path_weight(Gs, path, weight="weight")
                
                if path_length < MIN_ROUTE_LENGTH or path_length > MAX_ROUTE_LENGTH:
                    return None
                    
                return {
                    "start": st,
                    "end": en,
                    "path": path,
                    "length": path_length,
                }
            except nx.NetworkXNoPath:
                return None
        
        valid_routes = []
        with ProcessPoolExecutor() as ex:
            futures = [ex.submit(eval_route_pair, p) for p in pairs]
            for f in as_completed(futures):
                res = f.result()
                if res: valid_routes.append(res)
        
        print(f"Valid routes found: {len(valid_routes)}")
        
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
        
        # --- GENERATE IMAGES AND GRAPH DATA ---
        update_status("processing", f"Generating {len(selected_routes)} challenge images...")
        
        os.makedirs("/tmp/rf_16_9", exist_ok=True)
        os.makedirs("/tmp/rf_9_16", exist_ok=True)
        
        challenges_data = []
        
        def adjust_bbox(min_c, min_r, max_c, max_r, ratio, w, h):
            bw = max_c - min_c; bh = max_r - min_r
            curr_r = bw / bh if bh else ratio
            cent_c = (min_c + max_c) / 2; cent_r = (min_r + max_r) / 2
            
            if curr_r < ratio:
                nw = bh * ratio; nh = bh
            else:
                nw = bw; nh = bw / ratio
            return (int(max(cent_c-nw/2,0)), int(max(cent_r-nh/2,0)), 
                    int(min(cent_c+nw/2,w)), int(min(cent_r+nh/2,h)))

        for i, route in enumerate(selected_routes, 1):
            st = route["start"]
            en = route["end"]
            path = route["path"]
            path_length = route["length"]
            
            # Calculate bounding box
            all_pts = path
            rs = [p[0] for p in all_pts]; cs = [p[1] for p in all_pts]
            rmin, rmax = max(0, min(rs)-ZOOM_MARGIN), min(h_crop, max(rs)+ZOOM_MARGIN)
            cmin, cmax = max(0, min(cs)-ZOOM_MARGIN), min(w_crop, max(cs)+ZOOM_MARGIN)
            
            b169 = adjust_bbox(cmin, rmin, cmax, rmax, 16/9, w_crop, h_crop)
            b916 = adjust_bbox(cmin, rmin, cmax, rmax, 9/16, w_crop, h_crop)
            
            # Simplify graph for this challenge
            nodes_json, edges_json, node_id_map = simplify_graph_for_challenge(
                Gs, path, GRAPH_SIMPLIFICATION_RADIUS
            )
            
            # Map path to node IDs
            optimal_path_ids = [node_id_map[tuple(p)] for p in path]
            start_node_id = node_id_map[st]
            finish_node_id = node_id_map[en]
            
            def generate_challenge_images(bbox, folder, ratio_str):
                base = color_crop.copy()
                
                def off(pt): return (pt[1]-bbox[0], pt[0]-bbox[1])
                
                # --- BASE IMAGE (clean map + start/finish only) ---
                fig, ax = plt.subplots(figsize=((bbox[2]-bbox[0])/100, (bbox[3]-bbox[1])/100), dpi=100)
                ax.imshow(base.crop(bbox))
                
                s = off(st); e = off(en)
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
                
                return f"{map_id}/route_finder/{folder}/challenge_{i}_base.webp", f"{map_id}/route_finder/{folder}/challenge_{i}_answer.webp"
            
            base_16_9, answer_16_9 = generate_challenge_images(b169, "16_9", "16:9")
            base_9_16, answer_9_16 = generate_challenge_images(b916, "9_16", "9:16")
            
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
                "base_image_path_16_9": base_16_9,
                "answer_image_path_16_9": answer_16_9,
                "base_image_path_9_16": base_9_16,
                "answer_image_path_9_16": answer_9_16,
            })
        
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
        
        update_status("completed", f"Done. Generated {len(challenges_data)} Route Finder challenges.")
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        update_status("failed", error=str(e))


@app.function(image=image)
@modal.fastapi_endpoint(method="POST")
def trigger_route_finder(payload: dict):
    """Trigger Route Finder processing."""
    process_route_finder.spawn(payload)
    return {"status": "accepted"}
