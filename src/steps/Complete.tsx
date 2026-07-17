import { ProgressBar } from '../components/ProgressBar'
import { Button } from '../components/Button'
import { SuccessIcon } from '../components/icons'
import type { ApplicationData } from '../types'

interface Props {
  data: ApplicationData
  onRestart: () => void
}

export function Complete({ data, onRestart }: Props) {
  const { address } = data
  const lines = [
    data.venueName,
    address.addressLine1,
    address.addressLine2,
    address.municipality,
    address.administrativeArea,
    address.postcode,
    data.country,
  ].filter(Boolean)

  return (
    <div className="card">
      <ProgressBar step={4} total={4} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', alignItems: 'center', textAlign: 'center' }}>
        <SuccessIcon />
        <h1 className="title-md">Registration is complete</h1>
        <p className="body">
          Thanks! We’ve saved your venue details and submitted them for verification. We’ll be in
          touch about the next steps.
        </p>
      </div>

      <div className="info-panel" style={{ borderRadius: 'var(--radius-sm)' }}>
        <p className="body" style={{ fontWeight: 700, marginBottom: 8 }}>
          Venue submitted
        </p>
        {lines.map((l, i) => (
          <p className="body" key={i}>
            {l}
          </p>
        ))}
        {address.coordinates && (
          <p className="body muted" style={{ marginTop: 8 }}>
            Coordinates: {address.coordinates}
          </p>
        )}
      </div>

      <div className="button-wrapper" style={{ justifyContent: 'center' }}>
        <Button variant="secondary" onClick={onRestart}>
          Start a new application
        </Button>
      </div>
    </div>
  )
}
