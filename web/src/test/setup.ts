import '@testing-library/jest-dom/vitest'
import { cleanup, configure } from '@testing-library/react'
import { tokens } from '@/api/tokens'
import { server } from './server'

// jsdom has no <dialog> modal support yet: a minimal stand-in so components using showModal() work.
HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) {
  this.open = true
}
HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) {
  this.open = false
  this.dispatchEvent(new Event('close'))
}

// findBy*/waitFor wait up to 5s (default 1s) so slow machines don't fail async UI tests.
configure({ asyncUtilTimeout: 5000 })

// Any request without a handler fails the test, so nothing silently hits a real network.
beforeAll(() => server.listen({ onUnhandledFrame: 'error' }))
afterEach(() => {
  cleanup()
  server.resetHandlers()
  tokens.clear()
  localStorage.clear()
})
afterAll(() => server.close())
