export type ProgressStepId = 'upload' | 'match' | 'review' | 'download'

export interface ProgressStep {
  id: ProgressStepId
  label: string
}

const DEFAULT_STEPS: ProgressStep[] = [
  { id: 'upload', label: 'Upload' },
  { id: 'match', label: 'Match' },
  { id: 'review', label: 'Review' },
  { id: 'download', label: 'Download' },
]

export interface ProgressStepperProps {
  currentStepId: ProgressStepId
  steps?: ProgressStep[]
  className?: string
}

export function ProgressStepper({
  currentStepId,
  steps = DEFAULT_STEPS,
  className = '',
}: ProgressStepperProps) {
  const activeIndex = Math.max(
    0,
    steps.findIndex((s) => s.id === currentStepId),
  )
  const trackCompletePct =
    steps.length <= 1 ? 0 : (activeIndex / (steps.length - 1)) * 100

  return (
    <nav aria-label="Refund workflow progress" className={className}>
      <div className="relative">
        <div
          className="pointer-events-none absolute left-[4.5%] right-[4.5%] top-[1.125rem] hidden h-0.5 md:block"
          style={{
            background: `linear-gradient(to right,
              var(--color-success) 0%,
              var(--color-success) ${trackCompletePct}%,
              var(--color-border) ${trackCompletePct}%,
              var(--color-border) 100%)`,
          }}
          aria-hidden
        />
        <ol className="relative z-[1] grid grid-cols-1 gap-6 md:grid-cols-4 md:gap-4">
          {steps.map((step, index) => {
            const isComplete = index < activeIndex
            const isCurrent = index === activeIndex
            const state = isComplete
              ? 'complete'
              : isCurrent
                ? 'current'
                : 'pending'

            return (
              <li
                key={step.id}
                className="flex flex-row items-center gap-3 md:flex-col md:items-center md:text-center"
              >
                <span
                  className={[
                    'flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 text-[length:var(--text-sm)] font-semibold transition-colors md:bg-[var(--color-bg-elevated)]',
                    state === 'complete'
                      ? 'border-[var(--color-success)] bg-[var(--color-success-muted)] text-[var(--color-success)]'
                      : state === 'current'
                        ? 'border-[var(--color-primary)] bg-[var(--color-primary-muted)] text-[var(--color-primary)]'
                        : 'border-[var(--color-border)] bg-[var(--color-bg-subtle)] text-[var(--color-text-muted)]',
                  ].join(' ')}
                  aria-current={isCurrent ? 'step' : undefined}
                >
                  {isComplete ? (
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      aria-hidden
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  ) : (
                    <span aria-hidden>{index + 1}</span>
                  )}
                  <span className="sr-only">
                    {step.label}{' '}
                    {state === 'complete'
                      ? 'completed'
                      : state === 'current'
                        ? 'current step'
                        : 'pending'}
                  </span>
                </span>
                <p
                  className={[
                    'min-w-0 flex-1 text-[length:var(--text-sm)] font-semibold md:flex-none',
                    state === 'pending'
                      ? 'text-[var(--color-text-muted)]'
                      : 'text-[var(--color-text-primary)]',
                  ].join(' ')}
                >
                  {step.label}
                </p>
              </li>
            )
          })}
        </ol>
      </div>
    </nav>
  )
}
