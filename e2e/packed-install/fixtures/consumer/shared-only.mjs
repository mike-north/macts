/** A consumer of client composition requires no SDK or execution packages. */
import { createCodecClient, createRemoteClient, bindReference } from '@macts/contracts/client'
process.stdout.write(
  JSON.stringify({
    codec: typeof createCodecClient,
    remote: typeof createRemoteClient,
    binder: typeof bindReference,
  })
)
