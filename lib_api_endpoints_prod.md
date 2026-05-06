# My University App API Endpoints Documentation (Production)

This file documents the endpoints for the Student, Schedule, News, and Authentication services used in the application.

---

## Student & Schedule Service
Base URL: `https://mobileapp-1.lpnu.ua/student/api`

### Profile
- **Get Current User Profile**  
  **URL:** `/me`  
  **Method:** GET  
  **Headers:**  
  - `Authorization: Bearer <access_token>`
  **Description:** Fetches the profile of the currently authenticated student.
  **Response:** `UserProfileDto` (contains student code, name, faculty, hostel info, etc.)

### Schedule
- **Get Schedule by Group**  
  **URL:** `/schedule/group`  
  **Method:** GET  
  **Headers:**  
  - `Authorization: Bearer <access_token>`
  **Parameters:**  
  - `group` (query parameter, string) - The ID/Code of the student group.
  **Description:** Fetches the weekly schedule for a specific group.
  **Response:** List of lessons with details (subject, teacher, location, online link, etc.)

---

## News Service
Base URL: `https://lpnu.ua`

### RSS Feeds
- **Get News Feed**  
  **URL:** `/newsrss`  
  **Method:** GET  
  **Description:** Fetches the latest news from the university in RSS 2.0 format.

- **Get Events Feed**  
  **URL:** `/eventsrss`  
  **Method:** GET  
  **Description:** Fetches the latest events from the university in RSS 2.0 format.

---

## Authentication Service (Keycloak)
Issuer: `https://mobileapp-2.lpnu.ua/realms/master`

### OIDC Flow
- **Authorize**  
  **URL:** `/protocol/openid-connect/auth`  
  **Method:** GET  
  **Description:** Initiates the OAuth2 authorization flow. Supports `kc_idp_hint=google` for Google Sign-In.

- **Token**  
  **URL:** `/protocol/openid-connect/token`  
  **Method:** POST  
  **Description:** Exchanges authorization code for tokens or refreshes an existing token.

- **End Session**  
  **URL:** `/protocol/openid-connect/logout`  
  **Method:** GET  
  **Description:** Terminates the SSO session on the server.

---

## Additional Notes

- **Authentication:** All requests to the Student & Schedule service require a valid JWT Bearer token obtained via Keycloak.
- **Data Formats:** 
  - **JSON:** Used for Student and Schedule APIs.
  - **RSS/XML:** Used for News and Events feeds.
- **Error Handling:** The app uses standard HTTP status codes (401 for unauthorized, 404 for not found, etc.).
