import axios from "axios";
import {
  LotusWeatherConfig,
  WeatherProvider,
  CurrentWeather,
  CurrentWeatherOptions,
  CurrentWeatherUnits,
  OpenMeteoCurrentWeatherRaw,
  Coordinates,
  ForecastDay,
  ForecastOptions,
  ProviderType,
} from "./types";
import { OpenWeatherProvider, OpenMeteoProvider } from "./providers";
import { Cache, CacheConfig } from "./cache";
import { WeatherError, isTransientError } from "./errors";

/**
 * LotusWeather - A unified interface for fetching weather data from multiple providers.
 *
 * Supports:
 * - **Open-Meteo**: Free, no API key required
 * - **OpenWeather**: Requires an API key from https://openweathermap.org
 *
 * Features:
 * - Current weather and forecast support
 * - Optional in-memory caching
 * - Optional fallback provider for resilience
 *
 * @example
 * ```ts
 * // Basic usage with Open-Meteo (free, no API key)
 * const weather = new LotusWeather({ provider: "open-meteo" });
 * const current = await weather.getCurrentWeather("Tokyo");
 * const forecast = await weather.getForecast("Tokyo", { days: 5 });
 *
 * // With caching and fallback
 * const weather = new LotusWeather({
 *   provider: "open-meteo",
 *   fallbackProvider: "openweather",
 *   apiKey: "your-openweather-key",
 *   cache: { enabled: true }
 * });
 * ```
 */
export class LotusWeather {
  private primaryProvider: WeatherProvider;
  private fallbackProvider?: WeatherProvider;
  private cache?: Cache;
  private primaryProviderType: ProviderType;
  private fallbackProviderType?: ProviderType;

  /**
   * Creates a new LotusWeather instance.
   * @param config - Configuration options
   * @throws WeatherError if configuration is invalid
   */
  constructor(config: LotusWeatherConfig) {
    this.validateConfig(config);

    this.primaryProviderType = config.provider;
    this.fallbackProviderType = config.fallbackProvider;

    // Initialize primary provider
    this.primaryProvider = this.createProvider(config.provider, config.apiKey);

    // Initialize fallback provider if configured
    if (config.fallbackProvider) {
      this.fallbackProvider = this.createProvider(
        config.fallbackProvider,
        config.apiKey
      );
    }

    // Initialize cache if enabled
    if (config.cache?.enabled) {
      this.cache = new Cache(config.cache.ttl);
    }
  }

  /**
   * Validates the configuration at initialization time.
   * Fails early with clear error messages.
   */
  private validateConfig(config: LotusWeatherConfig): void {
    // OpenWeather as primary requires API key
    if (config.provider === "openweather" && !config.apiKey) {
      throw new WeatherError("API key is required for OpenWeather provider");
    }

    // OpenWeather as fallback requires API key
    if (config.fallbackProvider === "openweather" && !config.apiKey) {
      throw new WeatherError(
        "API key is required when using OpenWeather as fallback provider"
      );
    }

    // Cannot use same provider as primary and fallback
    if (config.fallbackProvider === config.provider) {
      throw new WeatherError(
        "Fallback provider must be different from primary provider"
      );
    }
  }

  /**
   * Creates a provider instance based on type.
   */
  private createProvider(type: ProviderType, apiKey?: string): WeatherProvider {
    if (type === "openweather") {
      return new OpenWeatherProvider(
        axios.create({
          baseURL: "https://api.openweathermap.org/data/2.5",
          params: { appid: apiKey },
        })
      );
    }
    return new OpenMeteoProvider();
  }

  /**
   * Executes an operation with optional fallback on transient errors.
   * Never falls back on client errors (city not found, invalid key, etc.)
   */
  private async executeWithFallback<T>(
    operation: (provider: WeatherProvider) => Promise<T>,
    providerName: string
  ): Promise<T> {
    try {
      return await operation(this.primaryProvider);
    } catch (error) {
      // If no fallback configured, wrap and throw
      if (!this.fallbackProvider) {
        throw this.wrapError(error, providerName);
      }

      // Only fallback on transient errors
      if (!isTransientError(error)) {
        throw this.wrapError(error, providerName);
      }

      // Try fallback provider
      try {
        return await operation(this.fallbackProvider);
      } catch (fallbackError) {
        // If fallback also fails, throw original error
        throw this.wrapError(error, providerName);
      }
    }
  }

  /**
   * Wraps provider errors in WeatherError with clear messages.
   */
  private wrapError(error: unknown, context: string): WeatherError {
    if (error instanceof WeatherError) {
      return error;
    }

    if (error instanceof Error) {
      // Check for city not found
      if (error.message.includes("City not found")) {
        return new WeatherError(error.message, error);
      }

      // Check for axios response errors
      if ("response" in error && error.response) {
        const response = error.response as { status?: number; data?: unknown };
        const status = response.status;

        if (status === 401) {
          return new WeatherError("Invalid API key", error);
        }
        if (status === 404) {
          return new WeatherError("City not found", error);
        }
        if (status === 429) {
          return new WeatherError("Rate limit exceeded", error);
        }
        if (status && status >= 500) {
          return new WeatherError("Provider service unavailable", error);
        }
      }

      // Network errors
      if ("code" in error && typeof error.code === "string") {
        if (error.code === "ECONNREFUSED" || error.code === "ENOTFOUND") {
          return new WeatherError("Unable to connect to weather service", error);
        }
        if (error.code === "ETIMEDOUT") {
          return new WeatherError("Request timed out", error);
        }
      }

      return new WeatherError(`${context}: ${error.message}`, error);
    }

    return new WeatherError(`${context}: Unknown error occurred`);
  }

  /**
   * Gets geocoded coordinates for a city (Open-Meteo only).
   * Uses geocoding cache to avoid repeated lookups.
   */
  private async getGeocodedCoords(city: string): Promise<Coordinates> {
    const cacheKey = Cache.createKey("geocoding", "geocoding", city);

    // Check cache first
    if (this.cache) {
      const cached = this.cache.get<Coordinates>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    // Get coordinates from Open-Meteo provider
    const openMeteo = this.primaryProvider as OpenMeteoProvider;
    if (!("geocode" in openMeteo)) {
      throw new WeatherError("Geocoding not supported for this provider");
    }

    const coords = await openMeteo.geocode(city);

    // Cache the result
    if (this.cache) {
      this.cache.set(cacheKey, coords, "geocoding");
    }

    return coords;
  }

  /**
   * Fetches current weather data for a city.
   * @param city - City name (e.g., "London", "Tokyo", "New York")
   * @param options - Optional settings (set raw: true for direct API response)
   * @returns Promise resolving to weather data or raw API response
   * @throws WeatherError if the city is not found or the request fails
   */
  async getCurrentWeather(
    city: string,
    options?: CurrentWeatherOptions
  ): Promise<CurrentWeather | OpenMeteoCurrentWeatherRaw> {
    // Skip caching for raw requests
    if (options?.raw) {
      return this.executeWithFallback(
        (provider) => provider.getCurrentWeatherByCity(city, options),
        "getCurrentWeather"
      );
    }

    const cacheKey = Cache.createKey(
      this.primaryProviderType,
      "current",
      city
    );

    // Check cache
    if (this.cache) {
      const cached = this.cache.get<CurrentWeather>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    // Fetch from provider
    const result = await this.executeWithFallback(
      (provider) => provider.getCurrentWeatherByCity(city, options),
      "getCurrentWeather"
    );

    // Cache successful result
    if (this.cache) {
      this.cache.set(cacheKey, result, "current");
    }

    return result;
  }

  /**
   * Fetches current weather data for geographic coordinates.
   * @param coords - Object with lat and lon properties
   * @param options - Optional settings (set raw: true for direct API response)
   * @returns Promise resolving to weather data or raw API response
   * @throws WeatherError if the request fails
   */
  async getWeatherByCoords(
    coords: { lat: number; lon: number },
    options?: CurrentWeatherOptions
  ): Promise<CurrentWeather | OpenMeteoCurrentWeatherRaw> {
    const normalizedCoords: Coordinates = {
      latitude: coords.lat,
      longitude: coords.lon,
    };

    // Skip caching for raw requests
    if (options?.raw) {
      return this.executeWithFallback(
        (provider) => provider.getCurrentWeatherByCoords(normalizedCoords, options),
        "getWeatherByCoords"
      );
    }

    const cacheKey = Cache.createKey(
      this.primaryProviderType,
      "current",
      `${coords.lat.toFixed(4)},${coords.lon.toFixed(4)}`
    );

    // Check cache
    if (this.cache) {
      const cached = this.cache.get<CurrentWeather>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    // Fetch from provider
    const result = await this.executeWithFallback(
      (provider) => provider.getCurrentWeatherByCoords(normalizedCoords, options),
      "getWeatherByCoords"
    );

    // Cache successful result
    if (this.cache) {
      this.cache.set(cacheKey, result, "current");
    }

    return result;
  }

  /**
   * Fetches weather forecast for a city.
   * @param city - City name (e.g., "London", "Tokyo", "New York")
   * @param options - Optional forecast options (e.g., { days: 7 })
   * @returns Promise resolving to array of daily forecasts
   * @throws WeatherError if the city is not found or the request fails
   */
  async getForecast(
    city: string,
    options?: ForecastOptions
  ): Promise<ForecastDay[]> {
    const days = options?.days ?? 5;
    const cacheKey = Cache.createKey(
      this.primaryProviderType,
      "forecast",
      city,
      String(days)
    );

    // Check cache
    if (this.cache) {
      const cached = this.cache.get<ForecastDay[]>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    // Fetch from provider
    const result = await this.executeWithFallback(
      (provider) => provider.getForecastByCity(city, options),
      "getForecast"
    );

    // Cache successful result
    if (this.cache) {
      this.cache.set(cacheKey, result, "forecast");
    }

    return result;
  }

  /**
   * Clears all cached data.
   * Only has effect if caching is enabled.
   */
  clearCache(): void {
    this.cache?.clear();
  }
}

// Export all public types
export {
  CurrentWeather,
  Coordinates,
  ForecastDay,
  ForecastOptions,
  LotusWeatherConfig,
  ProviderType,
} from "./types";
export { WeatherError } from "./errors";
export { CacheConfig } from "./cache";
