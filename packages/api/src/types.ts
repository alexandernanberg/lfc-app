///////////////////////////////////////////////////////////
// Domain types
///////////////////////////////////////////////////////////

export interface Tag {
  id: number
  value: string
}

export interface User {
  id: string
  name: string
  avatarUrl: string | null
  url: string
}

export interface Post {
  id: string
  slug: string
  url: string
  title: string
  excerpt: string
  publishedAt: Date
  imageUrl: string
  content: string
  tags: Array<Tag>
  author: User
  commentsCount: number
}

/**
 * The lighter shape used by the notifications backend. Parsed tolerantly (see
 * `fetchLatestPosts`) so a background poller doesn't throw on an unexpected
 * article payload — it only needs enough to detect "something new" and render a
 * push notification.
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

export interface Comment {
  id: string
  parentId: string
  createdAt: Date
  updatedAt: Date | null
  author: User
  comment: string
  numberOfLikes: number
  hasLiked: boolean
  replies: Array<Comment>
}

export interface Season {
  id: string
  name: string
}

export interface Session {
  token: string
  memberId: string
  username: string
  validThru: Date | null
  domain: string | null
}

export interface Member {
  id: string
  membershipNumber: number
  firstName: string
  lastName: string
  name: string
  username: string
  email: string
  avatarUrl: string | null
  signature: string | null
  expirationDate: Date | null
  daysLeft: number
  numberOfComments: number
}

export interface Standing {
  position: number
  team: string
  crestUrl: string
  played: number
  won: number
  draw: number
  lost: number
  goalsFor: number
  goalsAgainst: number
  goalDifference: number
  points: number
  isLiverpool: boolean
}

export interface FixtureSlim {
  id: string
  startsAt: Date
  startsAtTime: string | null
  isAwayGame: boolean
  oppoonent: string
  result: string | null
  resultHalfTime: string | null
  type: string
  opponentLogoUrl: string
  playOffType: string | null
}

export interface Fixture {
  id: string
  startsAt: Date
  startsAtTime: string | null
  isAwayGame: boolean
  oppoonent: string
  result: string | null
  resultHalfTime: string | null
  type: string
  playOffType: string | null
  arena: string
  spectators: number
  name: string
  attendence: number
  homeName: string
  awayName: string
  imageHomeUrl: string
  imageAwayUrl: string
  referee: {
    id: number
    name: string
    imageUrl: string
  } | null
}

export interface TeamStats {
  shots: number
  shotsOnGoal: number
  possession: number
  passes: number
  passingPercentage: number
  misconduct: number
  yellow: number
  red: number
  offsides: number
  corners: number
}

export interface FixtureStats {
  homeTeam: TeamStats
  awayTeam: TeamStats
}

export interface FixtureEvent {
  id: string
  type:
    | 'goal'
    | 'yellow_card'
    | 'second_yellow_card'
    | 'red_card'
    | 'substitution'
    | 'penalty_miss'
    | 'penalty_goal'
    | 'own_goal'
    | ({} & string)
  minute: number
  player: string
  assist?: string
  isLiverpool: boolean
  inPlayer?: string
  outPlayer?: string
}
