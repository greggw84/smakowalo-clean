// Cache system for OpenCart API data
interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number
}

class InMemoryCache {
  private cache = new Map<string, CacheEntry<any>>()
  private defaultTTL = Number.parseInt(process.env.CACHE_TTL || '3600') * 1000 // Convert to milliseconds

  set<T>(key: string, data: T, ttl?: number): void {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL
    }
    this.cache.set(key, entry)

    // Auto-cleanup expired entries
    setTimeout(() => {
      this.delete(key)
    }, entry.ttl)
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key)

    if (!entry) {
      return null
    }

    const isExpired = Date.now() - entry.timestamp > entry.ttl
    if (isExpired) {
      this.cache.delete(key)
      return null
    }

    return entry.data as T
  }

  delete(key: string): void {
    this.cache.delete(key)
  }

  clear(): void {
    this.cache.clear()
  }

  // Get cache statistics
  getStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
      totalMemory: JSON.stringify(Array.from(this.cache.entries())).length
    }
  }
}

// Singleton cache instance
const cache = new InMemoryCache()

// Cache wrapper for OpenCart API calls
export async function withCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl?: number
): Promise<T> {
  const cacheEnabled = process.env.ENABLE_CACHE === 'true'

  if (!cacheEnabled) {
    return fetcher()
  }

  // Try to get from cache first
  const cached = cache.get<T>(key)
  if (cached) {
    console.log(`🎯 Cache HIT for key: ${key}`)
    return cached
  }

  console.log(`💾 Cache MISS for key: ${key} - fetching fresh data`)

  try {
    const data = await fetcher()
    cache.set(key, data, ttl)
    return data
  } catch (error) {
    console.error(`❌ Cache fetch error for key ${key}:`, error)
    throw error
  }
}

// Cache utilities for OpenCart endpoints
export const cacheKeys = {
  product: (id: string) => `opencart:product:${id}`,
  products: (params: string) => `opencart:products:${params}`,
  categories: () => 'opencart:categories',
  recipe: (id: string) => `opencart:recipe:${id}`,
  menu: (filters: string) => `opencart:menu:${filters}`
}

// Cache invalidation helpers
export function invalidateCache(pattern: string) {
  const stats = cache.getStats()
  const keysToDelete = stats.keys.filter(key => key.includes(pattern))

  keysToDelete.forEach(key => {
    cache.delete(key)
    console.log(`🗑️ Invalidated cache key: ${key}`)
  })

  return keysToDelete.length
}

// Preload cache with popular data
export async function preloadCache() {
  console.log('🚀 Preloading cache with popular data...')

  try {
    // This would typically preload popular products, categories, etc.
    // For now, we'll just log that preloading is available
    const stats = cache.getStats()
    console.log('📊 Cache stats after preload:', stats)
  } catch (error) {
    console.error('❌ Cache preload error:', error)
  }
}

export { cache }
export default cache
