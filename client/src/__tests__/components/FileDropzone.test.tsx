import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { FileDropzone } from '../../components/ui/FileDropzone'

vi.mock('axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}))

function pdf(name: string) {
  return new File(['%PDF-1.4 minimal'], name, { type: 'application/pdf' })
}

function csv(name: string) {
  return new File(['a,b\n1,2'], name, { type: 'text/csv' })
}

function jsonFile(name: string) {
  return new File(['{}'], name, { type: 'application/json' })
}

describe('FileDropzone', () => {
  it('renders upload area with label and drop instructions', () => {
    render(
      <FileDropzone
        label="Documents"
        description="Upload compliance files"
        onFilesAccepted={vi.fn()}
      />,
    )
    expect(screen.getByText('Documents')).toBeInTheDocument()
    expect(
      screen.getByText(/drag and drop files here/i),
    ).toBeInTheDocument()
  })

  it('accepts PDF files and lists file name', async () => {
    const user = userEvent.setup()
    const onAccepted = vi.fn()
    const { container } = render(
      <FileDropzone label="FIRA PDFs" onFilesAccepted={onAccepted} />,
    )
    const input = container.querySelector('input[type="file"]') as HTMLInputElement
    const file = pdf('fira-1.pdf')
    await user.upload(input, file)
    await waitFor(() => expect(onAccepted).toHaveBeenCalled())
    expect(screen.getByText('fira-1.pdf')).toBeInTheDocument()
  })

  it('rejects non-PDF/CSV/JSON files and surfaces an error message', async () => {
    const onRejected = vi.fn()
    const { container } = render(
      <FileDropzone
        label="Invoices"
        onFilesAccepted={vi.fn()}
        onFilesRejected={onRejected}
      />,
    )
    const input = container.querySelector('input[type="file"]') as HTMLInputElement
    const rejectedFile = new File(['x'], 'notes.txt', { type: 'text/plain' })
    fireEvent.change(input, { target: { files: [rejectedFile] } })
    await waitFor(() => expect(onRejected).toHaveBeenCalled())
    const live = screen.getByRole('status', { name: /upload errors/i })
    expect(live).toHaveTextContent(/not accepted|rejected|invalid type|file-invalid-type/i)
  })

  it('shows file name and size after upload', async () => {
    const user = userEvent.setup()
    const { container } = render(
      <FileDropzone label="Bundle" onFilesAccepted={vi.fn()} />,
    )
    const input = container.querySelector('input[type="file"]') as HTMLInputElement
    const file = pdf('stmt.pdf')
    await user.upload(input, file)
    const list = await screen.findByRole('list', { name: /selected files/i })
    expect(within(list).getByText('stmt.pdf')).toBeInTheDocument()
    expect(list.textContent).toMatch(/B|KB/)
  })

  it('handles multiple accepted files', async () => {
    const user = userEvent.setup()
    const onAccepted = vi.fn()
    const { container } = render(
      <FileDropzone label="Multi" onFilesAccepted={onAccepted} />,
    )
    const input = container.querySelector('input[type="file"]') as HTMLInputElement
    await user.upload(input, [pdf('a.pdf'), csv('b.csv'), jsonFile('c.json')])
    await waitFor(() => expect(onAccepted).toHaveBeenCalled())
    expect(screen.getByText('a.pdf')).toBeInTheDocument()
    expect(screen.getByText('b.csv')).toBeInTheDocument()
    expect(screen.getByText('c.json')).toBeInTheDocument()
  })
})
