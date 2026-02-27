export * from './workspaces/service.js';
export * from './items/service.js';
export * from './settings/service.js';
export * from './notifications/service.js';
export * from './webhook/service.js';
export * from './coach/agent.js';
export * from './coach/coach.cron.js';
export * from './coach/abandonment.js';
export * from './coach/smart-notifications.js';
export * from './customer/processor.js';
export * from './customer/profile.js';
export * from './services/ai.js';
export * from './services/management.js';
export * from './services/ingestion.js';
export * from './services/batch.js';
export { getAIService } from './services/factory.js';
export { analyzeImage } from './services/vision.js';
export * from './services/settings.js';
export * from './orchestrator/index.js';

// Namespace exports for specifically encapsulated usage
export * as AdminDomain from './admin/service.js';
export * as DashboardDomain from './dashboard/service.js';
export * as CustomerDomain from './customer/service.js';
export * as AuthDomain from './auth/service.js';
