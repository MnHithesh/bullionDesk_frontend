import { isRouteErrorResponse, Link, useRouteError } from 'react-router'
import { Button } from '@/components/Button'
import { PageTitle } from '@/components/PageTitle'
import { NotFoundPage } from './NotFoundPage'

/** A failed dynamic import: usually a new deployment replaced the old chunk files. */
function isChunkLoadError(error: unknown) {
  return (
    error instanceof Error &&
    /dynamically imported module|Loading chunk|Importing a module script failed/i.test(
      error.message,
    )
  )
}

/**
 * The router's error boundary (errorElement). Each page route has one, so a crash in one page
 * renders this inside the app shell: the navigation keeps working and other pages are unaffected.
 */
export function RouteError() {
  const error = useRouteError()

  if (isRouteErrorResponse(error) && error.status === 404) return <NotFoundPage />

  const chunk = isChunkLoadError(error)
  if (import.meta.env.DEV) console.error(error)

  return (
    <div role="alert" className="mx-auto max-w-md py-16 text-center">
      <PageTitle title="Something went wrong" />
      <h1 className="text-2xl font-semibold tracking-tight">
        {chunk ? 'A new version is available' : 'This page hit a problem'}
      </h1>
      <p className="mt-2 text-muted">
        {chunk
          ? 'The app was updated since this tab was opened. Reload to get the latest version.'
          : 'The rest of the app still works. Reloading usually fixes it; if not, try again later.'}
      </p>
      {!chunk && error instanceof Error && (
        <p className="mt-3 font-mono text-xs break-words text-muted">{error.message}</p>
      )}
      <div className="mt-6 flex justify-center gap-3">
        <Button onClick={() => window.location.reload()}>Reload page</Button>
        <Link
          to="/markets"
          className="inline-flex items-center rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-bg"
        >
          Go to markets
        </Link>
      </div>
    </div>
  )
}
