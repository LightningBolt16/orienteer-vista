-- Delete partial Matera and Rotondella entries that failed upload
DELETE FROM route_maps WHERE name IN ('Matera', 'Rotondella');