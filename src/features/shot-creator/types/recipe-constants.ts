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
  // NOTE: brand-guide template lives in the legacy `directors-palette` bucket,
  // not `templates`. Consider migrating to `templates/system/brand-guides/`
  // alongside the others at next storage reorg.
  brandGuideTemplate: `${SUPABASE_URL}/storage/v1/object/public/directors-palette/templates/system/brand-guides/brand-visual-guide-template.png`,

  // AIOBR Title Card layout references — 6 curated examples covering 5 style
  // families (text-first, style-sheet meta, atmospheric, diegetic, typographic).
  // These are LAYOUT/COMPOSITION refs only, never subject refs. Selected style
  // family is driven by the LAYOUT_PRESET field in the recipe; illustration
  // rendering is driven by the Shot Creator Style dropdown (app-level).
  aiobrTitleCardTextFirst: `${SUPABASE_URL}/storage/v1/object/public/templates/system/aiobr-title-cards/text-first-pulp-comic-grid.jpg`,
  aiobrTitleCardStyleSheet32bit: `${SUPABASE_URL}/storage/v1/object/public/templates/system/aiobr-title-cards/style-sheet-32bit-pixel.png`,
  aiobrTitleCardStyleSheetActionFig: `${SUPABASE_URL}/storage/v1/object/public/templates/system/aiobr-title-cards/style-sheet-action-figure.png`,
  aiobrTitleCardAtmospheric: `${SUPABASE_URL}/storage/v1/object/public/templates/system/aiobr-title-cards/atmospheric-painterly-noir.jpg`,
  aiobrTitleCardDiegetic: `${SUPABASE_URL}/storage/v1/object/public/templates/system/aiobr-title-cards/diegetic-signs-in-scene.png`,
  aiobrTitleCardTypographic: `${SUPABASE_URL}/storage/v1/object/public/templates/system/aiobr-title-cards/typographic-poster-grid.png`,
};
