/**
 * Genre Taxonomy Data
 * 3-tier hierarchy: Genre -> Sub-genre -> Micro-genre
 * Comprehensive, genre-agnostic taxonomy
 */

export interface GenreTaxonomyNode {
  name: string
  children?: GenreTaxonomyNode[]
}

export const GENRE_TAXONOMY: GenreTaxonomyNode[] = [
  {
    name: 'Blues',
    children: [
      { name: 'Electric Blues', children: [{ name: 'Chicago Blues' }, { name: 'Texas Blues' }] },
      { name: 'Delta Blues', children: [{ name: 'Acoustic Blues' }, { name: 'Hill Country Blues' }] },
      { name: 'Jump Blues', children: [{ name: 'Swing Blues' }] },
      { name: 'Blues Rock', children: [{ name: 'British Blues' }, { name: 'Southern Blues Rock' }] },
    ],
  },
  {
    name: 'Hip-Hop/Rap',
    children: [
      { name: 'Gangsta Rap', children: [{ name: 'West Coast G-Funk' }, { name: 'Mafioso Rap' }] },
      { name: 'Rap (General)', children: [{ name: 'Freestyle Rap' }, { name: 'Battle Rap' }] },
      { name: 'Mumble Rap', children: [{ name: 'Autotune Rap' }, { name: 'Melodic Mumble' }] },
      {
        name: 'Trap',
        children: [
          { name: 'Latin Trap' }, { name: 'Country Trap' }, { name: 'EDM Trap' },
          { name: 'Drill (UK)' }, { name: 'Drill (Brooklyn)' }, { name: 'Drill (Chicago)' },
          { name: 'Phonk' }, { name: 'Plugg' }, { name: 'Pluggnb' },
          { name: 'Rage' }, { name: 'Tread Rap' }, { name: 'Trap Metal' },
          { name: 'Gospel Trap' }, { name: 'Cloud Trap' }, { name: 'Hyperpop Rap' },
          { name: 'Emo Trap' }, { name: 'Melodic Trap' },
        ],
      },
      { name: 'Conscious Rap', children: [{ name: 'Political Rap' }, { name: 'Socially Aware' }] },
      { name: 'Boom Bap', children: [{ name: 'East Coast' }, { name: 'Jazz Rap' }, { name: 'Golden Age' }] },
      { name: 'Memphis Rap', children: [{ name: 'Horrorcore Memphis' }, { name: 'Crunk Memphis' }] },
      { name: 'Alternative Hip-Hop', children: [{ name: 'Abstract Hip-Hop' }, { name: 'Experimental Rap' }] },
      { name: 'Southern Hip-Hop', children: [{ name: 'Crunk' }, { name: 'Chopped & Screwed' }, { name: 'Bounce' }] },
      { name: 'Pop Rap', children: [{ name: 'Radio Rap' }, { name: 'Crossover Rap' }] },
      { name: 'Electronic/Industrial Hip-Hop', children: [{ name: 'Glitch Hop' }, { name: 'Industrial Rap' }] },
      { name: 'Gospel Rap', children: [{ name: 'Christian Hip-Hop' }, { name: 'Inspirational Rap' }] },
      { name: 'Cloud Rap', children: [{ name: 'Ethereal Rap' }, { name: 'Vapor Rap' }] },
      { name: 'Emo Rap', children: [{ name: 'Sad Rap' }, { name: 'Post-Emo Rap' }] },
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
    ],
  },
  {
    name: 'Classical',
    children: [
      { name: 'Orchestral', children: [{ name: 'Symphonic' }, { name: 'Chamber Orchestra' }] },
      { name: 'Chamber Music', children: [{ name: 'String Quartet' }, { name: 'Piano Trio' }] },
      { name: 'Opera', children: [{ name: 'Grand Opera' }, { name: 'Opera Buffa' }] },
      { name: 'Contemporary Classical', children: [{ name: 'Minimalist' }, { name: 'Neo-Classical' }] },
      { name: 'Baroque', children: [{ name: 'Harpsichord' }, { name: 'Early Music' }] },
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
    ],
  },
  {
    name: 'Gospel/Christian',
    children: [
      { name: 'Contemporary Gospel', children: [{ name: 'Urban Gospel' }, { name: 'Praise & Worship' }] },
      { name: 'Traditional Gospel', children: [{ name: 'Choir' }, { name: 'Hymns' }] },
      { name: 'Christian Rock', children: [{ name: 'Worship Rock' }] },
      { name: 'Christian Hip-Hop', children: [{ name: 'Holy Hip-Hop' }] },
    ],
  },
  {
    name: 'Jazz',
    children: [
      { name: 'Modern Jazz', children: [{ name: 'Nu Jazz' }, { name: 'Jazz Fusion' }] },
      { name: 'Bebop', children: [{ name: 'Hard Bop' }, { name: 'Cool Jazz' }] },
      { name: 'Free Jazz', children: [{ name: 'Avant-Garde Jazz' }] },
      { name: 'Smooth Jazz', children: [{ name: 'Jazz Pop' }] },
      { name: 'Latin Jazz', children: [{ name: 'Afro-Cuban Jazz' }, { name: 'Bossa Nova Jazz' }] },
      { name: 'Swing', children: [{ name: 'Big Band' }, { name: 'Gypsy Jazz' }] },
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
    ],
  },
  {
    name: 'R&B/Soul',
    children: [
      { name: 'Neo-Soul', children: [{ name: 'Conscious Soul' }, { name: 'Nu Jazz Soul' }] },
      { name: 'Contemporary R&B', children: [{ name: 'PBR&B' }, { name: 'Alternative R&B' }] },
      { name: 'Classic R&B', children: [{ name: 'Motown' }, { name: 'Quiet Storm' }] },
      { name: 'Funk R&B', children: [{ name: 'Electro Funk' }, { name: 'P-Funk' }] },
      { name: 'Classic Soul', children: [{ name: 'Northern Soul' }, { name: 'Southern Soul' }] },
      { name: 'Psychedelic Soul', children: [{ name: 'Funk Soul' }] },
    ],
  },
  {
    name: 'Reggae/Caribbean',
    children: [
      { name: 'Dancehall', children: [{ name: 'Modern Dancehall' }, { name: 'Bashment' }] },
      { name: 'Roots Reggae', children: [{ name: 'Lovers Rock' }, { name: 'Dub' }] },
      { name: 'Soca', children: [{ name: 'Power Soca' }, { name: 'Groovy Soca' }] },
      { name: 'Calypso', children: [{ name: 'Kaiso' }] },
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
    ],
  },
  {
    name: 'African & Diaspora',
    children: [
      { name: 'Afrobeats', children: [{ name: 'Afro-Pop' }, { name: 'Afro-Fusion' }] },
      { name: 'Amapiano', children: [{ name: 'Private School Amapiano' }, { name: 'Vocal Amapiano' }] },
      { name: 'Highlife', children: [{ name: 'Palm Wine' }, { name: 'Juju Music' }] },
      { name: 'Afro House', children: [{ name: 'Gqom' }, { name: 'Kwaito' }] },
      { name: 'Soukous', children: [{ name: 'Congolese Rumba' }] },
    ],
  },
  {
    name: 'Traditional Black American',
    children: [
      { name: 'Spirituals', children: [{ name: 'Work Songs' }] },
      { name: 'Ragtime', children: [{ name: 'Stride Piano' }] },
      { name: 'Zydeco', children: [{ name: 'Creole Music' }] },
      { name: 'Go-Go', children: [{ name: 'DC Go-Go' }] },
    ],
  },
  {
    name: 'World',
    children: [
      { name: 'Middle Eastern', children: [{ name: 'Arabic Pop' }, { name: 'Sufi Music' }] },
      { name: 'Indian Classical', children: [{ name: 'Hindustani' }, { name: 'Carnatic' }] },
      { name: 'Celtic', children: [{ name: 'Irish Traditional' }, { name: 'Scottish Folk' }] },
      { name: 'East Asian', children: [{ name: 'J-Pop' }, { name: 'C-Pop' }, { name: 'Enka' }] },
      { name: 'Southeast Asian', children: [{ name: 'Filipino OPM' }, { name: 'Thai Pop' }] },
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
      { name: 'UK Garage', children: [{ name: '2-Step' }, { name: 'Speed Garage' }] },
      { name: 'Trance', children: [{ name: 'Progressive Trance' }, { name: 'Psytrance' }, { name: 'Uplifting Trance' }] },
      { name: 'IDM', children: [{ name: 'Glitch' }, { name: 'Experimental Electronic' }] },
      { name: 'Breakbeat', children: [{ name: 'Big Beat' }, { name: 'Florida Breaks' }] },
      { name: 'Disco/Nu-Disco', children: [{ name: 'Italo Disco' }, { name: 'Space Disco' }] },
    ],
  },
]

/** Get top-level genre names */
export function getGenres(): string[] {
  return GENRE_TAXONOMY.map((g) => g.name)
}

/** Get subgenres for given genres */
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

/** Get microgenres for given subgenres */
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
