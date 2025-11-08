/**
 * Checks if the json has a top-level key. If it does, types the value at
 * that top-level key as T.
 */
export function typecheck<T>(json: unknown, key: string): T | never {
  if (json === null || typeof json !== "object") {
    throw new Error(
      `Expected non-null object, actual ${json === null ? null : typeof json}`,
    );
  }

  if (!Object.prototype.hasOwnProperty.call(json, key)) {
    const keys = Object.keys(json as Record<string, unknown>);
    throw new Error(`Expected top-level key ${key}, actual keys: ${keys}`);
  }

  return (json as Record<string, unknown>)[key] as T;
}
