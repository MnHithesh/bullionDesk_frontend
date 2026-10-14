import { Navigate, type RouteObject } from 'react-router'
import { LoginPage } from '@/features/auth/LoginPage'
import { RegisterPage } from '@/features/auth/RegisterPage'
import { PublicOnly, RequireAuth } from '@/features/auth/RouteGuards'
import { HomePage } from './HomePage'

export const routes: RouteObject[] = [
  {
    element: <PublicOnly />,
    children: [
      { path: '/login', element: <LoginPage /> },
      { path: '/register', element: <RegisterPage /> },
    ],
  },
  {
    element: <RequireAuth />,
    children: [{ path: '/', element: <HomePage /> }],
  },
  // A proper 404 page comes with the polish step.
  { path: '*', element: <Navigate to="/" replace /> },
]
