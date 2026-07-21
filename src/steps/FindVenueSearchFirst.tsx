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
 * Search-first variant. Only the address search shows to begin with; once a
 * search returns a result the map appears so the user can fine-tune the pin.
 * There's no coordinate entry. Clicking "Confirm venue location" reverse-geocodes
 * the pin, reveals the address for confirmation, and freezes the map.
 */
export function FindVenueSearchFirst({
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
  // Whether a search has returned a result — the map only appears after this.
  const [searchDone, setSearchDone] = useState(false)
  // The live pin position, updated by search results and map drags.
  const [coords, setCoords] = useState<Coordinates>(coordinates)

  // Move focus to the heading when the address section is revealed on confirm.
  const headingRef = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    if (locationConfirmed) headingRef.current?.focus()
  }, [locationConfirmed])

  // A search result fills the venue/address details, moves the pin, and reveals
  // the map.
  const handlePlace = (sel: PlaceSelection) => {
    applyPlace(sel)
    setCoords({ lat: sel.lat, lng: sel.lng })
    setSearchDone(true)
  }

  // Clicking a point of interest on the map fills its details and moves the pin.
  const handlePoiSelect = async (placeId: string) => {
    const details = await placeDetailsById(placeId)
    if (details) handlePlace(details)
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
        <h1 className="title-md" tabIndex={-1} ref={headingRef}>
          {locationConfirmed ? 'Confirm the venue’s address' : 'Where is the club venue?'}
        </h1>
        {!locationConfirmed && (
          <p className="body">
            Pick an appropriate{' '}
            <a href="http://rpf.io/cc-venue" target="_blank" rel="noreferrer">
              venue for your club
            </a>
            .  Clubs need to run in public venues. You cannot run a club from a residential address,
            like your home. Online clubs still need to provide a venue for safeguarding reasons.
          </p>
        )}
      </div>

      <div className="section-gap">
        {!locationConfirmed && (
          <>
            <PlacesSearch
              onSelect={handlePlace}
              countryCode={countryCodeForCountry(data.country)}
            />

            {searchDone && (
              <>
                <div className="field">
                  <div className="label-wrapper">
                    <label>Fine-tune the location on the map</label>
                    <span className="hint">
                      Tap anywhere on the map to place the pin, or drag the map, then confirm the
                      location.
                    </span>
                  </div>
                  <GoogleMap
                    key="edit"
                    variant="full"
                    coordinates={coords}
                    interactive
                    onCoordinatesChange={setCoords}
                    onMapClick={(c) => setCoords(c)}
                    onPoiSelect={handlePoiSelect}
                  />
                </div>

                <PinCountryWarning
                  pin={coords}
                  country={data.country}
                  onChangeCountry={onChangeCountry}
                  onBlockingChange={setPinOutsideCountry}
                />
              </>
            )}
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
            disabled={!searchDone || confirming || pinOutsideCountry}
          >
            {confirming ? 'Confirming…' : 'Confirm venue location'}
          </Button>
        )}
      </div>
    </div>
  )
}
