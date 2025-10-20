/**
 * Utility function to camelize object keys with type safety
 * This is used throughout the component registry for data transformation
 */

import { camelizeKeys } from 'humps'

/**
 * Camelizes object keys and provides type safety
 * @param obj - Object to camelize
 * @returns Camelized object with proper typing
 */
export function camelizeKeysAs<T>(obj: any): T {
  return camelizeKeys(obj) as T
}

export default camelizeKeysAs