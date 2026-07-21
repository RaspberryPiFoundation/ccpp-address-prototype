import type { ReactNode } from 'react'
import {
  TextInput as DSTextInput,
  SelectInput as DSSelectInput,
  TextareaInput as DSTextareaInput,
  CheckboxInput as DSCheckboxInput,
} from '@raspberrypifoundation/design-system-react'

// Thin wrappers over the design system form components. They keep this app's
// value-based onChange API and default `name` to `id`, so existing call sites
// don't need to change.

interface TextInputProps {
  id: string
  label: string
  hint?: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  error?: string
  /** HTML autocomplete token — identifies the input's purpose (WCAG 1.3.5). */
  autoComplete?: string
}
export function TextInput({
  id,
  label,
  hint,
  value,
  onChange,
  placeholder,
  error,
  autoComplete,
}: TextInputProps) {
  return (
    <DSTextInput
      id={id}
      name={id}
      label={label}
      hint={hint}
      value={value}
      placeholder={placeholder}
      error={error}
      autoComplete={autoComplete}
      fullWidth
      onChange={(e) => onChange(e.target.value)}
    />
  )
}

interface SelectInputProps {
  id: string
  label: string
  value: string
  onChange: (v: string) => void
  options: string[]
  placeholder?: string
  error?: string
}
export function SelectInput({
  id,
  label,
  value,
  onChange,
  options,
  placeholder = 'Please select',
  error,
}: SelectInputProps) {
  return (
    <DSSelectInput
      id={id}
      name={id}
      label={label}
      value={value}
      placeholder={placeholder}
      error={error}
      fullWidth
      options={options.map((o) => ({ key: o, value: o }))}
      onChange={(e) => onChange(e.target.value)}
    />
  )
}

interface TextAreaProps {
  id: string
  label: string
  hint?: string
  value: string
  onChange: (v: string) => void
  /** Accepted for call-site compatibility; the design system textarea ignores it. */
  placeholder?: string
  error?: string
}
export function TextArea({ id, label, hint, value, onChange, error }: TextAreaProps) {
  return (
    <DSTextareaInput
      id={id}
      name={id}
      label={label}
      hint={hint}
      value={value}
      error={error}
      fullWidth
      onChange={(e) => onChange(e.target.value)}
    />
  )
}

interface CheckboxProps {
  id: string
  label: ReactNode
  checked: boolean
  onChange: (v: boolean) => void
  error?: string
}
export function Checkbox({ id, label, checked, onChange, error }: CheckboxProps) {
  return (
    <DSCheckboxInput
      id={id}
      name={id}
      label={label}
      error={error}
      isChecked={checked}
      onChange={(e) => onChange(e.currentTarget.checked)}
    />
  )
}
