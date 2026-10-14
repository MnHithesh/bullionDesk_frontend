import { Link } from 'react-router'
import { PageTitle } from '@/components/PageTitle'

export function NotFoundPage() {
  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <PageTitle title="Page not found" />
      <p className="font-mono text-sm text-muted">404</p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">Page not found</h1>
      <p className="mt-2 text-muted">The address may be mistyped, or the page has moved.</p>
      <Link
        to="/markets"
        className="mt-6 inline-flex rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-contrast hover:brightness-110"
      >
        Go to markets
      </Link>
    </div>
  )
}
