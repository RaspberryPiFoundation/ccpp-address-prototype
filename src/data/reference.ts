// Country and subdivision reference data.
//
// Sourced from https://github.com/countries/countries-data-json (MIT). The full
// dataset covers 249 countries; `countries-data.json` here is a trimmed vendored
// copy — names + subdivision names only — for the countries this prototype
// supports. For the UK the four nations (England/Scotland/Wales/Northern
// Ireland) are excluded from the subdivision list so it holds real local
// authorities. Regenerate by re-running the extraction against the upstream repo.
import countriesData from './countries-data.json'

interface CountryEntry {
  code: string
  name: string
}

const COUNTRY_ENTRIES = countriesData.countries as CountryEntry[]
const SUBDIVISIONS = countriesData.subdivisions as Record<string, string[]>

const NAME_TO_CODE = new Map(COUNTRY_ENTRIES.map((c) => [c.name, c.code]))

// Country names for the country dropdown, alphabetically sorted.
export const COUNTRIES = COUNTRY_ENTRIES.map((c) => c.name).sort((a, b) => a.localeCompare(b))

// Subdivisions (counties / states / provinces / council areas) for a country,
// looked up by its display name. Returns [] for an unknown or unset country.
export function subdivisionsForCountry(countryName: string): string[] {
  const code = NAME_TO_CODE.get(countryName)
  return code ? (SUBDIVISIONS[code] ?? []) : []
}

// ISO 3166-1 alpha-2 code (lowercase) for a country display name — the form
// Google Places `componentRestrictions` expects. undefined if country unset.
export function countryCodeForCountry(countryName: string): string | undefined {
  return NAME_TO_CODE.get(countryName)?.toLowerCase()
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
