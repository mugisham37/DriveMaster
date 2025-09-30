import { CacheManager } from './cache-manager'
import { CacheOptions, CacheLayer } from './types'

export interface CacheDecoratorOptions extends CacheOptions {
  keyGenerator?: (...args: any[]) => string
  condition?: (...args: any[]) => boolean
}

export function Cacheable(options: CacheDecoratorOptions = {}) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value
    const cacheManager = new CacheManager()

    descriptor.value = async function (...args: any[]) {
      // Check condition if provided
      if (options.condition && !options.condition.apply(this, args)) {
        return method.apply(this, args)
      }

      // Generate cache key
      const key = options.keyGenerator
        ? options.keyGenerator.apply(this, args)
        : `${target.constructor.name}:${propertyName}:${JSON.stringify(args)}`

      // Try to get from cache
      const cached = await cacheManager.get(key, options)
      if (cached !== null) {
        return cached
      }

      // Execute method and cache result
      const result = await method.apply(this, args)
      await cacheManager.set(key, result, options)

      return result
    }

    return descriptor
  }
}

export function CacheEvict(options: { key?: string; pattern?: string; tags?: string[] } = {}) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value
    const cacheManager = new CacheManager()

    descriptor.value = async function (...args: any[]) {
      const result = await method.apply(this, args)

      // Invalidate cache
      if (options.key) {
        await cacheManager.delete(options.key)
      }

      if (options.pattern || options.tags) {
        await cacheManager.invalidate({
          pattern: options.pattern,
          tags: options.tags,
        })
      }

      return result
    }

    return descriptor
  }
}

export function CachePut(options: CacheDecoratorOptions = {}) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value
    const cacheManager = new CacheManager()

    descriptor.value = async function (...args: any[]) {
      const result = await method.apply(this, args)

      // Generate cache key
      const key = options.keyGenerator
        ? options.keyGenerator.apply(this, args)
        : `${target.constructor.name}:${propertyName}:${JSON.stringify(args)}`

      // Always update cache with new result
      await cacheManager.set(key, result, options)

      return result
    }

    return descriptor
  }
}

// Method-level cache configuration
export function CacheConfig(config: Partial<CacheDecoratorOptions>) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    // Store cache config as metadata for the method
    Reflect.defineMetadata('cache:config', config, target, propertyName)
    return descriptor
  }
}

// Class-level cache configuration
export function CacheEnabled(defaultOptions: CacheDecoratorOptions = {}) {
  return function <T extends { new (...args: any[]): {} }>(constructor: T) {
    return class extends constructor {
      private static cacheManager = new CacheManager()

      static getCacheManager(): CacheManager {
        return this.cacheManager
      }
    }
  }
}
