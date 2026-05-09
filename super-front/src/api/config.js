/**
 * Configuração central da API para o Supercell AI.
 * Em desenvolvimento, utiliza o localhost:3005.
 * Em produção, utiliza a variável de ambiente VITE_API_URL.
 */
export const API_URL = import.meta.env.DEV ? '' : (import.meta.env.VITE_API_URL || '');

export const API_ENDPOINTS = {
  DASHBOARD: `${API_URL}/api/dashboard`,
  COMPANY_PROFILE: `${API_URL}/api/settings/company`,
  DAILY_INSIGHT: `${API_URL}/api/daily-insight`,
  TEAM: `${API_URL}/api/settings/team`,
  SECURITY: `${API_URL}/api/settings/security`,
  CHAT: `${API_URL}/api/chat`, // Se existir
  VOICE: `${API_URL}/api/voice` // Se existir
};
