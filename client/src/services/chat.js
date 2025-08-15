import api from './api';

export const startOrGetConversation = async (userId) => {
  const { data } = await api.post('/api/conversations/start', { userId });
  return data;
};

export const listConversations = async () => {
  const { data } = await api.get('/api/conversations/mine');
  return data;
};

export const getMessages = async (conversationId) => {
  const { data } = await api.get(`/api/messages/${conversationId}`);
  return data;
};

export const sendMessage = async (conversationId, text) => {
  const { data } = await api.post(`/api/messages/${conversationId}`, { text });
  return data;
};
