// client/src/services/subjects.js
import api from './api';

export async function fetchMySubjects() {
  const { data } = await api.get('/api/account/subjects');
  return data || [];
}
