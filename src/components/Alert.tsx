import type { ReactNode } from 'react'
import { InfoIcon, ErrorIcon } from './icons'

interface AlertProps {
  variant: 'info' | 'error'
  title: ReactNode
  children?: ReactNode
}

export function Alert({ variant, title, children }: AlertProps) {
  return (
    <div className={`alert alert-${variant}`} role={variant === 'error' ? 'alert' : undefined}>
      <div className="alert-header">
        <span className="icon">{variant === 'info' ? <InfoIcon /> : <ErrorIcon size={24} />}</span>
        <span>{title}</span>
      </div>
      {children && <div className="alert-body">{children}</div>}
    </div>
  )
}
