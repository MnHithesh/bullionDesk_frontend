import '@testing-library/jest-dom/vitest'
import { cleanup, configure } from '@testing-library/react'
import { tokens } from '@/api/tokens'
import { toast } from '@/components/toast/toastStore'
import { server } from './server'

// jsdom has no <dialog> modal support yet: a minimal stand-in so components using showModal() work.
HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) {
  this.open = true
}
HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) {
  this.open = false
  this.dispatchEvent(new Event('close'))
}

// findBy*/waitFor wait up to 10s (default 1s): the first render of a lazy page also compiles its
// chunk, which can take several seconds on a busy machine or WSL.
configure({ asyncUtilTimeout: 10_000 })

// Any request without a handler fails the test, so nothing silently hits a real network.
beforeAll(() => server.listen({ onUnhandledFrame: 'error' }))
afterEach(() => {
  cleanup()
  server.resetHandlers()
  tokens.clear()
  toast.clear()
  localStorage.clear()
})
afterAll(() => server.close())
