import { SharedArray } from 'k6/data';

// Helper to get env var with default
const getEnvVar = (name, defaultValue) => {
  const value = __ENV[name];
  return value !== undefined ? value : defaultValue;
};

export const config = {
  authBaseUrl: getEnvVar('AUTH_BASE_URL', 'https://vm4-dev-dto.lviv.education/realms/master'),
  studentApiBaseUrl: getEnvVar('STUDENT_API_BASE_URL', 'https://vm4-dev-dto.lviv.education/student/api'),
  newsBaseUrl: getEnvVar('NEWS_BASE_URL', 'https://lpnu.ua'),
  
  auth: {
    clientId: getEnvVar('KEYCLOAK_CLIENT_ID', 'my-university-client'),
    clientSecret: getEnvVar('KEYCLOAK_CLIENT_SECRET', ''), // Optional if public client
  },
  
  testOptions: {
    vus: parseInt(getEnvVar('VUS', 10)),
    duration: getEnvVar('DURATION', '1m'),
    stages: [
      { duration: getEnvVar('STAGE1_DURATION', '10s'), target: parseInt(getEnvVar('STAGE1_TARGET', 5)) },
      { duration: getEnvVar('STAGE2_DURATION', '30s'), target: parseInt(getEnvVar('STAGE2_TARGET', 10)) },
      { duration: getEnvVar('STAGE3_DURATION', '10s'), target: parseInt(getEnvVar('STAGE3_TARGET', 0)) },
    ],
  },
  
  endpoints: {
    token: '/protocol/openid-connect/token',
    logout: '/protocol/openid-connect/logout',
    me: '/me',
    scheduleGroup: '/schedule/group',
    newsRss: '/newsrss',
    eventsRss: '/eventsrss'
  }
};

export function validateConfig() {
  const requiredVars = [
    { name: 'KEYCLOAK_CLIENT_ID', value: config.auth.clientId }
  ];
  
  const missingVars = requiredVars
    .filter(v => !v.value || v.value.trim() === '')
    .map(v => v.name);
    
  if (missingVars.length > 0) {
    console.error('Error: Missing required environment variables: ' + missingVars.join(', '));
    throw new Error('Missing required configuration');
  }
}

// Validate on import
validateConfig();

export default config;
