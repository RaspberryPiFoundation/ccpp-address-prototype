import { useState } from 'react'
import { Layout } from './components/Layout'
import { StartApplication } from './steps/StartApplication'
import { FindVenue } from './steps/FindVenue'
import { MapPicker } from './steps/MapPicker'
import { Complete } from './steps/Complete'
import type { Coordinates } from './components/GoogleMap'
import type { PlaceSelection } from './components/PlacesSearch'
import { loadGoogleMaps, parseAddressComponents, formatCoordinates } from './lib/googleMaps'
import { emptyApplication, type ApplicationData, type VenueAddress } from './types'

type Screen = 'start' | 'venue' | 'map' | 'complete'

// Default map centre (London) used until the user picks a place or drags the pin.
const DEFAULT_COORDS: Coordinates = { lat: 51.5074, lng: -0.1278 }

export default function App() {
  const [screen, setScreen] = useState<Screen>('start')
  const [data, setData] = useState<ApplicationData>(emptyApplication)
  const [coordinates, setCoordinates] = useState<Coordinates>(DEFAULT_COORDS)

  const update = (patch: Partial<ApplicationData>) => setData((d) => ({ ...d, ...patch }))
  const updateAddress = (patch: Partial<VenueAddress>) =>
    setData((d) => ({ ...d, address: { ...d.address, ...patch } }))

  // Autofill from a Places selection — resets any previously entered address
  // fields, per the flow chart ("autofills location and resets previous inputs").
  const applyPlace = (sel: PlaceSelection) => {
    const coords: Coordinates = { lat: sel.lat, lng: sel.lng }
    setCoordinates(coords)
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

  // On map save the backend reverse-geocodes the pin to populate the fields.
  const handleMapSave = async (c: Coordinates) => {
    setCoordinates(c)
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
    setScreen('venue')
  }

  const restart = () => {
    setData(emptyApplication)
    setCoordinates(DEFAULT_COORDS)
    setScreen('start')
  }

  return (
    <Layout>
      {screen === 'start' && (
        <StartApplication data={data} update={update} onContinue={() => setScreen('venue')} />
      )}
      {screen === 'venue' && (
        <FindVenue
          data={data}
          coordinates={coordinates}
          update={update}
          updateAddress={updateAddress}
          applyPlace={applyPlace}
          onEditMap={() => setScreen('map')}
          onChangeCountry={() => setScreen('start')}
          onBack={() => setScreen('start')}
          onContinue={() => setScreen('complete')}
        />
      )}
      {screen === 'map' && (
        <MapPicker
          initialCoordinates={coordinates}
          onSave={handleMapSave}
          onCancel={() => setScreen('venue')}
        />
      )}
      {screen === 'complete' && <Complete data={data} onRestart={restart} />}
    </Layout>
  )
}
