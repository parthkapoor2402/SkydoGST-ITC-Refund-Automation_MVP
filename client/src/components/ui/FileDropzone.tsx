import { useCallback, useId, useMemo, useState } from 'react'
import { useDropzone, type FileRejection } from 'react-dropzone'

export type FileDropzoneVariant = 'default' | 'structured'

export interface FileDropzoneProps {
  onFilesAccepted: (files: File[]) => void
  onFilesRejected?: (rejections: FileRejection[]) => void
  maxFiles?: number
  maxSizeBytes?: number
  disabled?: boolean
  label: string
  description?: string
  className?: string
  /** Skydo JSON/CSV exports only (no PDF) */
  variant?: FileDropzoneVariant
}

const ACCEPT = {
  'application/pdf': ['.pdf'],
  'text/csv': ['.csv'],
  'application/json': ['.json'],
} as const

const ACCEPT_STRUCTURED = {
  'text/csv': ['.csv'],
  'application/json': ['.json'],
} as const

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  const value = bytes / k ** i
  return `${value < 10 && i > 0 ? value.toFixed(1) : Math.round(value)} ${sizes[i]}`
}

export function FileDropzone({
  onFilesAccepted,
  onFilesRejected,
  maxFiles = 12,
  maxSizeBytes = 25 * 1024 * 1024,
  disabled = false,
  label,
  description,
  className = '',
  variant = 'default',
}: FileDropzoneProps) {
  const inputId = useId()
  const errorId = `${inputId}-error`
  const [rejectionSummary, setRejectionSummary] = useState<string | null>(null)

  const onDrop = useCallback(
    (acceptedFiles: File[], rejections: FileRejection[]) => {
      if (acceptedFiles.length > 0) {
        setRejectionSummary(null)
        onFilesAccepted(acceptedFiles)
      }
      if (rejections.length > 0) {
        const parts = rejections.map((r) => {
          const name = r.file.name
          const code = r.errors[0]?.code ?? 'file-invalid-type'
          const msg =
            r.errors[0]?.message ??
            'File type not accepted. Use PDF, CSV, or JSON.'
          return `${name}: ${msg} (${code})`
        })
        setRejectionSummary(parts.join(' · '))
        onFilesRejected?.(rejections)
      }
    },
    [onFilesAccepted, onFilesRejected],
  )

  const accept = variant === 'structured' ? ACCEPT_STRUCTURED : ACCEPT

  const { getRootProps, getInputProps, isDragActive, acceptedFiles } =
    useDropzone({
      onDrop,
      accept,
      maxFiles,
      maxSize: maxSizeBytes,
      disabled,
    })

  const fileList = useMemo(() => acceptedFiles, [acceptedFiles])

  return (
    <div className={className}>
      <label
        htmlFor={inputId}
        className="mb-2 block text-[length:var(--text-sm)] font-medium text-[var(--color-text-primary)]"
      >
        {label}
      </label>
      {description ? (
        <p
          id={`${inputId}-hint`}
          className="mb-3 text-[length:var(--text-xs)] text-[var(--color-text-secondary)]"
        >
          {description}
        </p>
      ) : null}
      <div
        {...getRootProps({
          className: [
            'relative flex min-h-[11rem] cursor-pointer flex-col items-center justify-center rounded-[var(--radius-lg)] border-2 border-dashed px-[var(--space-4)] py-[var(--space-8)] text-center transition-colors',
            'border-[var(--color-border-strong)] bg-[var(--color-bg-subtle)]',
            isDragActive
              ? 'border-[var(--color-accent)] bg-[var(--color-accent-muted)] ring-2 ring-[var(--color-focus-ring)] ring-offset-2 ring-offset-[var(--color-bg-app)]'
              : 'hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-muted)]/40',
            disabled ? 'pointer-events-none opacity-50' : '',
          ]
            .filter(Boolean)
            .join(' '),
        })}
        aria-label={label}
        aria-describedby={
          [description ? `${inputId}-hint` : '', errorId].filter(Boolean).join(' ') ||
          undefined
        }
      >
        <input {...getInputProps({ id: inputId })} />
        <svg
          className="mb-3 h-10 w-10 text-[var(--color-primary)]"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          aria-hidden
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 16V4m0 0l4 4m-4-4L8 8M4 20h16"
          />
        </svg>
        <p className="text-[length:var(--text-sm)] font-medium text-[var(--color-text-primary)]">
          {isDragActive ? 'Drop files to upload' : 'Drag and drop files here'}
        </p>
        <p className="mt-1 text-[length:var(--text-xs)] text-[var(--color-text-muted)]">
          {variant === 'structured'
            ? `CSV or JSON — up to ${maxFiles} files, ${formatBytes(maxSizeBytes)} each`
            : `PDF, CSV, or JSON — up to ${maxFiles} files, ${formatBytes(maxSizeBytes)} each`}
        </p>
      </div>
      {fileList.length > 0 ? (
        <ul
          className="mt-4 space-y-2"
          aria-label="Selected files"
        >
          {fileList.map((file) => (
            <li
              key={`${file.name}-${file.size}-${file.lastModified}`}
              className="flex items-center justify-between gap-3 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-elevated)] px-[var(--space-3)] py-[var(--space-2)]"
            >
              <span className="min-w-0 truncate text-[length:var(--text-sm)] font-medium text-[var(--color-text-primary)]">
                {file.name}
              </span>
              <span className="shrink-0 text-[length:var(--text-xs)] text-[var(--color-text-muted)]">
                {formatBytes(file.size)}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
      {rejectionSummary ? (
        <div
          id={errorId}
          role="status"
          aria-live="polite"
          aria-label="Upload errors"
          className="mt-3 rounded-[var(--radius-md)] border border-[var(--color-error)]/40 bg-[var(--color-error-muted)] px-[var(--space-3)] py-[var(--space-2)] text-left text-[length:var(--text-sm)] text-[var(--color-error)]"
        >
          {rejectionSummary}
        </div>
      ) : (
        <p id={errorId} className="sr-only" aria-live="polite" />
      )}
    </div>
  )
}
