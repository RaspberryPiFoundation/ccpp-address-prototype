// The form implementations this prototype compares. Each is a distinct build of
// the "Where is the club venue?" step; everything else in the flow is shared.
// See Home.tsx for the front page that launches them.
export type Variant = 'as-is' | 'reveal-on-pin' | 'confirm-button' | 'search-first' | 'guided'

export interface VariantInfo {
  id: Variant
  title: string
  summary: string
}

export const VARIANTS: VariantInfo[] = [
  {
    id: 'as-is',
    title: 'Form as-is',
    summary:
      'The current flow. The address fields are always visible, and you save and continue whenever you like.',
  },
  {
    id: 'reveal-on-pin',
    title: 'Reveal address after pin is set',
    summary:
      'The “Confirm the venue’s address” section only appears once a location has been set — via search, the map, or entering it manually.',
  },
  {
    id: 'confirm-button',
    title: 'Map-first, then confirm',
    summary:
      'Name the venue and position the pin on a large movable map. Clicking “Confirm venue location” reveals the address to check and freezes the map until you edit it again.',
  },
  {
    id: 'search-first',
    title: 'Search-first, then map',
    summary:
      'Only the address search shows to start. Once a search returns a result the map appears to fine-tune the pin, then you confirm the address. No coordinate entry.',
  },
  {
    id: 'guided',
    title: 'Guided (easier for maps)',
    summary:
      'Designed for people who struggle with maps. Search or use your location and the address fills in for you to check in plain text — no map needed. The optional map uses tap-to-place instead of dragging a pin.',
  },
]
