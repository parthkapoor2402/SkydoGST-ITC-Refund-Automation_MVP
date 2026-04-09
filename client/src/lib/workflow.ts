import type { ProgressStepId } from '../components/ui/ProgressStepper'

export function pathnameToProgressStepId(pathname: string): ProgressStepId {
  if (pathname.startsWith('/upload')) return 'upload'
  if (pathname.startsWith('/match')) return 'match'
  if (pathname.startsWith('/report')) return 'review'
  if (pathname.startsWith('/download')) return 'download'
  return 'upload'
}
