// client/src/services/bookings.js
import api from './api';

export const confirmBooking = async (payload) => {
  const { data } = await api.post('/api/bookings/confirm', payload);
  return data;
};

export const updateBooking = async (id, { date, time, timezone }) => {
  if (!id) {
    throw new Error('Missing booking id for updateBooking');
  }
  const { data } = await api.patch(`/api/bookings/${String(id)}`, { date, time, timezone });
  return data;
};

export const cancelBooking = async (id) => {
  if (!id) {
    throw new Error('Missing booking id for cancelBooking');
  }
  const { data } = await api.delete(`/api/bookings/${String(id)}`);
  return data;
};
