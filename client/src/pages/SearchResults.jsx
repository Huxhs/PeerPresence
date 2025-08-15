// client/src/pages/SearchResults.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import DashboardLayout from './DashboardLayout';
import { searchTutors } from '../services/search';
import '../assets/Results.css';

const useQuery = () => {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
};

const avatarFor = (t) =>
  t.avatar ||
  t.avatarUrl ||
  `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(t.name || 'Tutor')}&radius=50&bold=true`;

const SearchResults = () => {
  const q = useQuery().get('q') || '';
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [allTutors, setAllTutors] = useState([]);
  const [visible, setVisible] = useState(10);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        // grab a healthy chunk; we’ll show 10 then "Load more"
        const tutors = await searchTutors(q, 50);
        if (alive) {
          setAllTutors(tutors || []);
          setVisible(10);
        }
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [q]);

  const list = allTutors.slice(0, visible);
  const canLoadMore = visible < allTutors.length;

  return (
    <DashboardLayout>
      <div className="results-wrap">
        <h3>Search results for “{q}”</h3>

        {loading ? (
          <p className="muted">Searching…</p>
        ) : allTutors.length === 0 ? (
          <div className="empty">
            <div className="empty-emoji" aria-hidden>🔍🧐</div>
            <h4>No tutors match “{q}”.</h4>
            <p className="muted">
              Try a different keyword, or{' '}
              <button className="link-btn" onClick={() => navigate('/tutors')}>browse tutors</button>{' '}
              /{' '}
              <button className="link-btn" onClick={() => navigate('/courses')}>browse courses</button>.
            </p>
          </div>
        ) : (
          <>
            <ul className="tutor-card-list">
              {list.map((t) => (
                <li key={t._id} className="tutor-card">
                  <img className="tutor-card-avatar" src={avatarFor(t)} alt={t.name} />
                  <div className="tutor-card-main">
                    <div className="tutor-card-top">
                      <div className="tutor-card-name">{t.name}</div>
                      {(t.rating || t.reviewsCount) && (
                        <div className="tutor-card-rating" title={`${t.rating || '—'} • ${t.reviewsCount || 0} reviews`}>
                          <span>⭐</span>
                          <strong>{t.rating?.toFixed ? t.rating.toFixed(1) : t.rating || '—'}</strong>
                          <span className="muted">({t.reviewsCount || 0})</span>
                        </div>
                      )}
                    </div>

                    {Array.isArray(t.subjects) && t.subjects.length > 0 && (
                      <div className="tutor-card-subjects">
                        {t.subjects.slice(0, 4).map((s, i) => (
                          <span key={i} className="pill">{s}</span>
                        ))}
                      </div>
                    )}

                    {t.bio && (
                      <div className="tutor-card-bio">
                        {t.bio.length > 140 ? `${t.bio.slice(0, 140)}…` : t.bio}
                      </div>
                    )}

                    <div className="tutor-card-actions">
                      <button
                        className="btn"
                        onClick={() => navigate(`/messages?to=${t._id}`)}
                      >
                        Message
                      </button>
                      <button
                        className="btn btn-secondary"
                        onClick={() => navigate(`/tutors/${t._id}`)}
                      >
                        View profile
                      </button>
                      <button
  className="btn btn-primary"
  onClick={() => navigate(`/book/${t._id}`)}
>
  Book Tutor
</button>

                    </div>
                  </div>
                </li>
              ))}
            </ul>

            {canLoadMore && (
              <div className="results-loadmore">
                <button className="btn" onClick={() => setVisible((v) => v + 10)}>
                  Load more
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default SearchResults;
