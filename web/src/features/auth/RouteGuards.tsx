import { Navigate, Outlet, useLocation } from 'react-router'
import { Alert } from '@/components/Alert'
import { Button } from '@/components/Button'
import { FullPageSpinner } from '@/components/Spinner'
import { errorMessage } from '@/api/errors'
import { useAuth } from './AuthContext'

type FromState = { from?: { pathname: string; search?: string } } | null

/** Like an Angular canActivate guard: renders the child routes only for a signed-in user. */
export function RequireAuth() {
  const { status, error, retry } = useAuth()
  const location = useLocation()

  if (status === 'loading') return <FullPageSpinner label="Loading your account" />
  if (status === 'error') {
    return (
      <div className="mx-auto max-w-md px-4 py-16">
        <Alert title="Could not load your account">{errorMessage(error)}</Alert>
        <Button className="mt-4" onClick={retry}>
          Try again
        </Button>
      </div>
    )
  }
  if (status === 'anonymous') return <Navigate to="/login" replace state={{ from: location }} />
  return <Outlet />
}

/** Login and register: a signed-in user is sent on to where they were going (or home). */
export function PublicOnly() {
  const { status } = useAuth()
  const location = useLocation()

  if (status === 'loading') return <FullPageSpinner label="Signing you in" />
  if (status === 'authenticated') {
    const from = (location.state as FromState)?.from
    return <Navigate to={from ? `${from.pathname}${from.search ?? ''}` : '/'} replace />
  }
  return <Outlet />
}
