/**
 * Genre Taxonomy Data
 * 3-tier hierarchy: Genre -> Sub-genre -> Micro-genre
 */

export interface GenreTaxonomyNode {
  name: string
  children?: GenreTaxonomyNode[]
}

export const GENRE_TAXONOMY: GenreTaxonomyNode[] = [
  {
    name: 'Hip-Hop',
    children: [
      { name: 'Trap', children: [{ name: 'Drill' }, { name: 'Melodic Trap' }, { name: 'Plugg' }, { name: 'Dark Trap' }] },
      { name: 'Boom Bap', children: [{ name: 'East Coast' }, { name: 'Jazz Rap' }, { name: 'Conscious' }] },
      { name: 'Southern', children: [{ name: 'Crunk' }, { name: 'Chopped & Screwed' }, { name: 'Bounce' }] },
      { name: 'West Coast', children: [{ name: 'G-Funk' }, { name: 'Hyphy' }, { name: 'Bay Area' }] },
      { name: 'Cloud Rap', children: [{ name: 'Ethereal' }, { name: 'Vapor Trap' }] },
      { name: 'Emo Rap', children: [{ name: 'SoundCloud Rap' }, { name: 'Rage' }] },
    ],
  },
  {
    name: 'R&B',
    children: [
      { name: 'Neo-Soul', children: [{ name: 'Conscious Soul' }, { name: 'Nu Jazz Soul' }] },
      { name: 'Contemporary R&B', children: [{ name: 'PBR&B' }, { name: 'Alternative R&B' }] },
      { name: 'Classic R&B', children: [{ name: 'Motown' }, { name: 'Quiet Storm' }] },
      { name: 'Funk R&B', children: [{ name: 'Electro Funk' }, { name: 'P-Funk' }] },
    ],
  },
  {
    name: 'Pop',
    children: [
      { name: 'Synth Pop', children: [{ name: 'Dark Synth' }, { name: 'Electropop' }] },
      { name: 'Art Pop', children: [{ name: 'Avant-Pop' }, { name: 'Experimental Pop' }] },
      { name: 'Dance Pop', children: [{ name: 'Euro Pop' }, { name: 'Disco Pop' }] },
      { name: 'Indie Pop', children: [{ name: 'Bedroom Pop' }, { name: 'Chamber Pop' }] },
    ],
  },
  {
    name: 'Rock',
    children: [
      { name: 'Alternative', children: [{ name: 'Grunge' }, { name: 'Shoegaze' }, { name: 'Dream Pop' }] },
      { name: 'Punk Rock', children: [{ name: 'Pop Punk' }, { name: 'Post-Punk' }, { name: 'Hardcore' }] },
      { name: 'Hard Rock', children: [{ name: 'Classic Rock' }, { name: 'Blues Rock' }] },
      { name: 'Progressive', children: [{ name: 'Math Rock' }, { name: 'Post-Rock' }] },
    ],
  },
  {
    name: 'Electronic',
    children: [
      { name: 'House', children: [{ name: 'Deep House' }, { name: 'Tech House' }, { name: 'Afro House' }] },
      { name: 'Techno', children: [{ name: 'Minimal' }, { name: 'Industrial Techno' }] },
      { name: 'Drum & Bass', children: [{ name: 'Liquid DnB' }, { name: 'Jungle' }, { name: 'Neurofunk' }] },
      { name: 'Ambient', children: [{ name: 'Dark Ambient' }, { name: 'Drone' }] },
      { name: 'Dubstep', children: [{ name: 'Riddim' }, { name: 'Melodic Dubstep' }] },
    ],
  },
  {
    name: 'Jazz',
    children: [
      { name: 'Modern Jazz', children: [{ name: 'Nu Jazz' }, { name: 'Jazz Fusion' }] },
      { name: 'Bebop', children: [{ name: 'Hard Bop' }, { name: 'Cool Jazz' }] },
      { name: 'Free Jazz', children: [{ name: 'Avant-Garde' }] },
    ],
  },
  {
    name: 'Country',
    children: [
      { name: 'Modern Country', children: [{ name: 'Country Pop' }, { name: 'Bro-Country' }] },
      { name: 'Outlaw Country', children: [{ name: 'Americana' }, { name: 'Alt-Country' }] },
      { name: 'Bluegrass', children: [{ name: 'Progressive Bluegrass' }] },
    ],
  },
  {
    name: 'Reggae',
    children: [
      { name: 'Dancehall', children: [{ name: 'Modern Dancehall' }, { name: 'Dub' }] },
      { name: 'Roots Reggae', children: [{ name: 'Lovers Rock' }] },
      { name: 'Reggaeton', children: [{ name: 'Latin Trap' }, { name: 'Dembow' }] },
    ],
  },
  {
    name: 'Soul',
    children: [
      { name: 'Classic Soul', children: [{ name: 'Northern Soul' }, { name: 'Southern Soul' }] },
      { name: 'Psychedelic Soul', children: [{ name: 'Funk Soul' }] },
    ],
  },
  {
    name: 'Gospel',
    children: [
      { name: 'Contemporary Gospel', children: [{ name: 'Urban Gospel' }] },
      { name: 'Traditional Gospel', children: [{ name: 'Choir' }] },
    ],
  },
  {
    name: 'Blues',
    children: [
      { name: 'Electric Blues', children: [{ name: 'Chicago Blues' }] },
      { name: 'Delta Blues', children: [{ name: 'Acoustic Blues' }] },
    ],
  },
  {
    name: 'Funk',
    children: [
      { name: 'Classic Funk', children: [{ name: 'Parliament-Funk' }] },
      { name: 'Modern Funk', children: [{ name: 'Boogie Funk' }, { name: 'Synth Funk' }] },
    ],
  },
  {
    name: 'Metal',
    children: [
      { name: 'Heavy Metal', children: [{ name: 'Thrash' }, { name: 'Speed Metal' }] },
      { name: 'Nu Metal', children: [{ name: 'Rap Metal' }] },
      { name: 'Death Metal', children: [{ name: 'Melodic Death' }, { name: 'Technical Death' }] },
      { name: 'Black Metal', children: [{ name: 'Atmospheric Black' }] },
    ],
  },
  {
    name: 'Folk',
    children: [
      { name: 'Indie Folk', children: [{ name: 'Freak Folk' }, { name: 'Chamber Folk' }] },
      { name: 'Traditional Folk', children: [{ name: 'Celtic' }, { name: 'Appalachian' }] },
    ],
  },
  {
    name: 'Latin',
    children: [
      { name: 'Salsa', children: [{ name: 'Timba' }] },
      { name: 'Bachata', children: [{ name: 'Modern Bachata' }] },
      { name: 'Cumbia', children: [{ name: 'Digital Cumbia' }] },
      { name: 'Bossa Nova', children: [{ name: 'MPB' }] },
    ],
  },
  {
    name: 'Indie',
    children: [
      { name: 'Indie Rock', children: [{ name: 'Lo-Fi' }, { name: 'Noise Rock' }] },
      { name: 'Indie Electronic', children: [{ name: 'Chillwave' }, { name: 'Synthwave' }] },
    ],
  },
  {
    name: 'Punk',
    children: [
      { name: 'Hardcore Punk', children: [{ name: 'Straight Edge' }] },
      { name: 'Ska Punk', children: [{ name: 'Third Wave Ska' }] },
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
