import type {
  Comment,
  Fixture,
  FixtureEvent,
  FixtureSlim,
  FixtureStats,
  Member,
  Post,
  Season,
  Session,
  Standing,
  TeamStats,
} from './types.js'

///////////////////////////////////////////////////////////
// Normalizers
///////////////////////////////////////////////////////////
//
// Turn the provider's raw (loosely-typed, PascalCase) payloads into the tidy
// domain types above. Kept free of any platform APIs so both the app and the
// backend can share them.

function isObject(input: unknown): input is any {
  return typeof input === 'object' && input !== null
}

/** Title-case a name, splitting on whitespace and hyphens. */
function titleCase(input: string): string {
  return input
    .toLowerCase()
    .split(/(\s|-)/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join('')
}

export function parsePost(input: unknown): Post {
  if (!isObject(input)) {
    throw new Error('Invalid post')
  }

  return {
    id: `${input.NewsId}`,
    title: input.Title,
    excerpt: input.Preamble.replace(/<[^>]*>/g, ''),
    imageUrl: input.ImageName.replace(/w_\d*/, 'w_600'),
    publishedAt: new Date(input.CreatedDate),
    commentsCount: input.NumberOfComments ?? 0,
    slug: input.Url,
    url: `https://lfc.nu${input.Url ?? ''}`,
    content: preprocessPostHtml(input.ContentText ?? ''),
    tags:
      input.TagList?.map((tag: any) => ({
        id: tag.TagId,
        value: tag.TagName,
      })) ?? [],
    author: {
      id: input.Admin?.AdminId,
      name: input.Admin?.AdminName,
      avatarUrl: input.Admin?.ImageName,
      url: input.Admin?.Url,
    },
  }
}

function preprocessPostHtml(html: string) {
  // Remove script tags
  let sanitizedHtml = html.replace(/<script[^>]*>([\s\S]*?)<\/script>/gi, '')

  // Twitter embeds
  sanitizedHtml = sanitizedHtml
    .replace(
      /<blockquote class="twitter-tweet"[^>]*>[\s\S]*?<\/blockquote>/gi,
      (match) => {
        // Extract the tweet ID from the blockquote
        const tweetIdMatch = match.match(/status\/(\d+)/)
        if (tweetIdMatch && tweetIdMatch[1]) {
          const tweetId = tweetIdMatch[1]
          // Return a custom tag with the tweet ID
          return `<tweet-embed id="${tweetId}"></tweet-embed>`
        }
        return '' // If no tweet ID is found, remove the blockquote
      },
    )
    .replace(
      /<iframe[^>]*src="[^"]*?\/Tweet\.html[^"]*?id=(\d+)[^>]*><\/iframe>/gi,
      (match, tweetId) => {
        return `<tweet-embed id="${tweetId}"></tweet-embed>`
      },
    )

  // Instagram embeds
  sanitizedHtml = sanitizedHtml.replace(
    /<figure>[\s\S]*?<blockquote class="instagram-media"[^>]*data-instgrm-permalink="[^"]*\/p\/([^/?]+)[^"]*"[^>]*>[\s\S]*?<\/blockquote>[\s\S]*?<\/figure>/gi,
    (match, postId) => {
      return `<instagram-embed id="${postId}"></instagram-embed>`
    },
  )

  // Remove annying banners
  sanitizedHtml = sanitizedHtml
    .replace(/<hr>[\s\S]*?<figure>[\s\S]*?data-emoji="🚩"[\s\S]*/g, '')
    .replace(/<p>\*&nbsp;(.|\s)+<\/p>\s<figure.+<\/figure>/g, '')
    .replace(/<hr>\s*<h2[^>]*>[\s\S]*?⛱️[\s\S]*?<\/ul>/g, '')

  // Ensure all iframes has a valid protocol
  sanitizedHtml = sanitizedHtml.replace(
    /(?<=\bsrc="?)\/\/(?<=[^"]+?)/gi,
    'https://',
  )

  // Remove empty <a>
  sanitizedHtml = sanitizedHtml.replace(/<a\b[^>]*>(\s|&nbsp;)*<\/a>/gm, '')

  // Remove empty <p>
  sanitizedHtml = sanitizedHtml.replace(/<p\b[^>]*>(\s|&nbsp;)*<\/p>/gm, '')

  return sanitizedHtml
}

export function parseComment(input: unknown): Comment {
  if (!isObject(input)) {
    throw new Error('Invalid comment')
  }

  return {
    id: `${input.CommentId}`,
    parentId: input.ParentId,
    createdAt: new Date(input.CreatedDate),
    updatedAt: input.ChangedDate ? new Date(input.ChangedDate) : null,
    comment: input.Comment.replace(/^\s+|\s+$/g, '')
      .replace(/<br>/g, '\n')
      .replace(/\n\n\n/g, '\n\n')
      .trim(),
    author: {
      id: input.MemberId,
      name: input.UserName,
      avatarUrl: input.ImageName?.endsWith('default-avatar-generic.png')
        ? null
        : input.ImageName,
      url: input.Url,
    },
    numberOfLikes: input.NumberOfLikes,
    hasLiked: Boolean(input.HasLiked),
    replies: input.SubList?.map((i: unknown) => parseComment(i)) ?? [],
  }
}

export function parseFixtureSlim(input: unknown): FixtureSlim {
  if (!isObject(input)) {
    throw new Error('Invalid fixture')
  }

  return {
    id: `${input.FixtureId}`,
    startsAt: new Date(`${input.GameDate}T${input.GameTime}`),
    startsAtTime: String(input.GameTime).trim(),
    isAwayGame: input.IsAwayGame,
    oppoonent: input.Opponent,
    type: input.GameType,
    opponentLogoUrl: input.ImageName,
    result: input.ResultFinal,
    resultHalfTime: input.ResultHalfTime,
    playOffType: input.PlayOffType,
  }
}

export function parseFixture(input: unknown): Fixture {
  if (!isObject(input)) {
    throw new Error('Invalid fixture')
  }

  const [homeName, awayName] = input.Name.split(' - ')

  return {
    id: `${input.FixtureId}`,
    startsAt: new Date(`${input.GameDate}T${input.GameTime}`),
    startsAtTime: String(input.GameTime).trim(),
    isAwayGame: input.IsAwayGame,
    oppoonent: input.Opponent,
    type: input.GameType,
    result: input.ResultFinal,
    resultHalfTime: input.ResultHalfTime,
    playOffType: input.PlayOffType,
    arena: input.Arena,
    spectators: input.Spectators,
    name: input.Name,
    homeName,
    awayName,
    imageHomeUrl: input.ImageHome.replace(/w_\d*/, 'w_220'),
    imageAwayUrl: input.ImageAway.replace(/w_\d*/, 'w_220'),
    attendence: input.Spectators,
    referee: input.Referee
      ? {
          id: input.Referee.RefereeId,
          name: String(input.Referee.Name).trim(),
          imageUrl: input.Referee.ImageName,
        }
      : null,
  }
}

function parseTeamStats(input: unknown): TeamStats {
  if (!isObject(input)) {
    throw new Error('Invalid fixture')
  }

  return {
    shots: input.Shots,
    shotsOnGoal: input.ShotsOnGoal,
    possession: input.Possession / 100,
    passes: input.Passes,
    passingPercentage: input.PassingPercentage,
    misconduct: input.Misconduct,
    yellow: input.Yellow,
    red: input.Red,
    offsides: input.Offsides,
    corners: input.Corners,
  }
}

export function parseFixtureStats(input: unknown): FixtureStats {
  if (!isObject(input)) {
    throw new Error('Invalid fixture')
  }

  const [homeStats, awayStats] = input.ItemList

  return {
    homeTeam: parseTeamStats(homeStats),
    awayTeam: parseTeamStats(awayStats),
  }
}

function parseName(input: string, type: FixtureEvent['type']) {
  let player = input.trim()
  let assist: undefined | string
  let inPlayer: undefined | string
  let outPlayer: undefined | string

  if (type === 'substitution') {
    // Parse substitution formatting, e.g. In: SALAH, Ut: DIAZ
    const match = input.match(/In:\s*([\w\s-]+)\s*,\s*Ut:\s*([\w\s-]+)/)
    if (match) {
      inPlayer = match[1]?.trim()
      outPlayer = match[2]?.trim()
    }
  } else {
    // Parse goal formatting, e.g. SALAH (ALEXANDER-ARNOLD)
    const match = input.match(/^([\w\s-]+)(?:\s\(([\w\s-]+)\))?$/)
    if (match) {
      player = match[1]?.trim() ?? ''
      assist = match[2]?.trim()
    }
  }

  return {
    player,
    assist,
    inPlayer,
    outPlayer,
  }
}

const fixtureEventTypeIdMap = {
  1: 'goal',
  2: 'yellow_card',
  3: 'second_yellow_card',
  4: 'red_card',
  5: 'substitution',
  7: 'penalty_miss',
  10: 'own_goal',
} as const satisfies Record<number, FixtureEvent['type']>

export function parseFixtureEvents(input: unknown): FixtureEvent {
  if (!isObject(input)) {
    throw new Error('Invalid fixture')
  }

  const type = input.IsPenalty
    ? 'penalty_goal'
    : input.EventTypeId in fixtureEventTypeIdMap
      ? fixtureEventTypeIdMap[
          input.EventTypeId as keyof typeof fixtureEventTypeIdMap
        ]
      : 'unknown'

  const { player, assist, inPlayer, outPlayer } = parseName(input.Name, type)

  return {
    id: input.FixtureEventId,
    type,
    minute: input.Minute,
    player: titleCase(player),
    assist: assist ? titleCase(assist) : undefined,
    isLiverpool: input.IsLiverpool,
    inPlayer: inPlayer ? titleCase(inPlayer) : undefined,
    outPlayer: outPlayer ? titleCase(outPlayer) : undefined,
  }
}

export function parseSeason(input: unknown): Season {
  if (!isObject(input)) {
    throw new Error('Invalid fixture')
  }

  return {
    id: input.SeasonId,
    name: input.Name,
  }
}

export function parseSession(input: unknown): Session {
  if (!isObject(input)) {
    throw new Error('Invalid session')
  }

  const validThru = input.ValidThru ? new Date(input.ValidThru) : null

  return {
    token: input.SessionId,
    memberId: `${input.MemberId}`,
    username: input.Username,
    validThru:
      validThru && !Number.isNaN(validThru.getTime()) ? validThru : null,
    domain: input.Domain ?? null,
  }
}

export function parseMember(input: unknown): Member {
  if (!isObject(input)) {
    throw new Error('Invalid member')
  }

  const expirationDate = input.ExpirationDate
    ? new Date(input.ExpirationDate)
    : null

  return {
    id: `${input.MemberId}`,
    membershipNumber: input.MembershipNumber,
    firstName: input.FirstName,
    lastName: input.LastName,
    name: input.Name,
    username: input.Username,
    email: input.Email,
    avatarUrl: input.ImageName?.includes('default-avatar')
      ? null
      : (input.ImageName ?? null),
    signature: input.Signature || null,
    expirationDate:
      expirationDate && !Number.isNaN(expirationDate.getTime())
        ? expirationDate
        : null,
    daysLeft: input.DaysLeft ?? 0,
    numberOfComments: input.NumberOfComments ?? 0,
  }
}

export function parseStanding(input: unknown): Standing {
  if (!isObject(input)) {
    throw new Error('Invalid standing')
  }

  const team = String(input.Team).trim()

  return {
    position: Number(input.Position),
    team,
    crestUrl: String(input.ImageName),
    played: Number(input.Played),
    won: Number(input.Won),
    draw: Number(input.Draw),
    lost: Number(input.Lost),
    goalsFor: Number(input.Fore),
    goalsAgainst: Number(input.Against),
    goalDifference: Number(input.GoalDifference),
    points: Number(input.Points),
    // The API's IsLiverpool flag is unreliable (always false), so fall back to
    // matching the team name.
    isLiverpool: Boolean(input.IsLiverpool) || team === 'Liverpool',
  }
}
