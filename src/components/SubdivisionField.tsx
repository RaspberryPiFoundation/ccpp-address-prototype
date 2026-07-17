import { SelectInput, TextInput } from './Fields'
import { subdivisionsForCountry, countryCodeForCountry } from '../data/reference'

// Countries whose subdivision is entered as free text rather than picked from a
// list — the UK's local authorities are too numerous/inconsistent to list well.
const FREE_TEXT_COUNTRIES = new Set(['gb'])

interface Props {
  /** The chosen country name; determines the list of subdivisions. */
  country: string
  value: string
  onChange: (v: string) => void
  error?: string
}

/**
 * County / state / province field. Renders a dropdown of the country's
 * subdivisions when we have a good list, and a free-text input otherwise (for
 * the UK, or countries with no subdivision data).
 */
export function SubdivisionField({ country, value, onChange, error }: Props) {
  const code = countryCodeForCountry(country)
  const options = subdivisionsForCountry(country)

  if (options.length === 0 || (code && FREE_TEXT_COUNTRIES.has(code))) {
    return (
      <TextInput
        id="county"
        label="County / state / province (optional)"
        value={value}
        onChange={onChange}
        error={error}
      />
    )
  }

  return (
    <SelectInput
      id="county"
      label="County / state / province"
      value={value}
      onChange={onChange}
      options={options}
      error={error}
    />
  )
}
