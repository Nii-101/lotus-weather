import axios from "axios";
import {
  CurrentWeather,
  Coordinates,
  WeatherProvider,
  ProviderMetadata,
  ForecastDay,
  ForecastOptions,
} from "../types";
import { WEATHER_CODE_MAP } from "../weather-codes";

interface GeocodingResponse {
  results?: Array<{
    name: string;
    latitude: number;
    longitude: number;
    country: string;
  }>;
}

interface OpenMeteoCurrentResponse {
  current_weather: {
    temperature: number;
    weathercode: number;
  };
}

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
   * @returns Promise resolving to normalized weather data
   * @throws Error if city is not found
   */
  async getCurrentWeatherByCity(city: string): Promise<CurrentWeather> {
    const coordinates = await this.geocode(city);
    const weather = await this.getCurrentWeatherByCoords(coordinates);
    return { ...weather, city };
  }

  /**
   * Fetches current weather for given coordinates using Open-Meteo API.
   * @param coords - Geographic coordinates
   * @returns Promise resolving to normalized weather data
   */
  async getCurrentWeatherByCoords(coords: Coordinates): Promise<CurrentWeather> {
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

    const weatherCode = response.data.current_weather.weathercode;

    return {
      city: `${coords.latitude.toFixed(4)},${coords.longitude.toFixed(4)}`,
      temperature: response.data.current_weather.temperature,
      description: WEATHER_CODE_MAP[weatherCode] ?? "Unknown",
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
