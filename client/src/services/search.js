// client/src/services/search.js
import api from './api';

export const searchTutors = async (q, limit = 5) => {
  const { data } = await api.get(`/api/search/tutors`, { params: { q, limit } });
  return data;
};

export const searchSubjects = async (q, limit = 5) => {
  const { data } = await api.get(`/api/search/subjects`, { params: { q, limit } });
  return data;
};
