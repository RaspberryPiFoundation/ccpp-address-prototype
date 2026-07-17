import { useEffect, useState } from 'react'
import { Alert } from './Alert'
import { Checkbox } from './Fields'
import { loadGoogleMaps } from '../lib/googleMaps'
import { countryCodeForCountry } from '../data/reference'
import type { Coordinates } from './GoogleMap'
import type { VenueAddress } from '../types'

const WARN_DISTANCE_KM = 10

// Great-circle distance in km between two coordinates.
function haversineKm(a: Coordinates, b: Coordinates): number {
  const R = 6371
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

interface Props {
  address: VenueAddress
  country: string
  pin: Coordinates
  /** Reports whether an unacknowledged mismatch should block continuing. */
  onBlockingChange?: (blocking: boolean) => void
}

/**
 * Forward-geocodes the entered address and warns if it lands more than 10km from
 * the map pin — a sign the address and pin have drifted out of sync. The user
 * can tick "this is expected" to acknowledge and continue.
 */
export function AddressPinWarning({ address, country, pin, onBlockingChange }: Props) {
  const [distanceKm, setDistanceKm] = useState<number | null>(null)
  const [acknowledged, setAcknowledged] = useState(false)

  const query = [
    address.addressLine1,
    address.municipality,
    address.administrativeArea,
    address.postcode,
    country,
  ]
    .filter(Boolean)
    .join(', ')

  useEffect(() => {
    // Any change to the address or pin needs a fresh acknowledgement.
    setAcknowledged(false)
    // Only check once there's a street plus a town or postcode to locate.
    if (!address.addressLine1.trim() || !(address.municipality.trim() || address.postcode.trim())) {
      setDistanceKm(null)
      return
    }
    let cancelled = false
    const timer = window.setTimeout(async () => {
      try {
        const google = await loadGoogleMaps()
        const geocoder = new google.maps.Geocoder()
        const code = countryCodeForCountry(country)
        const { results } = await geocoder.geocode({
          address: query,
          componentRestrictions: code ? { country: code } : undefined,
        })
        if (cancelled) return
        const loc = results[0]?.geometry?.location
        setDistanceKm(loc ? haversineKm(pin, { lat: loc.lat(), lng: loc.lng() }) : null)
      } catch {
        if (!cancelled) setDistanceKm(null)
      }
    }, 600)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [query, pin.lat, pin.lng])

  const isMismatch = distanceKm !== null && distanceKm > WARN_DISTANCE_KM
  const blocking = isMismatch && !acknowledged

  useEffect(() => {
    onBlockingChange?.(blocking)
    return () => onBlockingChange?.(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blocking])

  if (!isMismatch) return null

  return (
    <Alert variant="error" title="The address and map pin don’t match">
      The address you entered is about {Math.round(distanceKm!)} km from the map pin. Check the
      address details or move the pin to the correct location.
      <Checkbox
        id="address-mismatch-ack"
        label="This is expected — continue anyway"
        checked={acknowledged}
        onChange={setAcknowledged}
      />
    </Alert>
  )
}
