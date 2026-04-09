import '@testing-library/jest-dom/vitest'
import { afterAll, afterEach, beforeAll } from 'vitest'
import { mockApiServer } from './msw'

beforeAll(() => {
  mockApiServer.listen({ onUnhandledRequest: 'bypass' })
})

afterEach(() => {
  mockApiServer.resetHandlers()
})

afterAll(() => {
  mockApiServer.close()
})
