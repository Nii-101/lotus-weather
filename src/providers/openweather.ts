import { AxiosInstance } from "axios";
import {
  CurrentWeather,
  Coordinates,
  WeatherProvider,
  ProviderMetadata,
  ForecastDay,
  ForecastOptions,
} from "../types";

interface OpenWeatherCurrentResponse {
  name: string;
  main: {
    temp: number;
  };
  weather: Array<{
    description: string;
  }>;
}

interface OpenWeatherForecastResponse {
  city: {
    name: string;
  };
  list: Array<{
    dt: number;
    dt_txt: string;
    main: {
      temp: number;
      temp_min: number;
      temp_max: number;
    };
    weather: Array<{
      description: string;
    }>;
  }>;
}

/**
 * Represents aggregated data for a single forecast day.
 */
interface DayAggregate {
  temps: number[];
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
   * @returns Promise resolving to normalized weather data
   */
  async getCurrentWeatherByCity(city: string): Promise<CurrentWeather> {
    const response = await this.client.get<OpenWeatherCurrentResponse>(
      "/weather",
      {
        params: { q: city, units: "metric" },
      }
    );

    return {
      city: response.data.name,
      temperature: response.data.main.temp,
      description: response.data.weather[0].description,
    };
  }

  /**
   * Fetches current weather for given coordinates using OpenWeatherMap API.
   * @param coords - Geographic coordinates
   * @returns Promise resolving to normalized weather data
   */
  async getCurrentWeatherByCoords(coords: Coordinates): Promise<CurrentWeather> {
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

    return {
      city: response.data.name,
      temperature: response.data.main.temp,
      description: response.data.weather[0].description,
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
   * @param list - Raw forecast intervals from OpenWeather
   * @param days - Number of days to return
   * @returns Array of daily forecast summaries
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
        byDate.set(date, { temps: [], descriptions: [] });
      }

      const day = byDate.get(date)!;
      day.temps.push(item.main.temp);
      day.descriptions.push(item.weather[0].description);
    }

    // Convert to ForecastDay array
    const result: ForecastDay[] = [];

    for (const [date, data] of byDate) {
      if (result.length >= days) break;

      result.push({
        date,
        minTemp: Math.min(...data.temps),
        maxTemp: Math.max(...data.temps),
        description: this.getMostFrequent(data.descriptions),
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
