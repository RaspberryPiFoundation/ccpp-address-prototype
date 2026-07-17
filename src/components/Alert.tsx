import type { ReactNode } from 'react'
import { Alert as DSAlert } from '@raspberrypifoundation/design-system-react'

interface AlertProps {
  variant: 'info' | 'error'
  title: string
  children?: ReactNode
}

/** Thin wrapper over the design system Alert, keeping this app's variant names. */
export function Alert({ variant, title, children }: AlertProps) {
  return (
    <DSAlert type={variant === 'error' ? 'error' : 'information'} title={title}>
      {children}
    </DSAlert>
  )
}
