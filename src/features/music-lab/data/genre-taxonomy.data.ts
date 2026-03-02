/**
 * Genre Taxonomy Data
 * 3-tier hierarchy: Genre -> Sub-genre -> Micro-genre
 * Deep coverage of Black music, African diaspora, Caribbean, and electronic subcultures
 */

export interface GenreTaxonomyNode {
  name: string
  children?: GenreTaxonomyNode[]
}

export const GENRE_TAXONOMY: GenreTaxonomyNode[] = [
  {
    name: 'Blues',
    children: [
      { name: 'Acoustic Blues', children: [{ name: 'Country Blues' }, { name: 'Piedmont Blues' }] },
      { name: 'Electric Blues', children: [{ name: 'Chicago Blues' }, { name: 'Texas Blues' }] },
      { name: 'Delta Blues', children: [{ name: 'Hill Country Blues' }] },
      { name: 'Memphis Blues', children: [{ name: 'Beale Street Blues' }] },
      { name: 'St. Louis Blues', children: [{ name: 'St. Louis Jump' }] },
      { name: 'Piano Blues', children: [{ name: 'Boogie-Woogie' }] },
      { name: 'Jump Blues', children: [{ name: 'Swing Blues' }] },
      { name: 'Classic Blues', children: [{ name: 'Vaudeville Blues' }] },
      { name: 'Contemporary Blues', children: [{ name: 'Modern Electric Blues' }] },
      { name: 'Jazz Blues', children: [{ name: 'Blues-Jazz Fusion' }] },
      { name: 'Rhythm & Blues', children: [{ name: 'Early R&B' }] },
      { name: 'Blues Rock', children: [{ name: 'British Blues' }, { name: 'Southern Blues Rock' }] },
    ],
  },
  {
    name: 'Hip-Hop/Rap',
    children: [
      {
        name: 'Gangsta Rap',
        children: [
          { name: 'West Coast G-Funk' }, { name: 'Mafioso Rap' }, { name: 'Horrorcore' },
          { name: 'East Coast Gangsta' }, { name: 'Reality Rap' }, { name: 'Street Rap' },
          { name: 'Hardcore Gangsta' },
        ],
      },
      {
        name: 'Rap (General)',
        children: [
          { name: 'Freestyle Rap' }, { name: 'Battle Rap' }, { name: 'Storytelling Rap' },
          { name: 'Party Rap' }, { name: 'Comedy Hip-Hop' }, { name: 'Nerdcore' },
          { name: 'Noir Rap' }, { name: 'Cinematic Street Rap' },
        ],
      },
      {
        name: 'Mumble Rap',
        children: [
          { name: 'Melodic Mumble' }, { name: 'Auto-Tune Rap' },
          { name: 'Triplet Flow Rap' }, { name: 'Emo Mumble' }, { name: 'Cloud Mumble' },
        ],
      },
      {
        name: 'Trap',
        children: [
          { name: 'Latin Trap' }, { name: 'Country Trap' }, { name: 'EDM Trap' },
          { name: 'Boom Trap' },
          { name: 'Drill (UK)' }, { name: 'Drill (Brooklyn)' }, { name: 'Drill (Chicago)' },
          { name: 'Drill (Jacksonville)' }, { name: 'Drill (Detroit)' }, { name: 'Drill (Bronx)' },
          { name: 'Flint Drill' }, { name: 'Afro Drill' },
          { name: 'Phonk' }, { name: 'Plugg' }, { name: 'Pluggnb' },
          { name: 'Rage' }, { name: 'Tread Rap' }, { name: 'Trap Metal' },
          { name: 'Gospel Trap' }, { name: 'Cloud Trap' }, { name: 'Hyperpop Trap' },
          { name: 'Emo Trap' }, { name: 'Melodic Trap' },
        ],
      },
      {
        name: 'Conscious Rap',
        children: [
          { name: 'Political Hip-Hop' }, { name: 'Afrocentric Rap' },
          { name: 'Social Commentary Rap' }, { name: 'Spiritual Rap' },
          { name: 'Revolutionary Rap' }, { name: 'Backpack Rap' }, { name: 'Art Rap' },
        ],
      },
      {
        name: 'Boom Bap',
        children: [
          { name: 'East Coast Boom Bap' }, { name: 'Jazz Rap' }, { name: 'Golden Age' },
          { name: 'Lo-Fi Boom Bap' }, { name: 'Underground Boom Bap' },
          { name: 'Neo Boom Bap' }, { name: 'Sample-Heavy Boom Bap' },
        ],
      },
      {
        name: 'Memphis Rap',
        children: [
          { name: 'Horrorcore Memphis' }, { name: 'Crunk Memphis' },
          { name: 'Underground Memphis' }, { name: 'Memphis Trap' }, { name: 'Dark Memphis' },
        ],
      },
      { name: 'Rage Rap', children: [{ name: 'Rage Beat' }] },
      { name: 'Jersey Club Rap', children: [{ name: 'Jersey Bounce Rap' }] },
      { name: 'Lo-Fi Hip-Hop', children: [{ name: 'Chill Beats' }, { name: 'Study Beats' }] },
      { name: 'Alternative Hip-Hop', children: [{ name: 'Abstract Hip-Hop' }, { name: 'Experimental Rap' }] },
      {
        name: 'Southern Hip-Hop',
        children: [
          { name: 'Crunk' }, { name: 'Chopped & Screwed' }, { name: 'Swishahouse' },
          { name: 'Purple Sound' }, { name: 'Slowed & Reverb' },
        ],
      },
      { name: 'Pop Rap', children: [{ name: 'Radio Rap' }, { name: 'Crossover Rap' }] },
      { name: 'Electronic/Industrial Hip-Hop', children: [{ name: 'Glitch Hop' }, { name: 'Industrial Rap' }] },
      { name: 'Gospel Rap', children: [{ name: 'Christian Hip-Hop' }, { name: 'Inspirational Rap' }] },
      { name: 'Cloud Rap', children: [{ name: 'Ethereal Rap' }, { name: 'Vapor Rap' }] },
      { name: 'Emo Rap', children: [{ name: 'Sad Rap' }, { name: 'Post-Emo Rap' }] },
      {
        name: 'Juke/Footwork',
        children: [
          { name: 'Chicago Juke' }, { name: 'Footwork' }, { name: 'Baltimore Club' },
        ],
      },
      {
        name: 'SoundCloud Rap',
        children: [
          { name: 'Lo-Fi SoundCloud' }, { name: 'Emo SoundCloud' },
          { name: 'Cloud Rap SoundCloud' }, { name: 'DIY Rap' },
        ],
      },
    ],
  },
  {
    name: "Children's",
    children: [
      { name: 'Nursery Rhymes', children: [{ name: 'Educational Songs' }] },
      { name: 'Kids Pop', children: [{ name: 'Tween Pop' }] },
      { name: 'Lullabies', children: [{ name: 'Instrumental Lullabies' }] },
      { name: 'Sing-Along', children: [{ name: 'Campfire Songs' }] },
    ],
  },
  {
    name: 'Classical',
    children: [
      { name: 'Orchestral', children: [{ name: 'Symphonic' }, { name: 'Chamber Orchestra' }] },
      { name: 'Chamber Music', children: [{ name: 'String Quartet' }, { name: 'Piano Trio' }] },
      { name: 'Opera', children: [{ name: 'Grand Opera' }, { name: 'Opera Buffa' }] },
      { name: 'Contemporary Classical', children: [{ name: 'Minimalism' }, { name: 'Neo-Classical' }] },
      { name: 'Baroque', children: [{ name: 'Harpsichord' }, { name: 'Early Music' }] },
      { name: 'Romantic', children: [{ name: 'Late Romantic' }] },
      { name: 'Renaissance', children: [{ name: 'Renaissance Vocal' }] },
      { name: 'Medieval', children: [{ name: 'Gregorian' }] },
      { name: 'Black Classical', children: [{ name: 'Concert Spirituals' }, { name: 'Spirituals' }] },
      { name: 'Choral', children: [{ name: 'Chant' }] },
    ],
  },
  {
    name: 'Country',
    children: [
      { name: 'Modern Country', children: [{ name: 'Country Pop' }, { name: 'Bro-Country' }] },
      { name: 'Outlaw Country', children: [{ name: 'Americana' }, { name: 'Alt-Country' }] },
      { name: 'Bluegrass', children: [{ name: 'Progressive Bluegrass' }, { name: 'Newgrass' }] },
      { name: 'Honky Tonk', children: [{ name: 'Western Swing' }, { name: 'Bakersfield Sound' }] },
      { name: 'Country Rock', children: [{ name: 'Southern Rock Country' }] },
      { name: 'Traditional Country', children: [{ name: 'Country Gospel' }] },
      { name: 'Black Country', children: [{ name: 'Urban Cowboy' }] },
    ],
  },
  {
    name: 'Gospel/Christian',
    children: [
      { name: 'Contemporary Gospel', children: [{ name: 'Urban Contemporary Gospel' }, { name: 'Praise & Worship' }] },
      { name: 'Traditional Gospel', children: [{ name: 'Gospel Choir' }, { name: 'Hymns' }] },
      { name: 'Black Gospel', children: [{ name: 'Traditional Black Gospel' }, { name: 'Gospel Quartet' }] },
      { name: 'Gospel Blues', children: [{ name: 'Gospel Blues Piano' }] },
      { name: 'Southern Gospel', children: [{ name: 'Shape Note' }] },
      { name: 'Christian Rock', children: [{ name: 'Worship Rock' }] },
      { name: 'Christian Hip-Hop', children: [{ name: 'Holy Hip-Hop' }] },
      { name: 'CCM', children: [{ name: 'Christian Pop' }] },
    ],
  },
  {
    name: 'Jazz',
    children: [
      {
        name: 'Early Jazz',
        children: [
          { name: 'Ragtime' }, { name: 'Dixieland' }, { name: 'Chicago Jazz' }, { name: 'Stride Piano' },
        ],
      },
      {
        name: 'Swing/Big Band',
        children: [
          { name: 'Big Band Swing' }, { name: 'Kansas City Swing' },
          { name: 'Gypsy Swing' }, { name: 'Swing Revival' },
        ],
      },
      {
        name: 'Bebop',
        children: [
          { name: 'Hard Bop' }, { name: 'Post Bop' }, { name: 'Neo Bop' }, { name: 'Afro-Cuban Bop' },
        ],
      },
      { name: 'Cool Jazz', children: [{ name: 'West Coast Cool' }, { name: 'Third Stream' }] },
      { name: 'Modal Jazz', children: [{ name: 'Spiritual Jazz' }, { name: 'Modal Fusion' }] },
      {
        name: 'Jazz Fusion',
        children: [
          { name: 'Jazz-Rock Fusion' }, { name: 'Jazz-Funk' }, { name: 'Prog-Jazz' },
        ],
      },
      { name: 'Latin Jazz', children: [{ name: 'Afro-Cuban Jazz' }, { name: 'Samba Jazz' }] },
      { name: 'Smooth Jazz', children: [{ name: 'Urban Contemporary Jazz' }, { name: 'New Age Jazz' }] },
      { name: 'Free Jazz', children: [{ name: 'Avant-Garde Jazz' }, { name: 'New Thing' }] },
      { name: 'Acid Jazz', children: [{ name: 'Nu Jazz' }, { name: 'Club Jazz' }] },
      {
        name: 'Soul Jazz',
        children: [
          { name: 'Groove Jazz' }, { name: 'Boogaloo Jazz' }, { name: 'Organ Trio Soul-Jazz' },
        ],
      },
      { name: 'Bossa Nova', children: [{ name: 'Brazilian Jazz' }] },
    ],
  },
  {
    name: 'Latino',
    children: [
      { name: 'Reggaeton', children: [{ name: 'Perreo' }, { name: 'Dembow' }] },
      { name: 'Salsa', children: [{ name: 'Timba' }, { name: 'Salsa Dura' }] },
      { name: 'Bachata', children: [{ name: 'Modern Bachata' }, { name: 'Bachata Sensual' }] },
      { name: 'Cumbia', children: [{ name: 'Digital Cumbia' }, { name: 'Cumbia Villera' }] },
      { name: 'Bossa Nova', children: [{ name: 'MPB' }, { name: 'Tropicalia' }] },
      { name: 'Norteño', children: [{ name: 'Corridos' }, { name: 'Corridos Tumbados' }] },
      { name: 'Mariachi', children: [{ name: 'Ranchera' }] },
      { name: 'Baile Funk', children: [{ name: 'Funk Carioca' }, { name: 'Favela Funk' }] },
      { name: 'Tango', children: [{ name: 'Traditional Tango' }, { name: 'Nuevo Tango' }] },
      { name: 'Rumba', children: [{ name: 'Cuban Rumba' }] },
      { name: 'Pop Latino', children: [{ name: 'Latin Pop' }] },
    ],
  },
  {
    name: 'Metal',
    children: [
      { name: 'Heavy Metal', children: [{ name: 'Thrash' }, { name: 'Speed Metal' }, { name: 'Power Metal' }] },
      { name: 'Nu Metal', children: [{ name: 'Rap Metal' }, { name: 'Alt Metal' }] },
      { name: 'Death Metal', children: [{ name: 'Melodic Death' }, { name: 'Technical Death' }, { name: 'Brutal Death' }] },
      { name: 'Black Metal', children: [{ name: 'Atmospheric Black' }, { name: 'Symphonic Black' }] },
      { name: 'Doom Metal', children: [{ name: 'Stoner Metal' }, { name: 'Funeral Doom' }] },
      { name: 'Progressive Metal', children: [{ name: 'Djent' }, { name: 'Math Metal' }] },
      { name: 'Metalcore', children: [{ name: 'Deathcore' }, { name: 'Post-Hardcore' }] },
      { name: 'Grindcore', children: [{ name: 'Goregrind' }] },
    ],
  },
  {
    name: 'Pop',
    children: [
      { name: 'Synth Pop', children: [{ name: 'Dark Synth' }, { name: 'Electropop' }] },
      { name: 'Art Pop', children: [{ name: 'Avant-Pop' }, { name: 'Experimental Pop' }] },
      { name: 'Dance Pop', children: [{ name: 'Euro Pop' }, { name: 'Disco Pop' }] },
      { name: 'Indie Pop', children: [{ name: 'Bedroom Pop' }, { name: 'Chamber Pop' }] },
      { name: 'K-Pop', children: [{ name: 'K-Pop Boy Group' }, { name: 'K-Pop Girl Group' }] },
      { name: 'Hyperpop', children: [{ name: 'Glitchcore' }, { name: 'Bubblegum Bass' }] },
      { name: 'Pop Rock', children: [{ name: 'Power Pop' }] },
      { name: 'Hip-Pop', children: [{ name: 'Pop Rap' }] },
    ],
  },
  {
    name: 'R&B/Soul',
    children: [
      { name: 'Neo-Soul', children: [{ name: 'Conscious Soul' }, { name: 'Nu Jazz Soul' }] },
      {
        name: 'Contemporary R&B',
        children: [
          { name: 'PBR&B' }, { name: 'Early 2000s R&B' }, { name: 'Mid 2000s R&B' },
        ],
      },
      {
        name: 'Alternative R&B',
        children: [
          { name: 'Dark R&B' }, { name: 'Electronic R&B' }, { name: 'Hip-Hop/R&B Crossover' },
        ],
      },
      {
        name: 'Trap Soul',
        children: [
          { name: 'Melodic Trap Soul' }, { name: 'Dark Trap Soul' }, { name: 'Gospel Trap Soul' },
        ],
      },
      { name: 'Classic R&B', children: [{ name: 'Motown' }, { name: 'Quiet Storm' }] },
      {
        name: 'Funk',
        children: [
          { name: 'P-Funk' }, { name: 'Electro-Funk' }, { name: 'Nu-Funk' },
          { name: 'Funk Metal' }, { name: 'Afro-Funk' },
        ],
      },
      { name: 'Disco', children: [{ name: 'Eurodisco' }, { name: 'Nu-Disco' }] },
      { name: 'Doo Wop', children: [{ name: 'Classic Doo Wop' }] },
      {
        name: 'Classic Soul',
        children: [
          { name: 'Northern Soul' }, { name: 'Southern Soul' }, { name: 'Deep Soul' },
        ],
      },
      { name: 'Philadelphia Soul', children: [{ name: 'Philly Sound' }] },
      { name: 'Memphis Soul', children: [{ name: 'Stax Sound' }] },
      { name: 'Chicago Soul', children: [{ name: 'Chicago R&B' }] },
      { name: 'Psychedelic Soul', children: [{ name: 'Funk Soul' }] },
      {
        name: 'New Jack Swing',
        children: [
          { name: 'Swing Beat' }, { name: 'Jack Swing Ballads' },
        ],
      },
      { name: 'Minneapolis Sound', children: [{ name: 'Purple Sound R&B' }] },
      { name: 'Go-Go', children: [{ name: 'DC Go-Go' }, { name: 'Pocket Go-Go' }] },
      { name: 'Afrofuturism Soul', children: [{ name: 'Space Soul' }] },
      { name: 'Stadium R&B', children: [{ name: 'Arena R&B' }] },
      { name: 'Southern Gothic R&B', children: [{ name: 'Gothic Soul' }] },
    ],
  },
  {
    name: 'Reggae/Caribbean',
    children: [
      {
        name: 'Dancehall',
        children: [
          { name: 'Modern Dancehall' }, { name: 'Bashment' }, { name: 'Digital Dancehall' },
          { name: 'Ragga Dancehall' }, { name: 'Old Skool Dancehall' },
        ],
      },
      {
        name: 'Roots Reggae',
        children: [
          { name: 'Nyabinghi' }, { name: 'Cultural Roots' }, { name: 'Spiritual Roots' },
        ],
      },
      {
        name: 'Dub',
        children: [
          { name: 'Roots Dub' }, { name: 'Steppers Dub' }, { name: 'Digital Dub' },
        ],
      },
      {
        name: 'Ska',
        children: [
          { name: '1st Wave Ska' }, { name: '2 Tone Ska' }, { name: 'Ska Revival' },
        ],
      },
      {
        name: 'Rocksteady',
        children: [
          { name: 'Early Rocksteady' }, { name: 'Soul Rocksteady' },
        ],
      },
      {
        name: 'Lovers Rock',
        children: [
          { name: 'Roots Lovers' }, { name: 'Conscious Lovers' },
        ],
      },
      {
        name: 'Ragga',
        children: [
          { name: 'Digital Ragga' }, { name: 'Jungle Ragga' },
        ],
      },
      { name: 'Mento', children: [{ name: 'Traditional Mento' }, { name: 'Urban Mento' }] },
      {
        name: 'Soca',
        children: [
          { name: 'Power Soca' }, { name: 'Groovy Soca' }, { name: 'Chutney Soca' },
        ],
      },
      {
        name: 'Calypso',
        children: [
          { name: 'Traditional Calypso' }, { name: 'Kaiso' },
        ],
      },
      { name: 'Gospel Reggae', children: [{ name: 'Roots Gospel' }] },
      { name: 'Afro-Caribbean', children: [{ name: 'Zouk' }] },
    ],
  },
  {
    name: 'Rock',
    children: [
      { name: 'Alternative', children: [{ name: 'Grunge' }, { name: 'Shoegaze' }, { name: 'Dream Pop' }] },
      { name: 'Punk Rock', children: [{ name: 'Pop Punk' }, { name: 'Post-Punk' }, { name: 'Hardcore' }] },
      { name: 'Hard Rock', children: [{ name: 'Classic Rock' }, { name: 'Blues Rock' }] },
      { name: 'Progressive Rock', children: [{ name: 'Math Rock' }, { name: 'Post-Rock' }] },
      { name: 'Indie Rock', children: [{ name: 'Lo-Fi Rock' }, { name: 'Noise Rock' }, { name: 'Garage Rock' }] },
      { name: 'Psychedelic Rock', children: [{ name: 'Space Rock' }, { name: 'Acid Rock' }] },
      { name: 'Southern Rock', children: [{ name: 'Swamp Rock' }] },
      { name: 'Jam Bands', children: [{ name: 'Improvisational Rock' }] },
    ],
  },
  {
    name: 'African & Diaspora',
    children: [
      { name: 'Afrobeat', children: [{ name: 'Classic Afrobeat' }] },
      { name: 'Afrobeats', children: [{ name: 'Afro-Pop' }, { name: 'Afro-Fusion' }] },
      {
        name: 'Amapiano',
        children: [
          { name: 'Private School Amapiano' }, { name: 'Vocal Amapiano' },
          { name: 'Deep Amapiano' }, { name: 'Piano Hub' }, { name: 'Yanos' },
        ],
      },
      { name: 'Highlife', children: [{ name: 'Palm Wine' }, { name: 'Juju Music' }] },
      { name: 'Afro House', children: [{ name: 'Deep Afro House' }, { name: 'Tribal House' }] },
      {
        name: 'Gqom',
        children: [
          { name: 'Durban Gqom' }, { name: 'Broken Beat Gqom' }, { name: 'Dark Gqom' },
        ],
      },
      { name: 'Kwaito', children: [{ name: 'Modern Kwaito' }] },
      { name: 'Afroswing', children: [{ name: 'UK Afroswing' }] },
      { name: 'Soukous', children: [{ name: 'Congolese Rumba' }] },
      { name: 'Mbalax', children: [{ name: 'Senegalese Pop' }] },
      { name: 'Afro-Cuban', children: [{ name: 'Son Cubano' }] },
      { name: 'Afro-Brazilian', children: [{ name: 'Maracatu' }, { name: 'Axé' }] },
      { name: 'Zouk', children: [{ name: 'French Caribbean Zouk' }] },
    ],
  },
  {
    name: 'Traditional Black American',
    children: [
      { name: 'Field Hollers', children: [{ name: 'Work Songs' }] },
      { name: 'Ring Shouts', children: [{ name: 'Call and Response' }] },
      { name: 'Spirituals', children: [{ name: 'Jubilee' }] },
      { name: 'Ragtime', children: [{ name: 'Stride Piano' }] },
      { name: 'Brass Band', children: [{ name: 'Second Line' }] },
      { name: 'Zydeco', children: [{ name: 'Creole Music' }] },
      { name: 'Swamp Blues', children: [{ name: 'Swamp Pop' }] },
      {
        name: 'Go-Go',
        children: [
          { name: 'DC Go-Go' }, { name: 'Pocket Go-Go' }, { name: 'Raw Go-Go' }, { name: 'Crank' },
        ],
      },
      {
        name: 'Bounce',
        children: [
          { name: 'Sissy Bounce' }, { name: 'Triggerman' }, { name: 'Brass Band Bounce' },
        ],
      },
    ],
  },
  {
    name: 'World',
    children: [
      { name: 'Middle Eastern', children: [{ name: 'Arabic Pop' }, { name: 'Sufi Music' }] },
      { name: 'Indian Classical', children: [{ name: 'Hindustani' }, { name: 'Carnatic' }] },
      { name: 'Celtic', children: [{ name: 'Irish Folk' }, { name: 'Scottish Folk' }, { name: 'Breton Folk' }] },
      { name: 'East Asian', children: [{ name: 'J-Pop' }, { name: 'C-Pop' }, { name: 'Enka' }, { name: 'City Pop' }] },
      { name: 'Southeast Asian', children: [{ name: 'Filipino OPM' }, { name: 'Thai Pop' }] },
      { name: 'South African', children: [{ name: 'Maskandi' }, { name: 'Mbaqanga' }, { name: 'Isicathamiya' }] },
      { name: 'South American', children: [{ name: 'Andean Folk' }, { name: 'Nueva Canción' }] },
      { name: 'Klezmer', children: [{ name: 'Traditional Klezmer' }, { name: 'Yiddish Swing' }] },
      { name: 'Flamenco', children: [{ name: 'Modern Flamenco' }, { name: 'Fado' }] },
      { name: 'Hawaiian', children: [{ name: 'Slack-Key Guitar' }, { name: 'Traditional Hula' }] },
      { name: 'Turkish', children: [{ name: 'Arabesque' }, { name: 'Anatolian Folk' }] },
      { name: 'Polka', children: [{ name: 'Czech Polka' }, { name: 'German Polka' }] },
    ],
  },
  {
    name: 'Electronic/Dance',
    children: [
      {
        name: 'House',
        children: [
          { name: 'Deep House' }, { name: 'Tech House' }, { name: 'Afro House' },
          { name: 'Chicago House' }, { name: 'Detroit House' }, { name: 'Garage House' },
          { name: 'Vocal House' }, { name: 'Ballroom House' }, { name: 'Jersey Club' },
          { name: 'Ghetto House' }, { name: 'Jacking House' }, { name: 'Baltimore Club House' },
          { name: 'Progressive House' },
        ],
      },
      {
        name: 'Techno',
        children: [
          { name: 'Minimal Techno' }, { name: 'Industrial Techno' },
          { name: 'Detroit Techno' }, { name: 'Acid Techno' },
        ],
      },
      { name: 'Drum & Bass', children: [{ name: 'Liquid DnB' }, { name: 'Jungle' }, { name: 'Neurofunk' }] },
      { name: 'Ambient', children: [{ name: 'Dark Ambient' }, { name: 'Drone' }] },
      { name: 'Dubstep', children: [{ name: 'Riddim' }, { name: 'Melodic Dubstep' }] },
      { name: 'UK Garage', children: [{ name: '2-Step' }, { name: 'Speed Garage' }, { name: 'UK Funky' }] },
      { name: 'Trance', children: [{ name: 'Progressive Trance' }, { name: 'Psytrance' }, { name: 'Uplifting Trance' }] },
      { name: 'IDM', children: [{ name: 'Glitch' }, { name: 'Experimental Electronic' }] },
      { name: 'Breakbeat', children: [{ name: 'Big Beat' }, { name: 'Florida Breaks' }] },
      { name: 'Disco/Nu-Disco', children: [{ name: 'Italo Disco' }, { name: 'Space Disco' }] },
      { name: 'Future Bass', children: [{ name: 'Kawaii Bass' }] },
      { name: 'Hardstyle', children: [{ name: 'Hardcore EDM' }] },
    ],
  },
]

/** Get top-level genre names */
export function getGenres(): string[] {
  return GENRE_TAXONOMY.map((g) => g.name)
}

/** Get subgenres for given genres (supports multi-select) */
export function getSubgenres(selectedGenres: string[]): string[] {
  const subs: string[] = []
  for (const genre of GENRE_TAXONOMY) {
    if (selectedGenres.includes(genre.name) && genre.children) {
      for (const sub of genre.children) {
        subs.push(sub.name)
      }
    }
  }
  return subs
}

/** Get microgenres for given subgenres (supports multi-select) */
export function getMicrogenres(selectedSubgenres: string[]): string[] {
  const micros: string[] = []
  for (const genre of GENRE_TAXONOMY) {
    if (genre.children) {
      for (const sub of genre.children) {
        if (selectedSubgenres.includes(sub.name) && sub.children) {
          for (const micro of sub.children) {
            micros.push(micro.name)
          }
        }
      }
    }
  }
  return micros
}
