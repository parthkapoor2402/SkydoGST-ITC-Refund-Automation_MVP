import {
  forwardRef,
  type ButtonHTMLAttributes,
  type ReactNode,
} from 'react'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
export type ButtonSize = 'sm' | 'md' | 'lg'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  leftIcon?: ReactNode
  rightIcon?: ReactNode
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-[var(--color-primary)] text-[var(--color-text-inverse)] hover:bg-[var(--color-primary-hover)] shadow-sm border border-transparent',
  secondary:
    'bg-[var(--color-bg-elevated)] text-[var(--color-text-primary)] border border-[var(--color-border)] hover:bg-[var(--color-bg-subtle)] shadow-xs',
  ghost:
    'bg-transparent text-[var(--color-text-primary)] border border-transparent hover:bg-[var(--color-primary-muted)]',
  danger:
    'bg-[var(--color-error)] text-white border border-transparent hover:opacity-90 shadow-sm',
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'min-h-8 px-3 text-[length:var(--text-xs)] gap-1.5 rounded-[var(--radius-sm)]',
  md: 'min-h-10 px-4 text-[length:var(--text-sm)] gap-2 rounded-[var(--radius-md)]',
  lg: 'min-h-12 px-6 text-[length:var(--text-base)] gap-2 rounded-[var(--radius-md)]',
}

function Spinner({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-90"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  )
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      disabled,
      leftIcon,
      rightIcon,
      className = '',
      children,
      type = 'button',
      ...rest
    },
    ref,
  ) {
    const isDisabled = Boolean(disabled || loading)

    return (
      <button
        ref={ref}
        type={type}
        disabled={isDisabled}
        aria-busy={loading || undefined}
        aria-disabled={isDisabled || undefined}
        className={[
          'inline-flex items-center justify-center font-medium transition-colors',
          'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2',
          'focus-visible:outline-[var(--color-focus-ring)]',
          'disabled:pointer-events-none disabled:opacity-50',
          variantClasses[variant],
          sizeClasses[size],
          className,
        ]
          .filter(Boolean)
          .join(' ')}
        {...rest}
      >
        {loading ? (
          <>
            <Spinner className="h-4 w-4 shrink-0 animate-spin" />
            <span className="sr-only">Loading</span>
            {children ? (
              <span className="opacity-80" aria-hidden>
                {children}
              </span>
            ) : null}
          </>
        ) : (
          <>
            {leftIcon ? (
              <span className="inline-flex shrink-0" aria-hidden>
                {leftIcon}
              </span>
            ) : null}
            {children}
            {rightIcon ? (
              <span className="inline-flex shrink-0" aria-hidden>
                {rightIcon}
              </span>
            ) : null}
          </>
        )}
      </button>
    )
  },
)
