import { useState } from 'react'
import { ProgressBar } from '../components/ProgressBar'
import { Button } from '../components/Button'
import { GoogleMap, type Coordinates } from '../components/GoogleMap'
import { ArrowBackIcon } from '../components/icons'

interface Props {
  initialCoordinates: Coordinates
  onSave: (c: Coordinates) => void
  onCancel: () => void
}

export function MapPicker({ initialCoordinates, onSave, onCancel }: Props) {
  const [coords, setCoords] = useState<Coordinates>(initialCoordinates)
  const [failed, setFailed] = useState(false)

  return (
    <div className="card">
      <ProgressBar step={2} total={4} />

      <div className="intro">
        <h1 className="title-md">
          {failed ? 'We couldn’t load the map' : 'Find the venue on the map'}
        </h1>
        <p className="body">
          {failed
            ? 'Go back to enter the address manually or describe where your venue is.'
            : 'Tap anywhere on the map to place the pin, or drag the map, then save.'}
        </p>
      </div>

      <GoogleMap
        variant="full"
        coordinates={initialCoordinates}
        interactive
        onCoordinatesChange={setCoords}
        onMapClick={(c) => setCoords(c)}
        onLoadError={() => setFailed(true)}
      />

      <div className="button-wrapper">
        <Button variant="secondary" icon={<ArrowBackIcon />} onClick={onCancel}>
          {failed ? 'Go back' : 'Cancel'}
        </Button>
        {!failed && (
          <Button variant="primary" onClick={() => onSave(coords)}>
            Save
          </Button>
        )}
      </div>
    </div>
  )
}
