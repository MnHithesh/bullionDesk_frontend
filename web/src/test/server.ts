import { setupServer } from 'msw/node'
import { defaultHandlers } from './handlers'

/**
 * Network mock shared by all tests. It starts with the default handlers; each test adds the ones
 * it needs with server.use(), and resetHandlers() after each test goes back to the defaults.
 */
export const server = setupServer(...defaultHandlers)
