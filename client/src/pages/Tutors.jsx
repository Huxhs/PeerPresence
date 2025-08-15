import React, { useEffect, useState } from 'react';
import axios from 'axios';
import DashboardLayout from './DashboardLayout';
import '../assets/Tutors.css';
import Footer from '../components/Footer';
import { useNavigate, useLocation } from 'react-router-dom';

const MIN_LEN = 2;
const MAX_RESULTS = 5;

const Tutors = () => {
  const [tutors, setTutors] = useState([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  // Boot from ?subject= (e.g., /tutors?subject=Data%20Structures)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const subject = params.get('subject') || '';
    if (subject && subject !== query) {
      setQuery(subject);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search]);

  // Fetch tutors whenever query changes
  useEffect(() => {
    let cancelled = false;

    const fetchTutors = async () => {
      setLoading(true);
      try {
        let res;
        const q = (query || '').trim();

        if (q.length >= MIN_LEN) {
          // Server-side subject search (min 2 chars, max 5 results)
          res = await axios.get('/api/tutors/search', {
            params: { subject: q, limit: MAX_RESULTS }
          });
        } else {
          // No/short query → show default list
          res = await axios.get('/api/tutors');
        }

        if (!cancelled) setTutors(res.data || []);
      } catch (err) {
        console.error('Failed to fetch tutors:', err);
        if (!cancelled) setTutors([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchTutors();
    return () => { cancelled = true; };
  }, [query]);

  const hasResults = tutors && tutors.length > 0;

  return (
    <>
      <DashboardLayout title="View Tutors" showSearch>
        <div className="page-header">
          <h3>View Tutors</h3>
          <input
            className="search-input"
            placeholder="Search tutors, subjects..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        {loading && <div className="card muted">Loading…</div>}

        {!loading && !hasResults && (
          <div className="card muted">No tutors match your search.</div>
        )}

        {!loading && hasResults && (
          <div className="tutor-grid">
            {tutors.map((t) => (
              <div key={t._id} className="tutor-card card">
                <img
                  className="tutor-avatar"
                  src={
                    t.avatar ||
                    'https://images.unsplash.com/photo-1544723795-3fb6469f5b39?q=80&w=300&auto=format&fit=crop'
                  }
                  alt={t.name}
                  loading="lazy"
                />
                <div className="tutor-main">
                  <div className="tutor-head">
                    <h4 className="tutor-name">{t.name}</h4>
                    {(t.reviewsCount > 0 || t.rating > 0) && (
                      <span className="tutor-rating">
                        ★ {(t.rating ?? 0).toFixed(1)} ({t.reviewsCount || 0})
                      </span>
                    )}
                  </div>

                  <p className="tutor-bio">{t.bio || 'No bio yet.'}</p>

                  <div className="tutor-subjects">
                    {t.subjects?.length ? (
                      t.subjects.map((s, i) => (
                        <span className="chip" key={i}>{s}</span>
                      ))
                    ) : (
                      <span className="chip chip-muted">No subjects listed</span>
                    )}
                  </div>

                  <div className="tutor-actions">
                    <button
                      className="btn btn-primary"
                      onClick={() => navigate(`/tutors/${t._id}`)}
                    >
                      View Profile
                    </button>
                    <button
                      className="btn btn-outline"
                      onClick={() => navigate(`/messages?to=${t.userId || t._id}`)}
                    >
                      Message
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </DashboardLayout>
      <Footer />
    </>
  );
};

export default Tutors;
