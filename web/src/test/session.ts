import { http, HttpResponse } from 'msw'
import { tokens } from '@/api/tokens'
import { server } from './server'

export const testUser = {
  id: 'u1',
  email: 'trader@example.com',
  displayName: 'Asha',
  createdAt: '2026-10-14T09:30:00Z',
}

/** Starts the test signed in, as every page behind RequireAuth expects. */
export function signIn() {
  server.use(http.get('/api/auth/me', () => HttpResponse.json(testUser)))
  tokens.set({ accessToken: 'access-1', refreshToken: 'refresh-1' })
}
