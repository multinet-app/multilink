export const host: string = process.env.VUE_APP_MULTINET_HOST || 'http://localhost:8000';
export const oauthApiRoot: string = process.env.VUE_APP_OAUTH_API_ROOT || `${host}/oauth`;
export const oauthClientId: string = process.env.VUE_APP_OAUTH_CLIENT_ID || '';
