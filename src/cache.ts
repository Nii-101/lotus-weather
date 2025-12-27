/**
 * Cache entry with value and expiration time.
 */
interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

/**
 * Default TTL values in milliseconds.
 */
export const DEFAULT_TTL = {
  current: 5 * 60 * 1000, // 5 minutes
  forecast: 30 * 60 * 1000, // 30 minutes
  geocoding: 24 * 60 * 60 * 1000, // 24 hours
} as const;

/**
 * TTL configuration for different cache types.
 */
export interface CacheTTL {
  current?: number;
  forecast?: number;
  geocoding?: number;
}

/**
 * Cache configuration options.
 */
export interface CacheConfig {
  enabled: boolean;
  ttl?: CacheTTL;
}

/**
 * Cache key types for different operations.
 */
export type CacheKeyType = "current" | "forecast" | "geocoding";

/**
 * In-memory cache with TTL support.
 * Never caches errors - only successful responses.
 */
export class Cache {
  private store = new Map<string, CacheEntry<unknown>>();
  private ttl: Required<CacheTTL>;

  constructor(config?: CacheTTL) {
    this.ttl = {
      current: config?.current ?? DEFAULT_TTL.current,
      forecast: config?.forecast ?? DEFAULT_TTL.forecast,
      geocoding: config?.geocoding ?? DEFAULT_TTL.geocoding,
    };
  }

  /**
   * Generates a cache key from components.
   * Format: <provider>:<method>:<location>:<options>
   */
  static createKey(
    provider: string,
    method: CacheKeyType,
    location: string,
    options?: string
  ): string {
    const parts = [provider, method, location.toLowerCase().trim()];
    if (options) {
      parts.push(options);
    }
    return parts.join(":");
  }

  /**
   * Retrieves a value from cache if it exists and hasn't expired.
   */
  get<T>(key: string): T | undefined {
    const entry = this.store.get(key) as CacheEntry<T> | undefined;

    if (!entry) {
      return undefined;
    }

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }

    return entry.value;
  }

  /**
   * Stores a value in cache with the appropriate TTL.
   * @param key - Cache key
   * @param value - Value to cache (must be a successful response, never an error)
   * @param type - Type of cache entry (determines TTL)
   */
  set<T>(key: string, value: T, type: CacheKeyType): void {
    const ttl = this.ttl[type];
    this.store.set(key, {
      value,
      expiresAt: Date.now() + ttl,
    });
  }

  /**
   * Checks if a key exists and is not expired.
   */
  has(key: string): boolean {
    return this.get(key) !== undefined;
  }

  /**
   * Removes a specific key from cache.
   */
  delete(key: string): boolean {
    return this.store.delete(key);
  }

  /**
   * Clears all entries from cache.
   */
  clear(): void {
    this.store.clear();
  }

  /**
   * Returns the number of entries in cache (including expired).
   */
  get size(): number {
    return this.store.size;
  }
}
