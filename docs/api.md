# API Summary

All client calls go through `http://localhost:8080`.

## Auth

- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/refresh`
- `POST /api/v1/auth/logout`
- `GET /api/v1/auth/oauth2/google`
- `GET /api/v1/auth/oauth2/facebook`

## Users

- `POST /api/v1/user-service`
- `PUT /api/v1/user-service`
- `GET /api/v1/user-service`
- `GET /api/v1/user-service/findUserById/{user-id}`

## Health Data

- `POST /api/v1/health-data`
- `GET /api/v1/health-data/latest`
- `GET /api/v1/health-data/history`
- `GET /api/v1/health-data/providers`

## Recommendations

- `GET /api/v1/recommendations/latest`
- `GET /api/v1/recommendations`

## Meals

- `POST /api/v1/meal-service`
- `GET /api/v1/meal-service`
- `GET /api/v1/meal-service/{meal-id}`

## Notifications

- `GET /api/v1/notifications`
- `PATCH /api/v1/notifications/{id}/read`
