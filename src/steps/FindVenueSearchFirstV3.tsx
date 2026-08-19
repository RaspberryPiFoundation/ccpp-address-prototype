import { useEffect, useRef, useState, type ComponentType } from 'react'
import { ProgressBar } from '../components/ProgressBar'
import { TextInput, TextArea, Checkbox } from '../components/Fields'
import { Button } from '../components/Button'
import { GoogleMap, type Coordinates, type MapProps } from '../components/GoogleMap'
import {
  PlacesSearch,
  type PlaceSelection,
  type PlacesSearchHandle,
  type SearchMode,
} from '../components/PlacesSearch'
import { AddressPinWarning } from '../components/AddressPinWarning'
import { PinCountryWarning } from '../components/PinCountryWarning'
import { ArrowBackIcon } from '../components/icons'
import { countryCodeForCountry, isPostcodeRequired, addressFormat } from '../data/reference'
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
  /** Map component to render — GoogleMap by default, or LeafletMap for OSM. */
  MapComponent?: ComponentType<MapProps>
}

/**
 * Search-first (v3). Starts life as an exact copy of FindVenueSearchFirstV2 — the
 * working copy we're iterating on, so v2 stays untouched for comparison.
 * The address search shows first, with the fallback options beneath it; once a
 * search returns a result the map appears so the user can fine-tune the pin.
 * Clicking "Confirm venue location" reverse-geocodes the pin, reveals the address
 * for confirmation, and freezes the map.
 */
export function FindVenueSearchFirstV3({
  data,
  coordinates,
  update,
  updateAddress,
  applyPlace,
  onChangeCountry,
  onBack,
  onContinue,
  onConfirmLocation,
  MapComponent = GoogleMap,
}: Props) {
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [locationConfirmed, setLocationConfirmed] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [addressMismatchBlocking, setAddressMismatchBlocking] = useState(false)
  const [pinOutsideCountry, setPinOutsideCountry] = useState(false)
  // Whether a search has returned a result — the map only appears after this.
  const [searchDone, setSearchDone] = useState(false)
  // How the search field is scoped. When it isn't the plain address search,
  // "Back" returns it to that rather than leaving the step.
  const [searchMode, setSearchMode] = useState<SearchMode>('address')
  const searchRef = useRef<PlacesSearchHandle>(null)
  // The live pin position, updated by search results and map drags.
  const [coords, setCoords] = useState<Coordinates>(coordinates)
  // Address-field labels and hints tailored to the chosen country.
  const fmt = addressFormat(data.country)

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

  // Back unwinds one step at a time: out of the confirmed address, then out of a
  // re-scoped search (Plus Code / landmark / coordinates), then out of the step.
  const handleBack = () => {
    if (locationConfirmed) handleEditLocation()
    else if (searchMode !== 'address') searchRef.current?.resetSearch()
    else onBack()
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
              ref={searchRef}
              onSelect={handlePlace}
              countryCode={countryCodeForCountry(data.country)}
              enableFallbackOptions
              optionsAsAccordions
              label="Search for your venue"
              hint="Search by address, place, or Plus Code"
              coordsLabel="Enter coordinates"
              coordsHint="Enter the latitude and longitude of your club venue."
              coordsHelpFirst
              onCleared={() => setSearchDone(false)}
              modeExitViaBack
              onModeChange={(mode) => {
                setSearchMode(mode)
                // Re-scoping the field starts the search over, so the map and
                // description go until the new route produces a location.
                setSearchDone(false)
              }}
            >
              {searchDone && (
                <>
                  <div className="field">
                    <div className="label-wrapper">
                      <label>Fine-tune the location on the map</label>
                      <span className="hint">
                        Tap anywhere on the map to place the pin, or drag the map to move it. To
                        zoom, pinch on a touchscreen or hold Ctrl (⌘ on Mac) and scroll. Then
                        confirm the location.
                      </span>
                    </div>
                    <MapComponent
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

                  <TextArea
                    id="locationDescription"
                    label="Describe the location (optional)"
                    hint="If you’re struggling to place the pin exactly, add an explanation of where your venue is. Include nearby landmarks, road names, or anything that helps someone find your venue."
                    value={data.locationDescription}
                    onChange={(v) => update({ locationDescription: v })}
                    placeholder="e.g. Kibera Primary School, next to the water tower, off Ngong Road"
                  />
                </>
              )}
            </PlacesSearch>
          </>
        )}

        {locationConfirmed && (
          <>
            <div className="field">
              <span className="hint">
                Location confirmed. Use “Edit map location” to move the pin again.
              </span>
              <MapComponent
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
              label={fmt.addressLine1.label}
              hint={fmt.addressLine1.hint}
              autoComplete="address-line1"
              value={data.address.addressLine1}
              onChange={(v) => updateAddress({ addressLine1: v })}
              error={errors.addressLine1}
            />
            <TextInput
              id="addressLine2"
              label={fmt.addressLine2.label}
              hint={fmt.addressLine2.hint}
              autoComplete="address-line2"
              value={data.address.addressLine2}
              onChange={(v) => updateAddress({ addressLine2: v })}
            />
            <TextInput
              id="municipality"
              label={fmt.municipality.label}
              hint={fmt.municipality.hint}
              autoComplete="address-level2"
              value={data.address.municipality}
              onChange={(v) => updateAddress({ municipality: v })}
              error={errors.municipality}
            />
            <TextInput
              id="administrativeArea"
              label={fmt.administrativeArea.label}
              hint={fmt.administrativeArea.hint}
              autoComplete="address-level1"
              value={data.address.administrativeArea}
              onChange={(v) => updateAddress({ administrativeArea: v })}
            />
            <TextInput
              id="postcode"
              label={fmt.postcode.label}
              hint={fmt.postcode.hint}
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
          onClick={handleBack}
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
