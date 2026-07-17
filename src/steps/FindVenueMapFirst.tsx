import { useEffect, useState } from 'react'
import { ProgressBar } from '../components/ProgressBar'
import { TextInput, TextArea, Checkbox } from '../components/Fields'
import { Button } from '../components/Button'
import { GoogleMap, type Coordinates } from '../components/GoogleMap'
import { PlacesSearch, type PlaceSelection } from '../components/PlacesSearch'
import { SubdivisionField } from '../components/SubdivisionField'
import { AddressPinWarning } from '../components/AddressPinWarning'
import { PinCountryWarning } from '../components/PinCountryWarning'
import { ArrowBackIcon } from '../components/icons'
import { countryCodeForCountry } from '../data/reference'
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
 * Map-first variant. The venue name, address search and a large movable map
 * sit together while the user positions the pin. Clicking "Confirm venue
 * location" reverse-geocodes the pin, reveals the address for confirmation, and
 * freezes the search + map. "Edit map location" (on the frozen map) unfreezes
 * everything and hides the address section again.
 */
export function FindVenueMapFirst({
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
  const [locationConfirmed, setLocationConfirmed] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [addressMismatchBlocking, setAddressMismatchBlocking] = useState(false)
  const [pinOutsideCountry, setPinOutsideCountry] = useState(false)
  // The live pin position. Starts at the flow's current coordinates and updates
  // as the user drags the map or picks a search result.
  const [coords, setCoords] = useState<Coordinates>(coordinates)

  // Editable text for the lat/lng boxes. Kept separate from `coords` so the user
  // can type freely; committed to `coords` (which drives the map) on blur/Enter.
  const [latText, setLatText] = useState(coords.lat.toFixed(6))
  const [lngText, setLngText] = useState(coords.lng.toFixed(6))
  const [editingCoords, setEditingCoords] = useState(false)

  // Reflect map-driven pin changes (drag or search) back into the boxes, unless
  // the user is currently editing them.
  useEffect(() => {
    if (editingCoords) return
    setLatText(coords.lat.toFixed(6))
    setLngText(coords.lng.toFixed(6))
  }, [coords, editingCoords])

  // Move the pin to the typed coordinates. Invalid input is discarded — the
  // effect then restores the boxes to the current pin position.
  const applyTypedCoords = () => {
    setEditingCoords(false)
    const lat = parseFloat(latText)
    const lng = parseFloat(lngText)
    if (
      !Number.isNaN(lat) &&
      !Number.isNaN(lng) &&
      lat >= -90 &&
      lat <= 90 &&
      lng >= -180 &&
      lng <= 180
    ) {
      setCoords({ lat, lng })
    }
  }

  // A search result both fills the venue/address details and moves the pin.
  const handlePlace = (sel: PlaceSelection) => {
    applyPlace(sel)
    setCoords({ lat: sel.lat, lng: sel.lng })
  }

  const handleConfirmLocation = async () => {
    setConfirming(true)
    await onConfirmLocation(coords)
    setConfirming(false)
    setLocationConfirmed(true)
  }

  const handleEditLocation = () => {
    setLocationConfirmed(false)
  }

  const handleContinue = () => {
    const e: Record<string, string> = {}
    if (!data.venueName.trim()) e.venueName = 'This field is required.'
    if (!data.address.addressLine1.trim()) e.addressLine1 = 'This field is required.'
    if (!data.address.municipality.trim()) e.municipality = 'This field is required.'
    if (!data.address.postcode.trim()) e.postcode = 'This field is required.'
    if (!data.confirmedPermission) e.permission = 'You must confirm you have permission.'
    setErrors(e)
    if (Object.keys(e).length === 0) onContinue()
  }

  return (
    <div className="card">
      <ProgressBar step={2} total={4} />

      <div className="intro">
        <h1 className="title-md">
          {locationConfirmed ? 'Confirm the venue’s address' : 'Where is the club venue?'}
        </h1>
        {!locationConfirmed && (
          <>
            <p className="body">
              Pick an appropriate{' '}
              <a href="http://rpf.io/cc-venue" target="_blank" rel="noreferrer">
                venue for your club
              </a>
              .  Clubs need to run in public venues. You cannot run a club from a residential address,
              like your home. Online clubs still need to provide a venue for safeguarding reasons.
            </p>
          </>
        )}
      </div>

      <div className="section-gap">
        {!locationConfirmed && (
          <>
            <PlacesSearch
              onSelect={handlePlace}
              countryCode={countryCodeForCountry(data.country)}
            />

            <div className="or-divider">
              <span className="line" />
              <span>or</span>
              <span className="line" />
            </div>

            <div className="field">
              <div className="label-wrapper">
                <label>Find the venue on the map</label>
                <span className="hint">
                  Drag the map to move the pin to your venue, then confirm the location.
                </span>
              </div>
              <GoogleMap
                key="edit"
                variant="full"
                coordinates={coords}
                interactive
                onCoordinatesChange={setCoords}
              />
            </div>

            <div className="or-divider">
              <span className="line" />
              <span>or</span>
              <span className="line" />
            </div>

            <div className="field">
              <div className="label-wrapper">
                <label htmlFor="lat">Enter coordinates directly</label>
                <span className="hint">
                  Type a latitude and longitude to move the pin, or drag the map above.
                </span>
              </div>
              <div className="coord-row">
                <div className="coord-field">
                  <label htmlFor="lat">Latitude</label>
                  <input
                    id="lat"
                    className="input-box"
                    inputMode="decimal"
                    value={latText}
                    onChange={(e) => setLatText(e.target.value)}
                    onFocus={() => setEditingCoords(true)}
                    onBlur={applyTypedCoords}
                    onKeyDown={(e) => e.key === 'Enter' && applyTypedCoords()}
                  />
                </div>
                <div className="coord-field">
                  <label htmlFor="lng">Longitude</label>
                  <input
                    id="lng"
                    className="input-box"
                    inputMode="decimal"
                    value={lngText}
                    onChange={(e) => setLngText(e.target.value)}
                    onFocus={() => setEditingCoords(true)}
                    onBlur={applyTypedCoords}
                    onKeyDown={(e) => e.key === 'Enter' && applyTypedCoords()}
                  />
                </div>
              </div>
            </div>

            <PinCountryWarning
              pin={coords}
              country={data.country}
              onChangeCountry={onChangeCountry}
              onBlockingChange={setPinOutsideCountry}
            />
          </>
        )}

        {locationConfirmed && (
          <>
            <div className="field">
              <span className="hint">
                Location confirmed. Use “Edit map location” to move the pin again.
              </span>
              <GoogleMap
                key="frozen"
                variant="preview"
                coordinates={coords}
                onEdit={handleEditLocation}
              />
            </div>

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
              value={data.address.addressLine1}
              onChange={(v) => updateAddress({ addressLine1: v })}
              error={errors.addressLine1}
            />
            <TextInput
              id="addressLine2"
              label={
                <>
                  Address line 2 <span style={{ fontWeight: 400 }}>(optional)</span>
                </>
              }
              value={data.address.addressLine2}
              onChange={(v) => updateAddress({ addressLine2: v })}
            />
            <TextInput
              id="municipality"
              label="Village / Town / City"
              value={data.address.municipality}
              onChange={(v) => updateAddress({ municipality: v })}
              error={errors.municipality}
            />
            <SubdivisionField
              country={data.country}
              value={data.address.administrativeArea}
              onChange={(v) => updateAddress({ administrativeArea: v })}
            />
            <TextInput
              id="postcode"
              label="Postcode"
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
              hint="If you’re struggling to locate your venue using the map or address information, add an explanation of where your venue is. Include nearby landmarks, road names, or anything that helps someone find your venue."
              value={data.locationDescription}
              onChange={(v) => update({ locationDescription: v })}
              placeholder="e.g. Kibera Primary School, next to the water tower, off Ngong Road"
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
        <Button
          variant="secondary"
          icon={<ArrowBackIcon />}
          onClick={locationConfirmed ? handleEditLocation : onBack}
        >
          Back
        </Button>
        {locationConfirmed ? (
          <Button variant="primary" onClick={handleContinue} disabled={addressMismatchBlocking}>
            Save and continue
          </Button>
        ) : (
          <Button
            variant="primary"
            onClick={handleConfirmLocation}
            disabled={confirming || pinOutsideCountry}
          >
            {confirming ? 'Confirming…' : 'Confirm venue location'}
          </Button>
        )}
      </div>
    </div>
  )
}
