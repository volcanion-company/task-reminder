/**
 * Request deduplication utility
 * Prevents duplicate API calls by caching in-flight requests
 */

interface CacheEntry<T> {
  promise: Promise<T>;
  timestamp: number;
}

class RequestDeduplicator {
  private cache = new Map<string, CacheEntry<any>>();
  private defaultTTL = 1000; // 1 second

  /**
   * Execute a request with deduplication
   * If the same request is already in flight, return the existing promise
   * If a recent result exists (within TTL), return cached promise
   * 
   * @param key - Unique identifier for the request
   * @param fetcher - Function that performs the actual request
   * @param ttl - Time to live for cached result in milliseconds
   * @returns Promise with the result
   */
  async fetch<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl: number = this.defaultTTL
  ): Promise<T> {
    const now = Date.now();
    const cached = this.cache.get(key);

    // Return cached promise if still valid
    if (cached && (now - cached.timestamp) < ttl) {
      return cached.promise;
    }

    // Create new request
    const promise = fetcher()
      .then(result => {
        // Keep successful result in cache for TTL
        setTimeout(() => {
          const entry = this.cache.get(key);
          if (entry && entry.promise === promise) {
            this.cache.delete(key);
          }
        }, ttl);
        return result;
      })
      .catch(error => {
        // Remove failed requests immediately
        const entry = this.cache.get(key);
        if (entry && entry.promise === promise) {
          this.cache.delete(key);
        }
        throw error;
      });

    this.cache.set(key, { promise, timestamp: now });
    return promise;
  }

  /**
   * Invalidate a specific cache entry
   */
  invalidate(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Invalidate all cache entries matching a pattern
   */
  invalidatePattern(pattern: RegExp): void {
    for (const key of this.cache.keys()) {
      if (pattern.test(key)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Clear all cached requests
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}

// Singleton instance
export const requestDeduplicator = new RequestDeduplicator();

/**
 * Helper function for deduplicating requests
 * @example
 * const tasks = await dedupedRequest('tasks:all', () => fetchTasksAPI());
 */
export async function dedupedRequest<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl?: number
): Promise<T> {
  return requestDeduplicator.fetch(key, fetcher, ttl);
}

/**
 * Helper to generate cache keys
 */
export function generateCacheKey(resource: string, params?: Record<string, any>): string {
  if (!params || Object.keys(params).length === 0) {
    return resource;
  }
  const sortedParams = Object.keys(params)
    .sort()
    .map(k => `${k}=${JSON.stringify(params[k])}`)
    .join('&');
  return `${resource}?${sortedParams}`;
}
