import type { ReactNode } from 'react'
import { ErrorIcon, CheckIcon } from './icons'

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return (
    <div className="error-message" role="alert">
      <span className="icon">
        <ErrorIcon />
      </span>
      <span>{message}</span>
    </div>
  )
}

interface LabelWrapperProps {
  label: ReactNode
  hint?: ReactNode
  htmlFor?: string
}
function LabelWrapper({ label, hint, htmlFor }: LabelWrapperProps) {
  return (
    <div className="label-wrapper">
      <label htmlFor={htmlFor}>{label}</label>
      {hint && <span className="hint">{hint}</span>}
    </div>
  )
}

interface TextInputProps {
  id: string
  label: ReactNode
  hint?: ReactNode
  value: string
  onChange: (v: string) => void
  placeholder?: string
  error?: string
}
export function TextInput({ id, label, hint, value, onChange, placeholder, error }: TextInputProps) {
  return (
    <div className="field">
      <LabelWrapper label={label} hint={hint} htmlFor={id} />
      <input
        id={id}
        className={`input-box${error ? ' error' : ''}`}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={!!error}
      />
      <FieldError message={error} />
    </div>
  )
}

interface SelectInputProps {
  id: string
  label: ReactNode
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
  // Include an externally-supplied value (e.g. from Google) even if it's not
  // one of the preset options, so the select still shows it.
  const allOptions = value && !options.includes(value) ? [value, ...options] : options
  return (
    <div className="field">
      <LabelWrapper label={label} htmlFor={id} />
      <select
        id={id}
        className={`input-box${error ? ' error' : ''}`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={!!error}
      >
        <option value="" disabled>
          {placeholder}
        </option>
        {allOptions.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
      <FieldError message={error} />
    </div>
  )
}

interface TextAreaProps {
  id: string
  label: ReactNode
  hint?: ReactNode
  value: string
  onChange: (v: string) => void
  placeholder?: string
  maxLength?: number
  error?: string
}
export function TextArea({
  id,
  label,
  hint,
  value,
  onChange,
  placeholder,
  maxLength = 250,
  error,
}: TextAreaProps) {
  return (
    <div className="field">
      <LabelWrapper label={label} hint={hint} htmlFor={id} />
      <textarea
        id={id}
        className={`input-box${error ? ' error' : ''}`}
        value={value}
        placeholder={placeholder}
        maxLength={maxLength}
        onChange={(e) => onChange(e.target.value)}
      />
      <span className="char-count">
        {value.length}/{maxLength} characters
      </span>
      <FieldError message={error} />
    </div>
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
    <div className="field">
      <label className="checkbox" htmlFor={id}>
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span className="box">
          <CheckIcon />
        </span>
        <span className="cb-label">{label}</span>
      </label>
      <FieldError message={error} />
    </div>
  )
}
