export const host: string = import.meta.env.VITE_MULTINET_HOST || 'http://localhost:8000';
export const oauthApiRoot: string = import.meta.env.VITE_OAUTH_API_ROOT || `${host}/oauth`;
export const oauthClientId: string = import.meta.env.VITE_OAUTH_CLIENT_ID || '';
