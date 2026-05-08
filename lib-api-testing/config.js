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
    clientId: getEnvVar('KEYCLOAK_CLIENT_ID', 'my-university-app'),
    clientSecret: getEnvVar('KEYCLOAK_CLIENT_SECRET', ''), // Optional if public client
  },
  
  testOptions: {
    // Simple execution with constant VUs
    simpleOptions: {
      duration: getEnvVar('DURATION', '5m'),
      vus: parseInt(getEnvVar('VUS', 10)),
    },
    // Advanced execution with stages
    stagesOptions: {
      stages: [
        // Phase 1: Ramp up
        { duration: getEnvVar('STAGE_RAMPUP_DUR', '2m'), target: parseInt(getEnvVar('VUS_RAMPUP', 50)) },   
        // Phase 2: Steady state
        { duration: getEnvVar('STAGE_NORMAL_DUR', '5m'), target: parseInt(getEnvVar('VUS_NORMAL', 300)) },  
        // Phase 3: Peak spike
        { duration: getEnvVar('STAGE_PEAK_DUR', '2m'), target: parseInt(getEnvVar('VUS_PEAK', 600)) }, 
        // Phase 4: Ramp down
        { duration: getEnvVar('STAGE_RAMPDOWN_DUR', '1m'), target: 0 }     
      ]
    }
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
