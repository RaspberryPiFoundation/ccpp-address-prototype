import { useEffect, useState } from 'react'
import { Alert } from './Alert'
import { loadGoogleMaps } from '../lib/googleMaps'
import { countryCodeForCountry } from '../data/reference'
import type { Coordinates } from './GoogleMap'

interface Props {
  pin: Coordinates
  /** The chosen country's display name. */
  country: string
  onChangeCountry: () => void
  /** Reports whether the pin is outside the chosen country (blocks proceeding). */
  onBlockingChange?: (blocking: boolean) => void
}

/**
 * Reverse-geocodes the map pin and warns if it falls outside the chosen country,
 * blocking the user from proceeding until they move the pin back in or change
 * which country they're searching in.
 */
export function PinCountryWarning({ pin, country, onChangeCountry, onBlockingChange }: Props) {
  // The country the pin actually sits in, when it differs from the chosen one.
  const [pinCountryName, setPinCountryName] = useState<string | null>(null)

  useEffect(() => {
    const chosenCode = countryCodeForCountry(country)?.toUpperCase()
    if (!chosenCode) {
      setPinCountryName(null)
      return
    }
    let cancelled = false
    const timer = window.setTimeout(async () => {
      try {
        const google = await loadGoogleMaps()
        const geocoder = new google.maps.Geocoder()
        const { results } = await geocoder.geocode({ location: pin })
        if (cancelled) return
        // The most specific result (results[0]) is sometimes a Plus Code or
        // feature with no country component, so scan all results for the first
        // one that has a country.
        let component: google.maps.GeocoderAddressComponent | undefined
        for (const result of results) {
          component = result.address_components?.find((c) => c.types.includes('country'))
          if (component) break
        }
        // Can't tell (no result with a country) → don't block.
        if (!component) {
          setPinCountryName(null)
          return
        }
        const inChosenCountry = component.short_name.toUpperCase() === chosenCode
        setPinCountryName(inChosenCountry ? null : component.long_name)
      } catch {
        if (!cancelled) setPinCountryName(null)
      }
    }, 500)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [pin.lat, pin.lng, country])

  const blocking = pinCountryName !== null

  useEffect(() => {
    onBlockingChange?.(blocking)
    return () => onBlockingChange?.(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blocking])

  if (!blocking) return null

  return (
    <Alert
      variant="error"
      title={`This location is outside ${country}`}
      actions={[{ label: 'Go back and change country', onClick: onChangeCountry }]}
      announce
    >
      The point you selected on the map is in <strong>{pinCountryName}</strong>, but you chose{' '}
      <strong>{country}</strong>. Move the pin back into {country}, or go back and change the country
      you’re searching in.
    </Alert>
  )
}
