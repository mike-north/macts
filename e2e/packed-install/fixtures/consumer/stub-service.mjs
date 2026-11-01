/**
 * A stub macts service on an ephemeral local port, answering the widgets
 * app's operations the way the real HTTP adapter does: `list` succeeds with
 * one widget in wire form, and `get` fails with a `TARGET_NOT_FOUND` error
 * envelope. It records the Authorization header of every request.
 */

import { createServer } from 'node:http'

export async function startStubService() {
  const authorizations = []
  const server = createServer((request, response) => {
    authorizations.push(request.headers.authorization ?? null)
    request.resume()
    request.on('end', () => {
      response.setHeader('Content-Type', 'application/json')
      if (request.method === 'POST' && request.url === '/api/v1/rpc/widgets.widgets.list') {
        response.statusCode = 200
        response.end(JSON.stringify({ result: [{ name: 'Sprocket', count: { integer: '7' } }] }))
        return
      }
      if (request.method === 'POST' && request.url === '/api/v1/rpc/widgets.widgets.get') {
        response.statusCode = 404
        response.end(
          JSON.stringify({
            error: {
              code: 'TARGET_NOT_FOUND',
              message: 'No such widget.',
              details: { resource: 'Widget' },
            },
          })
        )
        return
      }
      response.statusCode = 404
      response.end(
        JSON.stringify({ error: { code: 'NOT_FOUND', message: 'No route', details: {} } })
      )
    })
  })
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  const { port } = server.address()
  return {
    url: `http://127.0.0.1:${port}`,
    authorizations,
    close: () => new Promise((resolve) => server.close(resolve)),
  }
}
