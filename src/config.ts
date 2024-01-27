const _config = {
  apiUrl: 'https://www.lfc.se/webapi',
}

export const config = {
  get(key: keyof typeof _config): string {
    return _config[key]
  },
}
