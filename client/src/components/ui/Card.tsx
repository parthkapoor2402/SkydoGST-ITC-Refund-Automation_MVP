import { useId, type HTMLAttributes, type ReactNode } from 'react'

export type CardElevation = 'flat' | 'raised' | 'overlay'

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  elevation?: CardElevation
  header?: ReactNode
  headerId?: string
  headerDescription?: string
  footer?: ReactNode
  padding?: 'none' | 'sm' | 'md' | 'lg'
}

const elevationClasses: Record<CardElevation, string> = {
  flat: 'border border-[var(--color-border)] bg-[var(--color-bg-elevated)] shadow-none',
  raised:
    'border border-[var(--color-border)] bg-[var(--color-bg-elevated)] shadow-md',
  overlay:
    'border border-[var(--color-border-strong)] bg-[var(--color-bg-elevated)] shadow-lg',
}

const paddingClasses = {
  none: '',
  sm: 'p-[var(--space-3)]',
  md: 'p-[var(--space-4)] sm:p-[var(--space-6)]',
  lg: 'p-[var(--space-6)] sm:p-[var(--space-8)]',
} as const

export function Card({
  elevation = 'raised',
  header,
  headerId: headerIdProp,
  headerDescription,
  footer,
  padding = 'md',
  className = '',
  children,
  ...rest
}: CardProps) {
  const autoId = useId()
  const hasHeader = Boolean(header)
  const titleId =
    headerIdProp ??
    (typeof header === 'string' ? `${autoId}-title` : undefined)
  const descId = headerDescription ? `${autoId}-desc` : undefined

  return (
    <section
      className={[
        'overflow-hidden rounded-[var(--radius-xl)]',
        elevationClasses[elevation],
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      aria-labelledby={titleId}
      aria-describedby={descId}
      {...rest}
    >
      {hasHeader ? (
        <header
          className="border-b border-[var(--color-border)] bg-[var(--color-bg-subtle)] px-[var(--space-4)] py-[var(--space-4)] sm:px-[var(--space-6)]"
        >
          {typeof header === 'string' ? (
            <h2
              id={titleId}
              className="text-[length:var(--text-md)] font-semibold text-[var(--color-text-primary)]"
            >
              {header}
            </h2>
          ) : (
            <div id={titleId}>{header}</div>
          )}
          {headerDescription ? (
            <p
              className="mt-1 text-[length:var(--text-sm)] text-[var(--color-text-secondary)]"
              id={descId}
            >
              {headerDescription}
            </p>
          ) : null}
        </header>
      ) : null}
      <div className={paddingClasses[padding]}>{children}</div>
      {footer ? (
        <footer className="border-t border-[var(--color-border)] bg-[var(--color-bg-subtle)] px-[var(--space-4)] py-[var(--space-3)] sm:px-[var(--space-6)]">
          {footer}
        </footer>
      ) : null}
    </section>
  )
}
