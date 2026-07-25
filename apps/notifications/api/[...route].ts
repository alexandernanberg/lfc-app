import { handle } from 'hono/vercel'
import { createApp } from '../src/app'

// Vercel's filesystem routing maps every `/api/*` path to this one function, so
// no vercel.json rewrite sits in front of it and the original request path
// reaches Hono intact. The app declares its routes under the same `/api` base
// path (see createApp), which keeps local dev and production URLs identical.
export const config = { runtime: 'nodejs' }

export default handle(createApp())
