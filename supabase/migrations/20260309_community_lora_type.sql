-- Add 'lora' type to community_items and user_library_items
ALTER TABLE community_items DROP CONSTRAINT IF EXISTS community_items_type_check;
ALTER TABLE community_items ADD CONSTRAINT community_items_type_check CHECK (type IN ('wildcard', 'recipe', 'prompt', 'lora', 'director'));

ALTER TABLE user_library_items DROP CONSTRAINT IF EXISTS user_library_items_type_check;
ALTER TABLE user_library_items ADD CONSTRAINT user_library_items_type_check CHECK (type IN ('wildcard', 'recipe', 'prompt', 'lora', 'director'));
