/**
 * The subset of a lfc.se news article the notification service cares about.
 * Deliberately smaller than the mobile app's `Post` — the backend only needs
 * enough to detect "something new" and render a push notification.
 */
export interface NewsPost {
  /** Stable article id (stringified `NewsId`). */
  id: string
  /** Headline, used as the notification title. */
  title: string
  /** Plain-text preamble (HTML stripped), used as the notification body. */
  excerpt: string
  /** Canonical article URL on lfc.nu, used for deep-linking. */
  url: string
  /** Article image, if any. */
  imageUrl: string | null
  /** Publish time. The service keys new-article detection off this. */
  publishedAt: Date
}
