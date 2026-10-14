import { render } from '@testing-library/react'
import type { ReactNode } from 'react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { Providers } from '@/app/Providers'
import { createQueryClient } from '@/app/queryClient'
import { routes } from '@/app/routes'

/** Renders the real app routes at `path` with fresh providers (no retries, so failures show at once). */
export function renderApp(path = '/') {
  const queryClient = createQueryClient({ retry: false })
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  const result = render(
    <Providers queryClient={queryClient}>
      <RouterProvider router={router} />
    </Providers>,
  )
  return { ...result, router, queryClient }
}

/** Renders one component (not the whole app) with fresh providers and a router around it. */
export function renderWithProviders(ui: ReactNode, { path = '/' } = {}) {
  const queryClient = createQueryClient({ retry: false })
  const router = createMemoryRouter([{ path: '*', element: ui }], { initialEntries: [path] })
  const result = render(
    <Providers queryClient={queryClient}>
      <RouterProvider router={router} />
    </Providers>,
  )
  return { ...result, router, queryClient }
}
