export interface AvroSchema {
  type: 'record'
  name: string
  namespace?: string
  fields: AvroField[]
}

export interface AvroField {
  name: string
  type: AvroType | AvroType[]
  default?: any
  doc?: string
}

export type AvroType =
  | 'null'
  | 'boolean'
  | 'int'
  | 'long'
  | 'float'
  | 'double'
  | 'bytes'
  | 'string'
  | AvroRecord
  | AvroArray
  | AvroMap
  | AvroUnion
  | AvroEnum

export interface AvroRecord {
  type: 'record'
  name: string
  fields: AvroField[]
}

export interface AvroArray {
  type: 'array'
  items: AvroType
}

export interface AvroMap {
  type: 'map'
  values: AvroType
}

export interface AvroUnion {
  type: AvroType[]
}

export interface AvroEnum {
  type: 'enum'
  name: string
  symbols: string[]
}

// Learning Event Schema
export const LearningEventSchema: AvroSchema = {
  type: 'record',
  name: 'LearningEvent',
  namespace: 'com.drivemaster.events',
  fields: [
    { name: 'eventId', type: 'string' },
    { name: 'userId', type: 'string' },
    { name: 'sessionId', type: ['null', 'string'], default: null },
    { name: 'conceptKey', type: 'string' },
    { name: 'itemId', type: ['null', 'string'], default: null },
    {
      name: 'eventType',
      type: {
        type: 'enum',
        name: 'EventType',
        symbols: [
          'question_answered',
          'session_started',
          'session_ended',
          'concept_mastered',
          'streak_updated',
        ],
      },
    },
    { name: 'correct', type: ['null', 'boolean'], default: null },
    { name: 'responseTime', type: ['null', 'long'], default: null },
    { name: 'confidence', type: ['null', 'int'], default: null },
    { name: 'attempts', type: 'int', default: 1 },
    { name: 'deviceType', type: ['null', 'string'], default: null },
    { name: 'timeOfDay', type: ['null', 'string'], default: null },
    { name: 'studyStreak', type: ['null', 'int'], default: null },
    { name: 'masteryBefore', type: ['null', 'double'], default: null },
    { name: 'masteryAfter', type: ['null', 'double'], default: null },
    { name: 'difficultyRating', type: ['null', 'double'], default: null },
    { name: 'engagementScore', type: ['null', 'double'], default: null },
    { name: 'timestamp', type: 'long' },
    { name: 'version', type: 'string', default: '1.0' },
    { name: 'correlationId', type: ['null', 'string'], default: null },
    {
      name: 'rawEventData',
      type: {
        type: 'map',
        values: 'string',
      },
    },
  ],
}

// Content Event Schema
export const ContentEventSchema: AvroSchema = {
  type: 'record',
  name: 'ContentEvent',
  namespace: 'com.drivemaster.events',
  fields: [
    { name: 'eventId', type: 'string' },
    { name: 'contentId', type: 'string' },
    { name: 'userId', type: ['null', 'string'], default: null },
    {
      name: 'eventType',
      type: {
        type: 'enum',
        name: 'ContentEventType',
        symbols: [
          'content_viewed',
          'content_created',
          'content_updated',
          'content_deleted',
          'content_rated',
        ],
      },
    },
    { name: 'category', type: ['null', 'string'], default: null },
    { name: 'difficulty', type: ['null', 'double'], default: null },
    { name: 'viewDuration', type: ['null', 'long'], default: null },
    { name: 'rating', type: ['null', 'int'], default: null },
    { name: 'timestamp', type: 'long' },
    { name: 'version', type: 'string', default: '1.0' },
    {
      name: 'metadata',
      type: {
        type: 'map',
        values: 'string',
      },
    },
  ],
}

// Engagement Event Schema
export const EngagementEventSchema: AvroSchema = {
  type: 'record',
  name: 'EngagementEvent',
  namespace: 'com.drivemaster.events',
  fields: [
    { name: 'eventId', type: 'string' },
    { name: 'userId', type: 'string' },
    {
      name: 'eventType',
      type: {
        type: 'enum',
        name: 'EngagementEventType',
        symbols: [
          'notification_sent',
          'notification_opened',
          'achievement_unlocked',
          'friend_added',
          'challenge_completed',
        ],
      },
    },
    { name: 'engagementScore', type: ['null', 'double'], default: null },
    { name: 'notificationType', type: ['null', 'string'], default: null },
    { name: 'achievementType', type: ['null', 'string'], default: null },
    { name: 'challengeId', type: ['null', 'string'], default: null },
    { name: 'timestamp', type: 'long' },
    { name: 'version', type: 'string', default: '1.0' },
    {
      name: 'contextData',
      type: {
        type: 'map',
        values: 'string',
      },
    },
  ],
}

// Schema validation utility
export class AvroValidator {
  static validate(data: any, schema: AvroSchema): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    try {
      this.validateRecord(data, schema, '', errors)
    } catch (error) {
      errors.push(`Validation error: ${error}`)
    }

    return {
      valid: errors.length === 0,
      errors,
    }
  }

  private static validateRecord(
    data: any,
    schema: AvroSchema,
    path: string,
    errors: string[],
  ): void {
    if (typeof data !== 'object' || data === null) {
      errors.push(`${path}: Expected object, got ${typeof data}`)
      return
    }

    for (const field of schema.fields) {
      const fieldPath = path ? `${path}.${field.name}` : field.name
      const value = data[field.name]

      if (value === undefined) {
        if (field.default === undefined && !this.isNullableType(field.type)) {
          errors.push(`${fieldPath}: Required field missing`)
        }
        continue
      }

      this.validateField(value, field.type, fieldPath, errors)
    }
  }

  private static validateField(
    value: any,
    type: AvroType | AvroType[],
    path: string,
    errors: string[],
  ): void {
    if (Array.isArray(type)) {
      // Union type
      const validTypes = type.some((t) => {
        try {
          const tempErrors: string[] = []
          this.validateField(value, t, path, tempErrors)
          return tempErrors.length === 0
        } catch {
          return false
        }
      })

      if (!validTypes) {
        errors.push(`${path}: Value doesn't match any union type`)
      }
      return
    }

    if (typeof type === 'string') {
      this.validatePrimitiveType(value, type, path, errors)
    } else if (typeof type === 'object') {
      this.validateComplexType(value, type, path, errors)
    }
  }

  private static validatePrimitiveType(
    value: any,
    type: string,
    path: string,
    errors: string[],
  ): void {
    switch (type) {
      case 'null':
        if (value !== null) errors.push(`${path}: Expected null, got ${typeof value}`)
        break
      case 'boolean':
        if (typeof value !== 'boolean')
          errors.push(`${path}: Expected boolean, got ${typeof value}`)
        break
      case 'int':
      case 'long':
        if (!Number.isInteger(value)) errors.push(`${path}: Expected integer, got ${typeof value}`)
        break
      case 'float':
      case 'double':
        if (typeof value !== 'number') errors.push(`${path}: Expected number, got ${typeof value}`)
        break
      case 'string':
        if (typeof value !== 'string') errors.push(`${path}: Expected string, got ${typeof value}`)
        break
      case 'bytes':
        if (!(value instanceof Buffer) && typeof value !== 'string') {
          errors.push(`${path}: Expected bytes (Buffer or string), got ${typeof value}`)
        }
        break
    }
  }

  private static validateComplexType(value: any, type: any, path: string, errors: string[]): void {
    switch (type.type) {
      case 'record':
        this.validateRecord(value, type, path, errors)
        break
      case 'array':
        if (!Array.isArray(value)) {
          errors.push(`${path}: Expected array, got ${typeof value}`)
        } else {
          value.forEach((item, index) => {
            this.validateField(item, type.items, `${path}[${index}]`, errors)
          })
        }
        break
      case 'map':
        if (typeof value !== 'object' || value === null) {
          errors.push(`${path}: Expected object (map), got ${typeof value}`)
        } else {
          Object.entries(value).forEach(([key, val]) => {
            this.validateField(val, type.values, `${path}.${key}`, errors)
          })
        }
        break
      case 'enum':
        if (!type.symbols.includes(value)) {
          errors.push(
            `${path}: Invalid enum value '${value}'. Expected one of: ${type.symbols.join(', ')}`,
          )
        }
        break
    }
  }

  private static isNullableType(type: AvroType | AvroType[]): boolean {
    if (Array.isArray(type)) {
      return type.includes('null')
    }
    return type === 'null'
  }
}

export const EventSchemas = {
  LearningEvent: LearningEventSchema,
  ContentEvent: ContentEventSchema,
  EngagementEvent: EngagementEventSchema,
}
