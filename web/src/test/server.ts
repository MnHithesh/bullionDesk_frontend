import { setupServer } from 'msw/node'

/** Network mock shared by all tests. Each test adds the handlers it needs with server.use(). */
export const server = setupServer()
