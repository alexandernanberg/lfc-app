import { handle } from 'hono/vercel'
import { createApp } from '../src/app'

// Run on Vercel's Node.js runtime (Docker/serverless). @upstash/redis speaks
// REST so it works here without a persistent TCP connection.
export const config = { runtime: 'nodejs' }

const app = createApp()

// All routes are served through this single function; see vercel.json rewrites.
export default handle(app)
