import type { ExecutionContext } from '@/lib/interpreter/executor'
import { Exercise } from '../Exercise'
import * as Jiki from '@/lib/interpreter/jikiObjects'
import { genericSetupFunctions } from '../../test-runner/generateAndRunTestSuite/genericSetupFunctions'

export default class DataExercise extends Exercise {
  public static override hasView = false

  public constructor() {
    super()
  }

  public override getState() {
    return {}
  }

  private fetchData(
    executionCtx: ExecutionContext,
    url: Jiki.JikiString,
    params: Jiki.JikiDictionary
  ): Jiki.JikiDictionary {
    if (!(url instanceof Jiki.JikiString)) {
      executionCtx.logicError('URL must be a string')
      return new Jiki.JikiDictionary({ error: 'URL must be a string' })
    }
    if (!(params instanceof Jiki.JikiDictionary)) {
      executionCtx.logicError('Params must be a dictionary')
      return new Jiki.JikiDictionary({ error: 'Params must be a dictionary' })
    }

    if (url.value == 'https://myllm.com/api/v2/qanda') {
      return this.llmRequest(executionCtx, params)
    }
    if (url.value == 'https://timeapi.io/api/time/current/city') {
      return this.timeRequest(executionCtx, params)
    }
    if (url.value.startsWith('https://api.spotify.com/v1/users/')) {
      return this.spotifyUserRequest(executionCtx, url.value)
    }
    if (url.value.startsWith('https://api.spotify.com/v1/artists/')) {
      return this.spotifyArtistRequest(executionCtx, url.value)
    }
    if (url.value.startsWith('https://api.school.com/')) {
      return this.gradesRequest(executionCtx, url.value)
    } else {
      return new Jiki.JikiDictionary({ error: 'Unknown URL' })
    }
  }

  private gradesRequest(
    executionCtx: ExecutionContext,
    url: string
  ): Jiki.JikiDictionary {
    if (url == 'https://api.school.com/v4/grades/2025/class-6') {
      return new Jiki.JikiDictionary({
        data: {
          teacher: 'miss joseph',
          grades: ['A', 'A', 'A', 'A', 'A', 'A'],
        },
      })
    } else if (url == 'https://api.school.com/v3/grades/2024/class-7') {
      return new Jiki.JikiDictionary({
        data: {
          teacher: 'mr omar',
          grades: 'BBBBBBBBBBBB',
        },
      })
    } else if (url == 'https://api.school.com/v3/grades/2024/class-2') {
      return new Jiki.JikiDictionary({
        data: {
          teacher: 'dr li',
          grades: 'BBDEAACADEDFFA',
        },
      })
    } else if (url == 'https://api.school.com/v4/grades/2025/class-9') {
      return new Jiki.JikiDictionary({
        data: {
          teacher: 'mrs bankole',
          grades: [
            'D',
            'D',
            'D',
            'F',
            'F',
            'F',
            'E',
            'E',
            'A',
            'B',
            'C',
            'A',
            'A',
            'C',
            'D',
          ],
        },
      })
    } else if (url == 'https://api.school.com/v3/grades/2024/class-3') {
      return new Jiki.JikiDictionary({
        data: {
          teacher: `${genericSetupFunctions.randomHonorific()} perez espinosa`,
          grades: 'DABAAECD',
        },
      })
    }
    executionCtx.logicError('Data not found')
    return new Jiki.JikiDictionary({ error: 'Data not found.' })
  }

  private timeRequest(
    executionCtx: ExecutionContext,
    params: Jiki.JikiDictionary
  ): Jiki.JikiDictionary {
    const cityValue = params.value['city']
    if (!cityValue) {
      executionCtx.logicError('Please specify a city')
      return new Jiki.JikiDictionary({ error: 'Please specify a city' })
    }
    
    // Extract the actual city string value
    const city = typeof cityValue === 'object' && cityValue && 'value' in cityValue 
      ? (cityValue as Jiki.JikiObject).value 
      : cityValue
    if (city == 'Amsterdam') {
      return new Jiki.JikiDictionary({
        year: 2025,
        month: 3,
        day: 3,
        hour: 0,
        minute: 28,
        seconds: 27,
        milliSeconds: 342,
        dateTime: '2025-03-03T00:28:27.3427549',
        date: '03/03/2025',
        time: '00:28',
        timeZone: 'Amsterdam',
        dayOfWeek: 'Monday',
        dstActive: false,
      })
    } else if (city == 'Amsterdam') {
      return new Jiki.JikiDictionary({
        year: 2025,
        month: 3,
        day: 3,
        hour: 8,
        minute: 39,
        seconds: 6,
        milliSeconds: 766,
        dateTime: '2025-03-03T08:39:06.7669212',
        date: '03/03/2025',
        time: '08:39',
        city: 'Asia/Tokyo',
        dayOfWeek: 'Monday',
        dstActive: false,
      })
    } else if (city == 'Tokyo') {
      return new Jiki.JikiDictionary({
        year: 2025,
        month: 3,
        day: 3,
        hour: 8,
        minute: 39,
        seconds: 6,
        milliSeconds: 766,
        dateTime: '2025-03-03T08:39:06.7669212',
        date: '03/03/2025',
        time: '08:39',
        city: 'Asia/Tokyo',
        dayOfWeek: 'Monday',
        dstActive: false,
      })
    } else if (city == 'Lima') {
      return new Jiki.JikiDictionary({
        year: 2025,
        month: 3,
        day: 2,
        hour: 18,
        minute: 39,
        seconds: 51,
        milliSeconds: 160,
        dateTime: '2025-03-02T18:39:51.1605098',
        date: '03/02/2025',
        time: '18:39',
        city: 'Lima',
        dayOfWeek: 'Sunday',
        dstActive: false,
      })
    } else {
      return new Jiki.JikiDictionary({ error: 'Could not determine the time.' })
    }
  }

  private llmRequest(
    executionCtx: ExecutionContext,
    params: Jiki.JikiDictionary
  ): Jiki.JikiDictionary {
    const questionValue = params.value['question']
    if (!questionValue) {
      executionCtx.logicError('Please specify a question')
      return new Jiki.JikiDictionary({ error: 'Please specify a question' })
    }
    
    // Extract the actual question string value
    const question = typeof questionValue === 'object' && questionValue && 'value' in questionValue 
      ? (questionValue as Jiki.JikiObject).value 
      : questionValue

    if (question == "Who won the 1966 Football Men's World Cup?") {
      return new Jiki.JikiDictionary({
        response: {
          question: "Who won the 1966 Football Men's World Cup?",
          answers: [{ text: 'England', certainty: '1' }],
        },
        meta: {
          time: '500ms',
        },
      })
    } else if (
      question == "What's the best cacao percentage in chocolate?"
    ) {
      return new Jiki.JikiDictionary({
        response: {
          question: "What's the best cacao percentage in chocolate?",
          answers: [
            {
              text: 'Everyone loves a sugar free 100% experience',
              certainty: '0.64',
            },
            {
              text: 'The deep sensations of 82% are the best',
              certainty: '0.78',
            },
            { text: 'The sweet spot is 70%', certainty: '0.77' },
            {
              text: 'If you have a sweet tooth, 60% is for you',
              certainty: '0.52',
            },
          ],
        },
        meta: {
          time: '123ms',
        },
      })
    } else if (question == "What's the best website to learn to code?") {
      return new Jiki.JikiDictionary({
        response: {
          question: "What's the best website to learn to code?",
          answers: [
            { text: 'Codecademy is the best', certainty: '0.04' },
            { text: 'FreeCodeCamp is the best', certainty: '0.78' },
            { text: 'Khan Academy is the best', certainty: '0.77' },
            { text: 'Exercism is the best', certainty: '0.99' },
            { text: 'Coursera is the best', certainty: '0.52' },
          ],
        },
        meta: {
          time: '1264ms',
        },
      })
    } else {
      return new Jiki.JikiDictionary({ error: 'Could not determine answer' })
    }
  }

  private spotifyUserRequest(
    _executionCtx: ExecutionContext,
    url: string
  ): Jiki.JikiDictionary {
    const emptyDict = new Jiki.JikiDictionary({ items: [] })

    // Extract username from https://api.spotify.com/v1/users/{username}
    // using a regexp where username can be a-z
    const match = url.match(
      /https:\/\/api\.spotify\.com\/v1\/users\/([a-zA-Z]+)/
    )
    if (match === null)
      return new Jiki.JikiDictionary({ error: 'Could not parse URL' })
    const username = match[1]
    if (username === null)
      return new Jiki.JikiDictionary({ error: 'Could not parse URL' })

    let artists: string[] | undefined
    switch (username) {
      case 'iHiD':
        artists = [
          '0vEsuISMWAKNctLlUAhSZC',
          '2d0hyoQ5ynDBnkvAbJKORj',
          '14r9dR01KeBLFfylVSKCZQ',
          '7dGJo4pcD2V6oG8kP0tJRR',
          '7EQ0qTo7fWT7DPxmxtSYEc',
        ]
        break
      case 'fred':
        artists = [
          '3TVXtAsR1Inumwj472S9r4',
          '8G9QnLx9NcXJF7cbZcHeqV',
          'A2qGv8w9Ne6wN6fYuaEz4n',
          '3YQKmKGau1PzlVlkL1iodx',
        ]
        break
      default:
        return new Jiki.JikiDictionary({ error: 'Unknown user' })
    }
    if (!artists) return emptyDict

    return new Jiki.JikiDictionary({
      items: artists.map((id) => ({
        urls: { spotify_api: `https://api.spotify.com/v1/artists/${id}` },
      })),
    })
  }
  private spotifyArtistRequest(
    _executionCtx: ExecutionContext,
    url: string
  ): Jiki.JikiDictionary {
    // Extract artist id from https://api.spotify.com/v1/artist/{id}
    // using a regexp where id can be a-z, A-Z, 0-9
    const match = url.match(
      /https:\/\/api\.spotify\.com\/v1\/artists\/([a-zA-Z0-9]+)/
    )
    if (match === null)
      return new Jiki.JikiDictionary({ error: 'Could not parse URL' })
    const artistId = match[1]
    if (artistId === null)
      return new Jiki.JikiDictionary({ error: 'Could not parse URL' })

    let name: string | undefined
    switch (artistId) {
      case '0vEsuISMWAKNctLlUAhSZC':
        name = 'Counting Crows'
        break
      case '2d0hyoQ5ynDBnkvAbJKORj':
        name = 'Rage Against The Machine'
        break
      case '14r9dR01KeBLFfylVSKCZQ':
        name = 'Damien Rice'
        break
      case '7dGJo4pcD2V6oG8kP0tJRR':
        name = 'Eminem'
        break
      case '7EQ0qTo7fWT7DPxmxtSYEc':
        name = 'Bastille'
        break
      case '3TVXtAsR1Inumwj472S9r4':
        name = 'Glee'
        break
      case '8G9QnLx9NcXJF7cbZcHeqV':
        name = 'NSYNC'
        break
      case 'A2qGv8w9Ne6wN6fYuaEz4n':
        name = 'Beethoven'
        break
      case '3YQKmKGau1PzlVlkL1iodx':
        name = 'Limp Bizkit'
        break
    }
    if (name === undefined) {
      return new Jiki.JikiDictionary({ error: 'Unknown artist' })
    }
    return new Jiki.JikiDictionary({ name })
  }

  public override availableFunctions = [
    {
      name: 'fetch',
      func: (...args: unknown[]) => {
        const [executionCtx, url, params] = args as [ExecutionContext, Jiki.JikiString, Jiki.JikiDictionary]
        return this.fetchData(executionCtx, url, params)
      },
      description: 'fetched data from the provided URL',
    },
  ]
}
