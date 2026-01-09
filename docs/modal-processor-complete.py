"""
ORIENTEERING ROUTE CHOICE GENERATOR - MODAL.COM VERSION (FIXED PICKLING)
===========================================================================
- Infrastructure: Modal, Cloudflare R2, Webhooks
- Algorithm: Advanced "Matera" Logic
- Fix: Moved multiprocessing functions to global scope to prevent PicklingError
"""

import modal
import math
import numpy as np
import networkx as nx
from concurrent.futures import ProcessPoolExecutor, as_completed

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
    "boto3",
)

# =============================================================================
# GLOBAL HELPER FUNCTIONS (Must be at top level for multiprocessing)
# =============================================================================

def euclid(u, v):
    return math.hypot(u[0]-v[0], u[1]-v[1])

def route_sim(r1, r2):
    s1 = set(r1); s2 = set(r2)
    if len(s1.union(s2)) == 0: return 0
    return len(s1.intersection(s2)) / len(s1.union(s2))

def find_alts(Gs, st, en, mainp, alt_max_alternatives=3):
    alts = []
    try:
        Lm = nx.path_weight(Gs, mainp, weight="weight")
    except Exception:
        return []

    # Sample edges along the path to remove and force alternatives
    # Step size of 5 keeps it reasonably fast
    for i in range(1, len(mainp), 5):
        u = mainp[i-1]; v = mainp[i]
        if not Gs.has_edge(u, v): continue
        ed = Gs[u][v]
        Gs.remove_edge(u, v)
        try:
            a = nx.astar_path(Gs, st, en, heuristic=euclid, weight="weight")
            La = nx.path_weight(Gs, a, weight="weight")
            # Only accept if not drastically longer (1.3x)
            if La <= 1.3 * Lm:
                s = route_sim(a, mainp)
                # Ensure it's sufficiently different
                if s < 0.90:
                    alts.append(a)
                    if len(alts) >= alt_max_alternatives:
                        Gs.add_edge(u, v, **ed)
                        break
        except: pass
        Gs.add_edge(u, v, **ed)
    return alts

def eval_pair(pair, Gs, max_overlap_percent, alt_max_alternatives):
    """
    Evaluates a single pair of points.
    Must accept Gs and config as arguments since it's now global.
    """
    st, en = pair
    try:
        mainp = nx.astar_path(Gs, st, en, heuristic=euclid, weight="weight")
        alts = find_alts(Gs, st, en, mainp, alt_max_alternatives)
        Lm = nx.path_weight(Gs, mainp, weight="weight")
    except: return None
    
    Ls = euclid(st, en)
    if Ls == 0: return None
    ineff = (Lm - Ls) / Ls
    
    valid_alts = []
    alt_sum = 0
    
    for a in alts:
        sim = route_sim(a, mainp)
        if sim > max_overlap_percent: continue 
        
        La = nx.path_weight(Gs, a, weight="weight")
        # Score calculation: Reward routes that are close in length to main route
        # but spatially distinct.
        q = max(0, 1 - ((La - Lm) / Lm)) * (1 - sim) * 20
        alt_sum += q
        valid_alts.append(a)
    
    if not valid_alts: return None 

    hs = ineff + alt_sum
    
    return {
        "snapped_pair": (st, en),
        "main_route_graph": mainp,
        "alt_routes_graph": valid_alts,
        "hardness_score": hs,
        "route_distance": Lm
    }

# =============================================================================
# MAIN PROCESSING FUNCTION
# =============================================================================

@app.function(
    image=image,
    timeout=3600,  # 1 hour timeout
    memory=8192,   # 8GB RAM
    secrets=[
        modal.Secret.from_name("map-processing-secrets"),
        modal.Secret.from_name("r2-credentials"),
    ],
)
def process_map(job_payload: dict):
    """
    Main processing function using the "Matera" algorithm.
    """
    import os
    import csv
    import matplotlib
    matplotlib.use('Agg')
    import matplotlib.pyplot as plt
    from PIL import Image, ImageDraw
    from skimage.morphology import skeletonize
    from skimage.graph import route_through_array
    from matplotlib.path import Path
    from scipy.spatial import KDTree
    from sklearn.cluster import DBSCAN
    import random
    import requests
    import base64
    from matplotlib.patches import Circle
    import boto3
    from botocore.config import Config
    
    # --- SAFETY FOR LARGE TIFF FILES ---
    Image.MAX_IMAGE_PIXELS = None
    
    # =============================================================================
    # 1. INFRASTRUCTURE HELPERS (Download/Upload)
    # =============================================================================
    def download_file(url: str, local_path: str) -> str:
        print(f"Downloading {url[:50]}... to {local_path}")
        response = requests.get(url, stream=True)
        response.raise_for_status()
        os.makedirs(os.path.dirname(local_path), exist_ok=True)
        with open(local_path, 'wb') as f:
            for chunk in response.iter_content(chunk_size=8192):
                f.write(chunk)
        return local_path
    
    def download_from_r2(r2_key: str, local_path: str) -> str:
        account_id = os.environ["R2_ACCOUNT_ID"]
        access_key = os.environ["R2_ACCESS_KEY_ID"]
        secret_key = os.environ["R2_SECRET_ACCESS_KEY"]
        bucket_name = os.environ["R2_BUCKET_NAME"]
        
        print(f"Downloading from R2: {r2_key}")
        s3 = boto3.client(
            's3',
            endpoint_url=f'https://{account_id}.r2.cloudflarestorage.com',
            aws_access_key_id=access_key,
            aws_secret_access_key=secret_key,
            config=Config(signature_version='s3v4'),
        )
        os.makedirs(os.path.dirname(local_path), exist_ok=True)
        s3.download_file(bucket_name, r2_key, local_path)
        return local_path

    def download_and_stitch_tiles(tile_urls: list, grid_config: dict, output_path: str) -> str:
        rows = grid_config["rows"]
        cols = grid_config["cols"]
        tile_w = grid_config["tileWidth"]
        tile_h = grid_config["tileHeight"]
        orig_w = grid_config["originalWidth"]
        orig_h = grid_config["originalHeight"]
        
        print(f"Stitching {len(tile_urls)} tiles...")
        result = Image.new("RGB", (orig_w, orig_h))
        os.makedirs("/tmp/tiles", exist_ok=True)
        
        idx = 0
        for row in range(rows):
            for col in range(cols):
                tile_path = f"/tmp/tiles/tile_{row}_{col}.png"
                download_file(tile_urls[idx], tile_path)
                tile_img = Image.open(tile_path).convert("RGB")
                result.paste(tile_img, (col * tile_w, row * tile_h))
                os.remove(tile_path)
                idx += 1
        
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        result.save(output_path)
        return output_path
    
    def update_status(status: str, message: str = None, error: str = None):
        webhook_url = job_payload["webhook_url"]
        webhook_secret = job_payload["webhook_secret"]
        map_id = job_payload["map_id"]
        
        payload = {"map_id": map_id, "status": status}
        if message: payload["message"] = message
        if error: payload["error"] = error
            
        try:
            requests.post(
                f"{webhook_url}/update-status",
                json=payload,
                headers={"Content-Type": "application/json", "X-Webhook-Secret": webhook_secret}
            )
            print(f"Status updated: {status}")
        except Exception as e:
            print(f"Failed to update status: {e}")
    
    def upload_image(file_path: str, storage_path: str, route_index: int, aspect_ratio: str):
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
            requests.post(
                f"{webhook_url}/upload-image",
                json=payload,
                headers={"Content-Type": "application/json", "X-Webhook-Secret": webhook_secret}
            )
            print(f"Uploaded {storage_path}")
        except Exception as e:
            print(f"Failed to upload {storage_path}: {e}")

    # =============================================================================
    # 2. CONFIGURATION & PARAMETERS
    # =============================================================================
    map_id = job_payload["map_id"]
    map_name = job_payload.get("name", "Map")
    storage_provider = job_payload.get("storage_provider", "supabase")
    params = job_payload.get("processing_parameters", {})

    OUTPUT_NAME = map_name
    
    # Point Generation
    NUM_RANDOM_POINTS = params.get("num_random_points", 1000)
    
    # Candidate Selection
    CANDIDATE_MIN_DIST = params.get("candidate_min_dist", 300)
    CANDIDATE_MAX_DIST = params.get("candidate_max_dist", 1500)
    MAX_CANDIDATE_PAIRS_TO_CALCULATE = 15000 
    
    # Output Goals
    NUM_OUTPUT_ROUTES = params.get("num_output_routes", 50)
    MAX_OVERLAP_PERCENT = params.get("max_overlap_percent", 0.20)
    BATCH_SIZE = params.get("batch_size", 25)
    
    # Visuals
    ZOOM_MARGIN = params.get("zoom_margin", 50)
    MARKER_RADIUS = params.get("marker_radius", 50)
    LINE_WIDTH = params.get("line_width", 8)
    LINE_ALPHA = params.get("line_alpha", 0.6)
    SMOOTHING_WINDOW = 5
    
    # Adaptive Corridor Logic
    CORRIDOR_BASE_WIDTH = params.get("corridor_base_width", 50)
    CORRIDOR_SCALE_FACTOR = params.get("corridor_scale_factor", 0.5)

    update_status("processing", "Starting route generation...")

    try:
        # =============================================================================
        # 3. DOWNLOAD & LOAD DATA
        # =============================================================================
        if storage_provider == "r2":
            color_image_path = download_from_r2(job_payload["r2_color_key"], "/tmp/input/color.tif")
            bw_image_path = download_from_r2(job_payload["r2_bw_key"], "/tmp/input/bw.tif")
        else:
            is_tiled = job_payload.get("is_tiled", False)
            if is_tiled:
                color_image_path = download_and_stitch_tiles(job_payload["color_tile_urls"], job_payload["tile_grid"], "/tmp/input/color.tif")
                bw_image_path = download_and_stitch_tiles(job_payload["bw_tile_urls"], job_payload["tile_grid"], "/tmp/input/bw.tif")
            else:
                color_image_path = download_file(job_payload["color_tif_url"], "/tmp/input/color.tif")
                bw_image_path = download_file(job_payload["bw_tif_url"], "/tmp/input/bw.tif")

        print("Loading images...")
        update_status("processing", "Loading images...")
        try:
            color_image = Image.open(color_image_path).convert("RGB")
            bw_image = Image.open(bw_image_path).convert("L")
            w_full, h_full = color_image.size
        except Exception as e:
            # Fallback for testing/safety
            w_full, h_full = 2000, 2000
            color_image = Image.new('RGB', (w_full, h_full))
            bw_image = Image.new('L', (w_full, h_full))
        
        # Load ROI from JSON
        roi_json = job_payload.get("roi_coordinates", [])
        if roi_json:
            roi_poly = np.array([[pt["x"], pt["y"]] for pt in roi_json])
        else:
            print("WARNING: ROI is empty. Using full map bounds.")
            roi_poly = np.array([[0,0], [w_full,0], [w_full,h_full], [0,h_full]])
            
        print(f"ROI Shape: {roi_poly.shape}")

        # =============================================================================
        # 4. CROP & PREPARE
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

        # =============================================================================
        # 5. GENERATE POINTS & SKELETON
        # =============================================================================
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
                    if len(points) >= count: break
                attempts += batch_size
            return points[:count]

        print("Generating random points...")
        update_status("processing", "Generating points & skeleton...")
        roi_bounds = (roi_left, roi_top, roi_right, roi_bottom)
        generated_points = generate_random_points(roi_path_full, NUM_RANDOM_POINTS, roi_bounds)
        roi_csv_points = [(pt[1]-roi_top, pt[0]-roi_left) for pt in generated_points]

        # Build Skeleton Graph
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

        # Snap & Cluster
        gs_nodes = np.array(list(Gs.nodes()))
        if len(gs_nodes) == 0:
            gs_nodes = np.array([[0,0]])
            Gs.add_node((0,0))
        kd_tree = KDTree(gs_nodes)
        
        def snap_point(pt, Gs, kd):
            nodes_arr = np.array(list(Gs.nodes()))
            dists = np.sum((nodes_arr - np.array(pt))**2, axis=1)
            idxs = np.argsort(dists)
            return tuple(nodes_arr[idxs[0]])

        snapped_pts = [snap_point(pt, Gs, kd_tree) for pt in roi_csv_points]
        if snapped_pts:
            db = DBSCAN(eps=5, min_samples=1).fit(snapped_pts)
            clusters = {}
            for spt, lbl in zip(snapped_pts, db.labels_):
                clusters.setdefault(lbl, []).append(spt)
            cluster_reps = [cluster[0] for cluster in clusters.values()]
        else:
            cluster_reps = []
        unique_points_arr = np.array(cluster_reps)

        # =============================================================================
        # 6. GRAPH EVALUATION (Calls global eval_pair)
        # =============================================================================
        print("Generating pairs...")
        update_status("processing", "Evaluating route candidates...")
        
        tree = KDTree(unique_points_arr)
        candidate_pairs = []
        if len(unique_points_arr) > 0:
            for i, pt in enumerate(unique_points_arr):
                inds = tree.query_ball_point(pt, r=CANDIDATE_MAX_DIST)
                for j in inds:
                    if j <= i: continue
                    pt2 = unique_points_arr[j]
                    if np.linalg.norm(pt - pt2) >= CANDIDATE_MIN_DIST:
                        candidate_pairs.append((tuple(pt), tuple(pt2)))

        if len(candidate_pairs) > MAX_CANDIDATE_PAIRS_TO_CALCULATE:
            candidate_pairs = random.sample(candidate_pairs, MAX_CANDIDATE_PAIRS_TO_CALCULATE)
        
        print(f"Candidates: {len(candidate_pairs)}")

        pair_scores = []
        
        # Parallel Execution
        # Note: We pass Gs and parameters explicitly because eval_pair is now global
        with ProcessPoolExecutor() as ex:
            # We use a constant of 3 for alt_max_alternatives
            futures = [ex.submit(eval_pair, cp, Gs, MAX_OVERLAP_PERCENT, 3) for cp in candidate_pairs]
            
            for fu in as_completed(futures):
                try:
                    res = fu.result()
                    if res: pair_scores.append(res)
                except Exception as e:
                    # Log but continue if individual pairs fail
                    print(f"Pair eval failed: {e}")
        
        print(f"Valid graph candidates: {len(pair_scores)}")

        # =============================================================================
        # 7. PIXEL REFINEMENT & SELECTION
        # =============================================================================
        update_status("processing", "Refining best routes...")
        sorted_graph_candidates = sorted(pair_scores, key=lambda x: x["hardness_score"], reverse=True)
        base_cost_map = np.where(binary_crop > 0, 1, 1000000000)

        def get_pixel_overlap(path_a, path_b):
            set_a = set(map(tuple, path_a))
            set_b = set(map(tuple, path_b))
            intersection = len(set_a.intersection(set_b))
            min_len = min(len(set_a), len(set_b))
            if min_len == 0: return 1.0
            return intersection / min_len

        def smooth_path(path, window_size=SMOOTHING_WINDOW):
            if len(path) < window_size: return path
            path_arr = np.array(path)
            smoothed_path = []
            for i in range(window_size // 2):
                smoothed_path.append(tuple(path_arr[i]))
            for i in range(window_size // 2, len(path) - window_size // 2):
                window = path_arr[i - window_size // 2 : i + window_size // 2 + 1]
                avg_pt = np.mean(window, axis=0)
                smoothed_path.append((int(round(avg_pt[0])), int(round(avg_pt[1]))))
            for i in range(len(path) - window_size // 2, len(path)):
                smoothed_path.append(tuple(path_arr[i]))
            return smoothed_path

        refined_pool = []
        final_list = []
        current_idx = 0
        PASSES = [300, 250, 200, 150, 120, 100, 80, 60, 40, 20]

        while len(final_list) < NUM_OUTPUT_ROUTES and current_idx < len(sorted_graph_candidates):
            batch_raw = sorted_graph_candidates[current_idx : current_idx + BATCH_SIZE]
            current_idx += BATCH_SIZE
            
            for cand in batch_raw:
                if len(cand["alt_routes_graph"]) < 1: continue
                try:
                    st = cand["snapped_pair"][0]
                    en = cand["snapped_pair"][1]
                    
                    # 1. Main Pixel Route
                    ind_m_raw, _ = route_through_array(base_cost_map, st, en, fully_connected=True, geometric=True)
                    
                    # 2. Adaptive Corridor Logic
                    graph_main = cand["main_route_graph"]
                    graph_main_tree = KDTree(graph_main)
                    r_alt_graph = cand["alt_routes_graph"][0] 
                    
                    mask_img = Image.new('L', (w_crop, h_crop), 0)
                    draw = ImageDraw.Draw(mask_img)
                    
                    for pt in r_alt_graph:
                        d, _ = graph_main_tree.query(pt)
                        radius = CORRIDOR_BASE_WIDTH + (d * CORRIDOR_SCALE_FACTOR)
                        x, y = pt[1], pt[0]
                        draw.ellipse([x-radius, y-radius, x+radius, y+radius], fill=255)
                    
                    corridor_mask = np.array(mask_img) > 0
                    cost_map_alt = base_cost_map.copy()
                    cost_map_alt[~corridor_mask] += 50000 
                    cost_map_alt[st] = 1
                    cost_map_alt[en] = 1

                    # 3. Alt Pixel Route
                    ind_a_raw, _ = route_through_array(cost_map_alt, st, en, fully_connected=True, geometric=True)

                    ind_m = smooth_path(ind_m_raw)
                    ind_a = smooth_path(ind_a_raw)
                    
                    ov = get_pixel_overlap(ind_m, ind_a)
                    if ov > MAX_OVERLAP_PERCENT: continue 
                    
                    cand["main_pixel"] = ind_m
                    cand["alt_pixel"] = ind_a
                    cand["overlap"] = ov
                    refined_pool.append(cand)
                    
                except Exception as e:
                    continue

            # Selection Filter
            temp_selected = []
            pool_sorted = sorted(refined_pool, key=lambda x: x["hardness_score"], reverse=True)
            
            for pass_idx, separation_dist in enumerate(PASSES, 1):
                if len(temp_selected) >= NUM_OUTPUT_ROUTES: break
                for c in pool_sorted:
                    if len(temp_selected) >= NUM_OUTPUT_ROUTES: break
                    if c["overlap"] > MAX_OVERLAP_PERCENT: continue
                    if c in temp_selected: continue
                    
                    st_new, en_new = c["snapped_pair"]
                    too_close = False
                    for selected in temp_selected:
                        st_sel, en_sel = selected["snapped_pair"]
                        d_st = math.hypot(st_new[0]-st_sel[0], st_new[1]-st_sel[1])
                        d_en = math.hypot(en_new[0]-en_sel[0], en_new[1]-en_sel[1])
                        d_x1 = math.hypot(st_new[0]-en_sel[0], st_new[1]-en_sel[1])
                        d_x2 = math.hypot(en_new[0]-st_sel[0], en_new[1]-st_sel[1])
                        if (d_st < separation_dist and d_en < separation_dist) or \
                           (d_x1 < separation_dist and d_x2 < separation_dist):
                            too_close = True; break
                    
                    if not too_close:
                        c["selection_pass"] = pass_idx
                        temp_selected.append(c)

            final_list = temp_selected
            if len(final_list) >= NUM_OUTPUT_ROUTES: break

        print(f"Final selected routes: {len(final_list)}")

        # =============================================================================
        # 8. EXPORT & UPLOAD
        # =============================================================================
        update_status("processing", "Generating and uploading images...")
        
        # Temp directories
        os.makedirs("/tmp/16_9", exist_ok=True)
        os.makedirs("/tmp/9_16", exist_ok=True)
        
        def adjust_bbox(min_c, min_r, max_c, max_r, ratio, w, h):
            bw = max_c - min_c; bh = max_r - min_r
            curr_r = bw / bh if bh else ratio
            cent_c = (min_c + max_c) / 2; cent_r = (min_r + max_r) / 2
            
            if curr_r < ratio:
                nw = bh * ratio; nh = bh
            else:
                nw = bw; nh = bw / ratio
                
            nc_min = int(max(cent_c - nw/2, 0)); nc_max = int(min(cent_c + nw/2, w))
            nr_min = int(max(cent_r - nh/2, 0)); nr_max = int(min(cent_r + nh/2, h))
            return nc_min, nr_min, nc_max, nr_max

        csv_data = []
        # Header for CSV
        csv_data.append(["ID", "Main_Side", "Main_Len", "Alt_Len", "Overlap_Pct", "Hardness", "Pass_Num"])

        for i, cand in enumerate(final_list, 1):
            mp = cand["main_pixel"]
            ap = cand["alt_pixel"]
            
            base = color_crop.copy()
            
            all_pts = mp + ap
            rs = [p[0] for p in all_pts]; cs = [p[1] for p in all_pts]
            rmin, rmax = min(rs), max(rs); cmin, cmax = min(cs), max(cs)
            
            rmin = max(0, rmin - ZOOM_MARGIN); rmax = min(h_crop, rmax + ZOOM_MARGIN)
            cmin = max(0, cmin - ZOOM_MARGIN); cmax = min(w_crop, cmax + ZOOM_MARGIN)
            
            b169 = adjust_bbox(cmin, rmin, cmax, rmax, 16/9, w_crop, h_crop)
            b916 = adjust_bbox(cmin, rmin, cmax, rmax, 9/16, w_crop, h_crop)
            
            img169 = base.crop(b169)
            img916 = base.crop(b916)
            
            avg_x_m = np.mean([p[1] for p in mp])
            avg_x_a = np.mean([p[1] for p in ap])
            
            if avg_x_m < avg_x_a:
                side = "Left"; col_m = "red"; col_a = "blue"
            else:
                side = "Right"; col_m = "blue"; col_a = "red"

            def plot_save_upload(img, bbox, folder_name, aspect_ratio_str):
                fig, ax = plt.subplots(figsize=((bbox[2]-bbox[0])/100, (bbox[3]-bbox[1])/100), dpi=100)
                ax.imshow(img)
                
                def off(pt): return (pt[1]-bbox[0], pt[0]-bbox[1])
                
                xm = [off(p)[0] for p in mp]; ym = [off(p)[1] for p in mp]
                xa = [off(p)[0] for p in ap]; ya = [off(p)[1] for p in ap]
                
                ax.plot(xm, ym, color=col_m, lw=LINE_WIDTH, alpha=LINE_ALPHA)
                ax.plot(xa, ya, color=col_a, lw=LINE_WIDTH, alpha=LINE_ALPHA)
                
                s = off(cand["snapped_pair"][0]); e = off(cand["snapped_pair"][1])
                ax.add_patch(Circle(s, MARKER_RADIUS, ec="magenta", fc="none", lw=4))
                ax.add_patch(Circle(e, MARKER_RADIUS, ec="magenta", fc="none", lw=4))
                
                ax.axis("off")
                
                filename = f"candidate_{i}.webp"
                local_path = f"/tmp/{folder_name}/{filename}"
                
                plt.tight_layout(pad=0)
                plt.savefig(local_path, dpi=100, bbox_inches='tight', pad_inches=0, format='webp')
                plt.close(fig)
                
                # UPLOAD TO WEBHOOK
                storage_path = f"{map_id}/{folder_name}/{filename}"
                upload_image(local_path, storage_path, i, aspect_ratio_str)

            # Generate and Upload 16:9
            plot_save_upload(img169, b169, "16_9", "16:9")
            
            # Generate and Upload 9:16
            plot_save_upload(img916, b916, "9_16", "9:16")

            # CSV Data
            def plen(pth):
                return sum(math.hypot(pth[k][0]-pth[k+1][0], pth[k][1]-pth[k+1][1]) for k in range(len(pth)-1))
            
            lm = plen(mp); la = plen(ap)
            csv_data.append([
                i, side, f"{lm:.1f}", f"{la:.1f}", 
                f"{cand['overlap']:.2f}", 
                f"{cand['hardness_score']:.2f}", 
                cand['selection_pass']
            ])

        # Build route records for the complete webhook
        csv_records = []
        for row in csv_data[1:]:  # Skip header row
            csv_records.append({
                "id": row[0],
                "main_side": row[1],
                "main_length": float(row[2]),
                "alt_length": float(row[3]),
                "overlap": float(row[4]),
                "hardness": float(row[5]),
            })

        webhook_url = job_payload["webhook_url"]
        webhook_secret = job_payload["webhook_secret"]

        # Call the /complete endpoint to create route_maps and route_images entries
        complete_response = requests.post(
            f"{webhook_url}/complete",
            json={
                "map_id": map_id,
                "route_count": len(final_list),
                "csv_data": csv_records,
            },
            headers={"Content-Type": "application/json", "X-Webhook-Secret": webhook_secret}
        )

        if complete_response.status_code != 200:
            print(f"Warning: Complete webhook returned {complete_response.status_code}: {complete_response.text}")
        else:
            print(f"Complete webhook succeeded - created route_maps and route_images entries")

        print(f"Processing complete! Generated {len(final_list)} routes")
        return {"success": True, "routes_count": len(final_list), "map_id": map_id}

    except Exception as e:
        import traceback
        error_msg = f"{str(e)}\n{traceback.format_exc()}"
        print(f"Processing failed: {error_msg}")
        update_status("failed", error=str(e))
        return {"success": False, "error": str(e)}

# =============================================================================
# FASTAPI ENDPOINT
# =============================================================================
@app.function(image=image)
@modal.fastapi_endpoint(method="POST")
def trigger(payload: dict):
    print(f"Received job for map: {payload.get('map_id')}")
    process_map.spawn(payload)
    return {"status": "accepted", "map_id": payload.get("map_id")}
