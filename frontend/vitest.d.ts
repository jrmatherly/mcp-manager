import type { TestingLibraryMatchers } from '@testing-library/jest-dom/matchers'
import 'vitest'
import 'vitest/globals'
import '@testing-library/jest-dom'

declare module 'vitest' {
  interface Assertion<T = unknown> extends jest.Matchers<void>, TestingLibraryMatchers<T, void> {}
  interface AsymmetricMatchersContaining extends jest.Matchers<void>, TestingLibraryMatchers<unknown, void> {}
}