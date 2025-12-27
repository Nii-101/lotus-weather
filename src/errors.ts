/**
 * Custom error class for LotusWeather SDK.
 * Wraps provider-specific errors with clear, consistent messages.
 */
export class WeatherError extends Error {
  override name = "WeatherError";

  /**
   * Creates a new WeatherError.
   * @param message - Human-readable error message
   * @param cause - Original error that caused this error (optional)
   */
  constructor(
    message: string,
    public readonly cause?: Error
  ) {
    super(message);
    // Maintains proper stack trace in V8 environments
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, WeatherError);
    }
  }
}

/**
 * Determines if an error is transient and should trigger fallback.
 * Transient errors are temporary failures that may succeed on retry.
 */
export function isTransientError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  // Axios error with response
  if ("response" in error && error.response) {
    const response = error.response as { status?: number };
    const status = response.status;

    // Rate limit or server errors are transient
    if (status === 429 || (status && status >= 500 && status < 600)) {
      return true;
    }

    // Client errors (4xx except 429) are not transient
    if (status && status >= 400 && status < 500) {
      return false;
    }
  }

  // Network errors (no response received) are transient
  if ("code" in error && typeof error.code === "string") {
    const transientCodes = [
      "ECONNREFUSED",
      "ECONNRESET",
      "ETIMEDOUT",
      "ENOTFOUND",
      "ENETUNREACH",
      "EAI_AGAIN",
    ];
    if (transientCodes.includes(error.code)) {
      return true;
    }
  }

  // Axios request error (no response)
  if ("request" in error && !("response" in error && error.response)) {
    return true;
  }

  return false;
}
