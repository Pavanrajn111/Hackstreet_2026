import apiClient from './apiClient';

const CHAT_API_TIMEOUT_MS = Number(import.meta.env.VITE_CHAT_API_TIMEOUT_MS || 35000);

export const sendChatMessage = async (payload) => (
  await apiClient.post('/api/chat/message', payload, { timeout: CHAT_API_TIMEOUT_MS })
).data;

export { CHAT_API_TIMEOUT_MS };
export default { sendChatMessage };
