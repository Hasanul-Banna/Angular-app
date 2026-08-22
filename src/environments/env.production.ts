import { type AppEnvironment } from './env.model';

export const environment: AppEnvironment = {
	production: true,
	baseUrl: 'https://app.example.com',
	apiBaseUrl: 'https://api.example.com',
	authBaseUrl: 'https://auth.example.com',
	appName: 'Angular LT App',
	defaultLanguage: 'en',
	enableDebugTools: false,
	geminiApiKey: '',
};
