import type { FormatDistanceLocale, Locale } from 'date-fns'
import { formatDistanceStrict, formatRelative } from 'date-fns'
import { sv } from 'date-fns/locale'
import { useState } from 'react'
import { useInterval } from './use-interval'

type FormatDistanceTokenValue =
  | string
  | {
      one: string
      other: string
    }

const formatDistanceLocale: FormatDistanceLocale<FormatDistanceTokenValue> = {
  lessThanXSeconds: {
    one: 'mindre än en sekund',
    other: 'mindre än {{count}} sekunder',
  },

  xSeconds: {
    one: 'en sekund',
    other: '{{count}} sekunder',
  },

  halfAMinute: 'en halv minut',

  lessThanXMinutes: {
    one: 'mindre än en minut',
    other: 'mindre än {{count}} minuter',
  },

  xMinutes: {
    one: 'en minut',
    other: '{{count}} minuter',
  },

  aboutXHours: {
    one: 'ungefär en timme',
    other: 'ungefär {{count}} timmar',
  },

  xHours: {
    one: 'en timme',
    other: '{{count}} timmar',
  },

  xDays: {
    one: 'en dag',
    other: '{{count}} dagar',
  },

  aboutXWeeks: {
    one: 'ungefär en vecka',
    other: 'ungefär {{count}} veckor',
  },

  xWeeks: {
    one: 'en vecka',
    other: '{{count}} veckor',
  },

  aboutXMonths: {
    one: 'ungefär en månad',
    other: 'ungefär {{count}} månader',
  },

  xMonths: {
    one: 'en månad',
    other: '{{count}} månader',
  },

  aboutXYears: {
    one: 'ungefär ett år',
    other: 'ungefär {{count}} år',
  },

  xYears: {
    one: 'ett år',
    other: '{{count}} år',
  },

  overXYears: {
    one: 'över ett år',
    other: 'över {{count}} år',
  },

  almostXYears: {
    one: 'nästan ett år',
    other: 'nästan {{count}} år',
  },
}

const locale = {
  ...sv,
  // formatRelative: (token, date, baseDate, options) => {
  //   const result = sv.formatRelative(token, date, baseDate, options)
  //   return result
  // },
  formatDistance: (token, count, options) => {
    let result

    const tokenValue = formatDistanceLocale[token]
    if (typeof tokenValue === 'string') {
      result = tokenValue
    } else if (count === 1) {
      result = tokenValue.one
    } else {
      result = tokenValue.other.replace('{{count}}', String(count))
    }

    if (options?.addSuffix) {
      if (options.comparison && options.comparison > 0) {
        return 'om ' + result
      } else {
        return result + ' sedan'
      }
    }

    return result
  },
} satisfies Locale

export function useRelativeTimeFormatter(date: Date) {
  function format(d: Date) {
    const now = new Date()
    return formatRelative(d, now, { locale })
  }

  const [value, setValue] = useState(() => format(date))

  useInterval(() => {
    setValue(format(date))
  }, 60_000)

  return value
}

interface RelativeTimeProps {
  date: Date
}

export function RelativeTime({ date }: RelativeTimeProps) {
  return useRelativeTimeFormatter(date)
}

export function useDistanceTimeFormatter(date: Date) {
  function format(d: Date) {
    const now = new Date()
    return formatDistanceStrict(d, now, { locale, addSuffix: true })
  }

  const [value, setValue] = useState(() => format(date))

  useInterval(() => {
    setValue(format(date))
  }, 60_000)

  return value
}

export function DistanceTime({ date }: RelativeTimeProps) {
  return useDistanceTimeFormatter(date)
}
