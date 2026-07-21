import { useEffect, useRef, useState } from 'react'
import { ProgressBar } from '../components/ProgressBar'
import { TextInput, TextArea, Checkbox } from '../components/Fields'
import { Button } from '../components/Button'
import { GoogleMap, type Coordinates } from '../components/GoogleMap'
import { PlacesSearch, type PlaceSelection } from '../components/PlacesSearch'
import { AddressPinWarning } from '../components/AddressPinWarning'
import { PinCountryWarning } from '../components/PinCountryWarning'
import { ArrowBackIcon } from '../components/icons'
import { countryCodeForCountry, isPostcodeRequired } from '../data/reference'
import { placeDetailsById } from '../lib/googleMaps'
import type { ApplicationData, VenueAddress } from '../types'

interface Props {
  data: ApplicationData
  coordinates: Coordinates
  update: (patch: Partial<ApplicationData>) => void
  updateAddress: (patch: Partial<VenueAddress>) => void
  applyPlace: (selection: PlaceSelection) => void
  onChangeCountry: () => void
  onBack: () => void
  onContinue: () => void
  /** Reverse-geocodes the given pin location and fills the address fields. */
  onConfirmLocation: (c: Coordinates) => Promise<void>
}

/**
 * Guided variant, designed for people who struggle with maps. Search (or "use my
 * location") is the main path and fills the address straight away, shown as plain
 * editable fields to confirm by reading — no map manipulation required. The map
 * is optional; when shown you can simply tap where your venue is (tap-to-place)
 * rather than drag a pin, and the address updates to match.
 */
export function FindVenueGuided({
  data,
  coordinates,
  update,
  updateAddress,
  applyPlace,
  onChangeCountry,
  onBack,
  onContinue,
  onConfirmLocation,
}: Props) {
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [coords, setCoords] = useState<Coordinates>(coordinates)
  const [hasLocation, setHasLocation] = useState(false)
  const [showMap, setShowMap] = useState(false)
  const [addressMismatchBlocking, setAddressMismatchBlocking] = useState(false)
  const [pinOutsideCountry, setPinOutsideCountry] = useState(false)
  // Announced to screen readers when the address is filled from a choice.
  const [statusMessage, setStatusMessage] = useState('')

  // Refs so the map's once-bound listeners read current values, not stale ones.
  const hasLocationRef = useRef(false)
  hasLocationRef.current = hasLocation
  const skipNextGeocode = useRef(false)
  const geocodeTimer = useRef<number | undefined>(undefined)
  // Heading of the revealed address section, focused when it appears.
  const addressHeadingRef = useRef<HTMLHeadingElement>(null)

  // Move focus to the address section once a location is set, so keyboard and
  // screen reader users are taken to the fields they need to check.
  useEffect(() => {
    if (hasLocation) addressHeadingRef.current?.focus()
  }, [hasLocation])

  // Reverse-geocode a pin (debounced) to keep the address fields in step with it.
  const refreshAddressFromPin = (c: Coordinates) => {
    window.clearTimeout(geocodeTimer.current)
    geocodeTimer.current = window.setTimeout(() => {
      void onConfirmLocation(c)
    }, 500)
  }
  useEffect(() => () => window.clearTimeout(geocodeTimer.current), [])

  // Search / "use my location": fills the address (with a name) and moves the pin.
  const handlePlace = (sel: PlaceSelection) => {
    applyPlace(sel)
    setCoords({ lat: sel.lat, lng: sel.lng })
    setHasLocation(true)
    setShowMap(true)
    setStatusMessage('We filled in the address below from your choice. Please check it.')
    // applyPlace already filled the address, so ignore the recentre that follows.
    skipNextGeocode.current = true
  }

  const handlePoiSelect = async (placeId: string) => {
    const details = await placeDetailsById(placeId)
    if (details) handlePlace(details)
  }

  // Tapping the map (or using the map centre) places the pin and refreshes the
  // address to match.
  const handleMapClick = (c: Coordinates) => {
    setCoords(c)
    setHasLocation(true)
    setStatusMessage('Location set. Updating the address below to match the map.')
    refreshAddressFromPin(c)
  }

  // Dragging the map: update the pin and, once a location exists, the address.
  const handleCoordsChange = (c: Coordinates) => {
    setCoords(c)
    if (skipNextGeocode.current) {
      skipNextGeocode.current = false
      return
    }
    if (hasLocationRef.current) refreshAddressFromPin(c)
  }

  const handleContinue = () => {
    const e: Record<string, string> = {}
    if (!data.venueName.trim()) e.venueName = 'This field is required.'
    if (!data.address.addressLine1.trim()) e.addressLine1 = 'This field is required.'
    if (!data.address.municipality.trim()) e.municipality = 'This field is required.'
    if (isPostcodeRequired(data.country) && !data.address.postcode.trim())
      e.postcode = 'This field is required.'
    if (!data.confirmedPermission) e.permission = 'You must confirm you have permission.'
    setErrors(e)
    if (Object.keys(e).length === 0) onContinue()
  }

  return (
    <div className="card">
      <ProgressBar step={2} total={4} />

      <div className="intro">
        <h1 className="title-md">Where is the club venue?</h1>
        <p className="body">
          Search for your venue below, or use your current location. We’ll fill in the address for
          you to check — you don’t have to use the map unless you want to.
        </p>
      </div>

      <div className="section-gap">
        <PlacesSearch onSelect={handlePlace} countryCode={countryCodeForCountry(data.country)} />

        {/* Screen-reader announcement when the address is filled from a choice. */}
        <p className="visually-hidden" role="status" aria-live="polite">
          {statusMessage}
        </p>

        {!showMap && (
          <button type="button" className="link-button" onClick={() => setShowMap(true)}>
            Can’t find it? Point to it on a map instead
          </button>
        )}

        {showMap && (
          <>
            <div className="field">
              <div className="label-wrapper">
                <label>Point to your venue on the map</label>
                <span className="hint">
                  Tap the spot where your venue is, or drag the map. Using a keyboard: focus the map,
                  move it with the arrow keys, zoom with + and −, then use the button below. The
                  address updates to match.
                </span>
              </div>
              <GoogleMap
                key="guided"
                variant="full"
                coordinates={coords}
                interactive
                onCoordinatesChange={handleCoordsChange}
                onMapClick={handleMapClick}
                onPoiSelect={handlePoiSelect}
              />
              <Button variant="secondary" onClick={() => handleMapClick(coords)}>
                Use the map centre as the venue location
              </Button>
            </div>

            <PinCountryWarning
              pin={coords}
              country={data.country}
              onChangeCountry={onChangeCountry}
              onBlockingChange={setPinOutsideCountry}
            />
          </>
        )}

        {hasLocation && (
          <>
            <hr className="divider" />

            <h2 className="title-sm" tabIndex={-1} ref={addressHeadingRef}>
              Check the venue’s address
            </h2>
            <p className="body muted">
              We filled this in from your choice. Please read it and fix anything that isn’t right.
            </p>

            <TextInput
              id="venueName"
              label="What is the name of the venue?"
              hint="e.g. Prince’s Library"
              value={data.venueName}
              onChange={(v) => update({ venueName: v })}
              error={errors.venueName}
            />
            <TextInput
              id="addressLine1"
              label="Address line 1"
              autoComplete="address-line1"
              value={data.address.addressLine1}
              onChange={(v) => updateAddress({ addressLine1: v })}
              error={errors.addressLine1}
            />
            <TextInput
              id="addressLine2"
              label="Address line 2 (optional)"
              autoComplete="address-line2"
              value={data.address.addressLine2}
              onChange={(v) => updateAddress({ addressLine2: v })}
            />
            <TextInput
              id="municipality"
              label="Village / Town / City"
              autoComplete="address-level2"
              value={data.address.municipality}
              onChange={(v) => updateAddress({ municipality: v })}
              error={errors.municipality}
            />
            <TextInput
              id="administrativeArea"
              label="County / state / province (optional)"
              autoComplete="address-level1"
              value={data.address.administrativeArea}
              onChange={(v) => updateAddress({ administrativeArea: v })}
            />
            <TextInput
              id="postcode"
              label={isPostcodeRequired(data.country) ? 'Postcode' : 'Postcode (optional)'}
              autoComplete="postal-code"
              value={data.address.postcode}
              onChange={(v) => updateAddress({ postcode: v })}
              error={errors.postcode}
            />

            <AddressPinWarning
              address={data.address}
              country={data.country}
              pin={coords}
              onBlockingChange={setAddressMismatchBlocking}
            />

            <hr className="divider" />

            <TextArea
              id="locationDescription"
              label="Describe the location (optional)"
              hint="If the map or address don’t pinpoint your venue, describe where it is. Include nearby landmarks, road names, or anything that helps someone find it."
              value={data.locationDescription}
              onChange={(v) => update({ locationDescription: v })}
            />

            <Checkbox
              id="permission"
              label="I confirm I have permission to host a club at this venue."
              checked={data.confirmedPermission}
              onChange={(v) => update({ confirmedPermission: v })}
              error={errors.permission}
            />

            <div className="info-panel">
              We will use this address to verify your club and show it on your public profile.
            </div>
          </>
        )}
      </div>

      <div className="button-wrapper">
        <Button variant="secondary" icon={<ArrowBackIcon />} onClick={onBack}>
          Back
        </Button>
        <Button
          variant="primary"
          onClick={handleContinue}
          disabled={!hasLocation || pinOutsideCountry || addressMismatchBlocking}
        >
          Save and continue
        </Button>
      </div>
    </div>
  )
}
