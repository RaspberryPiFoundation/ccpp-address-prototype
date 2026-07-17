// Country and subdivision reference data.
//
// Sourced from https://github.com/countries/countries-data-json (MIT). The full
// dataset covers 249 countries; `countries-data.json` here is a trimmed vendored
// copy — country + subdivision {code, name} pairs — for the countries this
// prototype supports. For the UK the four nations (England/Scotland/Wales/
// Northern Ireland) are excluded from the subdivision list so it holds real
// local authorities. Regenerate by re-running the extraction against the
// upstream repo.
import countriesData from './countries-data.json'

interface CountryEntry {
  code: string
  name: string
}

interface Subdivision {
  code: string
  name: string
}

const COUNTRY_ENTRIES = countriesData.countries as CountryEntry[]
const SUBDIVISIONS = countriesData.subdivisions as Record<string, Subdivision[]>

const NAME_TO_CODE = new Map(COUNTRY_ENTRIES.map((c) => [c.name, c.code]))

// Country names for the country dropdown, alphabetically sorted.
export const COUNTRIES = COUNTRY_ENTRIES.map((c) => c.name).sort((a, b) => a.localeCompare(b))

function subdivisionsFor(countryName: string): Subdivision[] {
  const code = NAME_TO_CODE.get(countryName)
  return code ? (SUBDIVISIONS[code] ?? []) : []
}

// Subdivision names (counties / states / provinces / council areas) for a
// country, looked up by its display name. Returns [] for an unknown country.
export function subdivisionsForCountry(countryName: string): string[] {
  return subdivisionsFor(countryName).map((s) => s.name)
}

// Normalise a subdivision value to the canonical full name. Google's adr address
// often gives the ISO code (e.g. "CA" for California, "ON" for Ontario); match
// on either code or name so the value lines up with the select options.
export function canonicalSubdivision(countryName: string, value: string): string {
  if (!value) return ''
  const lower = value.trim().toLowerCase()
  const match = subdivisionsFor(countryName).find(
    (s) => s.name.toLowerCase() === lower || s.code.toLowerCase() === lower,
  )
  return match ? match.name : value
}

// ISO 3166-1 alpha-2 code (lowercase) for a country display name — the form
// Google Places `componentRestrictions` expects. undefined if country unset.
export function countryCodeForCountry(countryName: string): string | undefined {
  return NAME_TO_CODE.get(countryName)?.toLowerCase()
}

// Capital-city coordinates, keyed by ISO alpha-2. The dataset only carries a
// country centroid, so we keep a small curated map to centre the map pin on the
// capital when a country is chosen.
const CAPITALS: Record<string, { lat: number; lng: number }> = {
  GB: { lat: 51.5074, lng: -0.1278 }, // London
  IN: { lat: 28.6139, lng: 77.209 }, // New Delhi
  ZA: { lat: -25.7461, lng: 28.1881 }, // Pretoria
  US: { lat: 38.9072, lng: -77.0369 }, // Washington, D.C.
  CA: { lat: 45.4215, lng: -75.6972 }, // Ottawa
  KE: { lat: -1.2921, lng: 36.8219 }, // Nairobi
}

// Capital-city coordinates for a country display name, or undefined if unknown.
export function capitalForCountry(countryName: string): { lat: number; lng: number } | undefined {
  const code = NAME_TO_CODE.get(countryName)
  return code ? CAPITALS[code] : undefined
}

export const VENUE_TYPES = [
  'Library',
  'School',
  'Community centre',
  'Place of worship',
  'Youth club',
  'Workplace',
  'Other public venue',
]
