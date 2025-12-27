import { CacheConfig } from "./cache";

/**
 * Represents current weather data returned by the SDK.
 */
export interface CurrentWeather {
  /** The city name */
  city: string;
  /** Temperature in Celsius */
  temperature: number;
  /** Human-readable weather description (e.g., "Clear sky", "Partly cloudy") */
  description: string;
}

/**
 * Represents a single day's forecast data.
 */
export interface ForecastDay {
  /** Date in ISO format (YYYY-MM-DD) */
  date: string;
  /** Minimum temperature in Celsius */
  minTemp: number;
  /** Maximum temperature in Celsius */
  maxTemp: number;
  /** Human-readable weather description */
  description: string;
}

/**
 * Options for forecast requests.
 */
export interface ForecastOptions {
  /** Number of days to forecast (default: 5, max varies by provider) */
  days?: number;
}

/**
 * Geographic coordinates for a location.
 */
export interface Coordinates {
  /** Latitude in decimal degrees */
  latitude: number;
  /** Longitude in decimal degrees */
  longitude: number;
}

/**
 * Provider capability metadata.
 */
export interface ProviderMetadata {
  /** Whether the provider requires an API key */
  requiresApiKey: boolean;
  /** Whether the provider supports forecast requests */
  supportsForecast: boolean;
}

/**
 * Provider type identifier.
 */
export type ProviderType = "openweather" | "open-meteo";

/**
 * Interface that all weather providers must implement.
 */
export interface WeatherProvider {
  /** Provider capability metadata */
  readonly metadata: ProviderMetadata;

  /**
   * Fetches current weather data for a given city.
   * @param city - The city name to get weather for
   * @returns Promise resolving to CurrentWeather data
   */
  getCurrentWeatherByCity(city: string): Promise<CurrentWeather>;

  /**
   * Fetches current weather data for given coordinates.
   * @param coords - Geographic coordinates
   * @returns Promise resolving to CurrentWeather data
   */
  getCurrentWeatherByCoords(coords: Coordinates): Promise<CurrentWeather>;

  /**
   * Fetches forecast data for a given city.
   * @param city - The city name to get forecast for
   * @param options - Forecast options (e.g., number of days)
   * @returns Promise resolving to array of ForecastDay data
   */
  getForecastByCity(
    city: string,
    options?: ForecastOptions
  ): Promise<ForecastDay[]>;

  /**
   * Fetches forecast data for given coordinates.
   * @param coords - Geographic coordinates
   * @param options - Forecast options (e.g., number of days)
   * @returns Promise resolving to array of ForecastDay data
   */
  getForecastByCoords(
    coords: Coordinates,
    options?: ForecastOptions
  ): Promise<ForecastDay[]>;
}

/**
 * Configuration options for LotusWeather.
 */
export interface LotusWeatherConfig {
  /**
   * The primary weather data provider to use.
   * - "open-meteo": Free, no API key required
   * - "openweather": Requires an API key
   */
  provider: ProviderType;

  /**
   * API key for providers that require it.
   * Required for OpenWeather (both primary and fallback).
   */
  apiKey?: string;

  /**
   * Optional fallback provider to use when the primary fails.
   * Only triggers on transient errors (network, rate-limit, server errors).
   * Never triggers on client errors (city not found, invalid key).
   *
   * Note: If fallbackProvider is "openweather", apiKey must be provided.
   */
  fallbackProvider?: ProviderType;

  /**
   * Optional caching configuration.
   * When enabled, successful responses are cached in-memory.
   */
  cache?: CacheConfig;
}
