import { Alert } from './components/Alert'
import { Button } from './components/Button'
import { VARIANTS, type Variant } from './variants'

interface Props {
  onSelect: (variant: Variant) => void
}

export function Home({ onSelect }: Props) {
  // Only the map-based options (C, D, E) are shown for now; the others are hidden.
  const visibleVariants = VARIANTS.filter(
    (v) => v.id === 'confirm-button' || v.id === 'search-first' || v.id === 'guided',
  )

  return (
    <div className="card">
      <div className="intro">
        <h1 className="title-lg">Venue address — prototypes</h1>
        <p className="body">
          Prototypes of the “Where is the club venue?” step. Pick one below to try it.
        </p>
      </div>

      <Alert variant="info" title="These flows are early prototypes">
        <ul className="disclaimer-list">
          <li>They exist to explore the venue-address experience — nothing you enter is saved.</li>
          <li>
            Only a handful of countries are available (United Kingdom, India, South Africa, United
            States, Canada and Kenya).
          </li>
          <li>Country and map data may be incomplete or inaccurate.</li>
          <li>None of the copy, labels or help text has been reviewed and may change.</li>
        </ul>
      </Alert>

      <div className="variant-list">
        {visibleVariants.map((v) => (
          <div className="variant-card" key={v.id}>
            <div className="variant-card-text">
              <h2 className="title-sm">{v.title}</h2>
              <p className="body muted">{v.summary}</p>
            </div>
            <Button variant="primary" onClick={() => onSelect(v.id)}>
              Try this
            </Button>
          </div>
        ))}
      </div>
    </div>
  )
}
