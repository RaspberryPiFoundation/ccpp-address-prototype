// Country reference data.
//
// Sourced from https://github.com/countries/countries-data-json (MIT). The full
// dataset covers 249 countries; `countries-data.json` here is a trimmed vendored
// copy for the countries this prototype supports.
import countriesData from './countries-data.json'

interface CountryEntry {
  code: string
  name: string
}

const COUNTRY_ENTRIES = countriesData.countries as CountryEntry[]

const NAME_TO_CODE = new Map(COUNTRY_ENTRIES.map((c) => [c.name, c.code]))

// Country names for the country dropdown, alphabetically sorted.
export const COUNTRIES = COUNTRY_ENTRIES.map((c) => c.name).sort((a, b) => a.localeCompare(b))

// ISO 3166-1 alpha-2 code (lowercase) for a country display name — the form
// Google Places `componentRestrictions` expects. undefined if country unset.
export function countryCodeForCountry(countryName: string): string | undefined {
  return NAME_TO_CODE.get(countryName)?.toLowerCase()
}

// Postcodes are only mandatory for countries where they're an essential part of
// the address (UK and US here); optional everywhere else.
const POSTCODE_REQUIRED_CODES = new Set(['gb', 'us'])
export function isPostcodeRequired(countryName: string): boolean {
  const code = countryCodeForCountry(countryName)
  return code ? POSTCODE_REQUIRED_CODES.has(code) : false
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

// Localised labels + example hints for the venue address fields.
export interface AddressFieldText {
  label: string
  hint?: string
}
export interface AddressFormat {
  addressLine1: AddressFieldText
  addressLine2: AddressFieldText
  municipality: AddressFieldText
  administrativeArea: AddressFieldText
  postcode: AddressFieldText
}

// Per-country address-field text for the core markets. Labels follow the
// conventions in Google's address i18n dataset (libaddressinput), so they match
// what people see elsewhere in their country. The "(optional)" suffixes mirror
// the validation rules: the postcode is only required where isPostcodeRequired
// is true (GB, US) — keep the two in sync if that set changes.
const ADDRESS_FORMATS: Record<string, AddressFormat> = {
  GB: {
    addressLine1: { label: 'Address line 1', hint: 'Building number and street, e.g. 37 Hills Road' },
    addressLine2: { label: 'Address line 2 (optional)', hint: 'Flat, unit, or building name' },
    municipality: { label: 'Town or city', hint: 'e.g. Cambridge' },
    administrativeArea: { label: 'County (optional)', hint: 'e.g. Cambridgeshire' },
    postcode: { label: 'Postcode', hint: 'e.g. CB2 1NT' },
  },
  US: {
    addressLine1: { label: 'Street address', hint: 'Number and street, e.g. 1600 Amphitheatre Pkwy' },
    addressLine2: { label: 'Apt, suite, or unit (optional)' },
    municipality: { label: 'City', hint: 'e.g. Mountain View' },
    administrativeArea: { label: 'State (optional)', hint: 'e.g. California' },
    postcode: { label: 'ZIP code', hint: 'e.g. 94043' },
  },
  IE: {
    addressLine1: { label: 'Address line 1', hint: 'Building number and street' },
    addressLine2: { label: 'Address line 2 (optional)', hint: 'Flat, unit, or building name' },
    municipality: { label: 'Town or city', hint: 'e.g. Galway' },
    administrativeArea: { label: 'County (optional)', hint: 'e.g. County Cork' },
    postcode: { label: 'Eircode (optional)', hint: 'e.g. D02 AF30' },
  },
  IN: {
    addressLine1: { label: 'Address', hint: 'Building number and street, e.g. 12 MG Road' },
    addressLine2: { label: 'Area or locality (optional)', hint: 'Locality, area, or nearby landmark' },
    municipality: { label: 'City, town, or village', hint: 'e.g. Bengaluru' },
    administrativeArea: { label: 'State (optional)', hint: 'e.g. Karnataka' },
    postcode: { label: 'PIN code (optional)', hint: '6 digits, e.g. 560001' },
  },
  KE: {
    addressLine1: { label: 'Building, estate, or street', hint: 'Building name, road, or plot number' },
    addressLine2: { label: 'Area or neighbourhood (optional)', hint: 'Estate, ward, or nearby landmark' },
    municipality: { label: 'Town or city', hint: 'e.g. Nairobi' },
    administrativeArea: { label: 'County (optional)', hint: 'e.g. Nairobi County' },
    postcode: { label: 'Postal code (optional)', hint: '5 digits, e.g. 00100' },
  },
  ZA: {
    addressLine1: { label: 'Street address', hint: 'Number and street, or building name' },
    addressLine2: { label: 'Suburb (optional)', hint: 'Suburb or complex' },
    municipality: { label: 'City or town', hint: 'e.g. Cape Town' },
    administrativeArea: { label: 'Province (optional)', hint: 'e.g. Western Cape' },
    postcode: { label: 'Postal code (optional)', hint: '4 digits, e.g. 8001' },
  },
}

// Generic fallback for countries we haven't tailored.
const DEFAULT_ADDRESS_FORMAT: AddressFormat = {
  addressLine1: { label: 'Address line 1', hint: 'Building number and street' },
  addressLine2: { label: 'Address line 2 (optional)' },
  municipality: { label: 'Town or city' },
  administrativeArea: { label: 'Region, state, or province (optional)' },
  postcode: { label: 'Postal code (optional)' },
}

// Localised address-field labels and hints for a country display name.
export function addressFormat(countryName: string): AddressFormat {
  const code = countryCodeForCountry(countryName)?.toUpperCase()
  return (code && ADDRESS_FORMATS[code]) || DEFAULT_ADDRESS_FORMAT
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
