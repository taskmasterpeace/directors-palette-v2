/**
 * Suno Genre Taxonomy
 * Comprehensive 3-tier hierarchy: Genre -> Subgenre -> Microgenre
 * Optimized for Suno prompt building with 500+ total genre nodes
 *
 * IDs use lowercase-hyphenated format: genre, genre-subgenre, genre-subgenre-micro
 */

import type { GenreNode } from '../types/sound-studio.types'

export const GENRE_TAXONOMY: GenreNode[] = [
  // ─────────────────────────────────────────────
  // HIP HOP
  // ─────────────────────────────────────────────
  {
    id: 'hip-hop',
    label: 'Hip Hop',
    children: [
      {
        id: 'hip-hop-trap',
        label: 'Trap',
        children: [
          { id: 'hip-hop-trap-melodic', label: 'Melodic Trap' },
          { id: 'hip-hop-trap-hard', label: 'Hard Trap' },
          { id: 'hip-hop-trap-uk-drill', label: 'UK Drill' },
          { id: 'hip-hop-trap-chicago-drill', label: 'Chicago Drill' },
          { id: 'hip-hop-trap-brooklyn-drill', label: 'Brooklyn Drill' },
          { id: 'hip-hop-trap-plugg', label: 'Plugg' },
          { id: 'hip-hop-trap-pluggnb', label: 'Pluggnb' },
          { id: 'hip-hop-trap-rage', label: 'Rage Beat' },
          { id: 'hip-hop-trap-latin', label: 'Latin Trap' },
          { id: 'hip-hop-trap-country', label: 'Country Trap' },
          { id: 'hip-hop-trap-edm', label: 'EDM Trap' },
          { id: 'hip-hop-trap-emo', label: 'Emo Trap' },
          { id: 'hip-hop-trap-gospel', label: 'Gospel Trap' },
          { id: 'hip-hop-trap-cloud', label: 'Cloud Trap' },
          { id: 'hip-hop-trap-metal', label: 'Trap Metal' },
          { id: 'hip-hop-trap-dark', label: 'Dark Trap' },
          { id: 'hip-hop-trap-hyperpop', label: 'Hyperpop Trap' },
          { id: 'hip-hop-trap-detroit', label: 'Detroit Type' },
          { id: 'hip-hop-trap-flute', label: 'Flute Trap' },
          { id: 'hip-hop-trap-piano', label: 'Piano Trap' },
        ],
      },
      {
        id: 'hip-hop-boom-bap',
        label: 'Boom Bap',
        children: [
          { id: 'hip-hop-boom-bap-east-coast', label: 'East Coast' },
          { id: 'hip-hop-boom-bap-golden-age', label: 'Golden Age' },
          { id: 'hip-hop-boom-bap-jazz-rap', label: 'Jazz Rap' },
          { id: 'hip-hop-boom-bap-dusty', label: 'Dusty Boom Bap' },
          { id: 'hip-hop-boom-bap-underground', label: 'Underground Boom Bap' },
          { id: 'hip-hop-boom-bap-grimey', label: 'Grimey Boom Bap' },
        ],
      },
      {
        id: 'hip-hop-lofi',
        label: 'Lo-fi Hip Hop',
        children: [
          { id: 'hip-hop-lofi-chill', label: 'Chill Lo-fi' },
          { id: 'hip-hop-lofi-jazzy', label: 'Jazzy Lo-fi' },
          { id: 'hip-hop-lofi-rainy', label: 'Rainy Lo-fi' },
          { id: 'hip-hop-lofi-beats', label: 'Lo-fi Beats to Study' },
          { id: 'hip-hop-lofi-vinyl', label: 'Vinyl Lo-fi' },
          { id: 'hip-hop-lofi-bedroom', label: 'Bedroom Lo-fi' },
        ],
      },
      {
        id: 'hip-hop-cloud-rap',
        label: 'Cloud Rap',
        children: [
          { id: 'hip-hop-cloud-rap-ethereal', label: 'Ethereal Cloud Rap' },
          { id: 'hip-hop-cloud-rap-vapor', label: 'Vapor Rap' },
          { id: 'hip-hop-cloud-rap-atmospheric', label: 'Atmospheric Cloud Rap' },
          { id: 'hip-hop-cloud-rap-dreamy', label: 'Dreamy Cloud Rap' },
        ],
      },
      {
        id: 'hip-hop-phonk',
        label: 'Phonk',
        children: [
          { id: 'hip-hop-phonk-drift', label: 'Drift Phonk' },
          { id: 'hip-hop-phonk-brazilian', label: 'Brazilian Phonk' },
          { id: 'hip-hop-phonk-memphis', label: 'Memphis Phonk' },
          { id: 'hip-hop-phonk-house', label: 'House Phonk' },
          { id: 'hip-hop-phonk-dark', label: 'Dark Phonk' },
          { id: 'hip-hop-phonk-cowbell', label: 'Cowbell Phonk' },
        ],
      },
      {
        id: 'hip-hop-memphis-rap',
        label: 'Memphis Rap',
        children: [
          { id: 'hip-hop-memphis-rap-horrorcore', label: 'Horrorcore Memphis' },
          { id: 'hip-hop-memphis-rap-crunk-memphis', label: 'Crunk Memphis' },
          { id: 'hip-hop-memphis-rap-lo-fi', label: 'Lo-fi Memphis' },
          { id: 'hip-hop-memphis-rap-tape', label: 'Memphis Tape' },
        ],
      },
      {
        id: 'hip-hop-crunk',
        label: 'Crunk',
        children: [
          { id: 'hip-hop-crunk-snap', label: 'Snap Music' },
          { id: 'hip-hop-crunk-hyphy', label: 'Hyphy' },
          { id: 'hip-hop-crunk-bass', label: 'Crunk Bass' },
        ],
      },
      {
        id: 'hip-hop-chopped-screwed',
        label: 'Chopped & Screwed',
        children: [
          { id: 'hip-hop-chopped-screwed-classic', label: 'Classic Screw' },
          { id: 'hip-hop-chopped-screwed-modern', label: 'Modern Screw' },
          { id: 'hip-hop-chopped-screwed-purple', label: 'Purple Sound' },
        ],
      },
      {
        id: 'hip-hop-conscious',
        label: 'Conscious Hip Hop',
        children: [
          { id: 'hip-hop-conscious-political', label: 'Political Rap' },
          { id: 'hip-hop-conscious-socially-aware', label: 'Socially Aware' },
          { id: 'hip-hop-conscious-spoken-word', label: 'Spoken Word Hip Hop' },
          { id: 'hip-hop-conscious-afrocentric', label: 'Afrocentric Rap' },
        ],
      },
      {
        id: 'hip-hop-gangsta',
        label: 'Gangsta Rap',
        children: [
          { id: 'hip-hop-gangsta-west-coast', label: 'West Coast Gangsta' },
          { id: 'hip-hop-gangsta-mafioso', label: 'Mafioso Rap' },
          { id: 'hip-hop-gangsta-street', label: 'Street Rap' },
          { id: 'hip-hop-gangsta-hardcore', label: 'Hardcore Rap' },
        ],
      },
      {
        id: 'hip-hop-g-funk',
        label: 'G-Funk',
        children: [
          { id: 'hip-hop-g-funk-classic', label: 'Classic G-Funk' },
          { id: 'hip-hop-g-funk-modern', label: 'Modern G-Funk' },
          { id: 'hip-hop-g-funk-p-funk', label: 'P-Funk Rap' },
        ],
      },
      {
        id: 'hip-hop-grime',
        label: 'Grime',
        children: [
          { id: 'hip-hop-grime-classic', label: 'Classic Grime' },
          { id: 'hip-hop-grime-instrumental', label: 'Instrumental Grime' },
          { id: 'hip-hop-grime-dark', label: 'Dark Grime' },
          { id: 'hip-hop-grime-melodic', label: 'Melodic Grime' },
        ],
      },
      {
        id: 'hip-hop-alternative',
        label: 'Alternative Hip Hop',
        children: [
          { id: 'hip-hop-alternative-abstract', label: 'Abstract Hip Hop' },
          { id: 'hip-hop-alternative-experimental', label: 'Experimental Rap' },
          { id: 'hip-hop-alternative-art-rap', label: 'Art Rap' },
          { id: 'hip-hop-alternative-glitch-hop', label: 'Glitch Hop' },
        ],
      },
      {
        id: 'hip-hop-southern',
        label: 'Southern Hip Hop',
        children: [
          { id: 'hip-hop-southern-bounce', label: 'Bounce' },
          { id: 'hip-hop-southern-dirty-south', label: 'Dirty South' },
          { id: 'hip-hop-southern-houston', label: 'Houston Rap' },
          { id: 'hip-hop-southern-atlanta', label: 'Atlanta Rap' },
        ],
      },
      {
        id: 'hip-hop-pop-rap',
        label: 'Pop Rap',
        children: [
          { id: 'hip-hop-pop-rap-radio', label: 'Radio Rap' },
          { id: 'hip-hop-pop-rap-crossover', label: 'Crossover Rap' },
          { id: 'hip-hop-pop-rap-party', label: 'Party Rap' },
        ],
      },
      {
        id: 'hip-hop-soundcloud',
        label: 'SoundCloud Rap',
        children: [
          { id: 'hip-hop-soundcloud-emo', label: 'Emo SoundCloud' },
          { id: 'hip-hop-soundcloud-lofi', label: 'Lo-fi SoundCloud' },
          { id: 'hip-hop-soundcloud-diy', label: 'DIY Rap' },
        ],
      },
    ],
  },

  // ─────────────────────────────────────────────
  // ELECTRONIC / DANCE
  // ─────────────────────────────────────────────
  {
    id: 'electronic',
    label: 'Electronic',
    children: [
      {
        id: 'electronic-house',
        label: 'House',
        children: [
          { id: 'electronic-house-deep', label: 'Deep House' },
          { id: 'electronic-house-tech', label: 'Tech House' },
          { id: 'electronic-house-chicago', label: 'Chicago House' },
          { id: 'electronic-house-detroit', label: 'Detroit House' },
          { id: 'electronic-house-afro', label: 'Afro House' },
          { id: 'electronic-house-vocal', label: 'Vocal House' },
          { id: 'electronic-house-garage', label: 'Garage House' },
          { id: 'electronic-house-progressive', label: 'Progressive House' },
          { id: 'electronic-house-acid', label: 'Acid House' },
          { id: 'electronic-house-funky', label: 'Funky House' },
          { id: 'electronic-house-latin', label: 'Latin House' },
          { id: 'electronic-house-soulful', label: 'Soulful House' },
          { id: 'electronic-house-minimal', label: 'Minimal House' },
          { id: 'electronic-house-electro', label: 'Electro House' },
          { id: 'electronic-house-ballroom', label: 'Ballroom House' },
          { id: 'electronic-house-jersey-club', label: 'Jersey Club' },
          { id: 'electronic-house-melodic', label: 'Melodic House' },
          { id: 'electronic-house-micro', label: 'Microhouse' },
        ],
      },
      {
        id: 'electronic-techno',
        label: 'Techno',
        children: [
          { id: 'electronic-techno-minimal', label: 'Minimal Techno' },
          { id: 'electronic-techno-industrial', label: 'Industrial Techno' },
          { id: 'electronic-techno-detroit', label: 'Detroit Techno' },
          { id: 'electronic-techno-acid', label: 'Acid Techno' },
          { id: 'electronic-techno-hard', label: 'Hard Techno' },
          { id: 'electronic-techno-dub', label: 'Dub Techno' },
          { id: 'electronic-techno-melodic', label: 'Melodic Techno' },
          { id: 'electronic-techno-dark', label: 'Dark Techno' },
          { id: 'electronic-techno-peak-time', label: 'Peak Time Techno' },
          { id: 'electronic-techno-hypnotic', label: 'Hypnotic Techno' },
        ],
      },
      {
        id: 'electronic-ambient',
        label: 'Ambient',
        children: [
          { id: 'electronic-ambient-dark', label: 'Dark Ambient' },
          { id: 'electronic-ambient-drone', label: 'Drone' },
          { id: 'electronic-ambient-space', label: 'Space Ambient' },
          { id: 'electronic-ambient-nature', label: 'Nature Ambient' },
          { id: 'electronic-ambient-generative', label: 'Generative Ambient' },
          { id: 'electronic-ambient-new-age', label: 'New Age Ambient' },
          { id: 'electronic-ambient-ethereal', label: 'Ethereal Ambient' },
          { id: 'electronic-ambient-tape-loops', label: 'Tape Loop Ambient' },
        ],
      },
      {
        id: 'electronic-dubstep',
        label: 'Dubstep',
        children: [
          { id: 'electronic-dubstep-riddim', label: 'Riddim' },
          { id: 'electronic-dubstep-melodic', label: 'Melodic Dubstep' },
          { id: 'electronic-dubstep-brostep', label: 'Brostep' },
          { id: 'electronic-dubstep-deep', label: 'Deep Dubstep' },
          { id: 'electronic-dubstep-tearout', label: 'Tearout' },
          { id: 'electronic-dubstep-chillstep', label: 'Chillstep' },
        ],
      },
      {
        id: 'electronic-dnb',
        label: 'Drum & Bass',
        children: [
          { id: 'electronic-dnb-liquid', label: 'Liquid DnB' },
          { id: 'electronic-dnb-jungle', label: 'Jungle' },
          { id: 'electronic-dnb-neurofunk', label: 'Neurofunk' },
          { id: 'electronic-dnb-jump-up', label: 'Jump Up' },
          { id: 'electronic-dnb-darkstep', label: 'Darkstep' },
          { id: 'electronic-dnb-rollers', label: 'Rollers' },
          { id: 'electronic-dnb-halftime', label: 'Halftime DnB' },
          { id: 'electronic-dnb-ragga', label: 'Ragga Jungle' },
        ],
      },
      {
        id: 'electronic-trance',
        label: 'Trance',
        children: [
          { id: 'electronic-trance-progressive', label: 'Progressive Trance' },
          { id: 'electronic-trance-psytrance', label: 'Psytrance' },
          { id: 'electronic-trance-uplifting', label: 'Uplifting Trance' },
          { id: 'electronic-trance-vocal', label: 'Vocal Trance' },
          { id: 'electronic-trance-goa', label: 'Goa Trance' },
          { id: 'electronic-trance-hard', label: 'Hard Trance' },
          { id: 'electronic-trance-dark-psy', label: 'Dark Psytrance' },
          { id: 'electronic-trance-full-on', label: 'Full On' },
        ],
      },
      {
        id: 'electronic-synthwave',
        label: 'Synthwave',
        children: [
          { id: 'electronic-synthwave-retrowave', label: 'Retrowave' },
          { id: 'electronic-synthwave-darksynth', label: 'Darksynth' },
          { id: 'electronic-synthwave-outrun', label: 'Outrun' },
          { id: 'electronic-synthwave-chillwave', label: 'Chillwave' },
          { id: 'electronic-synthwave-vaporwave', label: 'Vaporwave' },
          { id: 'electronic-synthwave-cyberpunk', label: 'Cyberpunk Synth' },
          { id: 'electronic-synthwave-sovietwave', label: 'Sovietwave' },
        ],
      },
      {
        id: 'electronic-idm',
        label: 'IDM',
        children: [
          { id: 'electronic-idm-glitch', label: 'Glitch' },
          { id: 'electronic-idm-experimental', label: 'Experimental Electronic' },
          { id: 'electronic-idm-braindance', label: 'Braindance' },
          { id: 'electronic-idm-abstract', label: 'Abstract Electronic' },
          { id: 'electronic-idm-microsound', label: 'Microsound' },
        ],
      },
      {
        id: 'electronic-breakbeat',
        label: 'Breakbeat',
        children: [
          { id: 'electronic-breakbeat-big-beat', label: 'Big Beat' },
          { id: 'electronic-breakbeat-florida', label: 'Florida Breaks' },
          { id: 'electronic-breakbeat-nu-skool', label: 'Nu Skool Breaks' },
          { id: 'electronic-breakbeat-breakcore', label: 'Breakcore' },
          { id: 'electronic-breakbeat-amen', label: 'Amen Break' },
        ],
      },
      {
        id: 'electronic-uk-garage',
        label: 'UK Garage',
        children: [
          { id: 'electronic-uk-garage-2step', label: '2-Step' },
          { id: 'electronic-uk-garage-speed', label: 'Speed Garage' },
          { id: 'electronic-uk-garage-bassline', label: 'Bassline' },
          { id: 'electronic-uk-garage-future', label: 'Future Garage' },
        ],
      },
      {
        id: 'electronic-downtempo',
        label: 'Downtempo',
        children: [
          { id: 'electronic-downtempo-trip-hop', label: 'Trip Hop' },
          { id: 'electronic-downtempo-chillout', label: 'Chillout' },
          { id: 'electronic-downtempo-lounge', label: 'Lounge' },
          { id: 'electronic-downtempo-balearic', label: 'Balearic' },
          { id: 'electronic-downtempo-psybient', label: 'Psybient' },
        ],
      },
      {
        id: 'electronic-hardstyle',
        label: 'Hardstyle',
        children: [
          { id: 'electronic-hardstyle-euphoric', label: 'Euphoric Hardstyle' },
          { id: 'electronic-hardstyle-rawstyle', label: 'Rawstyle' },
          { id: 'electronic-hardstyle-hardcore', label: 'Hardcore (Gabber)' },
          { id: 'electronic-hardstyle-frenchcore', label: 'Frenchcore' },
          { id: 'electronic-hardstyle-happy-hardcore', label: 'Happy Hardcore' },
        ],
      },
      {
        id: 'electronic-disco',
        label: 'Disco / Nu-Disco',
        children: [
          { id: 'electronic-disco-nu', label: 'Nu-Disco' },
          { id: 'electronic-disco-italo', label: 'Italo Disco' },
          { id: 'electronic-disco-space', label: 'Space Disco' },
          { id: 'electronic-disco-french-touch', label: 'French Touch' },
          { id: 'electronic-disco-boogie', label: 'Boogie' },
        ],
      },
      {
        id: 'electronic-edm',
        label: 'EDM / Festival',
        children: [
          { id: 'electronic-edm-big-room', label: 'Big Room' },
          { id: 'electronic-edm-future-bass', label: 'Future Bass' },
          { id: 'electronic-edm-tropical', label: 'Tropical House' },
          { id: 'electronic-edm-future-bounce', label: 'Future Bounce' },
          { id: 'electronic-edm-slap-house', label: 'Slap House' },
          { id: 'electronic-edm-bass-house', label: 'Bass House' },
        ],
      },
    ],
  },

  // ─────────────────────────────────────────────
  // R&B / SOUL
  // ─────────────────────────────────────────────
  {
    id: 'rnb',
    label: 'R&B',
    children: [
      {
        id: 'rnb-neo-soul',
        label: 'Neo-Soul',
        children: [
          { id: 'rnb-neo-soul-conscious', label: 'Conscious Soul' },
          { id: 'rnb-neo-soul-nu-jazz', label: 'Nu Jazz Soul' },
          { id: 'rnb-neo-soul-organic', label: 'Organic Neo-Soul' },
          { id: 'rnb-neo-soul-psychedelic', label: 'Psychedelic Soul' },
          { id: 'rnb-neo-soul-retro', label: 'Retro Soul' },
        ],
      },
      {
        id: 'rnb-alternative',
        label: 'Alternative R&B',
        children: [
          { id: 'rnb-alternative-experimental', label: 'Experimental R&B' },
          { id: 'rnb-alternative-art', label: 'Art R&B' },
          { id: 'rnb-alternative-dark', label: 'Dark R&B' },
          { id: 'rnb-alternative-indie', label: 'Indie R&B' },
          { id: 'rnb-alternative-electronic', label: 'Electronic R&B' },
        ],
      },
      {
        id: 'rnb-pbr',
        label: 'PBR&B',
        children: [
          { id: 'rnb-pbr-hazy', label: 'Hazy PBR&B' },
          { id: 'rnb-pbr-moody', label: 'Moody PBR&B' },
          { id: 'rnb-pbr-minimalist', label: 'Minimalist PBR&B' },
        ],
      },
      {
        id: 'rnb-trapsoul',
        label: 'Trapsoul',
        children: [
          { id: 'rnb-trapsoul-melodic', label: 'Melodic Trapsoul' },
          { id: 'rnb-trapsoul-dark', label: 'Dark Trapsoul' },
          { id: 'rnb-trapsoul-vibey', label: 'Vibey Trapsoul' },
          { id: 'rnb-trapsoul-late-night', label: 'Late Night Trapsoul' },
        ],
      },
      {
        id: 'rnb-quiet-storm',
        label: 'Quiet Storm',
        children: [
          { id: 'rnb-quiet-storm-classic', label: 'Classic Quiet Storm' },
          { id: 'rnb-quiet-storm-modern', label: 'Modern Quiet Storm' },
          { id: 'rnb-quiet-storm-slow-jam', label: 'Slow Jam' },
        ],
      },
      {
        id: 'rnb-new-jack-swing',
        label: 'New Jack Swing',
        children: [
          { id: 'rnb-new-jack-swing-classic', label: 'Classic New Jack' },
          { id: 'rnb-new-jack-swing-modern', label: 'Modern New Jack' },
          { id: 'rnb-new-jack-swing-uptempo', label: 'Uptempo New Jack' },
        ],
      },
      {
        id: 'rnb-contemporary',
        label: 'Contemporary R&B',
        children: [
          { id: 'rnb-contemporary-pop', label: 'Pop R&B' },
          { id: 'rnb-contemporary-urban', label: 'Urban Contemporary' },
          { id: 'rnb-contemporary-dance', label: 'Dance R&B' },
          { id: 'rnb-contemporary-90s', label: '90s R&B' },
          { id: 'rnb-contemporary-2000s', label: '2000s R&B' },
        ],
      },
      {
        id: 'rnb-funk',
        label: 'Funk',
        children: [
          { id: 'rnb-funk-classic', label: 'Classic Funk' },
          { id: 'rnb-funk-electro', label: 'Electro Funk' },
          { id: 'rnb-funk-p-funk', label: 'P-Funk' },
          { id: 'rnb-funk-modern', label: 'Modern Funk' },
          { id: 'rnb-funk-boogie', label: 'Boogie Funk' },
        ],
      },
      {
        id: 'rnb-classic-soul',
        label: 'Classic Soul',
        children: [
          { id: 'rnb-classic-soul-motown', label: 'Motown' },
          { id: 'rnb-classic-soul-northern', label: 'Northern Soul' },
          { id: 'rnb-classic-soul-southern', label: 'Southern Soul' },
          { id: 'rnb-classic-soul-philly', label: 'Philly Soul' },
        ],
      },
    ],
  },

  // ─────────────────────────────────────────────
  // ROCK
  // ─────────────────────────────────────────────
  {
    id: 'rock',
    label: 'Rock',
    children: [
      {
        id: 'rock-indie',
        label: 'Indie Rock',
        children: [
          { id: 'rock-indie-lo-fi', label: 'Lo-Fi Rock' },
          { id: 'rock-indie-noise', label: 'Noise Rock' },
          { id: 'rock-indie-jangle', label: 'Jangle Pop' },
          { id: 'rock-indie-twee', label: 'Twee Pop' },
          { id: 'rock-indie-slowcore', label: 'Slowcore' },
          { id: 'rock-indie-midwest-emo', label: 'Midwest Emo' },
          { id: 'rock-indie-math', label: 'Math Rock' },
        ],
      },
      {
        id: 'rock-psychedelic',
        label: 'Psychedelic Rock',
        children: [
          { id: 'rock-psychedelic-space', label: 'Space Rock' },
          { id: 'rock-psychedelic-acid', label: 'Acid Rock' },
          { id: 'rock-psychedelic-neo', label: 'Neo-Psychedelia' },
          { id: 'rock-psychedelic-stoner', label: 'Stoner Rock' },
          { id: 'rock-psychedelic-krautrock', label: 'Krautrock' },
        ],
      },
      {
        id: 'rock-post-rock',
        label: 'Post-Rock',
        children: [
          { id: 'rock-post-rock-cinematic', label: 'Cinematic Post-Rock' },
          { id: 'rock-post-rock-ambient', label: 'Ambient Post-Rock' },
          { id: 'rock-post-rock-crescendo', label: 'Crescendocore' },
          { id: 'rock-post-rock-experimental', label: 'Experimental Post-Rock' },
        ],
      },
      {
        id: 'rock-garage',
        label: 'Garage Rock',
        children: [
          { id: 'rock-garage-60s', label: '60s Garage' },
          { id: 'rock-garage-revival', label: 'Garage Revival' },
          { id: 'rock-garage-surf', label: 'Surf Rock' },
          { id: 'rock-garage-raw', label: 'Raw Garage' },
        ],
      },
      {
        id: 'rock-shoegaze',
        label: 'Shoegaze',
        children: [
          { id: 'rock-shoegaze-classic', label: 'Classic Shoegaze' },
          { id: 'rock-shoegaze-nu', label: 'Nu-Gaze' },
          { id: 'rock-shoegaze-blackgaze', label: 'Blackgaze' },
          { id: 'rock-shoegaze-dreampop', label: 'Dream Pop Shoegaze' },
        ],
      },
      {
        id: 'rock-alt',
        label: 'Alternative Rock',
        children: [
          { id: 'rock-alt-grunge', label: 'Grunge' },
          { id: 'rock-alt-britpop', label: 'Britpop' },
          { id: 'rock-alt-90s', label: '90s Alt Rock' },
          { id: 'rock-alt-2000s', label: '2000s Alt Rock' },
          { id: 'rock-alt-college', label: 'College Rock' },
        ],
      },
      {
        id: 'rock-progressive',
        label: 'Progressive Rock',
        children: [
          { id: 'rock-progressive-classic', label: 'Classic Prog' },
          { id: 'rock-progressive-neo', label: 'Neo-Prog' },
          { id: 'rock-progressive-symphonic', label: 'Symphonic Prog' },
          { id: 'rock-progressive-canterbury', label: 'Canterbury Scene' },
          { id: 'rock-progressive-zeuhl', label: 'Zeuhl' },
        ],
      },
      {
        id: 'rock-hard',
        label: 'Hard Rock',
        children: [
          { id: 'rock-hard-classic', label: 'Classic Hard Rock' },
          { id: 'rock-hard-arena', label: 'Arena Rock' },
          { id: 'rock-hard-blues-rock', label: 'Blues Rock' },
          { id: 'rock-hard-southern', label: 'Southern Rock' },
          { id: 'rock-hard-glam', label: 'Glam Rock' },
        ],
      },
      {
        id: 'rock-folk-rock',
        label: 'Folk Rock',
        children: [
          { id: 'rock-folk-rock-60s', label: '60s Folk Rock' },
          { id: 'rock-folk-rock-celtic', label: 'Celtic Rock' },
          { id: 'rock-folk-rock-americana', label: 'Americana Rock' },
        ],
      },
      {
        id: 'rock-new-wave',
        label: 'New Wave',
        children: [
          { id: 'rock-new-wave-synth', label: 'Synth New Wave' },
          { id: 'rock-new-wave-goth', label: 'Gothic Rock' },
          { id: 'rock-new-wave-cold-wave', label: 'Cold Wave' },
          { id: 'rock-new-wave-dark-wave', label: 'Dark Wave' },
        ],
      },
    ],
  },

  // ─────────────────────────────────────────────
  // JAZZ
  // ─────────────────────────────────────────────
  {
    id: 'jazz',
    label: 'Jazz',
    children: [
      {
        id: 'jazz-smooth',
        label: 'Smooth Jazz',
        children: [
          { id: 'jazz-smooth-contemporary', label: 'Contemporary Smooth' },
          { id: 'jazz-smooth-pop', label: 'Jazz Pop' },
          { id: 'jazz-smooth-r-and-b', label: 'R&B Jazz' },
          { id: 'jazz-smooth-saxophone', label: 'Saxophone Smooth' },
        ],
      },
      {
        id: 'jazz-bebop',
        label: 'Bebop',
        children: [
          { id: 'jazz-bebop-hard-bop', label: 'Hard Bop' },
          { id: 'jazz-bebop-post-bop', label: 'Post-Bop' },
          { id: 'jazz-bebop-classic', label: 'Classic Bebop' },
          { id: 'jazz-bebop-neo-bop', label: 'Neo-Bop' },
        ],
      },
      {
        id: 'jazz-modal',
        label: 'Modal Jazz',
        children: [
          { id: 'jazz-modal-classic', label: 'Classic Modal' },
          { id: 'jazz-modal-spiritual', label: 'Spiritual Jazz' },
          { id: 'jazz-modal-meditative', label: 'Meditative Jazz' },
        ],
      },
      {
        id: 'jazz-nu',
        label: 'Nu Jazz',
        children: [
          { id: 'jazz-nu-electronic', label: 'Electronic Jazz' },
          { id: 'jazz-nu-broken-beat', label: 'Broken Beat Jazz' },
          { id: 'jazz-nu-hip-hop', label: 'Jazz Hip Hop' },
          { id: 'jazz-nu-future', label: 'Future Jazz' },
        ],
      },
      {
        id: 'jazz-dark',
        label: 'Dark Jazz',
        children: [
          { id: 'jazz-dark-noir', label: 'Jazz Noir' },
          { id: 'jazz-dark-doom', label: 'Doom Jazz' },
          { id: 'jazz-dark-cinematic', label: 'Cinematic Dark Jazz' },
        ],
      },
      {
        id: 'jazz-fusion',
        label: 'Jazz Fusion',
        children: [
          { id: 'jazz-fusion-funk', label: 'Funk Fusion' },
          { id: 'jazz-fusion-rock', label: 'Rock Fusion' },
          { id: 'jazz-fusion-progressive', label: 'Progressive Fusion' },
          { id: 'jazz-fusion-electric', label: 'Electric Fusion' },
          { id: 'jazz-fusion-math', label: 'Math Fusion' },
        ],
      },
      {
        id: 'jazz-acid',
        label: 'Acid Jazz',
        children: [
          { id: 'jazz-acid-classic', label: 'Classic Acid Jazz' },
          { id: 'jazz-acid-modern', label: 'Modern Acid Jazz' },
          { id: 'jazz-acid-groovy', label: 'Groovy Acid Jazz' },
        ],
      },
      {
        id: 'jazz-cool',
        label: 'Cool Jazz',
        children: [
          { id: 'jazz-cool-west-coast', label: 'West Coast Cool' },
          { id: 'jazz-cool-bossa', label: 'Bossa Cool Jazz' },
          { id: 'jazz-cool-chamber', label: 'Chamber Jazz' },
        ],
      },
      {
        id: 'jazz-free',
        label: 'Free Jazz',
        children: [
          { id: 'jazz-free-avant-garde', label: 'Avant-Garde Jazz' },
          { id: 'jazz-free-energy', label: 'Energy Music' },
          { id: 'jazz-free-noise', label: 'Noise Jazz' },
        ],
      },
      {
        id: 'jazz-swing',
        label: 'Swing',
        children: [
          { id: 'jazz-swing-big-band', label: 'Big Band' },
          { id: 'jazz-swing-gypsy', label: 'Gypsy Jazz' },
          { id: 'jazz-swing-electro', label: 'Electro Swing' },
          { id: 'jazz-swing-lindy-hop', label: 'Lindy Hop' },
        ],
      },
      {
        id: 'jazz-latin',
        label: 'Latin Jazz',
        children: [
          { id: 'jazz-latin-afro-cuban', label: 'Afro-Cuban Jazz' },
          { id: 'jazz-latin-bossa-nova', label: 'Bossa Nova Jazz' },
          { id: 'jazz-latin-samba', label: 'Samba Jazz' },
        ],
      },
    ],
  },

  // ─────────────────────────────────────────────
  // POP
  // ─────────────────────────────────────────────
  {
    id: 'pop',
    label: 'Pop',
    children: [
      {
        id: 'pop-synth',
        label: 'Synth-Pop',
        children: [
          { id: 'pop-synth-80s', label: '80s Synth-Pop' },
          { id: 'pop-synth-modern', label: 'Modern Synth-Pop' },
          { id: 'pop-synth-dark', label: 'Dark Synth-Pop' },
          { id: 'pop-synth-minimal', label: 'Minimal Synth-Pop' },
          { id: 'pop-synth-new-romantic', label: 'New Romantic' },
        ],
      },
      {
        id: 'pop-dream',
        label: 'Dream Pop',
        children: [
          { id: 'pop-dream-ethereal', label: 'Ethereal Dream Pop' },
          { id: 'pop-dream-dark', label: 'Dark Dream Pop' },
          { id: 'pop-dream-shoegaze', label: 'Shoegaze Dream Pop' },
          { id: 'pop-dream-ambient', label: 'Ambient Dream Pop' },
        ],
      },
      {
        id: 'pop-city',
        label: 'City Pop',
        children: [
          { id: 'pop-city-classic', label: 'Classic City Pop' },
          { id: 'pop-city-modern', label: 'Modern City Pop' },
          { id: 'pop-city-future-funk', label: 'Future Funk' },
          { id: 'pop-city-night-drive', label: 'Night Drive City Pop' },
        ],
      },
      {
        id: 'pop-hyperpop',
        label: 'Hyperpop',
        children: [
          { id: 'pop-hyperpop-glitchcore', label: 'Glitchcore' },
          { id: 'pop-hyperpop-bubblegum-bass', label: 'Bubblegum Bass' },
          { id: 'pop-hyperpop-deconstructed', label: 'Deconstructed Club' },
          { id: 'pop-hyperpop-digicore', label: 'Digicore' },
        ],
      },
      {
        id: 'pop-electropop',
        label: 'Electropop',
        children: [
          { id: 'pop-electropop-dance', label: 'Dance Electropop' },
          { id: 'pop-electropop-indie', label: 'Indie Electropop' },
          { id: 'pop-electropop-dark', label: 'Dark Electropop' },
        ],
      },
      {
        id: 'pop-kpop',
        label: 'K-Pop',
        children: [
          { id: 'pop-kpop-boy-group', label: 'K-Pop Boy Group' },
          { id: 'pop-kpop-girl-group', label: 'K-Pop Girl Group' },
          { id: 'pop-kpop-ballad', label: 'K-Pop Ballad' },
          { id: 'pop-kpop-rnb', label: 'K-R&B' },
          { id: 'pop-kpop-hip-hop', label: 'K-Hip-Hop' },
        ],
      },
      {
        id: 'pop-dance',
        label: 'Dance Pop',
        children: [
          { id: 'pop-dance-euro', label: 'Euro Pop' },
          { id: 'pop-dance-disco', label: 'Disco Pop' },
          { id: 'pop-dance-hi-nrg', label: 'Hi-NRG' },
          { id: 'pop-dance-eurodance', label: 'Eurodance' },
        ],
      },
      {
        id: 'pop-art',
        label: 'Art Pop',
        children: [
          { id: 'pop-art-avant', label: 'Avant-Pop' },
          { id: 'pop-art-experimental', label: 'Experimental Pop' },
          { id: 'pop-art-baroque', label: 'Baroque Pop' },
          { id: 'pop-art-chamber', label: 'Chamber Pop' },
        ],
      },
      {
        id: 'pop-indie',
        label: 'Indie Pop',
        children: [
          { id: 'pop-indie-bedroom', label: 'Bedroom Pop' },
          { id: 'pop-indie-folk', label: 'Indie Folk Pop' },
          { id: 'pop-indie-twee', label: 'Twee' },
          { id: 'pop-indie-lofi', label: 'Lo-fi Pop' },
        ],
      },
      {
        id: 'pop-jpop',
        label: 'J-Pop',
        children: [
          { id: 'pop-jpop-idol', label: 'J-Pop Idol' },
          { id: 'pop-jpop-city', label: 'J-Pop City' },
          { id: 'pop-jpop-shibuya-kei', label: 'Shibuya-kei' },
          { id: 'pop-jpop-vocaloid', label: 'Vocaloid' },
        ],
      },
      {
        id: 'pop-power',
        label: 'Power Pop',
        children: [
          { id: 'pop-power-classic', label: 'Classic Power Pop' },
          { id: 'pop-power-modern', label: 'Modern Power Pop' },
        ],
      },
    ],
  },

  // ─────────────────────────────────────────────
  // CLASSICAL
  // ─────────────────────────────────────────────
  {
    id: 'classical',
    label: 'Classical',
    children: [
      {
        id: 'classical-baroque',
        label: 'Baroque',
        children: [
          { id: 'classical-baroque-harpsichord', label: 'Harpsichord' },
          { id: 'classical-baroque-early', label: 'Early Music' },
          { id: 'classical-baroque-concerto', label: 'Baroque Concerto' },
          { id: 'classical-baroque-cantata', label: 'Cantata' },
        ],
      },
      {
        id: 'classical-romantic',
        label: 'Romantic',
        children: [
          { id: 'classical-romantic-orchestral', label: 'Romantic Orchestral' },
          { id: 'classical-romantic-piano', label: 'Romantic Piano' },
          { id: 'classical-romantic-lieder', label: 'Lieder' },
          { id: 'classical-romantic-late', label: 'Late Romantic' },
          { id: 'classical-romantic-virtuoso', label: 'Virtuoso' },
        ],
      },
      {
        id: 'classical-neoclassical',
        label: 'Neoclassical',
        children: [
          { id: 'classical-neoclassical-modern', label: 'Modern Neoclassical' },
          { id: 'classical-neoclassical-piano', label: 'Neoclassical Piano' },
          { id: 'classical-neoclassical-ambient', label: 'Ambient Neoclassical' },
          { id: 'classical-neoclassical-dark', label: 'Dark Neoclassical' },
        ],
      },
      {
        id: 'classical-cinematic',
        label: 'Cinematic Classical',
        children: [
          { id: 'classical-cinematic-epic', label: 'Epic Orchestral' },
          { id: 'classical-cinematic-emotional', label: 'Emotional Strings' },
          { id: 'classical-cinematic-adventure', label: 'Adventure Score' },
          { id: 'classical-cinematic-tension', label: 'Tension Underscore' },
        ],
      },
      {
        id: 'classical-minimalist',
        label: 'Minimalist',
        children: [
          { id: 'classical-minimalist-piano', label: 'Minimalist Piano' },
          { id: 'classical-minimalist-process', label: 'Process Music' },
          { id: 'classical-minimalist-post', label: 'Post-Minimalism' },
          { id: 'classical-minimalist-repetitive', label: 'Repetitive Music' },
        ],
      },
      {
        id: 'classical-contemporary',
        label: 'Contemporary Classical',
        children: [
          { id: 'classical-contemporary-spectral', label: 'Spectral Music' },
          { id: 'classical-contemporary-aleatoric', label: 'Aleatoric Music' },
          { id: 'classical-contemporary-electronic', label: 'Electroacoustic' },
          { id: 'classical-contemporary-microtonal', label: 'Microtonal' },
          { id: 'classical-contemporary-avant-garde', label: 'Avant-Garde Classical' },
        ],
      },
      {
        id: 'classical-orchestral',
        label: 'Orchestral',
        children: [
          { id: 'classical-orchestral-symphonic', label: 'Symphonic' },
          { id: 'classical-orchestral-chamber', label: 'Chamber Orchestra' },
          { id: 'classical-orchestral-overture', label: 'Overture' },
          { id: 'classical-orchestral-tone-poem', label: 'Tone Poem' },
        ],
      },
      {
        id: 'classical-chamber',
        label: 'Chamber Music',
        children: [
          { id: 'classical-chamber-string-quartet', label: 'String Quartet' },
          { id: 'classical-chamber-piano-trio', label: 'Piano Trio' },
          { id: 'classical-chamber-wind', label: 'Wind Ensemble' },
          { id: 'classical-chamber-solo-piano', label: 'Solo Piano' },
        ],
      },
      {
        id: 'classical-opera',
        label: 'Opera',
        children: [
          { id: 'classical-opera-grand', label: 'Grand Opera' },
          { id: 'classical-opera-buffa', label: 'Opera Buffa' },
          { id: 'classical-opera-verismo', label: 'Verismo' },
          { id: 'classical-opera-modern', label: 'Modern Opera' },
        ],
      },
    ],
  },

  // ─────────────────────────────────────────────
  // FOLK / WORLD
  // ─────────────────────────────────────────────
  {
    id: 'folk-world',
    label: 'Folk / World',
    children: [
      {
        id: 'folk-world-afrobeat',
        label: 'Afrobeat',
        children: [
          { id: 'folk-world-afrobeat-classic', label: 'Classic Afrobeat' },
          { id: 'folk-world-afrobeat-modern', label: 'Modern Afrobeats' },
          { id: 'folk-world-afrobeat-afro-pop', label: 'Afro-Pop' },
          { id: 'folk-world-afrobeat-afro-fusion', label: 'Afro-Fusion' },
          { id: 'folk-world-afrobeat-amapiano', label: 'Amapiano' },
        ],
      },
      {
        id: 'folk-world-reggae',
        label: 'Reggae',
        children: [
          { id: 'folk-world-reggae-roots', label: 'Roots Reggae' },
          { id: 'folk-world-reggae-dub', label: 'Dub' },
          { id: 'folk-world-reggae-lovers-rock', label: 'Lovers Rock' },
          { id: 'folk-world-reggae-digital', label: 'Digital Reggae' },
          { id: 'folk-world-reggae-ragga', label: 'Ragga' },
          { id: 'folk-world-reggae-steppers', label: 'Steppers' },
        ],
      },
      {
        id: 'folk-world-dancehall',
        label: 'Dancehall',
        children: [
          { id: 'folk-world-dancehall-modern', label: 'Modern Dancehall' },
          { id: 'folk-world-dancehall-bashment', label: 'Bashment' },
          { id: 'folk-world-dancehall-90s', label: '90s Dancehall' },
          { id: 'folk-world-dancehall-digital', label: 'Digital Dancehall' },
        ],
      },
      {
        id: 'folk-world-bossa-nova',
        label: 'Bossa Nova',
        children: [
          { id: 'folk-world-bossa-nova-classic', label: 'Classic Bossa' },
          { id: 'folk-world-bossa-nova-modern', label: 'Modern Bossa' },
          { id: 'folk-world-bossa-nova-mpb', label: 'MPB' },
          { id: 'folk-world-bossa-nova-tropicalia', label: 'Tropicalia' },
        ],
      },
      {
        id: 'folk-world-celtic',
        label: 'Celtic',
        children: [
          { id: 'folk-world-celtic-irish', label: 'Irish Traditional' },
          { id: 'folk-world-celtic-scottish', label: 'Scottish Folk' },
          { id: 'folk-world-celtic-breton', label: 'Breton' },
          { id: 'folk-world-celtic-modern', label: 'Modern Celtic' },
          { id: 'folk-world-celtic-celtic-rock', label: 'Celtic Rock' },
        ],
      },
      {
        id: 'folk-world-flamenco',
        label: 'Flamenco',
        children: [
          { id: 'folk-world-flamenco-traditional', label: 'Traditional Flamenco' },
          { id: 'folk-world-flamenco-nuevo', label: 'Nuevo Flamenco' },
          { id: 'folk-world-flamenco-fusion', label: 'Flamenco Fusion' },
          { id: 'folk-world-flamenco-rumba', label: 'Rumba Flamenca' },
        ],
      },
      {
        id: 'folk-world-cumbia',
        label: 'Cumbia',
        children: [
          { id: 'folk-world-cumbia-digital', label: 'Digital Cumbia' },
          { id: 'folk-world-cumbia-villera', label: 'Cumbia Villera' },
          { id: 'folk-world-cumbia-colombian', label: 'Colombian Cumbia' },
          { id: 'folk-world-cumbia-mexican', label: 'Mexican Cumbia' },
          { id: 'folk-world-cumbia-psychedelic', label: 'Psychedelic Cumbia' },
        ],
      },
      {
        id: 'folk-world-latin',
        label: 'Latin',
        children: [
          { id: 'folk-world-latin-reggaeton', label: 'Reggaeton' },
          { id: 'folk-world-latin-salsa', label: 'Salsa' },
          { id: 'folk-world-latin-bachata', label: 'Bachata' },
          { id: 'folk-world-latin-merengue', label: 'Merengue' },
          { id: 'folk-world-latin-corridos', label: 'Corridos Tumbados' },
          { id: 'folk-world-latin-norteño', label: 'Norteño' },
          { id: 'folk-world-latin-mariachi', label: 'Mariachi' },
          { id: 'folk-world-latin-dembow', label: 'Dembow' },
        ],
      },
      {
        id: 'folk-world-middle-eastern',
        label: 'Middle Eastern',
        children: [
          { id: 'folk-world-middle-eastern-arabic-pop', label: 'Arabic Pop' },
          { id: 'folk-world-middle-eastern-sufi', label: 'Sufi Music' },
          { id: 'folk-world-middle-eastern-turkish', label: 'Turkish Folk' },
          { id: 'folk-world-middle-eastern-persian', label: 'Persian' },
          { id: 'folk-world-middle-eastern-oud', label: 'Oud Music' },
        ],
      },
      {
        id: 'folk-world-indian',
        label: 'Indian',
        children: [
          { id: 'folk-world-indian-hindustani', label: 'Hindustani Classical' },
          { id: 'folk-world-indian-carnatic', label: 'Carnatic' },
          { id: 'folk-world-indian-bollywood', label: 'Bollywood' },
          { id: 'folk-world-indian-raga', label: 'Raga' },
          { id: 'folk-world-indian-bhangra', label: 'Bhangra' },
        ],
      },
      {
        id: 'folk-world-east-asian',
        label: 'East Asian',
        children: [
          { id: 'folk-world-east-asian-cpop', label: 'C-Pop' },
          { id: 'folk-world-east-asian-enka', label: 'Enka' },
          { id: 'folk-world-east-asian-traditional-chinese', label: 'Traditional Chinese' },
          { id: 'folk-world-east-asian-traditional-japanese', label: 'Traditional Japanese' },
          { id: 'folk-world-east-asian-gamelan', label: 'Gamelan' },
        ],
      },
      {
        id: 'folk-world-african',
        label: 'African Traditional',
        children: [
          { id: 'folk-world-african-highlife', label: 'Highlife' },
          { id: 'folk-world-african-soukous', label: 'Soukous' },
          { id: 'folk-world-african-gqom', label: 'Gqom' },
          { id: 'folk-world-african-kwaito', label: 'Kwaito' },
          { id: 'folk-world-african-juju', label: 'Juju Music' },
          { id: 'folk-world-african-mbalax', label: 'Mbalax' },
        ],
      },
      {
        id: 'folk-world-folk',
        label: 'Folk',
        children: [
          { id: 'folk-world-folk-acoustic', label: 'Acoustic Folk' },
          { id: 'folk-world-folk-indie', label: 'Indie Folk' },
          { id: 'folk-world-folk-singer-songwriter', label: 'Singer-Songwriter' },
          { id: 'folk-world-folk-neofolk', label: 'Neofolk' },
          { id: 'folk-world-folk-appalachian', label: 'Appalachian' },
          { id: 'folk-world-folk-protest', label: 'Protest Folk' },
        ],
      },
      {
        id: 'folk-world-soca',
        label: 'Soca',
        children: [
          { id: 'folk-world-soca-power', label: 'Power Soca' },
          { id: 'folk-world-soca-groovy', label: 'Groovy Soca' },
          { id: 'folk-world-soca-calypso', label: 'Calypso' },
        ],
      },
    ],
  },

  // ─────────────────────────────────────────────
  // METAL
  // ─────────────────────────────────────────────
  {
    id: 'metal',
    label: 'Metal',
    children: [
      {
        id: 'metal-death',
        label: 'Death Metal',
        children: [
          { id: 'metal-death-melodic', label: 'Melodic Death Metal' },
          { id: 'metal-death-technical', label: 'Technical Death Metal' },
          { id: 'metal-death-brutal', label: 'Brutal Death Metal' },
          { id: 'metal-death-old-school', label: 'Old School Death Metal' },
          { id: 'metal-death-slam', label: 'Slam Death Metal' },
          { id: 'metal-death-blackened', label: 'Blackened Death Metal' },
        ],
      },
      {
        id: 'metal-black',
        label: 'Black Metal',
        children: [
          { id: 'metal-black-atmospheric', label: 'Atmospheric Black Metal' },
          { id: 'metal-black-symphonic', label: 'Symphonic Black Metal' },
          { id: 'metal-black-raw', label: 'Raw Black Metal' },
          { id: 'metal-black-depressive', label: 'DSBM' },
          { id: 'metal-black-post', label: 'Post-Black Metal' },
          { id: 'metal-black-blackgaze', label: 'Blackgaze' },
        ],
      },
      {
        id: 'metal-doom',
        label: 'Doom Metal',
        children: [
          { id: 'metal-doom-stoner', label: 'Stoner Doom' },
          { id: 'metal-doom-funeral', label: 'Funeral Doom' },
          { id: 'metal-doom-sludge', label: 'Sludge Metal' },
          { id: 'metal-doom-traditional', label: 'Traditional Doom' },
          { id: 'metal-doom-drone', label: 'Drone Doom' },
        ],
      },
      {
        id: 'metal-progressive',
        label: 'Progressive Metal',
        children: [
          { id: 'metal-progressive-djent', label: 'Djent' },
          { id: 'metal-progressive-math', label: 'Math Metal' },
          { id: 'metal-progressive-classic', label: 'Classic Prog Metal' },
          { id: 'metal-progressive-avant-garde', label: 'Avant-Garde Metal' },
          { id: 'metal-progressive-technical', label: 'Technical Prog' },
        ],
      },
      {
        id: 'metal-symphonic',
        label: 'Symphonic Metal',
        children: [
          { id: 'metal-symphonic-operatic', label: 'Operatic Metal' },
          { id: 'metal-symphonic-orchestral', label: 'Orchestral Metal' },
          { id: 'metal-symphonic-gothic', label: 'Gothic Metal' },
          { id: 'metal-symphonic-power', label: 'Symphonic Power Metal' },
        ],
      },
      {
        id: 'metal-thrash',
        label: 'Thrash Metal',
        children: [
          { id: 'metal-thrash-classic', label: 'Classic Thrash' },
          { id: 'metal-thrash-crossover', label: 'Crossover Thrash' },
          { id: 'metal-thrash-speed', label: 'Speed Metal' },
          { id: 'metal-thrash-teutonic', label: 'Teutonic Thrash' },
        ],
      },
      {
        id: 'metal-power',
        label: 'Power Metal',
        children: [
          { id: 'metal-power-european', label: 'European Power Metal' },
          { id: 'metal-power-us', label: 'US Power Metal' },
          { id: 'metal-power-symphonic', label: 'Symphonic Power' },
          { id: 'metal-power-epic', label: 'Epic Power Metal' },
        ],
      },
      {
        id: 'metal-nu',
        label: 'Nu Metal',
        children: [
          { id: 'metal-nu-rap', label: 'Rap Metal' },
          { id: 'metal-nu-alt', label: 'Alt Metal' },
          { id: 'metal-nu-industrial', label: 'Industrial Metal' },
          { id: 'metal-nu-funk', label: 'Funk Metal' },
        ],
      },
      {
        id: 'metal-metalcore',
        label: 'Metalcore',
        children: [
          { id: 'metal-metalcore-melodic', label: 'Melodic Metalcore' },
          { id: 'metal-metalcore-deathcore', label: 'Deathcore' },
          { id: 'metal-metalcore-mathcore', label: 'Mathcore' },
          { id: 'metal-metalcore-post-hardcore', label: 'Post-Hardcore' },
          { id: 'metal-metalcore-electronicore', label: 'Electronicore' },
        ],
      },
      {
        id: 'metal-folk',
        label: 'Folk Metal',
        children: [
          { id: 'metal-folk-viking', label: 'Viking Metal' },
          { id: 'metal-folk-celtic', label: 'Celtic Metal' },
          { id: 'metal-folk-pagan', label: 'Pagan Metal' },
          { id: 'metal-folk-medieval', label: 'Medieval Metal' },
        ],
      },
    ],
  },

  // ─────────────────────────────────────────────
  // COUNTRY
  // ─────────────────────────────────────────────
  {
    id: 'country',
    label: 'Country',
    children: [
      {
        id: 'country-outlaw',
        label: 'Outlaw Country',
        children: [
          { id: 'country-outlaw-classic', label: 'Classic Outlaw' },
          { id: 'country-outlaw-modern', label: 'Modern Outlaw' },
          { id: 'country-outlaw-red-dirt', label: 'Red Dirt' },
          { id: 'country-outlaw-texas', label: 'Texas Country' },
        ],
      },
      {
        id: 'country-americana',
        label: 'Americana',
        children: [
          { id: 'country-americana-roots', label: 'Roots Americana' },
          { id: 'country-americana-folk', label: 'Folk Americana' },
          { id: 'country-americana-gothic', label: 'Gothic Americana' },
          { id: 'country-americana-cowpunk', label: 'Cowpunk' },
        ],
      },
      {
        id: 'country-alt',
        label: 'Alt-Country',
        children: [
          { id: 'country-alt-indie', label: 'Indie Country' },
          { id: 'country-alt-insurgent', label: 'Insurgent Country' },
          { id: 'country-alt-no-depression', label: 'No Depression' },
          { id: 'country-alt-country-rock', label: 'Country Rock' },
        ],
      },
      {
        id: 'country-bluegrass',
        label: 'Bluegrass',
        children: [
          { id: 'country-bluegrass-progressive', label: 'Progressive Bluegrass' },
          { id: 'country-bluegrass-newgrass', label: 'Newgrass' },
          { id: 'country-bluegrass-traditional', label: 'Traditional Bluegrass' },
          { id: 'country-bluegrass-jamgrass', label: 'Jamgrass' },
        ],
      },
      {
        id: 'country-pop',
        label: 'Country Pop',
        children: [
          { id: 'country-pop-modern', label: 'Modern Country Pop' },
          { id: 'country-pop-bro', label: 'Bro-Country' },
          { id: 'country-pop-nashville', label: 'Nashville Sound' },
          { id: 'country-pop-crossover', label: 'Country Crossover' },
        ],
      },
      {
        id: 'country-honky-tonk',
        label: 'Honky Tonk',
        children: [
          { id: 'country-honky-tonk-classic', label: 'Classic Honky Tonk' },
          { id: 'country-honky-tonk-western-swing', label: 'Western Swing' },
          { id: 'country-honky-tonk-bakersfield', label: 'Bakersfield Sound' },
          { id: 'country-honky-tonk-neotraditional', label: 'Neotraditional Country' },
        ],
      },
      {
        id: 'country-country-rock',
        label: 'Country Rock',
        children: [
          { id: 'country-country-rock-southern', label: 'Southern Rock' },
          { id: 'country-country-rock-heartland', label: 'Heartland Rock' },
          { id: 'country-country-rock-classic', label: 'Classic Country Rock' },
        ],
      },
    ],
  },

  // ─────────────────────────────────────────────
  // PUNK
  // ─────────────────────────────────────────────
  {
    id: 'punk',
    label: 'Punk',
    children: [
      {
        id: 'punk-pop',
        label: 'Pop Punk',
        children: [
          { id: 'punk-pop-classic', label: 'Classic Pop Punk' },
          { id: 'punk-pop-easycore', label: 'Easycore' },
          { id: 'punk-pop-emo-pop', label: 'Emo Pop' },
          { id: 'punk-pop-modern', label: 'Modern Pop Punk' },
          { id: 'punk-pop-skate', label: 'Skate Punk' },
        ],
      },
      {
        id: 'punk-hardcore',
        label: 'Hardcore Punk',
        children: [
          { id: 'punk-hardcore-classic', label: 'Classic Hardcore' },
          { id: 'punk-hardcore-beatdown', label: 'Beatdown' },
          { id: 'punk-hardcore-youth-crew', label: 'Youth Crew' },
          { id: 'punk-hardcore-powerviolence', label: 'Powerviolence' },
          { id: 'punk-hardcore-straight-edge', label: 'Straight Edge' },
        ],
      },
      {
        id: 'punk-post',
        label: 'Post-Punk',
        children: [
          { id: 'punk-post-classic', label: 'Classic Post-Punk' },
          { id: 'punk-post-revival', label: 'Post-Punk Revival' },
          { id: 'punk-post-goth', label: 'Gothic Post-Punk' },
          { id: 'punk-post-dark', label: 'Dark Post-Punk' },
          { id: 'punk-post-no-wave', label: 'No Wave' },
        ],
      },
      {
        id: 'punk-emo',
        label: 'Emo',
        children: [
          { id: 'punk-emo-midwest', label: 'Midwest Emo' },
          { id: 'punk-emo-screamo', label: 'Screamo' },
          { id: 'punk-emo-twinkle', label: 'Twinkle Emo' },
          { id: 'punk-emo-post', label: 'Post-Emo' },
          { id: 'punk-emo-revival', label: 'Emo Revival' },
        ],
      },
      {
        id: 'punk-ska',
        label: 'Ska Punk',
        children: [
          { id: 'punk-ska-third-wave', label: 'Third Wave Ska' },
          { id: 'punk-ska-two-tone', label: 'Two-Tone' },
          { id: 'punk-ska-skacore', label: 'Skacore' },
          { id: 'punk-ska-reggae-punk', label: 'Reggae Punk' },
        ],
      },
      {
        id: 'punk-crust',
        label: 'Crust Punk',
        children: [
          { id: 'punk-crust-d-beat', label: 'D-Beat' },
          { id: 'punk-crust-anarcho', label: 'Anarcho-Punk' },
          { id: 'punk-crust-stenchcore', label: 'Stenchcore' },
        ],
      },
      {
        id: 'punk-garage',
        label: 'Garage Punk',
        children: [
          { id: 'punk-garage-lo-fi', label: 'Lo-fi Punk' },
          { id: 'punk-garage-proto', label: 'Proto-Punk' },
          { id: 'punk-garage-77', label: '77 Punk' },
        ],
      },
    ],
  },

  // ─────────────────────────────────────────────
  // SOUNDTRACK / SCORE
  // ─────────────────────────────────────────────
  {
    id: 'soundtrack',
    label: 'Soundtrack',
    children: [
      {
        id: 'soundtrack-cinematic',
        label: 'Cinematic',
        children: [
          { id: 'soundtrack-cinematic-epic', label: 'Epic Cinematic' },
          { id: 'soundtrack-cinematic-dramatic', label: 'Dramatic Score' },
          { id: 'soundtrack-cinematic-emotional', label: 'Emotional Score' },
          { id: 'soundtrack-cinematic-action', label: 'Action Score' },
          { id: 'soundtrack-cinematic-horror', label: 'Horror Score' },
          { id: 'soundtrack-cinematic-suspense', label: 'Suspense Score' },
          { id: 'soundtrack-cinematic-romantic', label: 'Romantic Score' },
          { id: 'soundtrack-cinematic-comedy', label: 'Comedy Score' },
        ],
      },
      {
        id: 'soundtrack-score',
        label: 'Film Score',
        children: [
          { id: 'soundtrack-score-orchestral', label: 'Orchestral Score' },
          { id: 'soundtrack-score-electronic', label: 'Electronic Score' },
          { id: 'soundtrack-score-hybrid', label: 'Hybrid Score' },
          { id: 'soundtrack-score-minimalist', label: 'Minimalist Score' },
          { id: 'soundtrack-score-noir', label: 'Noir Score' },
        ],
      },
      {
        id: 'soundtrack-video-game',
        label: 'Video Game',
        children: [
          { id: 'soundtrack-video-game-chiptune', label: 'Chiptune' },
          { id: 'soundtrack-video-game-8bit', label: '8-Bit' },
          { id: 'soundtrack-video-game-16bit', label: '16-Bit' },
          { id: 'soundtrack-video-game-rpg', label: 'RPG Soundtrack' },
          { id: 'soundtrack-video-game-boss-battle', label: 'Boss Battle' },
          { id: 'soundtrack-video-game-exploration', label: 'Exploration Theme' },
          { id: 'soundtrack-video-game-retro', label: 'Retro Game' },
          { id: 'soundtrack-video-game-modern', label: 'Modern Game OST' },
        ],
      },
      {
        id: 'soundtrack-anime',
        label: 'Anime',
        children: [
          { id: 'soundtrack-anime-opening', label: 'Anime Opening' },
          { id: 'soundtrack-anime-ending', label: 'Anime Ending' },
          { id: 'soundtrack-anime-ost', label: 'Anime OST' },
          { id: 'soundtrack-anime-battle', label: 'Anime Battle Theme' },
          { id: 'soundtrack-anime-slice-of-life', label: 'Slice of Life OST' },
        ],
      },
      {
        id: 'soundtrack-tv',
        label: 'TV Score',
        children: [
          { id: 'soundtrack-tv-drama', label: 'TV Drama Score' },
          { id: 'soundtrack-tv-documentary', label: 'Documentary Score' },
          { id: 'soundtrack-tv-theme', label: 'Theme Song' },
          { id: 'soundtrack-tv-reality', label: 'Reality TV Music' },
        ],
      },
      {
        id: 'soundtrack-trailer',
        label: 'Trailer Music',
        children: [
          { id: 'soundtrack-trailer-epic', label: 'Epic Trailer' },
          { id: 'soundtrack-trailer-teaser', label: 'Teaser Trailer' },
          { id: 'soundtrack-trailer-hybrid', label: 'Hybrid Trailer' },
          { id: 'soundtrack-trailer-dark', label: 'Dark Trailer' },
        ],
      },
    ],
  },

  // ─────────────────────────────────────────────
  // BLUES
  // ─────────────────────────────────────────────
  {
    id: 'blues',
    label: 'Blues',
    children: [
      {
        id: 'blues-electric',
        label: 'Electric Blues',
        children: [
          { id: 'blues-electric-chicago', label: 'Chicago Blues' },
          { id: 'blues-electric-texas', label: 'Texas Blues' },
          { id: 'blues-electric-west-side', label: 'West Side Blues' },
          { id: 'blues-electric-modern', label: 'Modern Electric Blues' },
        ],
      },
      {
        id: 'blues-delta',
        label: 'Delta Blues',
        children: [
          { id: 'blues-delta-acoustic', label: 'Acoustic Blues' },
          { id: 'blues-delta-hill-country', label: 'Hill Country Blues' },
          { id: 'blues-delta-fingerpicking', label: 'Fingerpicking Blues' },
        ],
      },
      {
        id: 'blues-rock',
        label: 'Blues Rock',
        children: [
          { id: 'blues-rock-british', label: 'British Blues Rock' },
          { id: 'blues-rock-southern', label: 'Southern Blues Rock' },
          { id: 'blues-rock-modern', label: 'Modern Blues Rock' },
        ],
      },
      {
        id: 'blues-jump',
        label: 'Jump Blues',
        children: [
          { id: 'blues-jump-swing', label: 'Swing Blues' },
          { id: 'blues-jump-boogie', label: 'Boogie Woogie' },
        ],
      },
      {
        id: 'blues-soul-blues',
        label: 'Soul Blues',
        children: [
          { id: 'blues-soul-blues-classic', label: 'Classic Soul Blues' },
          { id: 'blues-soul-blues-contemporary', label: 'Contemporary Soul Blues' },
        ],
      },
    ],
  },

  // ─────────────────────────────────────────────
  // GOSPEL / CHRISTIAN
  // ─────────────────────────────────────────────
  {
    id: 'gospel',
    label: 'Gospel / Christian',
    children: [
      {
        id: 'gospel-contemporary',
        label: 'Contemporary Gospel',
        children: [
          { id: 'gospel-contemporary-urban', label: 'Urban Gospel' },
          { id: 'gospel-contemporary-praise', label: 'Praise & Worship' },
          { id: 'gospel-contemporary-ccm', label: 'CCM' },
        ],
      },
      {
        id: 'gospel-traditional',
        label: 'Traditional Gospel',
        children: [
          { id: 'gospel-traditional-choir', label: 'Gospel Choir' },
          { id: 'gospel-traditional-hymns', label: 'Hymns' },
          { id: 'gospel-traditional-spirituals', label: 'Spirituals' },
        ],
      },
      {
        id: 'gospel-christian-rock',
        label: 'Christian Rock',
        children: [
          { id: 'gospel-christian-rock-worship', label: 'Worship Rock' },
          { id: 'gospel-christian-rock-alt', label: 'Christian Alt Rock' },
        ],
      },
      {
        id: 'gospel-christian-hip-hop',
        label: 'Christian Hip Hop',
        children: [
          { id: 'gospel-christian-hip-hop-holy', label: 'Holy Hip Hop' },
          { id: 'gospel-christian-hip-hop-rap', label: 'Christian Rap' },
        ],
      },
    ],
  },

  // ─────────────────────────────────────────────
  // EXPERIMENTAL / AVANT-GARDE
  // ─────────────────────────────────────────────
  {
    id: 'experimental',
    label: 'Experimental',
    children: [
      {
        id: 'experimental-noise',
        label: 'Noise',
        children: [
          { id: 'experimental-noise-harsh', label: 'Harsh Noise' },
          { id: 'experimental-noise-wall', label: 'Harsh Noise Wall' },
          { id: 'experimental-noise-power', label: 'Power Electronics' },
          { id: 'experimental-noise-japanoise', label: 'Japanoise' },
        ],
      },
      {
        id: 'experimental-industrial',
        label: 'Industrial',
        children: [
          { id: 'experimental-industrial-ebm', label: 'EBM' },
          { id: 'experimental-industrial-aggrotech', label: 'Aggrotech' },
          { id: 'experimental-industrial-classic', label: 'Classic Industrial' },
          { id: 'experimental-industrial-dark-electro', label: 'Dark Electro' },
        ],
      },
      {
        id: 'experimental-musique-concrete',
        label: 'Musique Concrete',
        children: [
          { id: 'experimental-musique-concrete-tape', label: 'Tape Music' },
          { id: 'experimental-musique-concrete-field', label: 'Field Recording' },
          { id: 'experimental-musique-concrete-acousmatic', label: 'Acousmatic' },
        ],
      },
      {
        id: 'experimental-drone',
        label: 'Drone Music',
        children: [
          { id: 'experimental-drone-meditation', label: 'Meditation Drone' },
          { id: 'experimental-drone-heavy', label: 'Heavy Drone' },
          { id: 'experimental-drone-minimalist', label: 'Minimalist Drone' },
        ],
      },
    ],
  },

  // ─────────────────────────────────────────────
  // CHILDREN'S
  // ─────────────────────────────────────────────
  {
    id: 'childrens',
    label: "Children's",
    children: [
      {
        id: 'childrens-nursery',
        label: 'Nursery Rhymes',
        children: [
          { id: 'childrens-nursery-educational', label: 'Educational Songs' },
          { id: 'childrens-nursery-classic', label: 'Classic Nursery' },
        ],
      },
      {
        id: 'childrens-kids-pop',
        label: 'Kids Pop',
        children: [
          { id: 'childrens-kids-pop-tween', label: 'Tween Pop' },
          { id: 'childrens-kids-pop-dance', label: 'Kids Dance' },
        ],
      },
      {
        id: 'childrens-lullabies',
        label: 'Lullabies',
        children: [
          { id: 'childrens-lullabies-instrumental', label: 'Instrumental Lullabies' },
          { id: 'childrens-lullabies-music-box', label: 'Music Box' },
        ],
      },
    ],
  },
]
