import { useState } from 'react'
import { ProgressBar } from '../components/ProgressBar'
import { TextInput, TextArea, Checkbox } from '../components/Fields'
import { Button } from '../components/Button'
import { GoogleMap, type Coordinates } from '../components/GoogleMap'
import { PlacesSearch, type PlaceSelection } from '../components/PlacesSearch'
import { AddressPinWarning } from '../components/AddressPinWarning'
import { ArrowBackIcon } from '../components/icons'
import { countryCodeForCountry, isPostcodeRequired } from '../data/reference'
import type { ApplicationData, VenueAddress } from '../types'

interface Props {
  data: ApplicationData
  coordinates: Coordinates
  update: (patch: Partial<ApplicationData>) => void
  updateAddress: (patch: Partial<VenueAddress>) => void
  applyPlace: (selection: PlaceSelection) => void
  onEditMap: () => void
  onChangeCountry: () => void
  onBack: () => void
  onContinue: () => void
  /** True once a location has been established (search, map, or manual entry). */
  locationSet: boolean
  /** Escape hatch: reveal the fields to type the address by hand. */
  onEnterManually: () => void
}

export function FindVenueRevealOnPin({
  data,
  coordinates,
  update,
  updateAddress,
  applyPlace,
  onEditMap,
  onChangeCountry,
  onBack,
  onContinue,
  locationSet,
  onEnterManually,
}: Props) {
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [addressMismatchBlocking, setAddressMismatchBlocking] = useState(false)

  const validate = () => {
    const e: Record<string, string> = {}
    if (!data.venueName.trim()) e.venueName = 'This field is required.'
    if (!data.address.addressLine1.trim()) e.addressLine1 = 'This field is required.'
    if (!data.address.municipality.trim()) e.municipality = 'This field is required.'
    if (isPostcodeRequired(data.country) && !data.address.postcode.trim())
      e.postcode = 'This field is required.'
    if (!data.confirmedPermission) e.permission = 'You must confirm you have permission.'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleContinue = () => {
    if (validate()) onContinue()
  }

  return (
    <div className="card">
      <ProgressBar step={2} total={4} />

      <div className="intro">
        <h1 className="title-md">Where is the club venue?</h1>
        <p className="body">
          Pick an appropriate{' '}
          <a href="http://rpf.io/cc-venue" target="_blank" rel="noreferrer">
            venue for your club
          </a>
          .
        </p>
        <p className="body">
          Clubs need to run in public venues. You cannot run a club from a residential address, like
          your home. Online clubs still need to provide a venue for safeguarding reasons.
        </p>
      </div>

      <div className="section-gap">
        <p className="chosen-country">
          <span className="prefix">Chosen country: </span>
          {data.country || 'Not set'}{' '}
          <button type="button" className="link-button" onClick={onChangeCountry}>
            (Go back to change country)
          </button>
        </p>

        <TextInput
          id="venueName"
          label="What is the name of the venue?"
          hint="e.g. Prince’s Library"
          value={data.venueName}
          onChange={(v) => update({ venueName: v })}
          error={errors.venueName}
        />

        <hr className="divider" />

        <h2 className="title-sm">Find your venue</h2>

        <PlacesSearch onSelect={applyPlace} countryCode={countryCodeForCountry(data.country)} />

        <div className="or-divider">
          <span className="line" />
          <span>or</span>
          <span className="line" />
        </div>

        <div className="field">
          <div className="label-wrapper">
            <label>Find the venue on the map</label>
            <span className="hint">
              Editing the map will change any address details you have already added.
            </span>
          </div>
          <GoogleMap variant="preview" coordinates={coordinates} onEdit={onEditMap} />
        </div>

        {/* The address section only appears once a location has been established. */}
        {!locationSet && (
          <div className="info-panel">
            Search for your venue or set its location on the map to confirm the address.{' '}
            <button type="button" className="link-button" onClick={onEnterManually}>
              Or enter the address manually
            </button>
            .
          </div>
        )}

        {locationSet && (
          <>
            <hr className="divider" />

            <h2 className="title-sm">Confirm the venue’s address</h2>

            <TextInput
              id="addressLine1"
              label="Address line 1"
              value={data.address.addressLine1}
              onChange={(v) => updateAddress({ addressLine1: v })}
              error={errors.addressLine1}
            />
            <TextInput
              id="addressLine2"
              label="Address line 2 (optional)"
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
            <TextInput
              id="administrativeArea"
              label="County / state / province (optional)"
              value={data.address.administrativeArea}
              onChange={(v) => updateAddress({ administrativeArea: v })}
            />
            <TextInput
              id="postcode"
              label={isPostcodeRequired(data.country) ? 'Postcode' : 'Postcode (optional)'}
              value={data.address.postcode}
              onChange={(v) => updateAddress({ postcode: v })}
              error={errors.postcode}
            />
            <TextInput
              id="coordinates"
              label="Coordinates (optional)"
              hint="Your venue coordinates are useful if you cannot provide other information to locate your venue. Find your coordinates using Google Maps."
              value={data.address.coordinates}
              onChange={(v) => updateAddress({ coordinates: v })}
            />

            <AddressPinWarning
              address={data.address}
              country={data.country}
              pin={coordinates}
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
        <Button variant="secondary" icon={<ArrowBackIcon />} onClick={onBack}>
          Back
        </Button>
        <Button
          variant="primary"
          onClick={handleContinue}
          disabled={!locationSet || addressMismatchBlocking}
        >
          Save and continue
        </Button>
      </div>
    </div>
  )
}
