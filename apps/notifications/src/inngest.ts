import { Inngest } from 'inngest'
import type { Env } from './env'
import type { Store } from './store'
import { pollAndNotify } from './poll'
import { checkReceipts } from './receipts'

///////////////////////////////////////////////////////////
// Scheduling
///////////////////////////////////////////////////////////
//
// Inngest drives both recurring jobs. It calls back into the deployment at
// `/api/inngest` on its own schedule, so the service needs no cron support from
// the host — which is what makes this work on a Vercel Hobby plan (Hobby caps
// Vercel Cron at once per day). Each run gets retries and a dashboard trail for
// free, and the jobs run in-process here rather than looping back over HTTP.

/** How often to check lfc.se for new articles. This is notification latency. */
const POLL_CRON = '*/5 * * * *'
/**
 * How often to reap dead device tokens. Deliberately slower than the poll:
 * receipts aren't ready for ~15-30 min anyway (see RECEIPT_MIN_AGE_MS), and
 * nothing breaks if a dead token lingers an extra half hour.
 */
const RECEIPTS_CRON = '*/30 * * * *'

/**
 * The Inngest client. Its `id` identifies this app in the Inngest dashboard.
 * Credentials (`INNGEST_SIGNING_KEY`, `INNGEST_EVENT_KEY`) are picked up from
 * the environment by the SDK; without them it runs in local dev mode.
 */
export const inngest = new Inngest({ id: 'lfc-notifications' })

/**
 * Build the scheduled functions bound to a given env and store, so they share
 * the same store instance as the HTTP routes (see `createApp`).
 *
 * Each job body is wrapped in `step.run` so Inngest records it as a retriable
 * step: a thrown error is retried with backoff instead of silently lost, which
 * is the main thing a bare cron ping didn't give us.
 */
export function createScheduledFunctions(env: Env, store: Store) {
  const pollNews = inngest.createFunction(
    { id: 'poll-news', triggers: [{ cron: POLL_CRON }] },
    async ({ step }) => {
      return step.run('poll-and-notify', () => pollAndNotify(store, env))
    },
  )

  const reapDeadTokens = inngest.createFunction(
    { id: 'reap-dead-tokens', triggers: [{ cron: RECEIPTS_CRON }] },
    async ({ step }) => {
      return step.run('check-receipts', () => checkReceipts(store, env))
    },
  )

  return [pollNews, reapDeadTokens]
}
