import http from 'k6/http';
import { check, group, sleep, fail } from 'k6';
import { SharedArray } from 'k6/data';
import { Rate, Trend, Counter } from 'k6/metrics';
import { config } from './config.js';

// --- BLOCK 1: OPTIONS ---
export const options = {
  scenarios: {
    load: {
      executor: 'ramping-vus', // Chosen executor: ramping-vus handles standard load progression (warm-up, steady state, cool-down)
      startVUs: 0,
      stages: config.testOptions.stages,
      gracefulRampDown: '30s',
      gracefulStop: '30s',
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<2000'], // 95% of requests should complete in under 2s
    http_req_failed: ['rate<0.01'],    // Error rate must be under 1%
    checks: ['rate>0.99'],             // 99% of checks must pass
    'login_response_time': ['p(95)<3000'],
    'api_response_time': ['p(95)<1000']
  },
};

// Custom metrics inspired by k6-testing
const errorRate = new Rate('errors');
const loginResponseTime = new Trend('login_response_time');
const apiResponseTime = new Trend('api_response_time');
const requestsMade = new Counter('requests_made');

// --- BLOCK 2: DATA ---
// Using SharedArray prevents OOM errors by loading the users.json file exactly once, rather than per VU
const users = new SharedArray('users', () => {
  try {
    return JSON.parse(open('./data/users.json'));
  } catch (e) {
    // Provide a fallback gracefully if file is missing
    console.warn("Could not load users.json, using fallback user.");
    return [{ username: 'teststudent', password: 'testpassword', group: 'KN-4' }];
  }
});

// --- BLOCK 3: SETUP ---
export function setup() {
  console.log('Starting load test for Library/University APIs...');
  // Note: We DO NOT perform authentication here. Sharing a single token across all VUs is a bad practice
  // as it prevents accurate representation of server-side session allocation and load.
  return { seed: Date.now() }; // Example of stateless setup data
}

// --- BLOCK 4: DEFAULT FUNCTION (VU WORKLOAD) ---
export default function(data) {
  // Select user deterministically or randomly (deterministically here to ensure uniform distribution)
  const user = users[(__VU - 1) % users.length];
  
  let token;
  
  group('1. Authentication', () => {
    const loginUrl = `${config.authBaseUrl}${config.endpoints.token}`;
    const payload = {
      client_id: config.auth.clientId,
      username: user.username,
      password: user.password,
      grant_type: 'password',
      scope: 'openid profile email'
    };
    
    // Add client_secret if present in config
    if (config.auth.clientSecret) {
      payload.client_secret = config.auth.clientSecret;
    }

    const res = http.post(loginUrl, payload, {
      tags: { endpoint: 'keycloak_token' }
    });
    
    requestsMade.add(1);
    loginResponseTime.add(res.timings.duration);

    check(res, {
      'login status is 200': (r) => r.status === 200,
      'has access token': (r) => r.json('access_token') !== undefined,
    }) || errorRate.add(1);

    if (res.status === 200) {
      token = res.json('access_token');
    } else {
      console.error(`Keycloak error response: ${res.body}`);
      fail(`Login failed for ${user.username} with status ${res.status}`);
    }
    
    sleep(1); // Think time after login
  });

  if (!token) return; // Halt iteration if login failed

  const authHeaders = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  group('2. Student Profile', () => {
    const res = http.get(`${config.studentApiBaseUrl}${config.endpoints.me}`, {
      headers: authHeaders,
      tags: { endpoint: 'student_me' }
    });

    requestsMade.add(1);
    apiResponseTime.add(res.timings.duration);

    check(res, {
      'me status is 200': (r) => r.status === 200,
      'me authorized': (r) => r.status !== 401 && r.status !== 403,
    }) || errorRate.add(1);
    
    sleep(Math.random() * 2 + 1); // 1-3s think time reading profile
  });

  group('3. Schedule View', () => {
    const groupName = user.group || 'KN-4';
    const res = http.get(`${config.studentApiBaseUrl}${config.endpoints.scheduleGroup}?group=${groupName}`, {
      headers: authHeaders,
      tags: { endpoint: 'schedule_group' }
    });

    requestsMade.add(1);
    apiResponseTime.add(res.timings.duration);

    check(res, {
      'schedule status is 200': (r) => r.status === 200,
      'schedule authorized': (r) => r.status !== 401 && r.status !== 403,
    }) || errorRate.add(1);
    
    sleep(Math.random() * 2 + 1); // 1-3s think time viewing schedule
  });

  group('4. Public Feeds (News & Events)', () => {
    const newsRes = http.get(`${config.newsBaseUrl}${config.endpoints.newsRss}`, {
      tags: { endpoint: 'news_rss' }
    });
    requestsMade.add(1);
    apiResponseTime.add(newsRes.timings.duration);
    check(newsRes, { 'news rss status is 200': (r) => r.status === 200 }) || errorRate.add(1);

    sleep(1); // Short pause between rss fetches

    const eventsRes = http.get(`${config.newsBaseUrl}${config.endpoints.eventsRss}`, {
      tags: { endpoint: 'events_rss' }
    });
    requestsMade.add(1);
    apiResponseTime.add(eventsRes.timings.duration);
    check(eventsRes, { 'events rss status is 200': (r) => r.status === 200 }) || errorRate.add(1);
    
    sleep(Math.random() * 2 + 1); // 1-3s reading news
  });

}

// --- BLOCK 5: TEARDOWN ---
export function teardown(data) {
  // Cleanup steps would go here. Since each VU manages its own Keycloak session/token via the password grant
  // and tokens expire, we do not require global administrative cleanup at the moment.
  console.log(`Load test finished with seed: ${data.seed}`);
}
