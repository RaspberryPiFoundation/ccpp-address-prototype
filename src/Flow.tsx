import { useState } from 'react'
import { StartApplication } from './steps/StartApplication'
import { FindVenue } from './steps/FindVenue'
import { FindVenueRevealOnPin } from './steps/FindVenueRevealOnPin'
import { FindVenueMapFirst } from './steps/FindVenueMapFirst'
import { MapPicker } from './steps/MapPicker'
import { Complete } from './steps/Complete'
import type { Coordinates } from './components/GoogleMap'
import type { PlaceSelection } from './components/PlacesSearch'
import { loadGoogleMaps, parseAddressComponents, formatCoordinates } from './lib/googleMaps'
import { emptyApplication, type ApplicationData, type VenueAddress } from './types'
import { VARIANTS, type Variant } from './variants'

interface Props {
  variant: Variant
  onExit: () => void
}

type Screen = 'start' | 'venue' | 'map' | 'complete'

// Default map centre (London) used until the user picks a place or drags the pin.
const DEFAULT_COORDS: Coordinates = { lat: 51.5074, lng: -0.1278 }

export function Flow({ variant, onExit }: Props) {
  const [screen, setScreen] = useState<Screen>('start')
  const [data, setData] = useState<ApplicationData>(emptyApplication)
  const [coordinates, setCoordinates] = useState<Coordinates>(DEFAULT_COORDS)
  // Whether a venue location has been established (via search, map, or — in the
  // reveal-on-pin variant — the manual escape hatch). Drives variant 2's reveal.
  const [locationSet, setLocationSet] = useState(false)

  const info = VARIANTS.find((v) => v.id === variant)!

  const update = (patch: Partial<ApplicationData>) => setData((d) => ({ ...d, ...patch }))
  const updateAddress = (patch: Partial<VenueAddress>) =>
    setData((d) => ({ ...d, address: { ...d.address, ...patch } }))

  // Autofill from a Places selection — resets any previously entered address
  // fields, per the flow chart ("autofills location and resets previous inputs").
  const applyPlace = (sel: PlaceSelection) => {
    const coords: Coordinates = { lat: sel.lat, lng: sel.lng }
    setCoordinates(coords)
    setLocationSet(true)
    setData((d) => ({
      ...d,
      venueName: d.venueName || sel.venueName,
      address: {
        addressLine1: sel.address.addressLine1,
        addressLine2: '',
        townCity: sel.address.townCity,
        county: sel.address.county,
        postcode: sel.address.postcode,
        coordinates: formatCoordinates(sel.lat, sel.lng),
      },
    }))
  }

  // Reverse-geocode a pin location to populate the address fields. Used both by
  // the standalone map screen (variants 1 & 2) and by variant 3's inline
  // "Confirm venue location" step. Does not navigate — callers decide that.
  const populateFromCoords = async (c: Coordinates) => {
    setCoordinates(c)
    setLocationSet(true)
    updateAddress({ coordinates: formatCoordinates(c.lat, c.lng) })
    try {
      const google = await loadGoogleMaps()
      const geocoder = new google.maps.Geocoder()
      const { results } = await geocoder.geocode({ location: c })
      if (results && results[0]) {
        const parsed = parseAddressComponents(results[0].address_components)
        setData((d) => ({
          ...d,
          address: {
            addressLine1: parsed.addressLine1,
            addressLine2: '',
            townCity: parsed.townCity,
            county: parsed.county,
            postcode: parsed.postcode,
            coordinates: formatCoordinates(c.lat, c.lng),
          },
        }))
      }
    } catch {
      // Geocoding unavailable — keep the coordinates and let the user fill the rest.
    }
  }

  const handleMapSave = async (c: Coordinates) => {
    await populateFromCoords(c)
    setScreen('venue')
  }

  const restart = () => {
    setData(emptyApplication)
    setCoordinates(DEFAULT_COORDS)
    setLocationSet(false)
    setScreen('start')
  }

  const findVenueCommon = {
    data,
    coordinates,
    update,
    updateAddress,
    applyPlace,
    onEditMap: () => setScreen('map'),
    onChangeCountry: () => setScreen('start'),
    onBack: () => setScreen('start'),
    onContinue: () => setScreen('complete'),
  }

  return (
    <div className="flow">
      <div className="variant-banner">
        <button type="button" className="link-button" onClick={onExit}>
          ← All variants
        </button>
        <span className="variant-banner-title">{info.title}</span>
      </div>

      {screen === 'start' && (
        <StartApplication data={data} update={update} onContinue={() => setScreen('venue')} />
      )}
      {screen === 'venue' && variant === 'as-is' && <FindVenue {...findVenueCommon} />}
      {screen === 'venue' && variant === 'reveal-on-pin' && (
        <FindVenueRevealOnPin
          {...findVenueCommon}
          locationSet={locationSet}
          onEnterManually={() => setLocationSet(true)}
        />
      )}
      {screen === 'venue' && variant === 'confirm-button' && (
        <FindVenueMapFirst {...findVenueCommon} onConfirmLocation={populateFromCoords} />
      )}
      {screen === 'map' && (
        <MapPicker
          initialCoordinates={coordinates}
          onSave={handleMapSave}
          onCancel={() => setScreen('venue')}
        />
      )}
      {screen === 'complete' && <Complete data={data} onRestart={restart} />}
    </div>
  )
}
