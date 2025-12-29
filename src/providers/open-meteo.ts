/**
 * Open-Meteo Provider
 *
 * Implements weather data fetching from the Open-Meteo API (https://open-meteo.com/).
 * Open-Meteo is a free, open-source weather API that doesn't require an API key.
 *
 * Features:
 * - Automatic geocoding: converts city names to coordinates
 * - Weather code translation: converts WMO codes to human-readable descriptions
 * - Raw response support: optionally returns untransformed API responses
 *
 * API Documentation: https://open-meteo.com/en/docs
 */

import axios from "axios";
import {
  CurrentWeather,
  CurrentWeatherOptions,
  Coordinates,
  WeatherProvider,
  ProviderMetadata,
  ForecastDay,
  ForecastOptions,
  OpenMeteoCurrentWeatherRaw,
} from "../types";
import { WEATHER_CODE_MAP } from "../weather-codes";

/**
 * Response structure from Open-Meteo's geocoding API.
 * Used to convert city names to latitude/longitude coordinates.
 */
interface GeocodingResponse {
  results?: Array<{
    name: string;
    latitude: number;
    longitude: number;
    country: string;
  }>;
}

/**
 * Response structure from Open-Meteo's current weather endpoint.
 * Contains location metadata, measurement units, and current conditions.
 */
interface OpenMeteoCurrentResponse {
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
 * Response structure from Open-Meteo's daily forecast endpoint.
 * Contains arrays of daily values indexed by date.
 */
interface OpenMeteoForecastResponse {
  daily: {
    time: string[];
    temperature_2m_min: number[];
    temperature_2m_max: number[];
    weathercode: number[];
  };
}

/**
 * Weather provider implementation for Open-Meteo API.
 * Free to use, no API key required.
 *
 * This provider automatically handles geocoding (city name -> coordinates)
 * since Open-Meteo requires latitude/longitude for weather requests.
 *
 * @example
 * ```ts
 * const provider = new OpenMeteoProvider();
 * const weather = await provider.getCurrentWeatherByCity("Tokyo");
 * const forecast = await provider.getForecastByCity("Tokyo", { days: 5 });
 * ```
 */
export class OpenMeteoProvider implements WeatherProvider {
  readonly metadata: ProviderMetadata = {
    requiresApiKey: false,
    supportsForecast: true,
  };

  /**
   * Converts a city name to geographic coordinates using Open-Meteo's geocoding API.
   * This method is exposed for SDK-level geocoding caching.
   * @param city - City name to geocode
   * @returns Promise resolving to coordinates
   * @throws Error if city is not found
   */
  async geocode(city: string): Promise<Coordinates> {
    const response = await axios.get<GeocodingResponse>(
      "https://geocoding-api.open-meteo.com/v1/search",
      {
        params: { name: city, count: 1 },
      }
    );

    if (!response.data.results || response.data.results.length === 0) {
      throw new Error(`City not found: ${city}`);
    }

    const location = response.data.results[0];
    return {
      latitude: location.latitude,
      longitude: location.longitude,
    };
  }

  /**
   * Fetches current weather for a city using Open-Meteo API.
   * Automatically geocodes the city name to coordinates.
   * @param city - City name (e.g., "Paris", "Tokyo")
   * @param options - Current weather options (set raw: true for direct API response)
   * @returns Promise resolving to normalized weather data or raw API response
   * @throws Error if city is not found
   */
  async getCurrentWeatherByCity(
    city: string,
    options?: CurrentWeatherOptions
  ): Promise<CurrentWeather | OpenMeteoCurrentWeatherRaw> {
    const coordinates = await this.geocode(city);
    const weather = await this.getCurrentWeatherByCoords(coordinates, options);

    if (options?.raw) {
      return weather as OpenMeteoCurrentWeatherRaw;
    }

    return { ...(weather as CurrentWeather), city };
  }

  /**
   * Fetches current weather for given coordinates using Open-Meteo API.
   * @param coords - Geographic coordinates
   * @param options - Current weather options (set raw: true for direct API response)
   * @returns Promise resolving to normalized weather data or raw API response
   */
  async getCurrentWeatherByCoords(
    coords: Coordinates,
    options?: CurrentWeatherOptions
  ): Promise<CurrentWeather | OpenMeteoCurrentWeatherRaw> {
    const response = await axios.get<OpenMeteoCurrentResponse>(
      "https://api.open-meteo.com/v1/forecast",
      {
        params: {
          latitude: coords.latitude,
          longitude: coords.longitude,
          current_weather: true,
        },
      }
    );

    if (options?.raw) {
      return response.data as OpenMeteoCurrentWeatherRaw;
    }

    const { current_weather, current_weather_units } = response.data;
    const weatherCode = current_weather.weathercode;

    return {
      city: `${coords.latitude.toFixed(4)},${coords.longitude.toFixed(4)}`,
      temperature: current_weather.temperature,
      description: WEATHER_CODE_MAP[weatherCode] ?? "Unknown",
      windSpeed: current_weather.windspeed,
      windDirection: current_weather.winddirection,
      isDay: current_weather.is_day === 1,
      timezone: response.data.timezone,
      timezoneAbbreviation: response.data.timezone_abbreviation,
      elevation: response.data.elevation,
      time: current_weather.time,
      units: {
        temperature: current_weather_units.temperature,
        windSpeed: current_weather_units.windspeed,
        windDirection: current_weather_units.winddirection,
      },
    };
  }

  /**
   * Fetches forecast for a city using Open-Meteo API.
   * @param city - City name (e.g., "Paris", "Tokyo")
   * @param options - Forecast options
   * @returns Promise resolving to array of forecast days
   * @throws Error if city is not found
   */
  async getForecastByCity(
    city: string,
    options?: ForecastOptions
  ): Promise<ForecastDay[]> {
    const coordinates = await this.geocode(city);
    return this.getForecastByCoords(coordinates, options);
  }

  /**
   * Fetches forecast for given coordinates using Open-Meteo API.
   * @param coords - Geographic coordinates
   * @param options - Forecast options
   * @returns Promise resolving to array of forecast days
   */
  async getForecastByCoords(
    coords: Coordinates,
    options?: ForecastOptions
  ): Promise<ForecastDay[]> {
    const days = options?.days ?? 5;

    const response = await axios.get<OpenMeteoForecastResponse>(
      "https://api.open-meteo.com/v1/forecast",
      {
        params: {
          latitude: coords.latitude,
          longitude: coords.longitude,
          daily: "temperature_2m_min,temperature_2m_max,weathercode",
          forecast_days: days,
        },
      }
    );

    const { daily } = response.data;

    return daily.time.map((date, index) => ({
      date,
      minTemp: daily.temperature_2m_min[index],
      maxTemp: daily.temperature_2m_max[index],
      description: WEATHER_CODE_MAP[daily.weathercode[index]] ?? "Unknown",
    }));
  }
}
