import type { HTMLAttributes } from 'react'

export type BadgeVariant = 'matched' | 'unmatched' | 'error' | 'pending'

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant
}

const variantClasses: Record<BadgeVariant, string> = {
  matched:
    'bg-[var(--color-success-muted)] text-[var(--color-success)] border-[var(--color-success)]/25',
  unmatched:
    'bg-[var(--color-warning-muted)] text-[var(--color-warning)] border-[var(--color-warning)]/30',
  error:
    'bg-[var(--color-error-muted)] text-[var(--color-error)] border-[var(--color-error)]/25',
  pending:
    'bg-[var(--color-bg-subtle)] text-[var(--color-text-muted)] border-[var(--color-border)]',
}

export function Badge({
  variant = 'pending',
  className = '',
  children,
  ...rest
}: BadgeProps) {
  return (
    <span
      role="status"
      className={[
        'inline-flex max-w-full items-center rounded-[var(--radius-full)] border px-2.5 py-0.5',
        'text-[length:var(--text-xs)] font-medium leading-tight',
        variantClasses[variant],
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    >
      {children}
    </span>
  )
}

export function badgeVariantFromConfidence(confidence: number): BadgeVariant {
  if (confidence >= 0.85) return 'matched'
  if (confidence >= 0.5) return 'unmatched'
  if (confidence > 0) return 'pending'
  return 'error'
}
