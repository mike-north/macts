/**
 * The Spotify server package: the app's generated contract, for a
 * macts host to serve.
 *
 * It re-exports `spotifyContract` from `@macts/spotify/contract` as
 * `contract`. A host serves the app from this contract and the app's
 * manifest, so this package carries no other code.
 *
 * @packageDocumentation
 */

export { spotifyContract as contract } from '@macts/spotify/contract'
