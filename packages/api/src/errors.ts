/**
 * Thrown when the API responds with a non-2xx status. Carries the status so
 * callers can distinguish auth failures (401) from other errors.
 */
export class RequestError extends Error {
  status: number

  constructor(path: string, status: number) {
    super(`Request to ${path} failed with status ${status}`)
    this.name = 'RequestError'
    this.status = status
  }
}

/**
 * Thrown when the provider rejects a login attempt. `errors` holds the
 * field-level messages returned by the API (already localized in Swedish).
 */
export class AuthError extends Error {
  errors: Array<{ name: string | null; message: string }>

  constructor(
    message: string,
    errors: Array<{ name: string | null; message: string }> = [],
  ) {
    super(message)
    this.name = 'AuthError'
    this.errors = errors
  }
}
