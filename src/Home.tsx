import { Accordion } from '@raspberrypifoundation/design-system-react'
import { Alert } from './components/Alert'
import { Button } from './components/Button'
import { VARIANTS, type Variant, type VariantInfo } from './variants'

interface Props {
  onSelect: (variant: Variant) => void
}

// The lead prototype shown on its own; every other variant sits in the accordion.
const PRIMARY: Variant = 'search-first-v2'

export function Home({ onSelect }: Props) {
  const primary = VARIANTS.find((v) => v.id === PRIMARY)!
  const others = VARIANTS.filter((v) => v.id !== PRIMARY)

  const card = (v: VariantInfo) => (
    <div className="variant-card" key={v.id}>
      <div className="variant-card-text">
        <h2 className="title-sm">{v.title}</h2>
        <p className="body muted">{v.summary}</p>
      </div>
      <Button variant="primary" onClick={() => onSelect(v.id)}>
        Try this
      </Button>
    </div>
  )

  return (
    <div className="card">
      <div className="intro">
        <h1 className="title-lg">Venue address — prototype</h1>
        <p className="body">
          A prototype of the “Where is the club venue?” step. Try the main approach below, or open
          the list for other approaches.
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

      <div className="variant-list">{card(primary)}</div>

      {others.length > 0 && (
        <Accordion
          id="other-approaches"
          className=""
          title="Other approaches to try"
          content={<div className="variant-list">{others.map(card)}</div>}
        />
      )}
    </div>
  )
}
