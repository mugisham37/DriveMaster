import UAParser from 'ua-parser-js'

// Remove the conflicting global declaration as it's already defined in lib.es2022.regexp.d.ts

export function areAllRegExpFeaturesSupported(): boolean {
  try {
    const lookbehindAssertionsTest = new RegExp('(?<=a)b')
    if ('ab'.search(lookbehindAssertionsTest) === -1) return false
  } catch (e) {
    console.log('Lookbehind is not supported:', e)
    return false
  }

  return true
}

function compareVersions(versionA: string, versionB: string): number {
  const partsA = versionA.split('.').map(Number)
  const partsB = versionB.split('.').map(Number)

  for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
    const partA = partsA[i] || 0
    const partB = partsB[i] || 0

    if (partA > partB) {
      return 1
    } else if (partA < partB) {
      return -1
    }
  }

  return 0
}

export function isLookbehindSupported(): boolean {
  const parser = new (UAParser as unknown as { new(): { getBrowser(): { name?: string; version?: string } } })()
  const browser = parser.getBrowser()

  switch (browser.name) {
    case 'IE':
    case 'Opera mini':
      return false
    case 'Chrome': {
      if (browser.version) return compareVersions(browser.version, '62') >= 0
    }
    case 'Edge': {
      if (browser.version) return compareVersions(browser.version, '79') >= 0
    }
    case 'Firefox': {
      if (browser.version) return compareVersions(browser.version, '78') >= 0
    }
    case 'Safari': {
      if (browser.version) return compareVersions(browser.version, '16.4') >= 0
    }
    case 'Mobile Safari': {
      if (browser.version) return compareVersions(browser.version, '16.4') >= 0
    }
    case 'Opera': {
      if (browser.version) return compareVersions(browser.version, '49') >= 0
    }
    case 'Opera Mobile': {
      if (browser.version) return compareVersions(browser.version, '80') >= 0
    }
    case 'Samsung Internet': {
      if (browser.version) return compareVersions(browser.version, '8.2') >= 0
    }
    case 'UCBrowser': {
      if (browser.version) return compareVersions(browser.version, '15.5') >= 0
    }
    case 'Android Browser': {
      if (browser.version) return compareVersions(browser.version, '124') >= 0
    }
    case 'QQ Browser': {
      if (browser.version) return compareVersions(browser.version, '14.9') >= 0
    }
    case 'Baidu Browser': {
      if (browser.version) return compareVersions(browser.version, '13.52') >= 0
    }
    case 'KaiOS Browser': {
      if (browser.version) return compareVersions(browser.version, '3.1') >= 0
    }
    default:
      return true
  }
}
