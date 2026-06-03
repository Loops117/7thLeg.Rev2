-- Convert rectangle hotspots to center pin points
UPDATE "image_submission_hotspots"
SET
  "x_percent" = "x_percent" + ("width_percent" / 2),
  "y_percent" = "y_percent" + ("height_percent" / 2),
  "width_percent" = 0,
  "height_percent" = 0
WHERE "width_percent" > 0 OR "height_percent" > 0;
