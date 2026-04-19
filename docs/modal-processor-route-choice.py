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

def compute_hardness(Lmain, Lalt, Lstraight, overlap):
    """Multi-factor hardness score (0-100).
    Balance: both routes similar length
    Divergence: routes take different paths
    Complexity: moderate route inefficiency
    """
    if Lmain <= 0 or Lstraight <= 0:
        return 0.0
    diff_pct = abs(Lmain - Lalt) / Lmain
    balance = max(0.0, 1.0 - diff_pct / 0.15)
    div_raw = 1.0 - overlap
    if div_raw < 0.30:
        div_score = div_raw * 0.50
    elif div_raw < 0.80:
        div_score = 0.15 + (div_raw - 0.30) * 1.70
    else:
        div_score = 1.0
    ineff = Lmain / Lstraight
    if ineff < 1.15:
        complexity = 0.30
    elif ineff < 1.50:
        complexity = 0.30 + (ineff - 1.15) * 2.0
    else:
        complexity = 1.00
    return balance * div_score * complexity * 100.0


def eval_pair(pair, Gs, num_alts_needed, overlap_tiers, min_sep, max_len_ratio):
    st, en = pair
    try:
        mainp = nx.astar_path(Gs, st, en, heuristic=euclid, weight="weight")
        alts = find_alts_smart(Gs, st, en, mainp, num_alts_needed, overlap_tiers, min_sep, max_len_ratio)
        Lm = nx.path_weight(Gs, mainp, weight="weight")
        Ls = euclid(st, en)
    except: return None
    
    if len(alts) != num_alts_needed:
        return None
    
    if Ls < 100:
        return None
    
    best_alt = alts[0]
    sim = route_sim(best_alt, mainp)
    La = nx.path_weight(Gs, best_alt, weight="weight")
    hs = compute_hardness(Lm, La, Ls, sim)
    
    if hs < 10:
        return None
    
    return {
        "snapped_pair": (st, en),
        "main_route_graph": mainp,
        "alt_routes_graph": alts, 
        "hardness_score": hs,
        "route_distance": Lm
    }


# =============================================================================
# HELPER FUNCTIONS (Path refinement & quality)
# =============================================================================

def expand_graph_path(graph_path, chains):
    """Expand a simplified-graph path (junction nodes only) into
    the full skeleton-pixel path using stored chain data."""
    if len(graph_path) < 2:
        return list(graph_path)
    full = list(chains.get((graph_path[0], graph_path[1]),
                           [graph_path[0], graph_path[1]]))
    for i in range(1, len(graph_path) - 1):
        u, v = graph_path[i], graph_path[i + 1]
        segment = chains.get((u, v), [u, v])
        full.extend(segment[1:])
    return full


def has_line_of_sight(p1, p2, binary_map):
    """Check clear straight line between two (row,col) points using Bresenham."""
    from skimage.draw import line as bresenham_line
    r0, c0 = int(round(p1[0])), int(round(p1[1]))
    r1, c1 = int(round(p2[0])), int(round(p2[1]))
    if r0 == r1 and c0 == c1:
        return True
    H, W = binary_map.shape
    rr, cc = bresenham_line(
        max(0, min(r0, H - 1)), max(0, min(c0, W - 1)),
        max(0, min(r1, H - 1)), max(0, min(c1, W - 1)))
    return bool(np.all(binary_map[rr, cc] > 0))


def string_pull(path, binary_map):
    """Greedy farthest-line-of-sight simplification."""
    if len(path) < 3:
        return list(path)
    smooth = [path[0]]
    cur = 0
    while cur < len(path) - 1:
        best = cur + 1
        for j in range(len(path) - 1, cur, -1):
            if has_line_of_sight(path[cur], path[j], binary_map):
                best = j
                break
        smooth.append(path[best])
        cur = best
    return smooth


def tighten_corners(path, binary_map, radius=10, iterations=5):
    if len(path) < 3: return list(path)
    H, W = binary_map.shape
    path = [tuple(p) for p in path]
    
    R = radius
    y, x = np.ogrid[-R:R+1, -R:R+1]
    mask = x**2 + y**2 <= R**2
    dy_arr, dx_arr = np.where(mask)
    offsets = list(zip(dy_arr - R, dx_arr - R))
    
    for _ in range(iterations):
        changed = False
        for i in range(1, len(path) - 1):
            p_prev, p_curr, p_next = path[i-1], path[i], path[i+1]
            
            best_p = p_curr
            best_dist = math.hypot(p_curr[0]-p_prev[0], p_curr[1]-p_prev[1]) + \
                        math.hypot(p_next[0]-p_curr[0], p_next[1]-p_curr[1])
            
            for dr, dc in offsets:
                r, c = int(p_curr[0] + dr), int(p_curr[1] + dc)
                if 0 <= r < H and 0 <= c < W and binary_map[r, c] > 0:
                    cand = (r, c)
                    dist = math.hypot(cand[0]-p_prev[0], cand[1]-p_prev[1]) + \
                           math.hypot(p_next[0]-cand[0], p_next[1]-cand[1])
                    if dist < best_dist - 0.5:
                        if has_line_of_sight(p_prev, cand, binary_map) and \
                           has_line_of_sight(cand, p_next, binary_map):
                            best_p = cand
                            best_dist = dist
            
            if best_p != p_curr:
                path[i] = best_p
                changed = True
                
        if not changed:
            break
            
    return string_pull(path, binary_map)

def smooth_path_los(path, binary_map):
    """String-pulling and dense rubber-banding for perfect corner hugging."""
    p = string_pull(string_pull(path, binary_map), binary_map)
    p_dense = densify_path(p, step=8)
    return tighten_corners(p_dense, binary_map, radius=10, iterations=5)


def optimize_waypoints(path, binary_map, iterations=3):
    """Shift intermediate waypoints toward the ideal straight line
    between their neighbors, while maintaining line-of-sight clearance.
    This removes visually suboptimal kinks left by string-pulling."""
    for _ in range(iterations):
        if len(path) < 3:
            break
        improved = [path[0]]
        for i in range(1, len(path) - 1):
            prev, curr, nxt = path[i - 1], path[i], path[i + 1]
            mid = ((prev[0] + nxt[0]) / 2, (prev[1] + nxt[1]) / 2)
            mid_int = (int(round(mid[0])), int(round(mid[1])))
            if has_line_of_sight(prev, mid_int, binary_map) and \
               has_line_of_sight(mid_int, nxt, binary_map):
                improved.append(mid_int)
            else:
                improved.append(curr)
        improved.append(path[-1])
        path = improved
    return path


def polyline_length(path):
    """Euclidean length of a polyline [(r,c), ...]."""
    total = 0.0
    for i in range(len(path) - 1):
        total += math.hypot(path[i+1][0] - path[i][0],
                            path[i+1][1] - path[i][1])
    return total


def densify_path(path, step=3):
    """Interpolate intermediate points along each segment."""
    pts = []
    for i in range(len(path) - 1):
        r0, c0 = path[i]
        r1, c1 = path[i + 1]
        n = max(1, int(math.hypot(r1 - r0, c1 - c0) / step))
        for j in range(n):
            t = j / n
            pts.append((r0 + t * (r1 - r0), c0 + t * (c1 - c0)))
    pts.append(path[-1])
    return np.array(pts)


def proximity_overlap_check(path1, path2, proximity=30):
    """Fraction of path1 points within *proximity* px of path2."""
    from scipy.spatial import KDTree
    d1 = densify_path(path1)
    d2 = densify_path(path2)
    if len(d1) == 0 or len(d2) == 0:
        return 1.0
    tree = KDTree(d2)
    dists, _ = tree.query(d1)
    return float(np.mean(dists < proximity))


def min_turning_angle(path):
    """Smallest interior angle (degrees). 180=straight, 0=hairpin."""
    if len(path) < 3:
        return 180.0
    worst = 180.0
    for i in range(1, len(path) - 1):
        v1 = np.array(path[i]) - np.array(path[i - 1])
        v2 = np.array(path[i + 1]) - np.array(path[i])
        n1, n2 = np.linalg.norm(v1), np.linalg.norm(v2)
        if n1 < 1e-6 or n2 < 1e-6:
            continue
        cos_a = np.clip(np.dot(v1, v2) / (n1 * n2), -1.0, 1.0)
        deflection = math.degrees(math.acos(cos_a))
        interior = 180.0 - deflection
        worst = min(worst, interior)
    return worst


def verify_no_obstacles(path, binary_map):
    """Return True if every segment of path is obstacle-free."""
    from skimage.draw import line as bresenham_line
    H, W = binary_map.shape
    for i in range(len(path) - 1):
        r0 = max(0, min(int(round(path[i][0])), H - 1))
        c0 = max(0, min(int(round(path[i][1])), W - 1))
        r1 = max(0, min(int(round(path[i+1][0])), H - 1))
        c1 = max(0, min(int(round(path[i+1][1])), W - 1))
        rr, cc = bresenham_line(r0, c0, r1, c1)
        if np.any(binary_map[rr, cc] == 0):
            return False
    return True


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
    from scipy.ndimage import binary_erosion
    from skimage.draw import line as bresenham_line
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
    
    # Calculate pixel sizes based on a 1:4000 sprint map and Web Mercator zoom level
    zoom_level = params.get("zoom_level", 18)
    scale_mult = math.pow(2, zoom_level - 18)
    pixels_per_mm = 13.4 * scale_mult

    # IOF sprint standard dimensions:
    MARKER_RADIUS = params.get("marker_radius", int(3.0 * pixels_per_mm))
    LINE_WIDTH_PX = params.get("line_width", max(3, int(0.35 * pixels_per_mm)))
    LINE_WIDTH_PT = max(2.0, LINE_WIDTH_PX * 72 / 200)

    LINE_ALPHA = 0.9
    CORRIDOR_BASE_WIDTH = int(12.5 * pixels_per_mm)    
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
        
        # --- APPLY IMPASSABLE ANNOTATIONS (server-side compositing) ---
        impassable = job_payload.get("impassable_annotations")
        if impassable:
            from PIL import ImageDraw
            
            areas = impassable.get("areas", [])
            lines = impassable.get("lines", [])
            print(f"Applying {len(areas)} impassable areas and {len(lines)} lines...")
            
            # Composite onto color image (vivid magenta with transparency)
            color_rgba = color_image.convert("RGBA")
            overlay = Image.new("RGBA", color_rgba.size, (0, 0, 0, 0))
            color_draw = ImageDraw.Draw(overlay)
            # IOF Purple for better consistency
            violet = (255, 0, 251, 180)  # IOF Purple with 70% alpha
            violet_solid = (255, 0, 251, 255) # IOF Purple solidpacity for outlines/lines
            
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
                        fill=violet_solid, width=LINE_WIDTH_PX  # Thicker lines for visibility
                    )
            
            color_image = Image.alpha_composite(color_rgba, overlay).convert("RGB")
            
            # Composite onto B&W image (black - makes area impassable for routing)
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
            """Generate points inside ROI, spread across a grid for coverage."""
            GRID_ROWS, GRID_COLS = 4, 4
            roi_l, roi_t, roi_r, roi_b = bounds
            cell_w = (roi_r - roi_l) / GRID_COLS
            cell_h = (roi_b - roi_t) / GRID_ROWS
            per_cell = math.ceil(count / (GRID_ROWS * GRID_COLS))
            all_points = []
            for r_idx in range(GRID_ROWS):
                for c_idx in range(GRID_COLS):
                    xmin = roi_l + c_idx * cell_w
                    ymin = roi_t + r_idx * cell_h
                    xmax = xmin + cell_w
                    ymax = ymin + cell_h
                    cell_pts = []
                    attempts = 0
                    while len(cell_pts) < per_cell and attempts < per_cell * 50:
                        batch = (per_cell - len(cell_pts)) * 3
                        xs = np.random.uniform(xmin, xmax, batch)
                        ys = np.random.uniform(ymin, ymax, batch)
                        cands = np.column_stack((xs, ys))
                        inside = poly.contains_points(cands)
                        for pt in cands[inside]:
                            cell_pts.append(tuple(pt))
                            if len(cell_pts) >= per_cell:
                                break
                        attempts += batch
                    all_points.extend(cell_pts)
            random.shuffle(all_points)
            return all_points[:count]
            
        roi_path_obj = Path(roi_poly)
        points_global = gen_points(roi_path_obj, NUM_RANDOM_POINTS, (roi_left, roi_top, roi_right, roi_bottom))
        roi_csv_points = [(pt[1]-roi_top, pt[0]-roi_left) for pt in points_global]

        # Apply ROI polygon mask to prevent out-of-bounds routes
        mask_img = Image.new("L", (w_crop, h_crop), 0)
        local_poly = [(pt[0] - roi_left, pt[1] - roi_top) for pt in roi_poly]
        ImageDraw.Draw(mask_img).polygon(local_poly, outline=1, fill=1)
        mask_arr = np.array(mask_img)
        binary_crop = ((np.array(bw_crop) > 128) & (mask_arr > 0)).astype(np.uint8)
        
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
        
        # Simplify + store chains for pixel-level path expansion
        junctions = {n for n in fullG.nodes() if fullG.degree(n) != 2}
        Gs = nx.Graph()
        chains = {}
        for n in junctions: Gs.add_node(n)
        visited_edges = set()
        for start_node in junctions:
            for neighbor in fullG.neighbors(start_node):
                if tuple(sorted((start_node, neighbor))) in visited_edges: continue
                chain = [start_node, neighbor]
                curr = neighbor
                prev = start_node
                dist = fullG[start_node][neighbor]['weight']
                while curr not in junctions and fullG.degree(curr) == 2:
                    nhs = list(fullG.neighbors(curr))
                    nhs.remove(prev)
                    if not nhs: break
                    nxt = nhs[0]
                    dist += fullG[curr][nxt]['weight']
                    chain.append(nxt)
                    prev, curr = curr, nxt
                if curr in junctions:
                    u, v = start_node, curr
                    if not Gs.has_edge(u, v) or dist < Gs[u][v]['weight']:
                        Gs.add_edge(u, v, weight=dist)
                        chains[(u, v)] = list(chain)
                        chains[(v, u)] = list(reversed(chain))
                    visited_edges.add(tuple(sorted((start_node, neighbor))))
        del fullG  # free memory

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

        # --- PATH REFINEMENT (chain expansion + string-pulling) ---
        update_status("processing", "Refining pixel paths...")
        
        OBSTACLE_MARGIN = 3
        MIN_ANGLE_DEG = 50
        OVERLAP_PROXIMITY = 30
        MAX_OVERLAP_SMOOTH = 0.30
        MAX_LEN_DIFF_SMOOTH = 0.15
        DEDUP_DIST = 80
        
        eroded_map = binary_erosion(binary_crop, iterations=OBSTACLE_MARGIN).astype(np.uint8)
        
        refined_pool = []
        
        for cand in scored:
            if len(refined_pool) >= NUM_OUTPUT_ROUTES * 5:
                break
            
            if len(cand["alt_routes_graph"]) != NUM_ALTS_PER_CANDIDATE:
                continue
            
            try:
                st, en = cand["snapped_pair"]
                
                # Expand main path via chains and smooth
                main_graph = cand["main_route_graph"]
                main_pixels = expand_graph_path(main_graph, chains)
                main_smooth = optimize_waypoints(smooth_path_los(main_pixels, eroded_map), eroded_map)
                
                if not verify_no_obstacles(main_smooth, binary_crop):
                    continue
                
                if min_turning_angle(main_smooth) < MIN_ANGLE_DEG:
                    continue
                
                valid_alts_smooth = []
                all_ok = True
                
                for alt_graph in cand["alt_routes_graph"]:
                    alt_pixels = expand_graph_path(alt_graph, chains)
                    alt_smooth = optimize_waypoints(smooth_path_los(alt_pixels, eroded_map), eroded_map)
                    
                    if not verify_no_obstacles(alt_smooth, binary_crop):
                        all_ok = False
                        break
                    
                    Lm = polyline_length(main_smooth)
                    La = polyline_length(alt_smooth)
                    
                    if Lm < 50 or La < 50:
                        all_ok = False
                        break
                    
                    diff = abs(Lm - La) / Lm
                    if diff > MAX_LEN_DIFF_SMOOTH:
                        all_ok = False
                        break
                    
                    ovlp = proximity_overlap_check(main_smooth, alt_smooth, OVERLAP_PROXIMITY)
                    if ovlp > MAX_OVERLAP_SMOOTH:
                        all_ok = False
                        break
                    
                    if min_turning_angle(alt_smooth) < MIN_ANGLE_DEG:
                        all_ok = False
                        break
                    
                    valid_alts_smooth.append(alt_smooth)
                
                if not all_ok or len(valid_alts_smooth) != NUM_ALTS_PER_CANDIDATE:
                    continue
                
                cand["main_pixel"] = main_smooth
                cand["alt_pixels"] = valid_alts_smooth
                cand["smooth_main_len"] = polyline_length(main_smooth)
                cand["smooth_overlap"] = proximity_overlap_check(
                    main_smooth, valid_alts_smooth[0], OVERLAP_PROXIMITY)
                refined_pool.append(cand)
            
            except Exception:
                continue
        
        print(f"Refined candidates: {len(refined_pool)}")
        
        # --- DIVERSITY SELECTION ---
        PASSES = [300, 250, 200, 150, 120, 100, 80, 60, 40, 20]
        final_list = []
        pool_sorted = sorted(refined_pool, key=lambda x: x["hardness_score"], reverse=True)
        
        for min_sep_dist in PASSES:
            if len(final_list) >= NUM_OUTPUT_ROUTES: break
            for c in pool_sorted:
                if len(final_list) >= NUM_OUTPUT_ROUTES: break
                if c in final_list: continue
                
                st, en = c["snapped_pair"]
                too_close = False
                for sel in final_list:
                    sst, sen = sel["snapped_pair"]
                    if math.hypot(st[0]-sst[0], st[1]-sst[1]) < min_sep_dist: too_close = True
                    if math.hypot(en[0]-sen[0], en[1]-sen[1]) < min_sep_dist: too_close = True
                if not too_close:
                    final_list.append(c)
        
        if len(final_list) > NUM_OUTPUT_ROUTES:
            final_list = final_list[:NUM_OUTPUT_ROUTES]

        # --- EXPORT & UPLOAD ---
        update_status("processing", f"Uploading {len(final_list)} candidates (ALL VIEW)...")
        
        csv_rows = []
        # Distinct palette
        COLORS = ['#FF0000', '#0000FF', '#00FF00', '#FF00FF', '#FFA500'] 
        
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
        
        def rotate_point_90(pt, w, h):
            """Rotate (row, col) 90 deg CW in image of PIL size (w, h)."""
            return (pt[1], h - 1 - pt[0])
            
        def is_path_left(path_a, path_b):
            poly = list(path_a) + list(path_b)[::-1]
            if len(poly) < 3: return True
            area2 = 0.0
            for i in range(len(poly)):
                r1, c1 = poly[i]
                r2, c2 = poly[(i + 1) % len(poly)]
                area2 += (c1 * r2 - c2 * r1)
            return area2 > 0
        
        def find_best_rotation(path_red, path_blue, w, h, start=None, end=None):
            """Try all 4 rotations. Return best_rot. Picks rotation pointing upwards."""
            best_upwardness = -float('inf')
            best_rot = 0
            
            pts_r = list(path_red)
            pts_b = list(path_blue)
            wr, hr = w, h
            st, en = start, end
            
            for rot in range(4):
                if st is not None and en is not None:
                    dx = en[1] - st[1]
                    dy = en[0] - st[0]
                    upwardness = -dy - abs(dx)
                else:
                    upwardness = 0
                
                if upwardness > best_upwardness:
                    best_upwardness = upwardness
                    best_rot = rot
                
                if st is not None:
                    st = rotate_point_90(st, wr, hr)
                    en = rotate_point_90(en, wr, hr)
                wr, hr = hr, wr
            
            return best_rot

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
            
            # --- 1:1 SQUARE IMAGE ---
            bbox_1_1 = adjust_bbox(cmin, rmin, cmax, rmax, 1.0, w_crop, h_crop)
            cropped_img = base.crop(bbox_1_1)
            bx0, by0, bx1, by1 = bbox_1_1
            
            # Offset all points to local crop coordinates
            def to_local(pt): return (pt[0] - by0, pt[1] - bx0)
            
            local_routes = []
            for r in all_routes:
                local_routes.append({
                    "path": [to_local(p) for p in r["path"]],
                    "color": r["color"],
                    "type": r["type"],
                })
            local_st = to_local(cand["snapped_pair"][0])
            local_en = to_local(cand["snapped_pair"][1])
            
            # --- ROTATION for red-left / blue-right ---
            img_w, img_h = cropped_img.size
            # Use routes at index 0 (red) and 1 (blue) for rotation scoring
            best_rot = find_best_rotation(
                local_routes[0]["path"],
                local_routes[1]["path"] if len(local_routes) > 1 else local_routes[0]["path"],
                img_w, img_h, local_st, local_en)
            
            # Apply rotation
            rotated_img = cropped_img
            for _ in range(best_rot):
                w_cur, h_cur = rotated_img.size
                rotated_img = rotated_img.transpose(Image.ROTATE_270)
                for lr in local_routes:
                    lr["path"] = [rotate_point_90(p, w_cur, h_cur) for p in lr["path"]]
                local_st = rotate_point_90(local_st, w_cur, h_cur)
                local_en = rotate_point_90(local_en, w_cur, h_cur)
            
            red_is_left = is_path_left(local_routes[0]["path"], local_routes[1]["path"] if len(local_routes) > 1 else local_routes[0]["path"])
            
            # If red is NOT on the left, swap red and blue colors
            if not red_is_left and len(local_routes) >= 2:
                local_routes[0]["color"], local_routes[1]["color"] = \
                    local_routes[1]["color"], local_routes[0]["color"]
            
            final_w, final_h = rotated_img.size
            
            fig, ax = plt.subplots(figsize=(final_w/200, final_h/200), dpi=200)
            ax.imshow(rotated_img, interpolation="lanczos")
            
            # Draw all routes in shuffled order
            for r in local_routes:
                path = r["path"]
                col = r["color"]
                x = [p[1] for p in path]
                y = [p[0] for p in path]
                ax.plot(x, y, color=col, lw=LINE_WIDTH_PT, alpha=LINE_ALPHA)
            
            s = (local_st[1], local_st[0])
            e = (local_en[1], local_en[0])
            # Connecting line with dynamic gap
            dx, dy = e[0] - s[0], e[1] - s[1]
            dist_px = math.hypot(dx, dy)
            dynamic_gap = max(25, dist_px * 0.04)
            inset = MARKER_RADIUS + dynamic_gap
            if dist_px > inset * 2:
                ux, uy = dx / dist_px, dy / dist_px
                ax.plot(
                    [s[0] + ux * inset, e[0] - ux * inset],
                    [s[1] + uy * inset, e[1] - uy * inset],
                    color="#FF00FB", lw=LINE_WIDTH_PT, zorder=3)
            ax.add_patch(Circle(s, MARKER_RADIUS, ec="#FF00FB", fc="none", lw=LINE_WIDTH_PT, zorder=4))
            ax.add_patch(Circle(e, MARKER_RADIUS, ec="#FF00FB", fc="none", lw=LINE_WIDTH_PT, zorder=4))
            ax.axis("off")
            
            os.makedirs("/tmp/1_1", exist_ok=True)
            local_path = f"/tmp/1_1/route_{i}.webp"
            plt.tight_layout(pad=0)
            plt.savefig(local_path, dpi=200, bbox_inches='tight', pad_inches=0, format='webp',
                        pil_kwargs={'quality': 95})
            plt.close(fig)
            
            upload_image(local_path, f"{map_id}/1_1/route_{i}.webp", i, "1:1")
            
            # --- SAFE ZONE (tight bbox of all routes, normalized 0-1) ---
            all_local_pts = []
            for lr in local_routes:
                all_local_pts.extend(lr["path"])
            ox = [p[1] for p in all_local_pts]
            oy = [p[0] for p in all_local_pts]
            safe_x = round(max(0, min(ox)) / max(final_w, 1), 4)
            safe_y = round(max(0, min(oy)) / max(final_h, 1), 4)
            safe_w = round(min(1.0, (max(ox) - min(ox)) / max(final_w, 1)), 4)
            safe_h = round(min(1.0, (max(oy) - min(oy)) / max(final_h, 1)), 4)
            
            # Calculate Lengths (in shuffled order)
            sorted_lengths = []
            colors_list = []
            def plen(pth): return sum(math.hypot(pth[k][0]-pth[k+1][0], pth[k][1]-pth[k+1][1]) for k in range(len(pth)-1))
            
            for r in all_routes:
                sorted_lengths.append(round(plen(r["path"]), 1))
                colors_list.append(r["color"])
            
            # Center of line between start and end (normalized 0-1)
            center_x = round(((local_st[1] + local_en[1]) / 2) / max(final_w, 1), 4)
            center_y = round(((local_st[0] + local_en[0]) / 2) / max(final_h, 1), 4)
            
            csv_rows.append({
                "id": i,
                "lengths": sorted_lengths,
                "colors": colors_list,
                "main_route_index": main_route_idx,
                "hardness": float(f"{cand['hardness_score']:.2f}"),
                "safe_zone": {
                    "x": safe_x,
                    "y": safe_y,
                    "w": safe_w,
                    "h": safe_h,
                },
                "center_point": {
                    "x": center_x,
                    "y": center_y,
                }
            })
        
        # Debug logging before sending complete webhook
        print(f"Sending complete webhook with {len(csv_rows)} csv_rows")
        if csv_rows:
            print(f"Sample csv_row: {csv_rows[0]}")
            
        response = requests.post(
            f"{job_payload['webhook_url']}/complete",
            json={"map_id": map_id, "route_count": len(final_list), "csv_data": csv_rows},
            headers={"Content-Type": "application/json", "X-Webhook-Secret": job_payload["webhook_secret"]}
        )
        print(f"Complete webhook response: {response.status_code} - {response.text}")
        
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