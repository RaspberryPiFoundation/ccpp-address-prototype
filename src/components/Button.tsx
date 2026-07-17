import type { MouseEvent, ReactNode } from 'react'
import { Button as DSButton } from '@raspberrypifoundation/design-system-react'

interface ButtonProps {
  variant?: 'primary' | 'secondary'
  icon?: ReactNode
  children: string
  onClick?: (event: MouseEvent<HTMLButtonElement>) => void
  disabled?: boolean
}

/** Thin wrapper over the design system Button, keeping this app's call-site API. */
export function Button({ variant = 'primary', icon, children, onClick, disabled }: ButtonProps) {
  return (
    <DSButton
      type={variant}
      text={children}
      icon={icon}
      iconPosition="left"
      onClick={onClick}
      disabled={disabled}
    />
  )
}
