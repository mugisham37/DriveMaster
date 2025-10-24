// Simple string check function
function isString(value: unknown): value is string {
  return typeof value === 'string'
}

import { genericSetupFunctions } from './genericSetupFunctions'

export function parseArgs(args: unknown[]) {
  return args.map((elem) => {
    if (!isString(elem)) {
      return elem
    }
    if (!(elem.startsWith('setup.') && elem.endsWith(')'))) {
      return elem
    }

    // Wild dark magic
    return new Function('setup', `"use strict"; return (${elem});`)(
      genericSetupFunctions
    )
  })
}
