// client/src/pages/Subjects.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import DashboardLayout from './DashboardLayout';
import '../assets/Subjects.css';

import api from '../services/api';                 // ⬅️ add
import { fetchMySubjects } from '../services/subjects';
import { updateBooking, cancelBooking } from '../services/bookings';

const fmtLocal = (d, t, tz) => {
  try {
    if (!d || !t) return '';
    const [yy, mm, dd] = (d || '').split('-').map(Number);
    const [HH, MM] = (t || '').split(':').map(Number);
    const date = new Date(yy, (mm || 1) - 1, dd || 1, HH || 0, MM || 0, 0);
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: 'full',
      timeStyle: 'short',
      timeZone: tz || undefined
    }).format(date);
  } catch {
    return '';
  }
};

export default function Subjects() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [avatarMap, setAvatarMap] = useState({});   // ⬅️ add
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ date: '', time: '' });
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const load = async () => {
    setLoading(true);
    try {
      const data = await fetchMySubjects(); // GET /api/account/subjects
      setRows(Array.isArray(data) ? data : []);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  // 🔒 Only keep real bookings (no placeholders)
  const booked = useMemo(() => rows.filter(r => !!r.bookingId), [rows]);

  // 🔎 Fetch tutor avatars when missing in lastSession
  useEffect(() => {
    const ids = Array.from(
      new Set(
        booked
          .filter(r => !r.tutorAvatar && r.tutorId)
          .map(r => String(r.tutorId))
      )
    ).filter(id => !avatarMap[id]);

    if (ids.length === 0) return;

    (async () => {
      const updates = {};
      for (const id of ids) {
        try {
          const { data } = await api.get(`/api/tutors/${id}`);
          const url = data?.avatar || data?.avatarUrl || '';
          if (url) updates[id] = url;
        } catch { /* ignore */ }
      }
      if (Object.keys(updates).length) {
        setAvatarMap(prev => ({ ...prev, ...updates }));
      }
    })();
  }, [booked, avatarMap]);

  const sorted = useMemo(() => {
    return [...booked].sort((a, b) => {
      const A = new Date(a.updatedAt || a.lastDate || 0).getTime();
      const B = new Date(b.updatedAt || b.lastDate || 0).getTime();
      return B - A;
    });
  }, [booked]);

  const beginEdit = (row) => {
    if (!row?.bookingId) {
      alert('No active booking to edit for this subject.');
      return;
    }
    setEditingId(String(row.bookingId));
    setForm({ date: row.lastDate || '', time: row.lastTime || '' });
  };

  const saveEdit = async (row) => {
    if (!row?.bookingId) return alert('Missing booking id.');
    if (!form.date || !form.time) return;
    try {
      await updateBooking(row.bookingId, { date: form.date, time: form.time, timezone: tz });
      setEditingId(null);
      await load();
    } catch {
      alert('Failed to update booking. Please try again.');
    }
  };

  const cancelRow = async (row) => {
    if (!row?.bookingId) {
      alert('No active booking to cancel for this subject.');
      return;
    }
    if (!window.confirm(`Cancel your ${row.subject} session with ${row.tutorName}?`)) return;
    try {
      await cancelBooking(row.bookingId);
      setRows((prev) => prev.filter((r) => String(r.bookingId) !== String(row.bookingId)));
      alert('Booking canceled. A refund will be processed shortly.');
    } catch {
      alert('Failed to cancel booking. Please try again.');
    }
  };

  return (
    <DashboardLayout>
      <div className="subjects-page">
        <div className="card subjects-header">
          <h3>My Subjects</h3>
          <p className="muted">
            Manage upcoming sessions. You can reschedule the date & time or cancel a booking.
          </p>
        </div>

        {loading && (
          <div className="card">
            <p className="muted">Loading…</p>
          </div>
        )}

        {!loading && sorted.length === 0 && (
          <div className="card empty-state">
            <div className="icon">📚</div>
            <h4>No sessions yet</h4>
            <p className="muted">Book a session to see it here.</p>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => navigate('/tutors')}
            >
              Book a session
            </button>
          </div>
        )}

        {!loading && sorted.length > 0 && (
          <div className="subject-list">
            {sorted.map((row) => {
              const isEditing = String(editingId) === String(row.bookingId);
              const when = fmtLocal(row.lastDate, row.lastTime, row.timezone);
              const avatar =
                row.tutorAvatar ||
                avatarMap[String(row.tutorId)] ||                 // ⬅️ use fetched avatar
                (row.tutorId ? `https://i.pravatar.cc/80?u=${row.tutorId}` : '');

              const profileTo = row.tutorId
                ? `/tutors/${row.tutorId}`
                : `/search?q=${encodeURIComponent(row.subject)}`;

              const bookTo = row.tutorId
                ? `/book/${row.tutorId}?subject=${encodeURIComponent(row.subject)}`
                : `/search?q=${encodeURIComponent(row.subject)}`;

              return (
                <div className="card subject-item" key={String(row.bookingId)}>
                  <div className="subject-left">
                    <img className="tutor-avatar" src={avatar} alt={row.tutorName || row.subject} />
                    <div className="meta">
                      <div className="title">
                        <span className="subject-name">{row.subject}</span>
                        <span className="dot">•</span>
                        <span className="tutor-name">{row.tutorName || 'Tutor'}</span>
                      </div>

                      {!isEditing ? (
                        <div className="muted small">
                          {when ? `${when} (${row.timezone || tz})` : '—'}
                          {row.duration ? ` • ${row.duration} min` : ''}
                        </div>
                      ) : (
                        <div className="edit-row">
                          <input
                            type="date"
                            className="input"
                            value={form.date}
                            onChange={(e) => setForm({ ...form, date: e.target.value })}
                          />
                          <input
                            type="time"
                            className="input"
                            value={form.time}
                            onChange={(e) => setForm({ ...form, time: e.target.value })}
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="subject-actions">
                    {!isEditing ? (
                      <>
                        <Link className="btn" to={profileTo}>View profile</Link>
                        <Link className="btn" to={bookTo}>Book again</Link>
                        <button type="button" className="btn" onClick={() => beginEdit(row)}>
                          Edit
                        </button>
                        <button type="button" className="btn danger" onClick={() => cancelRow(row)}>
                          Cancel booking
                        </button>
                      </>
                    ) : (
                      <>
                        <button type="button" className="btn" onClick={() => setEditingId(null)}>
                          Discard
                        </button>
                        <button type="button" className="btn btn-primary" onClick={() => saveEdit(row)}>
                          Save
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
