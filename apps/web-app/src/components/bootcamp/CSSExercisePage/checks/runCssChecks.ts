import {
  elementHasProperty,
  elementHasPropertyValue,
} from "./css/elementHasProperty";
import { onlyPropertyGroupsUsed } from "./css/onlyPropertyGroupsUsed";
import { onlyPropertiesUsed } from "./css/onlyPropertiesUsed";
import { illegalPropertiesUsed } from "./css/illegalPropertiesUsed";
import { Check, ChecksResult, runChecks } from "./runChecks";

// Type-safe wrapper functions to match the expected signature
const cssCheckFunctions: Record<string, (...args: unknown[]) => unknown> = {
  elementHasProperty: (css: unknown, ...args: unknown[]) => {
    if (typeof css !== "string") throw new Error("CSS must be a string");
    const [selector, property] = args as [string, string];
    return elementHasProperty(css, selector, property);
  },
  elementHasPropertyValue: (css: unknown, ...args: unknown[]) => {
    if (typeof css !== "string") throw new Error("CSS must be a string");
    const [selector, property, value] = args as [string, string, string];
    return elementHasPropertyValue(css, selector, property, value);
  },
  onlyPropertyGroupsUsed: (css: unknown, ...args: unknown[]) => {
    if (typeof css !== "string") throw new Error("CSS must be a string");
    const [allowed] = args as [string[]];
    return onlyPropertyGroupsUsed(css, allowed);
  },
  onlyPropertiesUsed: (css: unknown, ...args: unknown[]) => {
    if (typeof css !== "string") throw new Error("CSS must be a string");
    const [allowed] = args as [string[]];
    return onlyPropertiesUsed(css, allowed);
  },
  illegalPropertiesUsed: (css: unknown, ...args: unknown[]) => {
    if (typeof css !== "string") throw new Error("CSS must be a string");
    const [allowed] = args as [string[]];
    return illegalPropertiesUsed(css, allowed);
  },
};

export async function runCssChecks(
  checks: Check[],
  cssValue: string
): Promise<ChecksResult> {
  return await runChecks(checks, cssValue, cssCheckFunctions);
}
