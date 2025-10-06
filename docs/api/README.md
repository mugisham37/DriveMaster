# Adaptive Learning Platform API Documentation

## Overview

The Adaptive Learning Platform provides a comprehensive RESTful API for managing users, content, learning progress, and adaptive scheduling. This documentation covers all public API endpoints, authentication, and integration patterns.

## Base URLs

- **Production**: `https://api.adaptivelearning.com`
- **Staging**: `https://api-staging.adaptivelearning.com`
- **Development**: `http://localhost:8080`

## Authentication

### OAuth 2.0 / OpenID Connect

The platform uses OAuth 2.0 with OpenID Connect for user authentication. Supported flows:

- **Authorization Code Flow**: For web applications
- **PKCE Flow**: For mobile applications
- **Client Credentials Flow**: For service-to-service communication

#### Authorization Endpoints

```http
GET /auth/oauth/authorize
```

**Parameters:**

- `client_id` (required): Your application's client ID
- `redirect_uri` (required): Callback URL after authorization
- `response_type` (required): Set to `code`
- `scope` (required): Requested scopes (e.g., `openid profile email`)
- `state` (recommended): Random string for CSRF protection
- `code_challenge` (PKCE): Base64URL-encoded SHA256 hash
- `code_challenge_method` (PKCE): Set to `S256`

**Example:**

```http
GET /auth/oauth/authorize?client_id=your_client_id&redirect_uri=https://yourapp.com/callback&response_type=code&scope=openid%20profile%20email&state=random_state
```

#### Token Exchange

```http
POST /auth/oauth/token
```

**Request Body:**

```json
{
  "grant_type": "authorization_code",
  "client_id": "your_client_id",
  "client_secret": "your_client_secret",
  "code": "authorization_code",
  "redirect_uri": "https://yourapp.com/callback",
  "code_verifier": "pkce_code_verifier"
}
```

**Response:**

```json
{
  "access_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "refresh_token": "refresh_token_string",
  "scope": "openid profile email",
  "id_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### JWT Token Usage

Include the access token in the Authorization header:

```http
Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Token Refresh

```http
POST /auth/oauth/token
```

**Request Body:**

```json
{
  "grant_type": "refresh_token",
  "client_id": "your_client_id",
  "client_secret": "your_client_secret",
  "refresh_token": "refresh_token_string"
}
```

## API Endpoints

### User Management

#### Get Current User Profile

```http
GET /users/me
```

**Response:**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com",
  "country_code": "US",
  "timezone": "America/New_York",
  "language": "en",
  "preferences": {
    "notifications_enabled": true,
    "study_reminders": true,
    "difficulty_preference": "adaptive"
  },
  "created_at": "2024-01-15T10:30:00Z",
  "last_active_at": "2024-01-20T14:22:00Z"
}
```

#### Update User Profile

```http
PUT /users/me
```

**Request Body:**

```json
{
  "timezone": "Europe/London",
  "language": "en-GB",
  "preferences": {
    "notifications_enabled": false,
    "study_reminders": true,
    "difficulty_preference": "challenging"
  }
}
```

#### Get User Progress Summary

```http
GET /users/me/progress
```

**Response:**

```json
{
  "overall_mastery": 0.75,
  "topics_mastered": 12,
  "total_topics": 20,
  "study_streak": 7,
  "total_study_time_hours": 45.5,
  "items_completed": 234,
  "accuracy_rate": 0.82,
  "mastery_by_topic": {
    "traffic_signs": 0.95,
    "right_of_way": 0.78,
    "parking_rules": 0.65,
    "speed_limits": 0.88
  },
  "recent_sessions": [
    {
      "session_id": "session_123",
      "start_time": "2024-01-20T14:00:00Z",
      "duration_minutes": 25,
      "items_attempted": 15,
      "accuracy": 0.87,
      "topics_practiced": ["traffic_signs", "right_of_way"]
    }
  ]
}
```

### Content Management

#### Search Content Items

```http
GET /content/items
```

**Query Parameters:**

- `q` (optional): Search query for full-text search
- `topics` (optional): Comma-separated list of topics
- `jurisdictions` (optional): Comma-separated list of jurisdictions
- `difficulty_min` (optional): Minimum difficulty (0.0-1.0)
- `difficulty_max` (optional): Maximum difficulty (0.0-1.0)
- `item_type` (optional): Type of item (multiple_choice, true_false, etc.)
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20, max: 100)

**Example:**

```http
GET /content/items?topics=traffic_signs,right_of_way&jurisdictions=US-CA&difficulty_min=0.3&difficulty_max=0.7&page=1&limit=20
```

**Response:**

```json
{
  "items": [
    {
      "id": "item_123",
      "slug": "stop-sign-intersection",
      "content": {
        "text": "What should you do when approaching a stop sign?",
        "media": [
          {
            "type": "image",
            "url": "https://cdn.adaptivelearning.com/images/stop-sign.jpg",
            "alt": "Stop sign at intersection"
          }
        ]
      },
      "choices": [
        {
          "id": "a",
          "text": "Come to a complete stop"
        },
        {
          "id": "b",
          "text": "Slow down and proceed if clear"
        },
        {
          "id": "c",
          "text": "Stop only if other vehicles are present"
        },
        {
          "id": "d",
          "text": "Yield to traffic and proceed"
        }
      ],
      "difficulty": 0.45,
      "topics": ["traffic_signs", "intersection_rules"],
      "jurisdictions": ["US-CA", "US-NY"],
      "estimated_time_seconds": 45
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total_items": 156,
    "total_pages": 8,
    "has_next": true,
    "has_previous": false
  }
}
```

#### Get Content Item Details

```http
GET /content/items/{item_id}
```

**Response:**

```json
{
  "id": "item_123",
  "slug": "stop-sign-intersection",
  "content": {
    "text": "What should you do when approaching a stop sign?",
    "media": [
      {
        "type": "image",
        "url": "https://cdn.adaptivelearning.com/images/stop-sign.jpg",
        "alt": "Stop sign at intersection"
      }
    ]
  },
  "choices": [
    {
      "id": "a",
      "text": "Come to a complete stop"
    },
    {
      "id": "b",
      "text": "Slow down and proceed if clear"
    }
  ],
  "explanation": {
    "text": "According to traffic law, you must come to a complete stop at a stop sign...",
    "media": []
  },
  "difficulty": 0.45,
  "discrimination": 1.2,
  "topics": ["traffic_signs", "intersection_rules"],
  "jurisdictions": ["US-CA", "US-NY"],
  "item_type": "multiple_choice",
  "cognitive_level": "application",
  "estimated_time_seconds": 45,
  "points": 1,
  "created_at": "2024-01-10T09:15:00Z",
  "updated_at": "2024-01-15T11:30:00Z"
}
```

### Adaptive Scheduling

#### Get Next Items for Practice

```http
POST /scheduler/next-items
```

**Request Body:**

```json
{
  "session_type": "practice",
  "time_budget_minutes": 30,
  "topic_preferences": ["traffic_signs", "right_of_way"],
  "difficulty_preference": "adaptive",
  "count": 10
}
```

**Response:**

```json
{
  "session_id": "session_456",
  "items": [
    {
      "item_id": "item_123",
      "score": 0.85,
      "reasoning": {
        "sm2_urgency": 0.7,
        "mastery_gap": 0.3,
        "difficulty_match": 0.9,
        "exploration_bonus": 0.1
      },
      "predicted_difficulty": 0.45,
      "predicted_success_probability": 0.78
    }
  ],
  "session_context": {
    "strategy": "spaced_repetition",
    "focus_topics": ["traffic_signs"],
    "estimated_duration_minutes": 28
  }
}
```

#### Submit Practice Attempt

```http
POST /scheduler/attempts
```

**Request Body:**

```json
{
  "session_id": "session_456",
  "item_id": "item_123",
  "client_attempt_id": "attempt_789",
  "selected": ["a"],
  "time_taken_ms": 12500,
  "confidence": 4,
  "hints_used": 0,
  "timestamp": "2024-01-20T14:15:30Z"
}
```

**Response:**

```json
{
  "attempt_id": "attempt_789",
  "correct": true,
  "quality": 4,
  "explanation": {
    "text": "Correct! You must come to a complete stop at a stop sign...",
    "media": []
  },
  "state_updates": {
    "sm2_interval_days": 6,
    "mastery_change": 0.05,
    "ability_update": 0.02
  },
  "next_item_available": true
}
```

#### Get Placement Test

```http
POST /scheduler/placement-test
```

**Request Body:**

```json
{
  "topics": ["traffic_signs", "right_of_way", "parking_rules"],
  "target_items": 15
}
```

**Response:**

```json
{
  "placement_id": "placement_123",
  "items": [
    {
      "item_id": "item_456",
      "sequence": 1
    }
  ],
  "estimated_duration_minutes": 20,
  "instructions": "This placement test will help us understand your current knowledge level..."
}
```

### Machine Learning Predictions

#### Get Performance Predictions

```http
POST /ml/predictions
```

**Request Body:**

```json
{
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "candidate_items": ["item_123", "item_456", "item_789"],
  "context": {
    "session_type": "practice",
    "time_of_day": "afternoon",
    "recent_performance": 0.82
  }
}
```

**Response:**

```json
{
  "predictions": {
    "item_123": {
      "success_probability": 0.78,
      "confidence_interval": [0.72, 0.84],
      "expected_learning_gain": 0.05
    },
    "item_456": {
      "success_probability": 0.65,
      "confidence_interval": [0.58, 0.72],
      "expected_learning_gain": 0.08
    }
  },
  "model_version": "dkt-v2.1.0",
  "feature_importance": {
    "recent_accuracy": 0.35,
    "topic_mastery": 0.28,
    "item_difficulty": 0.22,
    "time_since_last_practice": 0.15
  }
}
```

### Analytics and Reporting

#### Get Learning Analytics

```http
GET /analytics/learning-progress
```

**Query Parameters:**

- `start_date` (optional): Start date (ISO 8601)
- `end_date` (optional): End date (ISO 8601)
- `granularity` (optional): day, week, month (default: day)

**Response:**

```json
{
  "time_series": [
    {
      "date": "2024-01-20",
      "sessions_completed": 2,
      "items_attempted": 25,
      "accuracy_rate": 0.84,
      "study_time_minutes": 45,
      "mastery_gained": 0.08
    }
  ],
  "summary": {
    "total_sessions": 15,
    "total_items": 234,
    "average_accuracy": 0.82,
    "total_study_time_hours": 12.5,
    "mastery_improvement": 0.25
  }
}
```

## Error Handling

### Error Response Format

All API errors follow a consistent format:

```json
{
  "error": {
    "type": "VALIDATION_ERROR",
    "code": "INVALID_REQUEST_BODY",
    "message": "The request body contains invalid data",
    "details": {
      "field": "email",
      "reason": "Invalid email format"
    },
    "trace_id": "550e8400-e29b-41d4-a716-446655440000",
    "timestamp": "2024-01-20T14:30:00Z"
  }
}
```

### HTTP Status Codes

- `200 OK`: Successful request
- `201 Created`: Resource created successfully
- `400 Bad Request`: Invalid request data
- `401 Unauthorized`: Authentication required
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Resource not found
- `409 Conflict`: Resource conflict (e.g., duplicate)
- `422 Unprocessable Entity`: Validation errors
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server error
- `503 Service Unavailable`: Service temporarily unavailable

### Common Error Types

#### Authentication Errors

```json
{
  "error": {
    "type": "AUTHENTICATION_ERROR",
    "code": "INVALID_TOKEN",
    "message": "The provided access token is invalid or expired"
  }
}
```

#### Validation Errors

```json
{
  "error": {
    "type": "VALIDATION_ERROR",
    "code": "REQUIRED_FIELD_MISSING",
    "message": "Required field is missing",
    "details": {
      "field": "session_id",
      "location": "request_body"
    }
  }
}
```

#### Rate Limiting

```json
{
  "error": {
    "type": "RATE_LIMIT_ERROR",
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Rate limit exceeded. Try again later.",
    "details": {
      "limit": 100,
      "window_seconds": 3600,
      "retry_after_seconds": 1800
    }
  }
}
```

## Rate Limiting

### Rate Limit Headers

All API responses include rate limiting headers:

```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1642694400
X-RateLimit-Window: 3600
```

### Rate Limits by Endpoint

- **Authentication**: 10 requests per minute per IP
- **User Management**: 100 requests per hour per user
- **Content Search**: 1000 requests per hour per user
- **Scheduling**: 500 requests per hour per user
- **ML Predictions**: 200 requests per hour per user

## Webhooks

### Webhook Events

The platform can send webhook notifications for various events:

#### User Events

- `user.created`: New user registration
- `user.updated`: User profile changes
- `user.deleted`: User account deletion

#### Learning Events

- `session.completed`: Practice session finished
- `mastery.achieved`: Topic mastery reached
- `placement.completed`: Placement test finished

#### System Events

- `system.maintenance`: Scheduled maintenance
- `system.incident`: System incident detected

### Webhook Configuration

```http
POST /webhooks
```

**Request Body:**

```json
{
  "url": "https://yourapp.com/webhooks/adaptive-learning",
  "events": ["session.completed", "mastery.achieved"],
  "secret": "webhook_secret_key",
  "active": true
}
```

### Webhook Payload Example

```json
{
  "event": "session.completed",
  "timestamp": "2024-01-20T14:30:00Z",
  "data": {
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "session_id": "session_456",
    "duration_minutes": 25,
    "items_attempted": 15,
    "accuracy": 0.87,
    "topics_practiced": ["traffic_signs", "right_of_way"]
  },
  "signature": "sha256=5d41402abc4b2a76b9719d911017c592"
}
```

## SDKs and Libraries

### Official SDKs

- **JavaScript/TypeScript**: `@adaptive-learning/js-sdk`
- **Python**: `adaptive-learning-python`
- **Swift**: `AdaptiveLearningSDK`
- **Kotlin**: `adaptive-learning-android`

### JavaScript SDK Example

```javascript
import { AdaptiveLearningClient } from "@adaptive-learning/js-sdk";

const client = new AdaptiveLearningClient({
  baseUrl: "https://api.adaptivelearning.com",
  clientId: "your_client_id",
  clientSecret: "your_client_secret",
});

// Authenticate user
const tokens = await client.auth.exchangeCode(authorizationCode);

// Get next practice items
const nextItems = await client.scheduler.getNextItems({
  sessionType: "practice",
  timeBudgetMinutes: 30,
  count: 10,
});

// Submit practice attempt
const result = await client.scheduler.submitAttempt({
  sessionId: "session_456",
  itemId: "item_123",
  selected: ["a"],
  timeTakenMs: 12500,
  confidence: 4,
});
```

## Testing

### Test Environment

- **Base URL**: `https://api-test.adaptivelearning.com`
- **Test Credentials**: Available in developer portal
- **Test Data**: Pre-populated with sample content and users

### Postman Collection

Download the official Postman collection:

```
https://api.adaptivelearning.com/docs/postman-collection.json
```

### OpenAPI Specification

The complete OpenAPI 3.0 specification is available at:

```
https://api.adaptivelearning.com/docs/openapi.json
```

## Support and Resources

### Developer Portal

- **Documentation**: https://developers.adaptivelearning.com
- **API Console**: https://developers.adaptivelearning.com/console
- **SDK Downloads**: https://developers.adaptivelearning.com/sdks

### Support Channels

- **Email**: api-support@adaptivelearning.com
- **Slack**: #api-support (for partners)
- **GitHub**: https://github.com/adaptive-learning/api-issues

### Status Page

Monitor API status and incidents:
https://status.adaptivelearning.com
