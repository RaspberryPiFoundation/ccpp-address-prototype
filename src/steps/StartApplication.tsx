import { useState } from 'react'
import { ProgressBar } from '../components/ProgressBar'
import { SelectInput, Checkbox } from '../components/Fields'
import { Alert } from '../components/Alert'
import { Button } from '../components/Button'
import { ArrowBackIcon } from '../components/icons'
import { COUNTRIES, VENUE_TYPES } from '../data/reference'
import type { ApplicationData } from '../types'

interface Props {
  data: ApplicationData
  update: (patch: Partial<ApplicationData>) => void
  onContinue: () => void
}

export function StartApplication({ data, update, onContinue }: Props) {
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validate = () => {
    const e: Record<string, string> = {}
    if (!data.country) e.country = 'This field is required.'
    if (!data.venueType) e.venueType = 'This field is required.'
    if (!data.confirmedAdult) e.adult = 'You must confirm you are 18 or older.'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleContinue = () => {
    if (validate()) onContinue()
  }

  return (
    <div className="card">
      <ProgressBar step={1} total={4} />

      <div className="intro">
        <h1 className="title-lg">Start your application</h1>
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
        <SelectInput
          id="country"
          label="What country is your club taking place in?"
          value={data.country}
          onChange={(v) => update({ country: v })}
          options={COUNTRIES}
          error={errors.country}
        />
        <SelectInput
          id="venueType"
          label="What type of venue is your club taking place in?"
          value={data.venueType}
          onChange={(v) => update({ venueType: v })}
          options={VENUE_TYPES}
          error={errors.venueType}
        />

        <Alert variant="info" title="You will need to nominate a safeguarding sponsor">
          You will need to provide the name and email address of an appropriate{' '}
          <strong>Safeguarding Sponsor</strong> for this club.
        </Alert>

        <Checkbox
          id="adult"
          label="I confirm that I am 18 years and older."
          checked={data.confirmedAdult}
          onChange={(v) => update({ confirmedAdult: v })}
          error={errors.adult}
        />
      </div>

      <div className="button-wrapper">
        <Button variant="secondary" icon={<ArrowBackIcon />} disabled>
          Back
        </Button>
        <Button variant="primary" onClick={handleContinue}>
          Save and continue
        </Button>
      </div>
    </div>
  )
}
