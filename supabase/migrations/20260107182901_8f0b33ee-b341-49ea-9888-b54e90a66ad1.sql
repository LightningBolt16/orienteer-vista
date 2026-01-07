-- Add activity tracking column for stale processing detection
ALTER TABLE user_maps 
ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMPTZ DEFAULT NOW();

-- Create trigger to auto-update last_activity_at on update
CREATE OR REPLACE FUNCTION update_user_map_activity()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_activity_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger
DROP TRIGGER IF EXISTS user_maps_activity_trigger ON user_maps;
CREATE TRIGGER user_maps_activity_trigger
  BEFORE UPDATE ON user_maps
  FOR EACH ROW
  EXECUTE FUNCTION update_user_map_activity();