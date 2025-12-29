import { CacheConfig } from "./cache";

/**
 * Units for current weather measurements.
 */
export interface CurrentWeatherUnits {
  /** Temperature unit (e.g., "°C") */
  temperature: string;
  /** Wind speed unit (e.g., "km/h") */
  windSpeed: string;
  /** Wind direction unit (e.g., "°") */
  windDirection: string;
  /** Pressure unit (e.g., "hPa") - OpenWeather only */
  pressure?: string;
  /** Humidity unit (e.g., "%") - OpenWeather only */
  humidity?: string;
  /** Visibility unit (e.g., "m") - OpenWeather only */
  visibility?: string;
}

/**
 * Represents current weather data returned by the SDK (opinionated structure).
 * Some fields are provider-specific and may be undefined depending on the provider used.
 */
export interface CurrentWeather {
  // === Common fields (available from all providers) ===

  /** The city name or coordinates string */
  city: string;
  /** Temperature value */
  temperature: number;
  /** Human-readable weather description (e.g., "Clear sky", "Partly cloudy") */
  description: string;
  /** Wind speed value */
  windSpeed: number;
  /** Wind direction in degrees (0-360, where 0=N, 90=E, 180=S, 270=W) */
  windDirection: number;
  /** Whether it's currently daytime */
  isDay: boolean;
  /** Timezone identifier (e.g., "GMT", "UTC+2") */
  timezone: string;
  /** Timezone abbreviation (e.g., "GMT", "UTC+2") */
  timezoneAbbreviation: string;
  /** Timestamp of the weather reading (YYYY-MM-DDTHH:MM format) */
  time: string;
  /** Units for the weather measurements */
  units: CurrentWeatherUnits;

  // === Open Meteo specific fields ===

  /** Elevation in meters above sea level (Open Meteo only) */
  elevation?: number;

  // === OpenWeather specific fields ===

  /** Feels like temperature (OpenWeather only) */
  feelsLike?: number;
  /** Humidity percentage 0-100 (OpenWeather only) */
  humidity?: number;
  /** Atmospheric pressure in hPa (OpenWeather only) */
  pressure?: number;
  /** Visibility in meters (OpenWeather only) */
  visibility?: number;
  /** Cloud coverage percentage 0-100 (OpenWeather only) */
  clouds?: number;
  /** Wind gust speed (OpenWeather only) */
  windGust?: number;
  /** Sunrise time in ISO format (OpenWeather only) */
  sunrise?: string;
  /** Sunset time in ISO format (OpenWeather only) */
  sunset?: string;
  /** Country code (OpenWeather only) */
  country?: string;
  /** Atmospheric pressure at sea level in hPa (OpenWeather only) */
  seaLevelPressure?: number;
  /** Atmospheric pressure at ground level in hPa (OpenWeather only) */
  groundLevelPressure?: number;
}

/**
 * Raw Open-Meteo API response for current weather.
 * This is the direct response from the API without any transformation.
 */
export interface OpenMeteoCurrentWeatherRaw {
  latitude: number;
  longitude: number;
  generationtime_ms: number;
  utc_offset_seconds: number;
  timezone: string;
  timezone_abbreviation: string;
  elevation: number;
  current_weather_units: {
    time: string;
    interval: string;
    temperature: string;
    windspeed: string;
    winddirection: string;
    is_day: string;
    weathercode: string;
  };
  current_weather: {
    time: string;
    interval: number;
    temperature: number;
    windspeed: number;
    winddirection: number;
    is_day: number;
    weathercode: number;
  };
}

/**
 * Options for current weather requests.
 */
export interface CurrentWeatherOptions {
  /**
   * When true, returns the raw API response instead of the opinionated structure.
   * @default false
   */
  raw?: boolean;
}

/**
 * Represents a single day's forecast data.
 * Some fields are provider-specific and may be undefined depending on the provider used.
 */
export interface ForecastDay {
  // === Common fields (available from all providers) ===

  /** Date in ISO format (YYYY-MM-DD) */
  date: string;
  /** Minimum temperature in Celsius */
  minTemp: number;
  /** Maximum temperature in Celsius */
  maxTemp: number;
  /** Human-readable weather description (most frequent condition of the day) */
  description: string;

  // === OpenWeather specific fields ===

  /** Average feels-like temperature for the day (OpenWeather only) */
  avgFeelsLike?: number;
  /** Average humidity percentage for the day (OpenWeather only) */
  avgHumidity?: number;
  /** Average atmospheric pressure in hPa for the day (OpenWeather only) */
  avgPressure?: number;
  /** Average wind speed in km/h for the day (OpenWeather only) */
  avgWindSpeed?: number;
  /** Average cloud coverage percentage for the day (OpenWeather only) */
  avgClouds?: number;
  /** Maximum probability of precipitation as percentage (0-100) for the day (OpenWeather only) */
  maxPop?: number;
  /** Total rain accumulation in mm for the day (OpenWeather only) */
  totalRain?: number;
  /** Total snow accumulation in mm for the day (OpenWeather only) */
  totalSnow?: number;
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
   * @param options - Current weather options
   * @returns Promise resolving to CurrentWeather data or raw response
   */
  getCurrentWeatherByCity(
    city: string,
    options?: CurrentWeatherOptions
  ): Promise<CurrentWeather | OpenMeteoCurrentWeatherRaw>;

  /**
   * Fetches current weather data for given coordinates.
   * @param coords - Geographic coordinates
   * @param options - Current weather options
   * @returns Promise resolving to CurrentWeather data or raw response
   */
  getCurrentWeatherByCoords(
    coords: Coordinates,
    options?: CurrentWeatherOptions
  ): Promise<CurrentWeather | OpenMeteoCurrentWeatherRaw>;

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
