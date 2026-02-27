-- Rename site_type value from "claude" to "anthropic" in channel metadata.
UPDATE channels
SET metadata_json = REPLACE(metadata_json, '"site_type":"claude"', '"site_type":"anthropic"')
WHERE metadata_json LIKE '%"site_type":"claude"%';
