-- Fix PUBLIC_DATA_EXPOSURE: Restrict user_map_stats to authenticated users only
DROP POLICY IF EXISTS "Users can view all map stats" ON user_map_stats;

CREATE POLICY "Authenticated users can view map stats"
ON user_map_stats FOR SELECT
TO authenticated
USING (true);

-- Fix PUBLIC_DATA_EXPOSURE: Restrict route_attempts to authenticated users only
DROP POLICY IF EXISTS "Users can view all route attempts" ON route_attempts;

CREATE POLICY "Authenticated users can view route attempts"
ON route_attempts FOR SELECT
TO authenticated
USING (true);

-- Fix PUBLIC_DATA_EXPOSURE: Restrict user_profiles to authenticated users only
DROP POLICY IF EXISTS "Users can view all profiles" ON user_profiles;

CREATE POLICY "Authenticated users can view profiles"
ON user_profiles FOR SELECT
TO authenticated
USING (true);