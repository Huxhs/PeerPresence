// client/src/pages/Checkout.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from './DashboardLayout';
import '../assets/Checkout.css';
import api from '../services/api';
import { getTutorById } from '../services/tutors';
import { confirmBooking } from '../services/bookings';

const CAD = new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' });
const baseFromDuration = (d) => (String(d) === '30' ? 30 : String(d) === '90' ? 80 : 55);
const buildDateTime = (dateStr, timeStr) => {
  try {
    if (!dateStr || !timeStr) return null;
    const [y, m, d] = (dateStr || '').split('-').map(Number);
    const [hh, mm] = (timeStr || '').split(':').map(Number);
    return new Date(y, (m || 1) - 1, d || 1, hh || 0, mm || 0, 0, 0);
  } catch {
    return null;
  }
};

// Simple short id from Mongo ObjectId
const shortId = (id = '') => (id.length >= 6 ? id.slice(-6).toUpperCase() : id);

export default function Checkout() {
  const navigate = useNavigate();
  const [draft, setDraft] = useState(null);
  const [student, setStudent] = useState(null);
  const [tutor, setTutor] = useState(null);

  const [method, setMethod] = useState('card'); // 'apple','google','paypal','card'
  const [promoCode, setPromoCode] = useState('');
  const [promoApplied, setPromoApplied] = useState(null); // {code, pct}

  const [card, setCard] = useState({ nameOnCard: '', cardNumber: '', expiry: '', cvc: '', postalCode: '' });

  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(null);
  const [error, setError] = useState('');

  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;

  useEffect(() => {
    // booking draft from BookTutor page
    let parsed = null;
    try {
      parsed = JSON.parse(localStorage.getItem('bookingDraft') || 'null');
    } catch {}
    if (!parsed || !parsed.tutorId) {
      setError('No booking draft found. Please start from a tutor page.');
      return;
    }
    setDraft(parsed);

    let alive = true;
    // student info
    api.get('/api/account/me').then(({ data }) => alive && setStudent(data)).catch(() => {});
    // tutor info
    getTutorById(parsed.tutorId)
      .then((t) => alive && setTutor(t))
      .catch(() => alive && setError('Could not load tutor info.'));
    return () => { alive = false; };
  }, []);

  // derived date/times
  const whenLocal = useMemo(() => {
    if (!draft) return '';
    const dt = buildDateTime(draft.date, draft.time);
    if (!dt) return '';
    return new Intl.DateTimeFormat(undefined, { dateStyle: 'full', timeStyle: 'short' }).format(dt);
  }, [draft]);

  const whenUTC = useMemo(() => {
    if (!draft) return '';
    const dt = buildDateTime(draft.date, draft.time);
    if (!dt) return '';
    return new Intl.DateTimeFormat('en-CA', { dateStyle: 'full', timeStyle: 'short', timeZone: 'UTC' }).format(dt);
  }, [draft]);

  // client-side preview (server also recomputes)
  const pricing = useMemo(() => {
    if (!draft) return null;
    const base = baseFromDuration(draft.duration);
    const discountPct = promoApplied?.pct || 0; // e.g., 0.10
    const discounted = +(base * (1 - discountPct)).toFixed(2);
    const service = +(discounted * 0.03).toFixed(2);
    const tax = +(discounted * 0.13).toFixed(2);
    const total = +(discounted + service + tax).toFixed(2);
    return { base, discounted, discountPct, service, tax, total };
  }, [draft, promoApplied]);

  const applyPromo = () => {
    const code = (promoCode || '').trim().toUpperCase();
    if (!code) return setPromoApplied(null);
    if (code === 'NEWUSER') {
      setPromoApplied({ code, pct: 0.1 });
    } else {
      setPromoApplied({ code, pct: 0, invalid: true });
    }
  };

  const onPay = async () => {
    if (!draft) return;
    setSubmitting(true);
    setError('');
    try {
      const res = await confirmBooking({
        ...draft,
        timezone: tz,
        currency: 'CAD',
        promoCode: promoApplied?.code || '',
        // “payment” strings (no processor in demo)
        method,
        ...card,
      });

      setDone(res);
      localStorage.removeItem('bookingDraft');

      // 🔄 Refresh cached user to include updated subjects for sidebar/shortcuts
      try {
        const prev = JSON.parse(localStorage.getItem('user') || '{}');
        if (res?.userSubjects) {
          const updated = { ...prev, subjects: res.userSubjects };
          localStorage.setItem('user', JSON.stringify(updated));
          // also update local state so "Billed to" (or anything else) reflects instantly
          setStudent((s) => (s ? { ...s, subjects: res.userSubjects } : s));
        }
      } catch { /* ignore cache issues */ }
    } catch (e) {
      setError(e?.response?.data?.message || 'Payment failed (mock). Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="checkout-wrap">

        {error && (
          <div className="card error">
            <h4>We couldn’t complete checkout</h4>
            <p className="muted">{error}</p>
            <div className="row-gap">
              <button className="btn" onClick={() => navigate(-1)}>Go back</button>
              <button className="btn btn-primary" onClick={() => navigate('/tutors')}>Browse tutors</button>
            </div>
          </div>
        )}

        {!error && !draft && <div className="card"><p className="muted">Preparing checkout…</p></div>}

        {/* ===================== CHECKOUT ===================== */}
        {!error && draft && !done && pricing && (
          <>
            {/* Brand + header */}
            <div className="card head">
              <div className="brand-bill">
                <div className="brand-row">
                  <div className="mini-logo" aria-hidden>🎓</div>
                  <div className="brand-name">PeerPresence Tutoring Inc.</div>
                </div>
                <div className="brand-sub muted">Invoice preview • {new Date().toLocaleDateString()}</div>
              </div>

              <div className="head-left">
                <img className="head-avatar" src={draft.tutorAvatar} alt={draft.tutorName} />
                <div>
                  <div className="head-tutor">{draft.tutorName}</div>
                  <div className="head-sub">
                    {draft.subject || 'Subject'} • {draft.duration} min
                    <span className="dot">•</span>
                    <span className="when">{whenLocal}</span>
                    <span className="tz">({tz})</span>
                  </div>
                </div>
              </div>

              <button className="btn" onClick={() => navigate(`/book/${draft.tutorId}`)}>Edit booking</button>
            </div>

            {/* Billed to */}
            <div className="card billed">
              <div><div className="label-sm">Billed to</div>
                <div className="bill-name">{student?.name || 'Student'}</div>
                <div className="muted small">{student?.email || ''}</div>
              </div>
              <div>
                <div className="label-sm">Tutor</div>
                <div className="bill-name">{draft.tutorName}</div>
                <div className="muted small">{tutor?.email || ''}</div>
              </div>
            </div>

            <div className="grid-3-columns">
              {/* Payment methods */}
              <section className="card pay">
                <div className="tabs">
                  {['apple','google','paypal','card'].map((m) => (
                    <button
                      key={m}
                      className={`tab ${method===m ? 'active':''}`}
                      onClick={() => setMethod(m)}
                    >
                      {m==='apple' ? 'Apple Pay' : m==='google' ? 'Google Pay' : m==='paypal' ? 'PayPal' : 'Card'}
                    </button>
                  ))}
                </div>

                {method !== 'card' && (
                  <div className="alt-box">
                    <p className="muted small">
                      This is a demo. {method === 'apple' ? 'Apple Pay' : method === 'google' ? 'Google Pay' : 'PayPal'} is not enabled.
                      Click <b>Pay</b> to simulate a successful charge and receive a confirmation email.
                    </p>
                  </div>
                )}

                {method === 'card' && (
                  <>
                    <div className="grid-2">
                      <div>
                        <label className="label">Name on card</label>
                        <input
                          className="input"
                          placeholder="Jane Student"
                          value={card.nameOnCard}
                          onChange={(e) => setCard({ ...card, nameOnCard: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="label">Card number</label>
                        <input
                          className="input"
                          placeholder="4242 4242 4242 4242"
                          value={card.cardNumber}
                          onChange={(e) => setCard({ ...card, cardNumber: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="grid-3">
                      <div>
                        <label className="label">Expiry</label>
                        <input
                          className="input"
                          placeholder="MM/YY"
                          value={card.expiry}
                          onChange={(e) => setCard({ ...card, expiry: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="label">CVC</label>
                        <input
                          className="input"
                          placeholder="123"
                          value={card.cvc}
                          onChange={(e) => setCard({ ...card, cvc: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="label">Postal code</label>
                        <input
                          className="input"
                          placeholder="A1A 1A1"
                          value={card.postalCode}
                          onChange={(e) => setCard({ ...card, postalCode: e.target.value })}
                        />
                      </div>
                    </div>
                  </>
                )}

                {/* Promo code */}
                <div className="promo-row">
                  <input
                    className="input"
                    placeholder="Promo code"
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value)}
                  />
                  <button className="btn" onClick={applyPromo}>Apply</button>
                </div>
                {promoApplied && (
                  <div className={`promo-status ${promoApplied.invalid ? 'bad' : 'good'}`}>
                    {promoApplied.invalid ? 'Invalid code' : `Applied ${promoApplied.code} — 10% off`}
                  </div>
                )}

                <div className="legal small muted">
                  By paying, you agree to the
                  {' '}<a href="/terms">Terms</a> and <a href="/refunds">Refund Policy</a>.
                  All amounts in CAD.
                </div>

                <button className="btn btn-primary pay-btn" disabled={submitting} onClick={onPay}>
                  {submitting ? 'Processing…' : `Pay ${CAD.format(pricing.total)}`}
                </button>
              </section>

              {/* Order summary */}
              <aside className="card summary-card">
                <h4>Summary</h4>
                <ul className="summary-list">
                  <li><span>Lesson price</span><span>
                    {promoApplied?.pct ? <><s className="muted">{CAD.format(pricing.base)}</s> {CAD.format(pricing.discounted)}</> : CAD.format(pricing.base)}
                  </span></li>
                  <li><span>Service fee (3%)</span><span>{CAD.format(pricing.service)}</span></li>
                  <li><span>Tax (13%)</span><span>{CAD.format(pricing.tax)}</span></li>
                  <li className="total"><span>Total</span><span>{CAD.format(pricing.total)}</span></li>
                </ul>
                <p className="muted small">
                  You won’t be charged in this demo. Clicking <b>Pay</b> saves your booking and emails a receipt.
                </p>
              </aside>

              {/* Tutor snapshot */}
              <aside className="card mini-tutor">
                <div className="mini-row">
                  <img className="mini-avatar" src={draft.tutorAvatar} alt={draft.tutorName} />
                  <div>
                    <div className="mini-name">{draft.tutorName}</div>
                    <div className="mini-meta">{draft.subject || 'Subject'} • {draft.duration} min</div>
                  </div>
                </div>
                <div className="mini-since muted small">Local time: {whenLocal} — UTC: {whenUTC}</div>
              </aside>
            </div>
          </>
        )}

        {/* ===================== SUCCESS ===================== */}
        {!error && done && (
          <div className="card success">
            <div className="success-head">
              <div className="badge">Payment received (mock)</div>
              <h3>Thanks! Your session is booked.</h3>
              <div className="muted small">Confirmation #{shortId(done.id)} · Email sent to you and your tutor.</div>
            </div>

            <div className="grid-2">
              <section className="success-col">
                <h4>Booking</h4>
                <ul className="summary-list flush">
                  <li><span>Tutor</span><span>{done.tutor?.name}</span></li>
                  <li><span>Subject</span><span>{done.booking?.subject}</span></li>
                  <li>
                    <span>Date & time</span>
                    <span>
                      {whenLocal} <span className="muted">({tz})</span>
                      <div className="muted small">UTC: {whenUTC}</div>
                    </span>
                  </li>
                  <li><span>Duration</span><span>{done.booking?.duration} minutes</span></li>
                </ul>
              </section>

              <section className="success-col">
                <h4>Receipt — PeerPresence Tutoring Inc.</h4>
                <ul className="summary-list">
                  <li><span>Lesson price</span><span>{CAD.format(done.pricing.base)}</span></li>
                  {done.pricing.discount && done.pricing.discount > 0 && (
                    <li><span>Promo</span><span>-{CAD.format(done.pricing.discount)}</span></li>
                  )}
                  <li><span>Service fee (3%)</span><span>{CAD.format(done.pricing.serviceFee)}</span></li>
                  <li><span>Tax (13%)</span><span>{CAD.format(done.pricing.tax)}</span></li>
                  <li className="total"><span>Total (CAD)</span><span>{CAD.format(done.pricing.total)}</span></li>
                </ul>

                <div className="actions">
                  <button className="btn" onClick={() => window.print()}>Download receipt</button>
                  <button className="btn" onClick={() => navigate(`/messages?to=${done.tutor?._id}`)}>Message tutor</button>
                  <button className="btn btn-primary" onClick={() => navigate('/tutors')}>Find another tutor</button>
                </div>
              </section>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
