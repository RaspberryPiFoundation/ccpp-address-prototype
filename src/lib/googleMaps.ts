import { Loader } from '@googlemaps/js-api-loader'

export const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined

let loaderPromise: Promise<typeof google> | null = null

/**
 * Loads the Google Maps JavaScript API (Maps + Places libraries) once and
 * caches the promise. Rejects if no API key is configured.
 */
export function loadGoogleMaps(): Promise<typeof google> {
  if (!GOOGLE_MAPS_API_KEY) {
    return Promise.reject(new Error('missing-api-key'))
  }
  if (!loaderPromise) {
    const loader = new Loader({
      apiKey: GOOGLE_MAPS_API_KEY,
      version: 'weekly',
      libraries: ['places', 'marker', 'geocoding'],
    })
    loaderPromise = loader.load()
  }
  return loaderPromise
}

// Address parsed straight from Google's adr microformat (`adr_address` /
// `adrFormatAddress`). Field names match the clubs API venue address.
export interface AdrAddress {
  addressLine1: string
  addressLine2: string
  municipality: string
  administrativeArea: string
  postcode: string
  country: string
}

const EMPTY_ADR: AdrAddress = {
  addressLine1: '',
  addressLine2: '',
  municipality: '',
  administrativeArea: '',
  postcode: '',
  country: '',
}

export function emptyAdrAddress(): AdrAddress {
  return { ...EMPTY_ADR }
}

/**
 * Parses the adr microformat HTML Google returns for a place into address
 * fields. The adr format labels each part per the country's own conventions
 * (street-address, extended-address, locality, region, postal-code,
 * country-name), so we read those directly rather than guessing admin levels.
 */
export function parseAdrAddress(adr: string | null | undefined): AdrAddress {
  if (!adr) return emptyAdrAddress()
  // Log the raw adr microformat so it can be inspected while prototyping.
  console.log('adr_address:', adr)
  let doc: Document
  try {
    doc = new DOMParser().parseFromString(adr, 'text/html')
  } catch {
    return emptyAdrAddress()
  }
  const text = (selector: string) => doc.querySelector(selector)?.textContent?.trim() ?? ''
  return {
    addressLine1: text('.street-address'),
    addressLine2: text('.extended-address'),
    municipality: text('.locality'),
    administrativeArea: text('.region'),
    postcode: text('.postal-code'),
    country: text('.country-name'),
  }
}

/**
 * Fetches a place's adr address by place ID. Used for results that only give a
 * place ID (reverse geocoding, Plus Codes) so every path can rely on adr.
 */
export async function adrAddressForPlaceId(placeId: string): Promise<AdrAddress> {
  try {
    const google = await loadGoogleMaps()
    const place = new google.maps.places.Place({ id: placeId })
    await place.fetchFields({ fields: ['adrFormatAddress'] })
    return parseAdrAddress(place.adrFormatAddress)
  } catch {
    return emptyAdrAddress()
  }
}

export function formatCoordinates(lat: number, lng: number): string {
  return `${lat.toFixed(6)}, ${lng.toFixed(6)}`
}
