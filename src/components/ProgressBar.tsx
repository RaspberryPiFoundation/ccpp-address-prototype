interface ProgressBarProps {
  step: number
  total: number
}

export function ProgressBar({ step, total }: ProgressBarProps) {
  const pct = Math.min(100, Math.round((step / total) * 100))
  return (
    <div className="progress">
      <span className="label">
        Step {step} of {total}
      </span>
      <div className="track">
        <div className="fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}
