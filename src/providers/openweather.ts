/**
 * OpenWeatherMap Provider
 *
 * Implements weather data fetching from the OpenWeatherMap API (https://openweathermap.org/).
 * Requires an API key from https://openweathermap.org/api
 *
 * Features:
 * - Rich weather data including humidity, pressure, visibility, and more
 * - Sunrise/sunset times for day/night detection
 * - Wind gust information when available
 * - Automatic unit conversion to match Open-Meteo format (km/h for wind speed)
 *
 * API Documentation: https://openweathermap.org/current
 */

import { AxiosInstance } from "axios";
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

/**
 * Response structure from OpenWeatherMap's current weather endpoint.
 * Contains comprehensive weather data including conditions, wind, and atmospheric readings.
 * Reference: https://openweathermap.org/current#current_JSON
 */
interface OpenWeatherCurrentResponse {
  coord: {
    lon: number;
    lat: number;
  };
  weather: Array<{
    id: number;
    main: string;
    description: string;
    icon: string;
  }>;
  base: string;
  main: {
    temp: number;
    feels_like: number;
    temp_min: number;
    temp_max: number;
    pressure: number;
    humidity: number;
    sea_level?: number;
    grnd_level?: number;
  };
  visibility: number;
  wind: {
    speed: number;
    deg: number;
    gust?: number;
  };
  rain?: {
    "1h"?: number;
    "3h"?: number;
  };
  snow?: {
    "1h"?: number;
    "3h"?: number;
  };
  clouds: {
    all: number;
  };
  dt: number;
  sys: {
    type?: number;
    id?: number;
    country: string;
    sunrise: number;
    sunset: number;
  };
  timezone: number;
  id: number;
  name: string;
  cod: number;
}

/**
 * Response structure from OpenWeatherMap's 5-day forecast endpoint.
 * Contains 3-hour interval forecasts that are aggregated into daily summaries.
 * Reference: https://openweathermap.org/forecast5
 */
interface OpenWeatherForecastResponse {
  city: {
    name: string;
  };
  list: Array<{
    dt: number;
    dt_txt: string;
    main: {
      temp: number;
      feels_like: number;
      temp_min: number;
      temp_max: number;
      pressure: number;
      humidity: number;
    };
    weather: Array<{
      description: string;
    }>;
    clouds: {
      all: number;
    };
    wind: {
      speed: number;
    };
    pop: number;
    rain?: {
      "3h": number;
    };
    snow?: {
      "3h": number;
    };
  }>;
}

/**
 * Internal structure for aggregating 3-hour forecast intervals into daily data.
 * Collects temperatures and descriptions for calculating daily min/max and
 * selecting the most representative weather description.
 */
interface DayAggregate {
  temps: number[];
  feelsLike: number[];
  humidity: number[];
  pressure: number[];
  windSpeed: number[];
  clouds: number[];
  pop: number[];
  rain: number[];
  snow: number[];
  descriptions: string[];
}

/**
 * Weather provider implementation for OpenWeatherMap API.
 * Requires an API key from https://openweathermap.org/api
 *
 * @example
 * ```ts
 * const client = axios.create({
 *   baseURL: "https://api.openweathermap.org/data/2.5",
 *   params: { appid: "YOUR_API_KEY" }
 * });
 * const provider = new OpenWeatherProvider(client);
 * const weather = await provider.getCurrentWeatherByCity("London");
 * const forecast = await provider.getForecastByCity("London", { days: 5 });
 * ```
 */
export class OpenWeatherProvider implements WeatherProvider {
  readonly metadata: ProviderMetadata = {
    requiresApiKey: true,
    supportsForecast: true,
  };

  /**
   * Creates a new OpenWeatherProvider instance.
   * @param client - Axios instance configured with OpenWeather base URL and API key
   */
  constructor(private client: AxiosInstance) {}

  /**
   * Fetches current weather for a city using OpenWeatherMap API.
   * @param city - City name (e.g., "London", "New York")
   * @param options - Current weather options (raw mode not supported for OpenWeather)
   * @returns Promise resolving to normalized weather data
   */
  async getCurrentWeatherByCity(
    city: string,
    options?: CurrentWeatherOptions
  ): Promise<CurrentWeather | OpenMeteoCurrentWeatherRaw> {
    const response = await this.client.get<OpenWeatherCurrentResponse>(
      "/weather",
      {
        params: { q: city, units: "metric" },
      }
    );

    if (options?.raw) {
      throw new Error("Raw mode is only supported for Open-Meteo provider");
    }

    return this.mapToCurrentWeather(response.data);
  }

  /**
   * Fetches current weather for given coordinates using OpenWeatherMap API.
   * @param coords - Geographic coordinates
   * @param options - Current weather options (raw mode not supported for OpenWeather)
   * @returns Promise resolving to normalized weather data
   */
  async getCurrentWeatherByCoords(
    coords: Coordinates,
    options?: CurrentWeatherOptions
  ): Promise<CurrentWeather | OpenMeteoCurrentWeatherRaw> {
    const response = await this.client.get<OpenWeatherCurrentResponse>(
      "/weather",
      {
        params: {
          lat: coords.latitude,
          lon: coords.longitude,
          units: "metric",
        },
      }
    );

    if (options?.raw) {
      throw new Error("Raw mode is only supported for Open-Meteo provider");
    }

    return this.mapToCurrentWeather(response.data);
  }

  /**
   * Maps OpenWeather API response to the normalized CurrentWeather structure.
   * Converts units to match Open Meteo format for consistency.
   */
  private mapToCurrentWeather(data: OpenWeatherCurrentResponse): CurrentWeather {
    const now = data.dt * 1000;
    const sunrise = data.sys.sunrise * 1000;
    const sunset = data.sys.sunset * 1000;
    const isDay = now >= sunrise && now < sunset;

    // Convert timezone offset (seconds) to timezone string
    const offsetHours = data.timezone / 3600;
    const sign = offsetHours >= 0 ? "+" : "";
    const timezoneAbbrev = `UTC${sign}${offsetHours}`;

    // Convert wind speed from m/s to km/h for consistency with Open Meteo
    const windSpeedKmh = data.wind.speed * 3.6;
    const windGustKmh = data.wind.gust ? data.wind.gust * 3.6 : undefined;

    // Format time to match Open Meteo format (YYYY-MM-DDTHH:MM)
    const formatTime = (timestamp: number) => new Date(timestamp).toISOString().slice(0, 16);

    return {
      // Common fields
      city: data.name,
      temperature: data.main.temp,
      description: data.weather[0].description,
      windSpeed: Math.round(windSpeedKmh * 10) / 10,
      windDirection: data.wind.deg,
      isDay,
      timezone: timezoneAbbrev,
      timezoneAbbreviation: timezoneAbbrev,
      time: formatTime(now),
      units: {
        temperature: "°C",
        windSpeed: "km/h",
        windDirection: "°",
        pressure: "hPa",
        humidity: "%",
        visibility: "m",
      },

      // OpenWeather specific fields
      feelsLike: data.main.feels_like,
      humidity: data.main.humidity,
      pressure: data.main.pressure,
      visibility: data.visibility,
      clouds: data.clouds.all,
      windGust: windGustKmh ? Math.round(windGustKmh * 10) / 10 : undefined,
      sunrise: formatTime(sunrise),
      sunset: formatTime(sunset),
      country: data.sys.country,
      seaLevelPressure: data.main.sea_level,
      groundLevelPressure: data.main.grnd_level,
    };
  }

  /**
   * Fetches forecast for a city using OpenWeatherMap API.
   * Groups 3-hour intervals by date and calculates min/max temperatures.
   * @param city - City name (e.g., "London", "New York")
   * @param options - Forecast options
   * @returns Promise resolving to array of forecast days
   */
  async getForecastByCity(
    city: string,
    options?: ForecastOptions
  ): Promise<ForecastDay[]> {
    const response = await this.client.get<OpenWeatherForecastResponse>(
      "/forecast",
      {
        params: { q: city, units: "metric" },
      }
    );

    return this.aggregateForecast(response.data.list, options?.days ?? 5);
  }

  /**
   * Fetches forecast for given coordinates using OpenWeatherMap API.
   * Groups 3-hour intervals by date and calculates min/max temperatures.
   * @param coords - Geographic coordinates
   * @param options - Forecast options
   * @returns Promise resolving to array of forecast days
   */
  async getForecastByCoords(
    coords: Coordinates,
    options?: ForecastOptions
  ): Promise<ForecastDay[]> {
    const response = await this.client.get<OpenWeatherForecastResponse>(
      "/forecast",
      {
        params: {
          lat: coords.latitude,
          lon: coords.longitude,
          units: "metric",
        },
      }
    );

    return this.aggregateForecast(response.data.list, options?.days ?? 5);
  }

  /**
   * Aggregates 3-hour forecast intervals into daily forecasts.
   * Calculates min/max temperatures, averages for various metrics,
   * and totals for precipitation.
   * @param list - Raw forecast intervals from OpenWeather
   * @param days - Number of days to return
   * @returns Array of daily forecast summaries with aggregated data
   */
  private aggregateForecast(
    list: OpenWeatherForecastResponse["list"],
    days: number
  ): ForecastDay[] {
    // Group by date
    const byDate = new Map<string, DayAggregate>();

    for (const item of list) {
      const date = item.dt_txt.split(" ")[0]; // Extract YYYY-MM-DD

      if (!byDate.has(date)) {
        byDate.set(date, {
          temps: [],
          feelsLike: [],
          humidity: [],
          pressure: [],
          windSpeed: [],
          clouds: [],
          pop: [],
          rain: [],
          snow: [],
          descriptions: [],
        });
      }

      const day = byDate.get(date)!;
      day.temps.push(item.main.temp);
      day.feelsLike.push(item.main.feels_like);
      day.humidity.push(item.main.humidity);
      day.pressure.push(item.main.pressure);
      day.windSpeed.push(item.wind.speed * 3.6); // Convert m/s to km/h
      day.clouds.push(item.clouds.all);
      day.pop.push(item.pop * 100); // Convert 0-1 to percentage (0-100)
      day.rain.push(item.rain?.["3h"] ?? 0);
      day.snow.push(item.snow?.["3h"] ?? 0);
      day.descriptions.push(item.weather[0].description);
    }

    // Helper to calculate average, rounded to 1 decimal
    const avg = (arr: number[]) =>
      arr.length > 0
        ? Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10
        : 0;

    // Helper to calculate sum, rounded to 1 decimal
    const sum = (arr: number[]) =>
      Math.round(arr.reduce((a, b) => a + b, 0) * 10) / 10;

    // Convert to ForecastDay array
    const result: ForecastDay[] = [];

    for (const [date, data] of byDate) {
      if (result.length >= days) break;

      const totalRain = sum(data.rain);
      const totalSnow = sum(data.snow);

      result.push({
        date,
        minTemp: Math.min(...data.temps),
        maxTemp: Math.max(...data.temps),
        description: this.getMostFrequent(data.descriptions),
        avgFeelsLike: avg(data.feelsLike),
        avgHumidity: avg(data.humidity),
        avgPressure: avg(data.pressure),
        avgWindSpeed: avg(data.windSpeed),
        avgClouds: avg(data.clouds),
        maxPop: Math.round(Math.max(...data.pop)),
        totalRain: totalRain > 0 ? totalRain : undefined,
        totalSnow: totalSnow > 0 ? totalSnow : undefined,
      });
    }

    return result;
  }

  /**
   * Gets the most frequent description from an array.
   * Used to pick a representative description for the day.
   */
  private getMostFrequent(descriptions: string[]): string {
    const counts = new Map<string, number>();

    for (const desc of descriptions) {
      counts.set(desc, (counts.get(desc) ?? 0) + 1);
    }

    let maxCount = 0;
    let result = descriptions[0];

    for (const [desc, count] of counts) {
      if (count > maxCount) {
        maxCount = count;
        result = desc;
      }
    }

    return result;
  }
}
