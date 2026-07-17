import { Alert } from './components/Alert'
import { Button } from './components/Button'
import { VARIANTS, type Variant } from './variants'

interface Props {
  onSelect: (variant: Variant) => void
}

export function Home({ onSelect }: Props) {
  // Only option C is shown for now; the other variants are hidden.
  const visibleVariants = VARIANTS.filter((v) => v.id === 'confirm-button')

  return (
    <div className="card">
      <div className="intro">
        <h1 className="title-lg">Venue address — prototype</h1>
        <p className="body">
          A prototype of the “Where is the club venue?” step. Select it below to try it.
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
