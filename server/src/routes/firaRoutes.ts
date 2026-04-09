import { randomUUID } from 'node:crypto'
import { Router, type Request, type Response } from 'express'
import multer from 'multer'
import { isParseError, parseFIRA, parseFIRAFromCSV } from '../modules/firaParser.js'
import {
  deleteFira,
  deleteFiraByReferenceNumber,
  listFiras,
  storeFira,
} from '../services/firaSessionStore.js'

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 32 },
})

export const firaRouter = Router()

firaRouter.post(
  '/upload',
  upload.array('files', 24),
  (req: Request, res: Response) => {
    const files = req.files
    if (!files || !Array.isArray(files) || files.length === 0) {
      res.status(400).json({ error: 'No files uploaded (field: files)' })
      return
    }

    const saved: { id: string; parsed: unknown }[] = []
    const errors: { file: string; error: string }[] = []

    for (const file of files) {
      const name = file.originalname || 'unnamed.json'
      try {
        const text = file.buffer.toString('utf8')
        const raw = JSON.parse(text) as unknown
        const r = parseFIRA(raw)
        if (isParseError(r)) {
          errors.push({ file: name, error: r.error })
          continue
        }
        deleteFiraByReferenceNumber(r.referenceNumber)
        const id = randomUUID()
        storeFira({ id, parsed: r, sourceFileName: name })
        saved.push({ id, parsed: r })
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        errors.push({ file: name, error: msg })
      }
    }

    res.status(201).json({ saved, errors })
  },
)

firaRouter.post('/parse-csv', (req: Request, res: Response) => {
  const csv =
    typeof req.body?.csv === 'string'
      ? req.body.csv
      : typeof req.body === 'string'
        ? req.body
        : null

  if (!csv || !csv.trim()) {
    res
      .status(400)
      .json({ error: 'Send JSON body { "csv": "..." } with CSV content' })
    return
  }

  const rows = parseFIRAFromCSV(csv)
  const saved: { id: string; parsed: unknown }[] = []
  for (const parsed of rows) {
    deleteFiraByReferenceNumber(parsed.referenceNumber)
    const id = randomUUID()
    storeFira({ id, parsed, sourceFileName: 'bulk.csv' })
    saved.push({ id, parsed })
  }

  res.status(201).json({ count: saved.length, saved })
})

firaRouter.get('/list', (_req: Request, res: Response) => {
  res.json({ items: listFiras() })
})

firaRouter.delete('/:id', (req: Request, res: Response) => {
  const raw = req.params.id
  const id = Array.isArray(raw) ? raw[0] : raw
  if (!id) {
    res.status(400).json({ error: 'Missing id' })
    return
  }
  const ok = deleteFira(id)
  if (!ok) {
    res.status(404).json({ error: 'FIRA not found' })
    return
  }
  res.status(204).send()
})
