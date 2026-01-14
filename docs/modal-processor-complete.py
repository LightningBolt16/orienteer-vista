"""
ORIENTEERING ROUTE CHOICE GENERATOR - MODAL VERSION (RANDOMIZED COLORS)
===========================================================================
- Infrastructure: Modal, Cloudflare R2, Webhooks
- Logic: "Smart Divergence" with Strict Count
- Visuals: Routes are RANDOMLY shuffled. The correct route is not always Red.
- Output: Sends 'main_route_index' to identifying the correct color/length.
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

DEFAULT_OVERLAP_TIERS = [0.30, 0.70, 0.85, 0.90]
DEFAULT_MIN_SEPARATION = 60
DEFAULT_MAX_LEN_RATIO = 1.25

def euclid(u, v):
    return math.hypot(u[0]-v[0], u[1]-v[1])

def route_sim(r1, r2):
    s1 = set(r1); s2 = set(r2)
    if len(s1.union(s2)) == 0: return 0
    return len(s1.intersection(s2)) / len(s1.union(s2))

def get_max_separation(path_a, path_b):
    from scipy.spatial import KDTree
    tree_b = KDTree(path_b)
    dists, _ = tree_b.query(path_a)
    return np.max(dists)

def find_alts_smart(original_G, st, en, mainp, requested_alts, overlap_tiers, min_sep, max_len_ratio):
    alts = []
    local_weights = {}
    
    def get_w(u, v):
        if (u,v) in local_weights: return local_weights[(u,v)]
        if (v,u) in local_weights: return local_weights[(v,u)]
        return original_G[u][v]['weight']

    def heuristic(u, v): return euclid(u, v)
    
    def get_path():
        return nx.astar_path(original_G, st, en, heuristic=heuristic, 
                             weight=lambda u, v, d: get_w(u,v))

    try:
        Lm = nx.path_weight(original_G, mainp, weight="weight")
    except:
        return []

    PENALTY_FACTOR = 4.0
    current_pool = [mainp]
    
    for k in range(requested_alts):
        tier_idx = min(k, len(overlap_tiers) - 1)
        allowed_overlap = overlap_tiers[tier_idx]
        
        last_path = current_pool[-1]
        for i in range(len(last_path)-1):
            u, v = last_path[i], last_path[i+1]
            old_w = get_w(u, v)
            new_w = old_w * PENALTY_FACTOR
            local_weights[(u,v)] = new_w
            local_weights[(v,u)] = new_w
            
        try:
            new_p = get_path()
            
            # Check Similarity
            is_distinct = True
            for existing in current_pool:
                if route_sim(new_p, existing) > allowed_overlap:
                    is_distinct = False
                    break
            if not is_distinct: continue
            
            # Check Length
            real_len = sum(original_G[u][v]['weight'] for u, v in zip(new_p[:-1], new_p[1:]))
            if real_len > max_len_ratio * Lm: continue
            
            # Check Physical Separation
            is_separated = True
            for existing in current_pool:
                sep = get_max_separation(new_p, existing)
                if sep < min_sep:
                    is_separated = False
                    break
            if not is_separated: continue
            
            alts.append(new_p)
            current_pool.append(new_p)
                
        except nx.NetworkXNoPath:
            break
            
    return alts

def eval_pair(pair, Gs, num_alts_needed, overlap_tiers, min_sep, max_len_ratio):
    st, en = pair
    try:
        mainp = nx.astar_path(Gs, st, en, heuristic=euclid, weight="weight")
        alts = find_alts_smart(Gs, st, en, mainp, num_alts_needed, overlap_tiers, min_sep, max_len_ratio)
        Lm = nx.path_weight(Gs, mainp, weight="weight")
    except: return None
    
    if len(alts) != num_alts_needed:
        return None
    
    best_alt = alts[0]
    sim = route_sim(best_alt, mainp)
    hs = (1 - sim) * 10
    
    return {
        "snapped_pair": (st, en),
        "main_route_graph": mainp,
        "alt_routes_graph": alts, 
        "hardness_score": hs,
        "route_distance": Lm
    }

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
def process_map(job_payload: dict):
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
    
    def download_and_stitch_tiles(tile_urls: list, grid_config: dict, output_path: str) -> str:
        rows = grid_config["rows"]
        cols = grid_config["cols"]
        tile_w = grid_config["tileWidth"]
        tile_h = grid_config["tileHeight"]
        orig_w = grid_config["originalWidth"]
        orig_h = grid_config["originalHeight"]
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
    
    def upload_image(file_path: str, storage_path: str, route_index: int, aspect_ratio: str):
        with open(file_path, "rb") as f:
            image_data = base64.b64encode(f.read()).decode("utf-8")
        requests.post(
            f"{job_payload['webhook_url']}/upload-image",
            json={
                "map_id": job_payload["map_id"],
                "image_data": image_data,
                "storage_path": storage_path,
                "route_index": route_index,
                "aspect_ratio": aspect_ratio,
                "content_type": "image/webp",
            },
            headers={"Content-Type": "application/json", "X-Webhook-Secret": job_payload["webhook_secret"]}
        )

    # --- CONFIGURATION ---
    map_id = job_payload["map_id"]
    params = job_payload.get("processing_parameters", {})
    
    NUM_ALTS_PER_CANDIDATE = params.get("num_alternate_routes", 3)
    
    OVERLAP_TIERS = params.get("overlap_tiers", DEFAULT_OVERLAP_TIERS)
    MIN_SEPARATION_DIST = params.get("min_separation", DEFAULT_MIN_SEPARATION)
    MAX_LENGTH_RATIO = params.get("max_length_ratio", DEFAULT_MAX_LEN_RATIO)
    
    NUM_RANDOM_POINTS = params.get("num_random_points", 1000)
    CANDIDATE_MIN_DIST = params.get("candidate_min_dist", 300)
    CANDIDATE_MAX_DIST = params.get("candidate_max_dist", 1500)
    NUM_OUTPUT_ROUTES = params.get("num_output_routes", 50)
    BATCH_SIZE = 25

    ZOOM_MARGIN = params.get("zoom_margin", 50)
    MARKER_RADIUS = params.get("marker_radius", 50)
    LINE_WIDTH = 6
    LINE_ALPHA = 0.7
    CORRIDOR_BASE_WIDTH = 50    
    CORRIDOR_SCALE_FACTOR = 0.5 

    update_status("processing", f"Starting generation. Target: {NUM_ALTS_PER_CANDIDATE} alts per candidate.")

    try:
        # --- LOAD DATA ---
        if job_payload.get("storage_provider") == "r2":
            color_path = download_from_r2(job_payload["r2_color_key"], "/tmp/color.tif")
            bw_path = download_from_r2(job_payload["r2_bw_key"], "/tmp/bw.tif")
        else:
            if job_payload.get("is_tiled", False):
                color_path = download_and_stitch_tiles(job_payload["color_tile_urls"], job_payload["tile_grid"], "/tmp/color.tif")
                bw_path = download_and_stitch_tiles(job_payload["bw_tile_urls"], job_payload["tile_grid"], "/tmp/bw.tif")
            else:
                color_path = download_file(job_payload["color_tif_url"], "/tmp/color.tif")
                bw_path = download_file(job_payload["bw_tif_url"], "/tmp/bw.tif")

        color_image = Image.open(color_path).convert("RGB")
        bw_image = Image.open(bw_path).convert("L")
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
        
        # Simplify
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

        # Snap
        gs_nodes = np.array(list(Gs.nodes()))
        if len(gs_nodes) == 0: raise Exception("No navigable terrain found.")
        tree = KDTree(gs_nodes)
        snapped_pts = [tuple(gs_nodes[tree.query(p)[1]]) for p in roi_csv_points]
        
        # Cluster
        db = DBSCAN(eps=5, min_samples=1).fit(snapped_pts)
        unique_pts = []
        labels = set(db.labels_)
        for l in labels:
            cluster = [snapped_pts[i] for i in range(len(snapped_pts)) if db.labels_[i] == l]
            unique_pts.append(cluster[0])
            
        # Candidates
        cand_tree = KDTree(unique_pts)
        pairs = []
        for i, p1 in enumerate(unique_pts):
            idxs = cand_tree.query_ball_point(p1, CANDIDATE_MAX_DIST)
            for j in idxs:
                if j <= i: continue
                p2 = unique_pts[j]
                if np.linalg.norm(np.array(p1)-np.array(p2)) >= CANDIDATE_MIN_DIST:
                    pairs.append((p1, p2))
        
        if len(pairs) > 20000: pairs = random.sample(pairs, 20000)
        
        # --- PARALLEL SCORING ---
        update_status("processing", f"Scoring {len(pairs)} pairs (Smart Divergence)...")
        scored = []
        with ProcessPoolExecutor() as ex:
            futures = [ex.submit(eval_pair, p, Gs, NUM_ALTS_PER_CANDIDATE, OVERLAP_TIERS, MIN_SEPARATION_DIST, MAX_LENGTH_RATIO) for p in pairs]
            for f in as_completed(futures):
                res = f.result()
                if res: scored.append(res)
                
        scored.sort(key=lambda x: x["hardness_score"], reverse=True)
        print(f"Valid Candidates Found: {len(scored)}")

        # --- PIXEL REFINEMENT & SELECTION ---
        update_status("processing", "Refining pixel paths...")
        
        refined_pool = []
        base_cost_map = np.where(binary_crop > 0, 1, 1000000000)
        
        def smooth(pth):
            if len(pth) < 5: return pth
            arr = np.array(pth)
            res = []
            for i in range(2, len(arr)-2):
                res.append(tuple(map(int, np.mean(arr[i-2:i+3], axis=0))))
            return [tuple(arr[0])] + res + [tuple(arr[-1])]

        def get_pixel_overlap(path_a, path_b):
            set_a = set(map(tuple, path_a))
            set_b = set(map(tuple, path_b))
            intersection = len(set_a.intersection(set_b))
            min_len = min(len(set_a), len(set_b))
            if min_len == 0: return 1.0
            return intersection / min_len

        # BATCHED REFINEMENT
        current_idx = 0
        final_list = []
        PASSES = [300, 250, 200, 150, 120, 100, 80, 60, 40, 20]
        
        while len(final_list) < NUM_OUTPUT_ROUTES and current_idx < len(scored):
            batch_raw = scored[current_idx : current_idx + BATCH_SIZE]
            current_idx += BATCH_SIZE
            
            for cand in batch_raw:
                if len(cand["alt_routes_graph"]) != NUM_ALTS_PER_CANDIDATE:
                    continue
                
                try:
                    st, en = cand["snapped_pair"]
                    
                    ind_m_raw, _ = route_through_array(base_cost_map, st, en, fully_connected=True, geometric=True)
                    ind_m = smooth(ind_m_raw)
                    cand["main_pixel"] = ind_m
                    
                    valid_pixel_alts = []
                    
                    for i, r_alt_graph in enumerate(cand["alt_routes_graph"]):
                        tier_idx = min(i, len(OVERLAP_TIERS) - 1)
                        pixel_overlap_limit = OVERLAP_TIERS[tier_idx] + 0.05
                        
                        graph_main = cand["main_route_graph"]
                        graph_main_tree = KDTree(graph_main)
                        
                        mask_img = Image.new('L', (w_crop, h_crop), 0)
                        draw = ImageDraw.Draw(mask_img)
                        
                        for pt in r_alt_graph:
                            d, _ = graph_main_tree.query(pt)
                            radius = CORRIDOR_BASE_WIDTH + (d * CORRIDOR_SCALE_FACTOR)
                            draw.ellipse([pt[1]-radius, pt[0]-radius, pt[1]+radius, pt[0]+radius], fill=255)
                        
                        corridor_mask = np.array(mask_img) > 0
                        cost_map_alt = base_cost_map.copy()
                        cost_map_alt[~corridor_mask] += 50000 
                        cost_map_alt[st] = 1; cost_map_alt[en] = 1

                        ind_a_raw, _ = route_through_array(cost_map_alt, st, en, fully_connected=True, geometric=True)
                        ind_a = smooth(ind_a_raw)
                        
                        ov = get_pixel_overlap(ind_m, ind_a)
                        if ov > pixel_overlap_limit: continue
                        
                        is_unique_pixel = True
                        for existing in valid_pixel_alts:
                            if get_pixel_overlap(ind_a, existing) > pixel_overlap_limit:
                                is_unique_pixel = False; break
                        
                        if is_unique_pixel:
                            valid_pixel_alts.append(ind_a)
                            
                    if len(valid_pixel_alts) == NUM_ALTS_PER_CANDIDATE:
                        cand["alt_pixels"] = valid_pixel_alts
                        cand["overlap"] = get_pixel_overlap(ind_m, valid_pixel_alts[0])
                        refined_pool.append(cand)
                
                except Exception:
                    continue

            # Selection Filter
            temp_selected = []
            pool_sorted = sorted(refined_pool, key=lambda x: x["hardness_score"], reverse=True)
            
            for min_sep in PASSES:
                if len(temp_selected) >= NUM_OUTPUT_ROUTES: break
                for c in pool_sorted:
                    if len(temp_selected) >= NUM_OUTPUT_ROUTES: break
                    if c in temp_selected: continue
                    
                    st, en = c["snapped_pair"]
                    too_close = False
                    for sel in temp_selected:
                        sst, sen = sel["snapped_pair"]
                        if math.hypot(st[0]-sst[0], st[1]-sst[1]) < min_sep: too_close = True
                        if math.hypot(en[0]-sen[0], en[1]-sen[1]) < min_sep: too_close = True
                    if not too_close:
                        temp_selected.append(c)
            
            final_list = temp_selected
            if len(final_list) >= NUM_OUTPUT_ROUTES: break

        # --- EXPORT & UPLOAD ---
        update_status("processing", f"Uploading {len(final_list)} candidates (ALL VIEW)...")
        
        csv_rows = []
        # Distinct palette
        COLORS = ['#E41A1C', '#377EB8', '#4DAF4A', '#984EA3', '#FF7F00'] 
        
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
            return (int(max(cent_c-nw/2,0)), int(max(cent_r-nh/2,0)), 
                    int(min(cent_c+nw/2,w)), int(min(cent_r+nh/2,h)))

        for i, cand in enumerate(final_list, 1):
            mp = cand["main_pixel"]
            alt_pixels = cand["alt_pixels"]
            
            # Combine all routes
            all_routes = [{"path": mp, "type": "main"}]
            for ap in alt_pixels:
                all_routes.append({"path": ap, "type": "alt"})
            
            # SHUFFLE ROUTES RANDOMLY
            # This ensures "Main" can be any color
            random.shuffle(all_routes)
            
            # Assign colors based on new shuffled index
            for idx, r in enumerate(all_routes):
                r["color"] = COLORS[idx % len(COLORS)]
                
            # Find which index (0-based) is the Main route for CSV data
            main_route_idx = next(idx for idx, r in enumerate(all_routes) if r["type"] == "main")
            
            # Prepare Image Base
            base = color_crop.copy()
            all_pts = []
            for r in all_routes: all_pts.extend(r["path"])
            
            rs = [p[0] for p in all_pts]; cs = [p[1] for p in all_pts]
            rmin, rmax = max(0, min(rs)-ZOOM_MARGIN), min(h_crop, max(rs)+ZOOM_MARGIN)
            cmin, cmax = max(0, min(cs)-ZOOM_MARGIN), min(w_crop, max(cs)+ZOOM_MARGIN)
            
            b169 = adjust_bbox(cmin, rmin, cmax, rmax, 16/9, w_crop, h_crop)
            b916 = adjust_bbox(cmin, rmin, cmax, rmax, 9/16, w_crop, h_crop)
            
            def generate_upload(bbox, folder, ratio_str):
                fig, ax = plt.subplots(figsize=((bbox[2]-bbox[0])/100, (bbox[3]-bbox[1])/100), dpi=100)
                ax.imshow(base.crop(bbox))
                
                def off(pt): return (pt[1]-bbox[0], pt[0]-bbox[1])
                
                # Draw all routes in shuffled order
                for r in all_routes:
                    path = r["path"]
                    col = r["color"]
                    x = [off(p)[0] for p in path]
                    y = [off(p)[1] for p in path]
                    # Z-order: maybe draw main last? Or random is fine.
                    # Random order is fine for obfuscation.
                    ax.plot(x, y, color=col, lw=LINE_WIDTH, alpha=LINE_ALPHA)
                
                s = off(cand["snapped_pair"][0]); e = off(cand["snapped_pair"][1])
                ax.add_patch(Circle(s, MARKER_RADIUS, ec="magenta", fc="none", lw=4))
                ax.add_patch(Circle(e, MARKER_RADIUS, ec="magenta", fc="none", lw=4))
                ax.axis("off")
                
                local_path = f"/tmp/{folder}/c_{i}_ALL.webp"
                plt.tight_layout(pad=0)
                plt.savefig(local_path, dpi=100, bbox_inches='tight', pad_inches=0, format='webp')
                plt.close(fig)
                
                upload_image(local_path, f"{map_id}/{folder}/candidate_{i}_ALL.webp", i, ratio_str)

            generate_upload(b169, "16_9", "16:9")
            generate_upload(b916, "9_16", "9:16")
            
            # Calculate Lengths (in shuffled order)
            sorted_lengths = []
            colors_list = []
            def plen(pth): return sum(math.hypot(pth[k][0]-pth[k+1][0], pth[k][1]-pth[k+1][1]) for k in range(len(pth)-1))
            
            for r in all_routes:
                sorted_lengths.append(round(plen(r["path"]), 1))
                colors_list.append(r["color"])
            
            csv_rows.append({
                "id": i,
                "lengths": sorted_lengths,
                "colors": colors_list,
                "main_route_index": main_route_idx, # Vital for frontend validation
                "hardness": float(f"{cand['hardness_score']:.2f}")
            })
            
        requests.post(
            f"{job_payload['webhook_url']}/complete",
            json={"map_id": map_id, "route_count": len(final_list), "csv_data": csv_rows},
            headers={"Content-Type": "application/json", "X-Webhook-Secret": job_payload["webhook_secret"]}
        )
        
        update_status("completed", f"Done. Generated {len(final_list)} candidates.")
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        update_status("failed", error=str(e))

@app.function(image=image)
@modal.fastapi_endpoint(method="POST")
def trigger(payload: dict):
    process_map.spawn(payload)
    return {"status": "accepted"}