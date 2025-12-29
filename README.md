# LotusWeather

A TypeScript SDK for fetching weather data from multiple providers with a unified interface.

## Features

- **Multiple Providers**: Support for OpenWeatherMap and Open-Meteo APIs
- **Forecast Support**: Get multi-day weather forecasts
- **Coordinates Support**: Fetch weather by latitude/longitude
- **Optional Caching**: In-memory caching with configurable TTL
- **Optional Fallback**: Automatic failover on transient errors
- **TypeScript First**: Full type definitions included
- **Zero Config Option**: Open-Meteo requires no API key
- **Robust Error Handling**: Clear, consistent error messages

## Installation

```bash
npm install lotus-weather
```

## Quick Start

```typescript
import { LotusWeather } from "lotus-weather";

// Using Open-Meteo (free, no API key required)
const weather = new LotusWeather({ provider: "open-meteo" });

// Get current weather (opinionated, structured response)
const current = await weather.getCurrentWeather("London");
console.log(current);
// {
//   city: "London",
//   temperature: 15,
//   description: "Partly cloudy",
//   windSpeed: 12.5,
//   windDirection: 180,
//   isDay: true,
//   timezone: "GMT",
//   elevation: 25,
//   time: "2025-01-15T14:30",
//   units: { temperature: "°C", windSpeed: "km/h", windDirection: "°" }
// }

// Get raw API response (for advanced use cases)
const raw = await weather.getCurrentWeather("London", { raw: true });
console.log(raw); // Direct Open-Meteo API response

// Get 5-day forecast
const forecast = await weather.getForecast("London");
console.log(forecast);
// [{ date: "2025-01-15", minTemp: 8, maxTemp: 14, description: "Partly cloudy" }, ...]
```

## Providers

### Open-Meteo

Open-Meteo is a free weather API that requires no API key.

```typescript
const weather = new LotusWeather({
  provider: "open-meteo"
});

const current = await weather.getCurrentWeather("Tokyo");
const forecast = await weather.getForecast("Tokyo", { days: 7 });
```

**Characteristics:**
- No API key required
- Automatic geocoding (city name to coordinates)
- Weather codes converted to human-readable descriptions

### OpenWeatherMap

OpenWeatherMap requires an API key from [https://openweathermap.org/api](https://openweathermap.org/api).

```typescript
const weather = new LotusWeather({
  provider: "openweather",
  apiKey: "your-api-key-here"
});

const current = await weather.getCurrentWeather("New York");
const forecast = await weather.getForecast("New York", { days: 5 });
```

**Characteristics:**
- Requires API key
- Accepts city names directly
- Returns descriptive weather text from the API

## API Reference

### LotusWeather

The main class for interacting with weather data.

#### Constructor

```typescript
new LotusWeather(config: LotusWeatherConfig)
```

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `config.provider` | `"openweather"` \| `"open-meteo"` | Yes | The weather data provider to use |
| `config.apiKey` | `string` | Conditional | Required for OpenWeather |
| `config.fallbackProvider` | `"openweather"` \| `"open-meteo"` | No | Fallback provider for resilience |
| `config.cache` | `CacheConfig` | No | Caching configuration |

**Throws:**
- `WeatherError` if configuration is invalid

#### Methods

##### getCurrentWeather(city: string, options?: CurrentWeatherOptions): Promise\<CurrentWeather | OpenMeteoCurrentWeatherRaw\>

Fetches current weather data for a specified city.

```typescript
// Get opinionated response (default)
const current = await weather.getCurrentWeather("Paris");
// Returns rich CurrentWeather object with all available fields

// Get raw API response (Open Meteo only)
const raw = await weather.getCurrentWeather("Paris", { raw: true });
// Returns direct API response without transformation
```

##### getWeatherByCoords(coords: { lat: number; lon: number }, options?: CurrentWeatherOptions): Promise\<CurrentWeather | OpenMeteoCurrentWeatherRaw\>

Fetches current weather data for geographic coordinates.

```typescript
const data = await weather.getWeatherByCoords({ lat: 51.5074, lon: -0.1278 });
// Returns rich CurrentWeather object
```

##### getForecast(city: string, options?: ForecastOptions): Promise\<ForecastDay[]\>

Fetches multi-day weather forecast for a city.

```typescript
const forecast = await weather.getForecast("Berlin", { days: 7 });
// [{ date: "2025-01-15", minTemp: 2, maxTemp: 8, description: "Cloudy" }, ...]
```

##### clearCache(): void

Clears all cached data. Only has effect if caching is enabled.

```typescript
weather.clearCache();
```

### Types

#### CurrentWeather

LotusWeather provides a rich, unified response structure with both common fields (available from all providers) and provider-specific fields.

```typescript
interface CurrentWeather {
  // === Common fields (available from all providers) ===
  city: string;                    // The city name or coordinates string
  temperature: number;             // Temperature value
  description: string;             // Human-readable weather description
  windSpeed: number;               // Wind speed in km/h
  windDirection: number;           // Wind direction in degrees (0-360)
  isDay: boolean;                  // Whether it's currently daytime
  timezone: string;                // Timezone identifier (e.g., "GMT", "UTC+2")
  timezoneAbbreviation: string;    // Timezone abbreviation
  time: string;                    // Timestamp (YYYY-MM-DDTHH:MM format)
  units: CurrentWeatherUnits;      // Units for measurements

  // === Open Meteo specific fields ===
  elevation?: number;              // Elevation in meters above sea level

  // === OpenWeather specific fields ===
  feelsLike?: number;              // Feels like temperature
  humidity?: number;               // Humidity percentage (0-100)
  pressure?: number;               // Atmospheric pressure in hPa
  visibility?: number;             // Visibility in meters
  clouds?: number;                 // Cloud coverage percentage (0-100)
  windGust?: number;               // Wind gust speed in km/h
  sunrise?: string;                // Sunrise time (ISO format)
  sunset?: string;                 // Sunset time (ISO format)
  country?: string;                // Country code
  seaLevelPressure?: number;       // Pressure at sea level in hPa
  groundLevelPressure?: number;    // Pressure at ground level in hPa
}

interface CurrentWeatherUnits {
  temperature: string;    // e.g., "°C"
  windSpeed: string;      // e.g., "km/h"
  windDirection: string;  // e.g., "°"
  pressure?: string;      // e.g., "hPa" (OpenWeather only)
  humidity?: string;      // e.g., "%" (OpenWeather only)
  visibility?: string;    // e.g., "m" (OpenWeather only)
}
```

#### ForecastDay

Forecast data includes common fields from all providers and additional aggregated data when using OpenWeather.

```typescript
interface ForecastDay {
  // === Common fields (available from all providers) ===
  date: string;             // Date in ISO format (YYYY-MM-DD)
  minTemp: number;          // Minimum temperature in Celsius
  maxTemp: number;          // Maximum temperature in Celsius
  description: string;      // Most frequent weather description of the day

  // === OpenWeather specific fields ===
  avgFeelsLike?: number;    // Average feels-like temperature (°C)
  avgHumidity?: number;     // Average humidity (%)
  avgPressure?: number;     // Average atmospheric pressure (hPa)
  avgWindSpeed?: number;    // Average wind speed (km/h)
  avgClouds?: number;       // Average cloud coverage (%)
  maxPop?: number;          // Max probability of precipitation (0-100%)
  totalRain?: number;       // Total rain accumulation (mm)
  totalSnow?: number;       // Total snow accumulation (mm)
}
```

#### LotusWeatherConfig

```typescript
interface LotusWeatherConfig {
  provider: "openweather" | "open-meteo";
  apiKey?: string;
  fallbackProvider?: "openweather" | "open-meteo";
  cache?: {
    enabled: boolean;
    ttl?: {
      current?: number;   // TTL for current weather (default: 5 min)
      forecast?: number;  // TTL for forecasts (default: 30 min)
      geocoding?: number; // TTL for geocoding (default: 24 hours)
    };
  };
}
```

#### CurrentWeatherOptions

```typescript
interface CurrentWeatherOptions {
  raw?: boolean;  // When true, returns raw API response (Open Meteo only)
}
```

#### Coordinates

```typescript
interface Coordinates {
  latitude: number;
  longitude: number;
}
```

#### WeatherError

Custom error class for all SDK errors.

```typescript
class WeatherError extends Error {
  name: "WeatherError";
  cause?: Error;  // Original error if available
}
```

## Raw API Response

For advanced use cases where you need the exact API response from Open-Meteo, use the `raw` option:

```typescript
const weather = new LotusWeather({ provider: "open-meteo" });

// Get raw Open-Meteo API response
const raw = await weather.getCurrentWeather("London", { raw: true });
console.log(raw);
// {
//   latitude: 51.5,
//   longitude: -0.12,
//   generationtime_ms: 0.1,
//   utc_offset_seconds: 0,
//   timezone: "GMT",
//   timezone_abbreviation: "GMT",
//   elevation: 25.0,
//   current_weather_units: { ... },
//   current_weather: { ... }
// }
```

**Note:** Raw mode is only supported for the Open-Meteo provider. Using `raw: true` with OpenWeather will throw an error.

## Caching

Enable in-memory caching to reduce API calls and improve performance.

```typescript
const weather = new LotusWeather({
  provider: "open-meteo",
  cache: {
    enabled: true,
    ttl: {
      current: 5 * 60 * 1000,      // 5 minutes
      forecast: 30 * 60 * 1000,    // 30 minutes
      geocoding: 24 * 60 * 60 * 1000 // 24 hours
    }
  }
});
```

**Default TTL values:**
- Current weather: 5 minutes
- Forecast: 30 minutes
- Geocoding: 24 hours

**Cache behavior:**
- Only successful responses are cached
- Errors are never cached
- Each SDK instance has its own cache (no shared state)
- Cache is in-memory only (not persisted)

## Fallback Provider

Configure a fallback provider for resilience. The fallback is used when the primary provider fails with transient errors.

```typescript
const weather = new LotusWeather({
  provider: "open-meteo",
  fallbackProvider: "openweather",
  apiKey: "your-openweather-key" // Required for OpenWeather fallback
});
```

**Fallback triggers (transient errors):**
- Network errors (connection refused, timeout)
- Rate limit errors (HTTP 429)
- Server errors (HTTP 5xx)

**Fallback does NOT trigger for:**
- City not found (HTTP 404)
- Invalid API key (HTTP 401)
- Bad request (HTTP 400)
- Any input validation error

This ensures fallback is for infrastructure reliability, not masking user errors.

## Error Handling

All errors are wrapped in `WeatherError` with clear messages.

```typescript
import { LotusWeather, WeatherError } from "lotus-weather";

const weather = new LotusWeather({ provider: "open-meteo" });

try {
  const data = await weather.getCurrentWeather("InvalidCityName123");
} catch (error) {
  if (error instanceof WeatherError) {
    console.error(error.message); // "City not found: InvalidCityName123"
    console.error(error.cause);   // Original error if available
  }
}
```

**Common error messages:**
- `"City not found: <city>"`
- `"Invalid API key"`
- `"Rate limit exceeded"`
- `"Provider service unavailable"`
- `"Unable to connect to weather service"`
- `"Request timed out"`

## Examples

### Basic Usage

```typescript
import { LotusWeather } from "lotus-weather";

async function getWeather() {
  const weather = new LotusWeather({ provider: "open-meteo" });

  const current = await weather.getCurrentWeather("Paris");
  console.log(`Temperature in ${current.city}: ${current.temperature}C`);
  console.log(`Conditions: ${current.description}`);

  const forecast = await weather.getForecast("Paris", { days: 5 });
  forecast.forEach(day => {
    console.log(`${day.date}: ${day.minTemp}C - ${day.maxTemp}C, ${day.description}`);
  });
}
```

### With Caching and Fallback

```typescript
import { LotusWeather } from "lotus-weather";

const weather = new LotusWeather({
  provider: "open-meteo",
  fallbackProvider: "openweather",
  apiKey: process.env.OPENWEATHER_API_KEY,
  cache: { enabled: true }
});

// First call fetches from API
const result1 = await weather.getCurrentWeather("London");

// Second call returns cached result
const result2 = await weather.getCurrentWeather("London");

// Clear cache when needed
weather.clearCache();
```

### Weather by Coordinates

```typescript
import { LotusWeather } from "lotus-weather";

const weather = new LotusWeather({ provider: "open-meteo" });

// Get weather for specific coordinates
const data = await weather.getWeatherByCoords({
  lat: 5.6037,
  lon: -0.1870
});
console.log(data); // Weather for Accra, Ghana
```

### Multiple Cities

```typescript
import { LotusWeather } from "lotus-weather";

const weather = new LotusWeather({
  provider: "open-meteo",
  cache: { enabled: true }
});

const cities = ["London", "Paris", "Tokyo", "New York", "Sydney"];

const results = await Promise.all(
  cities.map(city => weather.getCurrentWeather(city))
);

results.forEach(data => {
  console.log(`${data.city}: ${data.temperature}C - ${data.description}`);
});
```

## Weather Codes (Open-Meteo)

When using Open-Meteo, numeric weather codes are automatically converted to descriptions:

| Code | Description |
|------|-------------|
| 0 | Clear sky |
| 1 | Mainly clear |
| 2 | Partly cloudy |
| 3 | Overcast |
| 45, 48 | Fog |
| 51, 53, 55 | Drizzle (light to dense) |
| 56, 57 | Freezing drizzle |
| 61, 63, 65 | Rain (slight to heavy) |
| 66, 67 | Freezing rain |
| 71, 73, 75 | Snow fall (slight to heavy) |
| 77 | Snow grains |
| 80, 81, 82 | Rain showers |
| 85, 86 | Snow showers |
| 95 | Thunderstorm |
| 96, 99 | Thunderstorm with hail |

## Architecture

LotusWeather uses a provider pattern with clean separation of concerns:

```
LotusWeather (orchestrator)
├── Config validation (fail early)
├── Cache (optional, per-instance)
│   └── In-memory store with TTL
├── Primary Provider
│   └── OpenMeteo | OpenWeather
├── Fallback Provider (optional)
│   └── OpenMeteo | OpenWeather
└── Error wrapping (WeatherError)
```

**Responsibilities:**
- **Providers**: Fetch and normalize data only
- **LotusWeather**: Orchestration, caching, fallback, error wrapping
- **Cache**: Independent, reusable utility
- No provider knows about caching or fallback

## License

This project is licensed under the MIT License.

```
MIT License

Copyright (c) 2025 Nii Odartey Edem Lamptey

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
