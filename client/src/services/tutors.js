import api from './api';

export const getTutorById = async (id) => {
  if (!id) throw new Error('Missing tutor id');
  const { data } = await api.get(`/api/tutors/${id}`);
  return data;
};

export const listTutors = async (params = {}) => {
  const { data } = await api.get('/api/tutors', { params });
  return data || [];
};

export const searchTutorsBySubject = async (term, limit = 5) => {
  const q = (term || '').trim();
  if (q.length < 2) return [];
  const { data } = await api.get('/api/tutors/search', {
    params: { subject: q, limit },
  });
  return data || [];
};
