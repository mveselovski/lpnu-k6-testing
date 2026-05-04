# LPNU API Load Testing Suite

This repository contains a [k6](https://k6.io/) load testing suite designed to validate the performance and reliability of the LPNU University APIs (Student, Schedule, News, and Keycloak Authentication services).

## Prerequisites

- [k6 installed](https://grafana.com/docs/k6/latest/set-up/install-k6/) on your local machine (`brew install k6`, `choco install k6`, or `apt install k6`).
- Valid Keycloak credentials for testing.

## Setup

1. **Configure Test Users:**
   Create a file at `lib-api-testing/data/users.json` with the student credentials you want to test with. (Note: This file is ignored by Git to protect your secrets).

   *Example `users.json`:*
   ```json
   [
     {
       "username": "your.email@lpnu.ua",
       "password": "your_password",
       "group": "ІР-21"
     }
   ]
   ```

2. **Environment Variables:**
   The test relies on a few core environment variables. At a minimum, you must provide your Keycloak Client ID.

## Running the Test

Run the following command from the root of this repository:

```bash
k6 run --env KEYCLOAK_CLIENT_ID=my-university-client lib-api-testing/k6-load-test.js
```

### Customizing Load Parameters

You can easily override the default load profile by passing additional environment variables to the `k6 run` command:

- `KEYCLOAK_CLIENT_SECRET`: Secret for your Keycloak client (if required).
- `STAGE1_TARGET` / `STAGE1_DURATION`: Ramp-up target VUs and duration.
- `STAGE2_TARGET` / `STAGE2_DURATION`: Steady-state target VUs and duration.
- `STAGE3_TARGET` / `STAGE3_DURATION`: Ramp-down target VUs and duration.
- `AUTH_BASE_URL`, `STUDENT_API_BASE_URL`, `NEWS_BASE_URL`: Overrides for the target environment URLs.

*Example of running a heavier load test:*
```bash
k6 run \
  --env KEYCLOAK_CLIENT_ID=my-university-client \
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
4. **Public Feeds**: Checks the university News and Events RSS feeds.

### Metrics & Thresholds

The script is built with strict Service Level Agreement (SLA) thresholds. The test will automatically fail (exit with a non-zero code) if any of these are breached:

- **Global Error Rate**: Must be `< 1%`
- **Global Response Time (p95)**: Must be `< 2000ms`
- **Check Success Rate**: Must be `> 99%`
- **Login Response Time (p95)**: Must be `< 3000ms`
- **API Response Time (p95)**: Must be `< 1000ms`
