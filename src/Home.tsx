import { Button } from './components/Button'
import { VARIANTS, type Variant } from './variants'

interface Props {
  onSelect: (variant: Variant) => void
}

export function Home({ onSelect }: Props) {
  return (
    <div className="card">
      <div className="intro">
        <h1 className="title-lg">Venue address — prototype variants</h1>
        <p className="body">
          Three implementations of the “Where is the club venue?” step. Each one starts the same
          registration flow; only the address step differs. Pick one to try it.
        </p>
      </div>

      <div className="variant-list">
        {VARIANTS.map((v) => (
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
