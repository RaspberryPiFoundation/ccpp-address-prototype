import type { ReactNode } from 'react'
import { Alert as DSAlert } from '@raspberrypifoundation/design-system-react'

interface AlertAction {
  label: string
  onClick?: () => void
  href?: string
}

interface AlertProps {
  variant: 'info' | 'error'
  title: string
  children?: ReactNode
  /** Action buttons rendered (and styled) by the design system Alert. */
  actions?: AlertAction[]
  /**
   * Announce the alert to assistive technology when it appears (WCAG 4.1.3).
   * The design system Alert has no role of its own, so we wrap it in a
   * role="alert" region. Use only for alerts shown in response to an action,
   * not always-present informational alerts (which would speak on load).
   */
  announce?: boolean
}

/** Thin wrapper over the design system Alert, keeping this app's variant names. */
export function Alert({ variant, title, children, actions, announce }: AlertProps) {
  const alert = (
    <DSAlert type={variant === 'error' ? 'error' : 'information'} title={title} actions={actions}>
      {children}
    </DSAlert>
  )
  return announce ? <div role="alert">{alert}</div> : alert
}
