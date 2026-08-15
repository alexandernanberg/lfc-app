/**
 * Race `promise` against a timer, rejecting with `message` if it doesn't
 * settle within `ms`. Native module calls (SecureStore, cookie jars, push
 * token registration) have no built-in timeout and can hang indefinitely on a
 * bad device/network state, which would otherwise wedge anything awaiting
 * them forever.
 */
export function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  message: string,
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error(message)), ms)
    }),
  ])
}
