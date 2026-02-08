/**
 * Recipe Constants
 * Static data used by recipes (frame types, holidays, template URLs)
 */

/**
 * Frame type options for cinematic grids
 */
export const FRAME_TYPE_OPTIONS = {
  row1: ['Extreme Wide Shot', 'Wide Shot', 'Full Body Shot', 'Establishing Shot', 'Environmental Shot'],
  row2: ['Medium Wide Shot', 'Medium Shot', 'Waist-Up Shot', 'Cowboy Shot', 'American Shot'],
  row3: ['Medium Close-Up', 'Close-Up Shot', 'Chest-Up Shot', 'Tight Shot', 'Portrait Frame'],
  row4: ['Extreme Close-Up', 'Big Close-Up', 'Detail Shot', 'Macro Shot', 'Insert Shot'],
  angles: ['Eye-Level', 'Low Angle', 'High Angle', 'Dutch Angle', 'Birds Eye', 'Worms Eye', 'Over-the-Shoulder', 'POV'],
};

/**
 * Holiday options
 */
export const HOLIDAY_OPTIONS = [
  'Christmas',
  'Valentines Day',
  'Halloween',
  'Easter',
  'Thanksgiving',
  'New Years Eve',
  'Fourth of July',
  'St Patricks Day',
  'Lunar New Year',
  'Diwali',
  'Hanukkah',
  'Cinco de Mayo',
];

/**
 * System template URLs from Supabase Storage
 * These are used as layout reference images for recipes
 */
const SUPABASE_URL = 'https://tarohelkwuurakbxjyxm.supabase.co';

export const SYSTEM_TEMPLATE_URLS = {
  characterSheetBasic: `${SUPABASE_URL}/storage/v1/object/public/templates/system/character-sheets/charactersheet-basic.png`,
  characterSheetAdvanced: `${SUPABASE_URL}/storage/v1/object/public/templates/system/character-sheets/charactersheet-advanced.webp`,
  characterSheetV3: `${SUPABASE_URL}/storage/v1/object/public/templates/system/character-sheets/charactersheet-v3.jpg`,
  wardrobeGrid: `${SUPABASE_URL}/storage/v1/object/public/templates/system/grids/wardrobe-2x3.png`,
  styleGuide9Tile: `${SUPABASE_URL}/storage/v1/object/public/templates/system/grids/style-guide-9tile.png`,
};
