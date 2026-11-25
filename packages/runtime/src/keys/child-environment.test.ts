/** Consumer processes retain the native guard without inheriting test preloads. */
import { expect, it } from 'vitest'
import { childEnvironment } from './child-environment.js'

it('preserves only the guard import in consumer Node options', () => {
  const env = childEnvironment({
    NODE_OPTIONS: '--conditions=x --import "/a path/macts-nonnative-process-guard.mjs" --require y',
    NODE_NO_WARNINGS: '1',
    MACTS_API_KEY_SECRET: 'test-only',
    OTHER: 'kept',
  })
  expect(env).toEqual({
    NODE_OPTIONS: '--import "/a path/macts-nonnative-process-guard.mjs"',
    OTHER: 'kept',
  })
})

it('drops Node options when the guard is absent', () => {
  expect(childEnvironment({ NODE_OPTIONS: '--conditions=x --require y' })).toEqual({})
})
