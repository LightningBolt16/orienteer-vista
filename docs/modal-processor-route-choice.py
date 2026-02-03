"""
ORIENTEERING ROUTE CHOICE GENERATOR - MODAL VERSION (RANDOMIZED COLORS)
===========================================================================
- Infrastructure: Modal, Cloudflare R2, Webhooks
- Logic: "Smart Divergence" with Strict Count
- Visuals: Routes are RANDOMLY shuffled. The correct route is not always Red.
- Output: Sends 'main_route_index' to identifying the correct color/length.

This is the ROUTE CHOICE ONLY script - does NOT include Route Finder processing.
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
# MAIN ROUTE CHOICE PROCESSING FUNCTION
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
    import boto3
    from botocore.config import Config
    from matplotlib.patches import Polygon as MplPolygon, Circle, FancyBboxPatch
    
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
    
    def download_and_stitch_tiles(tile_urls: list, tile_grid: dict, local_path: str) -> str:
        from PIL import Image as PILImage
        
        rows = tile_grid["rows"]
        cols = tile_grid["cols"]
        tile_width = tile_grid["tileWidth"]
        tile_height = tile_grid["tileHeight"]
        
        full_width = cols * tile_width
        full_height = rows * tile_height
        full_image = PILImage.new("RGB", (full_width, full_height))
        
        for idx, url in enumerate(tile_urls):
            row = idx // cols
            col = idx % cols
            tile_path = f"/tmp/tile_{row}_{col}.png"
            download_file(url, tile_path)
            tile_img = PILImage.open(tile_path)
            x = col * tile_width
            y = row * tile_height
            full_image.paste(tile_img, (x, y))
        
        os.makedirs(os.path.dirname(local_path), exist_ok=True)
        full_image.save(local_path)
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
        
        # --- APPLY IMPASSABLE ANNOTATIONS ---
        impassable = job_payload.get("impassable_annotations")
        if impassable:
            areas = impassable.get("areas", [])
            lines = impassable.get("lines", [])
            print(f"Applying {len(areas)} impassable areas and {len(lines)} lines...")
            
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

        # --- CANDIDATE PAIR GENERATION ---
        update_status("processing", "Finding route pairs...")
        
        cand_tree = KDTree(unique_pts)
        pairs = []
        for i, p1 in enumerate(unique_pts):
            idxs = cand_tree.query_ball_point(p1, CANDIDATE_MAX_DIST)
            for j in idxs:
                if j <= i: continue
                p2 = unique_pts[j]
                straight_dist = np.linalg.norm(np.array(p1)-np.array(p2))
                if straight_dist >= CANDIDATE_MIN_DIST:
                    pairs.append((p1, p2))
        
        if len(pairs) > 5000: pairs = random.sample(pairs, 5000)
        print(f"Candidate pairs: {len(pairs)}")

        # --- EVALUATE PAIRS (Parallel) ---
        update_status("processing", "Evaluating route alternatives...")
        
        valid_candidates = []
        with ProcessPoolExecutor() as ex:
            futures = [ex.submit(eval_pair, p, Gs, NUM_ALTS_PER_CANDIDATE, OVERLAP_TIERS, MIN_SEPARATION_DIST, MAX_LENGTH_RATIO) for p in pairs]
            for f in as_completed(futures):
                res = f.result()
                if res: valid_candidates.append(res)

        valid_candidates.sort(key=lambda x: x["hardness_score"], reverse=True)
        final_candidates = valid_candidates[:NUM_OUTPUT_ROUTES]
        print(f"Final candidates: {len(final_candidates)}")

        # --- IMAGE GENERATION ---
        update_status("processing", f"Generating {len(final_candidates)} route images...")

        os.makedirs("/tmp/16_9", exist_ok=True)
        os.makedirs("/tmp/9_16", exist_ok=True)
        
        # Colors for routes (will be shuffled)
        ROUTE_COLORS = ['#E41A1C', '#377EB8', '#4DAF4A', '#984EA3', '#FF7F00', '#FFFF33']
        
        csv_rows = []

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

        for ci, cand in enumerate(final_candidates, 1):
            st, en = cand["snapped_pair"]
            mainp = cand["main_route_graph"]
            alts = cand["alt_routes_graph"]
            Lm = cand["route_distance"]
            
            # Combine all routes
            all_routes = [mainp] + alts
            route_lengths = [Lm] + [sum(Gs[u][v]['weight'] for u, v in zip(r[:-1], r[1:])) for r in alts]
            
            # Shuffle routes - this randomizes which position the main route appears in
            indices = list(range(len(all_routes)))
            random.shuffle(indices)
            shuffled_routes = [all_routes[i] for i in indices]
            shuffled_lengths = [route_lengths[i] for i in indices]
            shuffled_colors = ROUTE_COLORS[:len(shuffled_routes)]
            
            # Find which shuffled index contains the main route (original index 0)
            main_route_index = indices.index(0)
            
            # Bounding box
            all_pts = [p for r in all_routes for p in r]
            rs = [p[0] for p in all_pts]; cs = [p[1] for p in all_pts]
            rmin, rmax = max(0, min(rs)-ZOOM_MARGIN), min(h_crop, max(rs)+ZOOM_MARGIN)
            cmin, cmax = max(0, min(cs)-ZOOM_MARGIN), min(w_crop, max(cs)+ZOOM_MARGIN)
            
            b169 = adjust_bbox(cmin, rmin, cmax, rmax, 16/9, w_crop, h_crop)
            b916 = adjust_bbox(cmin, rmin, cmax, rmax, 9/16, w_crop, h_crop)
            
            def draw_route_image(bbox, folder, ratio_str):
                base = color_crop.copy()
                
                def off(pt): return (pt[1]-bbox[0], pt[0]-bbox[1])
                
                fig, ax = plt.subplots(figsize=((bbox[2]-bbox[0])/100, (bbox[3]-bbox[1])/100), dpi=100)
                ax.imshow(base.crop(bbox))
                
                # Draw all routes in shuffled order
                for route, color in zip(shuffled_routes, shuffled_colors):
                    pts = [off(p) for p in route]
                    xs = [p[0] for p in pts]; ys = [p[1] for p in pts]
                    ax.plot(xs, ys, color=color, lw=LINE_WIDTH, alpha=LINE_ALPHA, solid_capstyle='round')
                
                # Draw start/end markers
                s = off(st); e = off(en)
                start_marker = MplPolygon([
                    (s[0], s[1] - MARKER_RADIUS),
                    (s[0] - MARKER_RADIUS * 0.866, s[1] + MARKER_RADIUS * 0.5),
                    (s[0] + MARKER_RADIUS * 0.866, s[1] + MARKER_RADIUS * 0.5),
                ], closed=True, ec='magenta', fc='none', lw=4)
                ax.add_patch(start_marker)
                ax.add_patch(Circle(e, MARKER_RADIUS, ec="magenta", fc="none", lw=4))
                ax.add_patch(Circle(e, MARKER_RADIUS * 0.6, ec="magenta", fc="none", lw=3))
                
                ax.axis("off")
                out_path = f"/tmp/{folder}/candidate_{ci}_ALL.webp"
                plt.tight_layout(pad=0)
                plt.savefig(out_path, dpi=100, bbox_inches='tight', pad_inches=0, format='webp')
                plt.close(fig)
                
                upload_image(out_path, f"{map_id}/{folder}/candidate_{ci}_ALL.webp", ci, ratio_str)
                
            draw_route_image(b169, "16_9", "16:9")
            draw_route_image(b916, "9_16", "9:16")
            
            csv_rows.append({
                "id": ci,
                "lengths": shuffled_lengths,
                "colors": shuffled_colors,
                "main_route_index": main_route_index,
                "hardness": cand["hardness_score"]
            })

            if ci % BATCH_SIZE == 0:
                update_status("processing", f"Generated {ci}/{len(final_candidates)} routes")

        # --- COMPLETE ---
        update_status("processing", f"Finalizing {len(csv_rows)} routes...")
        
        requests.post(
            f"{job_payload['webhook_url']}/complete",
            json={
                "map_id": map_id,
                "route_count": len(csv_rows),
                "csv_data": csv_rows,
            },
            headers={"Content-Type": "application/json", "X-Webhook-Secret": job_payload["webhook_secret"]}
        )
        
        update_status("completed", f"Done. Generated {len(csv_rows)} route choices.")

    except Exception as e:
        import traceback
        traceback.print_exc()
        update_status("failed", error=str(e))


# =============================================================================
# WEB ENDPOINT
# =============================================================================

@app.function(image=image)
@modal.fastapi_endpoint(method="POST")
def trigger(payload: dict):
    """Trigger route choice processing."""
    process_map.spawn(payload)
    return {"status": "accepted"}
