# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] - 2025-12-29

### Added

- **Expanded CurrentWeather Response**: The `CurrentWeather` interface now includes comprehensive weather data:
  - **Common fields** (available from all providers):
    - `windSpeed` - Wind speed in km/h
    - `windDirection` - Wind direction in degrees (0-360)
    - `isDay` - Whether it's currently daytime
    - `timezone` - Timezone identifier
    - `timezoneAbbreviation` - Timezone abbreviation
    - `time` - Timestamp of the weather reading
    - `units` - Object containing measurement units
  - **Open Meteo specific**:
    - `elevation` - Elevation in meters above sea level
  - **OpenWeather specific**:
    - `feelsLike` - Feels like temperature
    - `humidity` - Humidity percentage
    - `pressure` - Atmospheric pressure
    - `visibility` - Visibility in meters
    - `clouds` - Cloud coverage percentage
    - `windGust` - Wind gust speed
    - `sunrise` / `sunset` - Sunrise and sunset times
    - `country` - Country code
    - `seaLevelPressure` / `groundLevelPressure` - Pressure at sea and ground level

- **Raw API Response Option**: New `raw` parameter in `CurrentWeatherOptions` allows direct API responses:
  ```typescript
  const raw = await weather.getCurrentWeather("London", { raw: true });
  ```
  - Returns the untransformed Open-Meteo API response
  - Useful for advanced use cases requiring full API access
  - Only supported for Open-Meteo provider

- **Expanded ForecastDay Response**: The `ForecastDay` interface now includes additional aggregated data when using OpenWeather:
  - `avgFeelsLike` - Average feels-like temperature for the day
  - `avgHumidity` - Average humidity percentage
  - `avgPressure` - Average atmospheric pressure
  - `avgWindSpeed` - Average wind speed (km/h)
  - `avgClouds` - Average cloud coverage
  - `maxPop` - Maximum probability of precipitation (0-100%)
  - `totalRain` / `totalSnow` - Total precipitation accumulation (mm)

- **New Exported Types**:
  - `CurrentWeatherOptions` - Options for current weather requests
  - `CurrentWeatherUnits` - Units for weather measurements
  - `OpenMeteoCurrentWeatherRaw` - Type definition for raw Open-Meteo responses

### Changed

- **Consistent Wind Speed Units**: Both providers now return wind speed in km/h for consistency
  - OpenWeather responses are automatically converted from m/s to km/h
- **Standardized Time Format**: All timestamps now use ISO 8601 format (YYYY-MM-DDTHH:MM)
- **Updated Method Signatures**:
  - `getCurrentWeather()` now accepts optional `CurrentWeatherOptions` parameter
  - `getWeatherByCoords()` now accepts optional `CurrentWeatherOptions` parameter

## [0.1.3] - 2025-12-28

### Fixed

- Updated variable names for consistency in usage examples

## [0.1.2] - 2025-12-28

### Added

- Package metadata: repository, homepage, and bugs URLs in package.json

## [0.1.1] - 2025-12-28

### Fixed

- Initial bug fixes and improvements

## [0.1.0] - 2025-12-28

### Added

- Initial release
- Multi-provider support (Open-Meteo and OpenWeatherMap)
- Current weather and forecast endpoints
- Weather by city name and coordinates
- In-memory caching with configurable TTL
- Automatic fallback provider on transient errors
- TypeScript type definitions
- Comprehensive error handling with `WeatherError` class
- Weather code to description mapping for Open-Meteo
