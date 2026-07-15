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

export interface ParsedAddress {
  addressLine1: string
  townCity: string
  county: string
  postcode: string
  country: string
}

function componentByType(
  components: google.maps.GeocoderAddressComponent[],
  ...types: string[]
): string {
  for (const type of types) {
    const match = components.find((c) => c.types.includes(type))
    if (match) return match.long_name
  }
  return ''
}

/** Maps Google address_components into the venue address fields. */
export function parseAddressComponents(
  components: google.maps.GeocoderAddressComponent[],
): ParsedAddress {
  const streetNumber = componentByType(components, 'street_number')
  const route = componentByType(components, 'route')
  const addressLine1 = [streetNumber, route].filter(Boolean).join(' ')

  return {
    addressLine1,
    townCity: componentByType(components, 'postal_town', 'locality', 'sublocality'),
    county: componentByType(
      components,
      'administrative_area_level_2',
      'administrative_area_level_1',
    ),
    postcode: componentByType(components, 'postal_code'),
    country: componentByType(components, 'country'),
  }
}

export function formatCoordinates(lat: number, lng: number): string {
  return `${lat.toFixed(6)}, ${lng.toFixed(6)}`
}
