// client/src/pages/BookTutor.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import DashboardLayout from './DashboardLayout';
import { getTutorById } from '../services/tutors';
import '../assets/Book.css';

const avatarFor = (t = {}) =>
  t.avatar ||
  t.avatarUrl ||
  `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
    t.name || 'Tutor'
  )}&radius=50&bold=true`;

const todayStr = () => {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const BookTutor = () => {
  // Accept both /book/:tutorId and /tutors/:id/book
  const params = useParams();
  const tutorId = params.tutorId || params.id;

  const navigate = useNavigate();

  // auth soft-guard
  const user = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('user') || '{}');
    } catch {
      return {};
    }
  }, []);
  const token = localStorage.getItem('token');

  const [loading, setLoading] = useState(true);
  const [tutor, setTutor] = useState(null);
  const [err, setErr] = useState('');

  // form state
  const [form, setForm] = useState({
    subject: '',
    date: '',
    time: '',
    duration: '60',
    topic: '',
    agree: false,
    signatureName: '',
    signatureDate: todayStr(),
  });

  // Prefill signature name
  useEffect(() => {
    if (user?.name && !form.signatureName) {
      setForm((f) => ({ ...f, signatureName: user.name }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.name]);

  useEffect(() => {
    if (!token) {
      navigate('/login?next=' + encodeURIComponent(`/book/${tutorId}`));
      return;
    }
    let alive = true;
    (async () => {
      try {
        const t = await getTutorById(tutorId);
        if (alive) {
          setTutor(t);
          if (t?.subjects?.length) {
            setForm((f) => ({ ...f, subject: f.subject || t.subjects[0] }));
          }
        }
      } catch (e) {
        setErr('Failed to load tutor.');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [tutorId, token, navigate]);

  const onChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((f) => ({ ...f, [name]: type === 'checkbox' ? checked : value }));
  };

  const isValid = useMemo(() => {
    return (
      form.subject &&
      form.date &&
      form.time &&
      form.duration &&
      form.agree &&
      form.signatureName &&
      form.signatureDate
    );
  }, [form]);

  const onCheckout = (e) => {
    e.preventDefault();
    if (!isValid) return;

    // Keep date & time as separate strings; also include a combined ISO for convenience
    let combinedISO = null;
    try {
      const dt = new Date(`${form.date}T${form.time}:00`);
      if (!isNaN(dt.getTime())) combinedISO = dt.toISOString();
    } catch {
      // ignore
    }

    const draft = {
      tutorId,
      tutorName: tutor?.name,
      tutorAvatar: avatarFor(tutor),
      studentId: user?._id,
      studentName: user?.name,
      ...form,
      combinedISO,
    };
    localStorage.setItem('bookingDraft', JSON.stringify(draft));
    navigate('/checkout');
  };

  const goBack = () => navigate(`/tutors/${tutorId}`);

  return (
    <DashboardLayout>
      <div className="book-wrap">
        {loading ? (
          <p className="muted">Loading tutor…</p>
        ) : err ? (
          <div className="card error">{err}</div>
        ) : (
          <div className="stack-16">
            {/* 1) Profile hero (horizontal) */}
            <div className="card book-hero">
              <img className="book-avatar" src={avatarFor(tutor)} alt={tutor.name} />
              <div className="book-hero-main">
                <div className="book-name">{tutor.name}</div>
                {(tutor.rating || tutor.reviewsCount) && (
                  <div className="book-rating">
                    <span aria-hidden>⭐</span>
                    <strong>
                      {tutor.rating?.toFixed ? tutor.rating.toFixed(1) : tutor.rating || '—'}
                    </strong>
                    <span className="muted">({tutor.reviewsCount || 0} reviews)</span>
                  </div>
                )}

                {Array.isArray(tutor.subjects) && tutor.subjects.length > 0 && (
                  <div className="book-tags">
                    {tutor.subjects.slice(0, 6).map((s, i) => (
                      <span key={i} className="pill">
                        {s}
                      </span>
                    ))}
                  </div>
                )}

                {/* Socials row (placeholder links) */}
                <div className="book-socials">
                  <a
                    className="soc"
                    href="https://twitter.com"
                    target="_blank"
                    rel="noreferrer"
                    aria-label="Twitter (X)"
                  >
                    𝕏
                  </a>
                  <a
                    className="soc"
                    href="https://www.linkedin.com"
                    target="_blank"
                    rel="noreferrer"
                    aria-label="LinkedIn"
                  >
                    in
                  </a>
                  <a
                    className="soc"
                    href="https://github.com"
                    target="_blank"
                    rel="noreferrer"
                    aria-label="GitHub"
                  >
                    GH
                  </a>
                </div>
              </div>
            </div>

            {/* 2) About (bio only) */}
            <section className="card about full">
              <h4>About {tutor.name.split(' ')[0]}</h4>
              <p className="about-text">
                {tutor.bio || 'This tutor has not added a bio yet.'}
              </p>
            </section>

            {/* 3) Book a session (wide) */}
            <section className="card form full">
              <h4>Book a session</h4>
              <form onSubmit={onCheckout} className="stack-12">
                {/* Course / Subject */}
                <div>
                  <label className="label">Course / subject</label>
                  <select
                    className="input"
                    name="subject"
                    value={form.subject}
                    onChange={onChange}
                    required
                  >
                    {!form.subject && <option value="">Select a subject…</option>}
                    {(tutor.subjects || []).map((s, i) => (
                      <option key={i} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Date & time */}
                <div className="grid-2">
                  <div>
                    <label className="label">Preferred date</label>
                    <input
                      className="input"
                      type="date"
                      name="date"
                      min={todayStr()}
                      value={form.date}
                      onChange={onChange}
                      required
                    />
                  </div>
                  <div>
                    <label className="label">Preferred time</label>
                    <input
                      className="input"
                      type="time"
                      name="time"
                      step="900" /* 15-min increments */
                      value={form.time}
                      onChange={onChange}
                      required
                    />
                  </div>
                </div>

                {/* Duration */}
                <div>
                  <label className="label">Duration</label>
                  <select
                    className="input"
                    name="duration"
                    value={form.duration}
                    onChange={onChange}
                  >
                    <option value="30">30 minutes</option>
                    <option value="60">60 minutes</option>
                    <option value="90">90 minutes</option>
                  </select>
                </div>

                {/* Topic / goals */}
                <div>
                  <label className="label">Topic / goals for this session</label>
                  <textarea
                    className="input"
                    name="topic"
                    rows={4}
                    placeholder="What would you like to cover?"
                    value={form.topic}
                    onChange={onChange}
                  />
                </div>

                {/* Terms */}
                <div className="terms">
                  <div className="terms-box">
                    <p>
                      <strong>Terms &amp; Conditions</strong>
                    </p>
                    <p className="muted">
                      Sessions must be rescheduled at least 24 hours in advance. No-shows may
                      be charged the full session fee. Be respectful and abide by your
                      school’s academic integrity policy. By continuing you agree to these
                      terms.
                    </p>
                  </div>
                  <label className="check">
                    <input
                      type="checkbox"
                      name="agree"
                      checked={form.agree}
                      onChange={onChange}
                    />
                    <span>I have read and agree to the Terms &amp; Conditions.</span>
                  </label>
                </div>

                {/* Signature */}
                <div className="grid-2">
                  <div>
                    <label className="label">Signature (your full name)</label>
                    <input
                      className="input"
                      name="signatureName"
                      value={form.signatureName}
                      onChange={onChange}
                      placeholder={user?.name || 'Your name'}
                      required
                    />
                  </div>
                  <div>
                    <label className="label">Signature date</label>
                    <input
                      className="input"
                      type="date"
                      name="signatureDate"
                      min={todayStr()}
                      value={form.signatureDate}
                      onChange={onChange}
                      required
                    />
                  </div>
                </div>

                <div className="book-actions">
                  <button
                    type="button"
                    className="btn"
                    onClick={goBack}
                    title="Back to profile"
                  >
                    Back
                  </button>
                  <button
                    className="btn btn-primary lg"
                    type="submit"
                    disabled={!isValid}
                    title={!isValid ? 'Complete required fields' : 'Continue'}
                  >
                    Continue to checkout
                  </button>
                </div>
              </form>
            </section>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default BookTutor;
