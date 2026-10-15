// The campus destinations from docs/03-CAMPUS-MAP-SPECIFICATION.md: the nine
// documented destinations plus the Vivekananda Library (official key 3), added
// for the owner's Library location (10 Oct 2026).
//
// `pos` is a position on the map ARTWORK (assets/map/campus-map.jpg), as a
// percentage of its width and height. It was read from the numbered pins on the
// official FLAME University Campus Map 2025 and converted to the cropped artwork
// (crop box x 60..1450, y 10..900 of the 1500 x 1061 original).
//
// These are NOT GPS coordinates and must never be used as such.
// See docs/03 section 10 for the calibration that would be required.

export const MAP_IMAGE = {
  src: 'assets/map/campus-map.jpg',
  width: 1390,
  height: 890,
};

export const DESTINATIONS = [
  {
    id: 'main-gate',
    name: 'Main Gate',
    label: 'Main Gate',
    officialRef: 'Official key 46: FLAME Entrance',
    pos: { x: 86.5, y: 84.6 },
    blurb: 'Where every arrival begins. The road climbs in from here.',
  },
  {
    id: 'apj',
    name: 'APJ Abdul Kalam',
    label: 'APJ',
    officialRef: 'Official key 2: APJ Abdul Kalam (Academics)',
    pos: { x: 73.2, y: 35.6 },
    blurb: 'A long academic block on the eastern rise, beside the cricket ground.',
  },
  {
    id: 'arjuna',
    name: 'Arjuna Centre for Sports',
    label: 'Arjuna',
    officialRef: 'Official key 18: Arjuna Centre for Sports',
    pos: { x: 58.8, y: 8.3 },
    blurb: 'Courts, pool and studios at the northern edge, above the track.',
  },
  {
    id: 'housing',
    name: 'Housing Area',
    label: 'Housing Area',
    officialRef: 'Official keys 40 to 42: North, West and East Housing (marker on West Housing)',
    pos: { x: 17.3, y: 32.6 },
    blurb: 'The residential blocks along the western ridge.',
  },
  {
    id: 'common-areas',
    name: 'General Areas / Common Areas',
    label: 'Common Areas',
    officialRef: 'Official keys 46 to 48: Common Areas (marker on 48: ATM, Convenient Store)',
    pos: { x: 60.3, y: 76.1 },
    blurb: 'Shared everyday places: the store, the ATM, the infirmary.',
  },
  {
    id: 'eating-place',
    name: 'Mess',
    label: 'Mess',
    officialRef: 'Official keys 25 to 35: Eateries (marker on 26: Rasoi)',
    pos: { x: 62.6, y: 63.8 },
    blurb: 'Where queues turn into conversations, if you let them.',
  },
  {
    id: 'shantiniketan',
    name: 'Shantiniketan',
    label: 'Shantiniketan',
    officialRef: 'Official keys 49 to 54: Shantiniketan',
    pos: { x: 69.6, y: 68.5 },
    blurb: 'Auditorium, dance studio and rooms for making things.',
  },
  {
    id: 'library',
    name: 'Vivekananda Library',
    label: 'Library',
    officialRef: 'Official key 3: Vivekananda Library',
    pos: { x: 65.5, y: 47.4 },
    blurb: 'Quiet floors, long tables and a lot of glowing screens.',
  },
  {
    id: 'plaza',
    name: 'Plaza',
    label: 'Plaza',
    officialRef: 'Official key 43: FLAME Plaza',
    pos: { x: 60.8, y: 45.3 },
    blurb: 'The open heart of campus, crossed a hundred times a day.',
  },
  {
    id: 'chandragupta',
    name: 'Chandragupta Collaborative Development Centre',
    label: 'Chandragupta',
    officialRef: 'Official key 12: Chandragupta Collaborative Development Centre',
    pos: { x: 39.6, y: 51.9 },
    blurb: 'A curved building on the western side of the academic cluster.',
  },
];

export function getDestination(id) {
  return DESTINATIONS.find((d) => d.id === id) || null;
}
