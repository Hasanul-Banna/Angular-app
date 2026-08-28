import { type AppEnvironment } from './env.model';

export const environment: AppEnvironment = {
	production: false,
	baseUrl: 'http://localhost:4200',
	apiBaseUrl: 'http://localhost:3000/api',
	authBaseUrl: 'http://localhost:3000/auth',
	appName: 'Angular LT App',
	defaultLanguage: 'en',
	enableDebugTools: true,
	geminiApiKey: '',
	openaiApiKey: '',
};
