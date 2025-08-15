import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import DashboardLayout from './DashboardLayout';
import '../assets/Courses.css';

const Courses = () => {
  const navigate = useNavigate();

  const [courses, setCourses] = useState([]);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(false);
  const [seedMsg, setSeedMsg] = useState('');

  const load = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/api/courses');
      setCourses(data || []);
    } catch (e) {
      console.error('Failed to fetch courses', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const seed = async () => {
    try {
      setSeedMsg('');
      await api.post('/api/courses/seed');
      await load();
      setSeedMsg('Seeded!');
    } catch (e) {
      console.error('Seeding failed', e);
      setSeedMsg('Seeding failed');
    }
  };

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return courses;
    return courses.filter(c =>
      c.title?.toLowerCase().includes(s) ||
      c.description?.toLowerCase().includes(s)
    );
  }, [q, courses]);

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isTutor = user?.role === 'tutor';

  const handleFindTutor = (title) => {
    if (!title) return;
    // route to tutors page with subject query; server handles min 2 chars + max 5 results
    navigate(`/tutors?subject=${encodeURIComponent(title)}`);
  };

  return (
    <DashboardLayout>
      <div className="card">
        <h3>Browse Courses</h3>
        <p>Filter by subject, level, or tutor.</p>

        <div className="card mt-12">
          <input
            type="text"
            className="input"
            placeholder="Search courses..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />

          {loading ? (
            <p className="muted mt-8">Loading…</p>
          ) : filtered.length === 0 ? (
            <div className="muted mt-8">
              <p>No courses yet.</p>
              <button type="button" className="btn btn-secondary mt-8" onClick={seed}>
                Seed mock courses
              </button>
              {seedMsg && <div className="error mt-8">{seedMsg}</div>}
            </div>
          ) : (
            <div className="stack mt-12">
              {filtered.map((c) => (
                <div key={c._id} className="course-card">
                  <img
                    className="course-thumb"
                    src={c.imageUrl || 'https://picsum.photos/seed/placeholder/80/80'}
                    alt={c.title}
                    loading="lazy"
                  />
                  <div className="course-main">
                    <h4 className="course-title">{c.title}</h4>
                    <p className="course-desc">{c.description}</p>
                    <div className="course-actions">
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={() => handleFindTutor(c.title)}
                      >
                        Find Tutor
                      </button>
                      {isTutor && (
                        <button type="button" className="btn btn-ghost">
                          Become Tutor
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Courses;
