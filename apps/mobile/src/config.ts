const _config = {
  apiUrl: 'https://www.lfc.se/webapi',
  // Base URL of the notifications backend (apps/notifications, hosted on
  // Vercel). Set EXPO_PUBLIC_NOTIFICATIONS_API_URL at build time to point at the
  // deployment. When empty, the app skips server push registration and falls
  // back to the on-device background poll.
  notificationsApiUrl: String(
    process.env.EXPO_PUBLIC_NOTIFICATIONS_API_URL ?? '',
  ),
}

export const config = {
  get(key: keyof typeof _config): string {
    return _config[key]
  },
}
