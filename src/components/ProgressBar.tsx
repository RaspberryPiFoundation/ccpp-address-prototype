import { ProgressBar as DSProgressBar } from '@raspberrypifoundation/design-system-react'

interface ProgressBarProps {
  step: number
  total: number
}

/** Thin wrapper over the design system ProgressBar, keeping the step/total API. */
export function ProgressBar({ step, total }: ProgressBarProps) {
  return (
    <DSProgressBar
      percent={Math.min(100, Math.round((step / total) * 100))}
      text={`Step ${step} of ${total}`}
      complete={step >= total}
    />
  )
}
