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
        // Phase 1: Start with 50 VUs (10 minutes)
        { duration: '10m', target: parseInt(getEnvVar('VUS_RAMPUP', 50)) },   
        // Phase 2: Ramp up to moderate load (20 minutes)
        { duration: '20m', target: parseInt(getEnvVar('VUS_NORMAL', 300)) },  
        // Phase 3: Maintain moderate load (60 minutes)
        { duration: '60m', target: parseInt(getEnvVar('VUS_NORMAL', 300)) },  
        // Phase 4: Spike to peak load (15 minutes)
        { duration: '15m', target: parseInt(getEnvVar('VUS_PEAK', 600)) }, 
        // Phase 5: Maintain spike load (15 minutes)
        { duration: '15m', target: parseInt(getEnvVar('VUS_PEAK', 600)) }, 
        // Phase 6: Return to moderate load (30 minutes)
        { duration: '30m', target: parseInt(getEnvVar('VUS_NORMAL', 300)) },  
        // Phase 7: Maintain moderate load again (20 minutes)
        { duration: '20m', target: parseInt(getEnvVar('VUS_NORMAL', 300)) },  
        // Phase 8: Ramp down to zero (10 minutes)
        { duration: '10m', target: 0 }     
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
