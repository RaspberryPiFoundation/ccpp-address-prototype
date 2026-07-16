import { useState } from 'react'
import { Layout } from './components/Layout'
import { Home } from './Home'
import { Flow } from './Flow'
import type { Variant } from './variants'

export default function App() {
  // `null` shows the front page; a variant runs that implementation's flow.
  const [variant, setVariant] = useState<Variant | null>(null)

  return (
    <Layout>
      {variant === null ? (
        <Home onSelect={setVariant} />
      ) : (
        <Flow variant={variant} onExit={() => setVariant(null)} />
      )}
    </Layout>
  )
}
