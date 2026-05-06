# LPNU API Load Testing Suite

This repository contains a [k6](https://k6.io/) load testing suite designed to validate the performance and reliability of the LPNU University APIs (Student, Schedule, News, and Keycloak Authentication services).

## API Documentation

The target endpoints are documented in the following files:
- [Development Endpoints](lib_api_endpoints_dev.md)
- [Production Endpoints](lib_api_endpoints_prod.md)

## Prerequisites

- [k6 installed](https://grafana.com/docs/k6/latest/set-up/install-k6/) on your local machine (`brew install k6`, `choco install k6`, or `apt install k6`).
- Valid Keycloak credentials for testing.

## Setup

1. **Configure Test Users:**
   Create a file at `lib-api-testing/data/users.json` with the student credentials you want to test with. (Note: This file is ignored by Git to protect your secrets).

   > **⚠️ IMPORTANT: Keycloak & Google Authentication**
   > This load test uses the Resource Owner Password Credentials Grant (`grant_type=password`). Because Keycloak delegates Google logins to the Google IdP, **you cannot use real Google-federated accounts** in your `users.json`. You must create "synthetic" local test users directly in the Keycloak Admin Console with local passwords.

   *Example `users.json`:*
   ```json
   [
     {
       "username": "load-test-student-1@lpnu.ua",
       "password": "local_password",
       "group": "ІР-21"
     }
   ]
   ```

2. **Environment Variables:**
   The test relies on environment variables to switch between environments and load profiles. At a minimum, you must provide your Keycloak Client ID.

## Running the Test

By default, the script will run against the **Development** environment.

Run the following command from the root of this repository:

```bash
k6 run --env KEYCLOAK_CLIENT_ID=my-university-app lib-api-testing/k6-load-test.js
```

### Running against Production

To test the Production environment, override the base URL variables:

```bash
k6 run \
  --env KEYCLOAK_CLIENT_ID=my-university-app \
  --env STUDENT_API_BASE_URL=https://mobileapp-1.lpnu.ua/student/api \
  --env AUTH_BASE_URL=https://mobileapp-2.lpnu.ua/realms/master \
  lib-api-testing/k6-load-test.js
```

### Customizing Load Parameters

You can override the default load profile by passing additional environment variables:

- `KEYCLOAK_CLIENT_SECRET`: Secret for your Keycloak client (if required).
- `STAGE1_TARGET` / `STAGE1_DURATION`: Ramp-up target VUs and duration.
- `STAGE2_TARGET` / `STAGE2_DURATION`: Steady-state target VUs and duration.
- `STAGE3_TARGET` / `STAGE3_DURATION`: Ramp-down target VUs and duration.

*Example of running a heavier load test:*
```bash
k6 run \
  --env KEYCLOAK_CLIENT_ID=my-university-app \
  --env STAGE2_TARGET=100 \
  --env STAGE2_DURATION=5m \
  lib-api-testing/k6-load-test.js
```

## How It Works

The script utilizes the **`ramping-vus`** executor to realistically simulate user traffic: escalating smoothly (warm-up), holding a sustained peak (steady state), and gracefully stepping down (cool-down).

### User Flow

To prevent caching anomalies and ensure realistic server session allocation, each Virtual User (VU) performs the following flow dynamically:
1. **Authentication**: Authenticates directly against the Keycloak `/protocol/openid-connect/token` endpoint using the `password` grant to retrieve a unique `access_token`.
2. **Student Profile**: Fetches the authenticated user's profile (`/me`).
3. **Schedule**: Fetches the weekly schedule for the user's specific group (`/schedule/group`).
*(Note: Public RSS feed fetching has been disabled in the current script iteration to focus on authenticated API load).*

### Metrics & Thresholds

The script is built with strict Service Level Agreement (SLA) thresholds. The test will automatically fail (exit with a non-zero code) if any of these are breached:

- **Global Error Rate**: Must be `< 1%`
- **Global Response Time (p95)**: Must be `< 2000ms`
- **Check Success Rate**: Must be `> 99%`
- **Login Response Time (p95)**: Must be `< 3000ms`
- **API Response Time (p95)**: Must be `< 1000ms`
