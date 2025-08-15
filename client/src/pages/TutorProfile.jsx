import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DashboardLayout from './DashboardLayout';
import api from '../services/api';
import '../assets/TutorProfile.css';

const Star = ({ filled }) => (
  <span className={filled ? 'star filled' : 'star'} aria-hidden>★</span>
);

const Stars = ({ value = 0 }) => {
  const v = Math.round(value || 0);
  return (
    <span className="stars">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} filled={n <= v} />
      ))}
    </span>
  );
};

const TutorProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const me = useMemo(() => JSON.parse(localStorage.getItem('user') || '{}'), []);
  const myId = String(me?._id || me?.id || '');

  const [tutor, setTutor] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(true);

  const [myRating, setMyRating] = useState(5);
  const [myComment, setMyComment] = useState('');
  const [savingReview, setSavingReview] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      const [{ data: t }, { data: r }] = await Promise.all([
        api.get(`/api/tutors/${id}`),
        api.get(`/api/tutors/${id}/reviews`),
      ]);
      setTutor(t);
      setReviews(r);
    } catch (e) {
      setMsg(e.response?.data?.message || 'Failed to fetch tutor');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const submitReview = async (e) => {
    e.preventDefault();
    if (!myRating) return;
    setSavingReview(true);
    setMsg('');
    try {
      const { data } = await api.post(`/api/tutors/${id}/reviews`, {
        rating: Number(myRating),
        comment: myComment.trim(),
      });
      // optimistic add/replace my review
      setReviews((prev) => {
        const idx = prev.findIndex((x) => String(x.author?._id) === myId);
        if (idx >= 0) {
          const copy = [...prev];
          copy[idx] = data;
          return copy;
        }
        return [data, ...prev];
      });
      setMyComment('');
      // refresh summary
      const { data: fresh } = await api.get(`/api/tutors/${id}`);
      setTutor(fresh);
    } catch (e) {
      setMsg(e.response?.data?.message || 'Could not submit review');
    } finally {
      setSavingReview(false);
    }
  };

  const startMessage = () => navigate(`/messages?to=${id}`);
  // ✅ fixed: use canonical booking route
  const startBooking = () => navigate(`/book/${id}`);

  // Fallback helpers for existing seed data
  const avatarSrc =
    tutor?.avatar || tutor?.avatarUrl || 'https://i.pravatar.cc/160';
  const ratingAvg =
    typeof tutor?.ratingAvg === 'number'
      ? tutor.ratingAvg
      : tutor?.rating || 0;
  const ratingCount =
    typeof tutor?.ratingCount === 'number'
      ? tutor.ratingCount
      : tutor?.reviewsCount || 0;

  return (
    <DashboardLayout>
      {msg && (
        <div className="card">
          <div className="info">{msg}</div>
        </div>
      )}

      {loading ? (
        <div className="card">
          <p>Loading…</p>
        </div>
      ) : !tutor ? (
        <div className="card">
          <p>Not found.</p>
        </div>
      ) : (
        <>
          {/* Hero */}
          <section className="card tutor-hero">
            <div className="hero-left">
              <img className="tutor-avatar" src={avatarSrc} alt={tutor.name} />
            </div>
            <div className="hero-right">
              <h2 className="tutor-name">{tutor.name}</h2>
              <div className="rating-row">
                <Stars value={ratingAvg} />
                <span className="rating-text">
                  {Number(ratingAvg).toFixed(2)} ({ratingCount} reviews)
                </span>
              </div>
              <p className="tutor-bio">{tutor.bio || 'No bio provided yet.'}</p>
              <div className="chips">
                {(tutor.subjects || []).map((s, i) => (
                  <span key={i} className="chip">
                    {s}
                  </span>
                ))}
              </div>

              <div className="hero-actions">
                <button className="btn" onClick={startMessage}>
                  Message
                </button>
                <button className="btn btn-primary" onClick={startBooking}>
                  Book Tutor
                </button>
              </div>
            </div>
          </section>

          {/* Add review */}
          <section className="card mt-16">
            <h4>Write a review</h4>
            <form className="grid-2 mt-12" onSubmit={submitReview}>
              <div>
                <label className="label">Your rating</label>
                <select
                  className="input"
                  value={myRating}
                  onChange={(e) => setMyRating(e.target.value)}
                >
                  {[5, 4, 3, 2, 1].map((n) => (
                    <option key={n} value={n}>
                      {n} ★
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label className="label">Comment (optional)</label>
                <textarea
                  className="input"
                  rows={3}
                  value={myComment}
                  onChange={(e) => setMyComment(e.target.value)}
                  placeholder="What did you think about the sessions?"
                />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <button className="btn btn-primary" disabled={savingReview}>
                  {savingReview ? 'Saving…' : 'Submit review'}
                </button>
              </div>
            </form>
          </section>

          {/* Reviews */}
          <section className="card mt-16">
            <h4>Reviews</h4>
            {reviews.length === 0 ? (
              <p className="muted mt-12">No reviews yet. Be the first!</p>
            ) : (
              <ul className="reviews mt-12">
                {reviews.map((r) => (
                  <li key={r._id} className="review">
                    <div className="review-left">
                      <img
                        className="review-avatar"
                        src={r.author?.avatarUrl || 'https://i.pravatar.cc/48'}
                        alt={r.author?.name || 'User'}
                      />
                    </div>
                    <div className="review-body">
                      <div className="review-head">
                        <strong>{r.author?.name || 'User'}</strong>
                        <span className="review-rating">
                          <Stars value={r.rating} />
                        </span>
                        <span className="review-time">
                          {new Date(r.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      {r.comment ? (
                        <p className="review-text">{r.comment}</p>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </DashboardLayout>
  );
};

export default TutorProfile;
