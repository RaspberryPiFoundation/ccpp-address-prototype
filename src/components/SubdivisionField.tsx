import { SelectInput, TextInput } from './Fields'
import { subdivisionsForCountry } from '../data/reference'

interface Props {
  /** The chosen country name; determines the list of subdivisions. */
  country: string
  value: string
  onChange: (v: string) => void
  error?: string
}

/**
 * County / state / province field. When the chosen country has subdivisions in
 * the reference data it renders a dropdown of them; otherwise it falls back to a
 * free-text input so the flow still works for unlisted countries.
 */
export function SubdivisionField({ country, value, onChange, error }: Props) {
  const options = subdivisionsForCountry(country)

  if (options.length === 0) {
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
