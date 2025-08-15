// client/src/pages/CheckoutSuccess.jsx
import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import DashboardLayout from './DashboardLayout';
import '../assets/Checkout.css';

const CAD = (n) => `$${Number(n || 0).toFixed(2)}`;

export default function CheckoutSuccess() {
  const { state } = useLocation();
  const navigate = useNavigate();

  const tutor = state?.tutor || {};
  const student = state?.student || {};
  const booking = state?.booking || {};
  const pricing = state?.pricing || {};
  const usedPromo = state?.usedPromo || null;

  if (!tutor?._id || !booking?.duration) {
    return (
      <DashboardLayout>
        <div className="ck-guard">
          <h3>Payment received</h3>
          <p className="muted">No recent booking found.</p>
          <a className="btn" href="/tutors">Find a tutor</a>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="ck-grid success">
        <section className="ck-card ck-receipt">
          <div className="success-head">
            <div className="check">✅</div>
            <div>
              <h3>Payment received (mock)</h3>
              <div className="muted">We saved your booking and sent confirmation emails.</div>
            </div>
          </div>

          <div className="ck-two">
            <div className="ck-box">
              <div className="ck-label">Booking</div>
              <div className="mini-tutor">
                <img src={tutor.avatar} alt={tutor.name} />
                <div>
                  <div className="tutor-name">{tutor.name}</div>
                  <div className="muted">{booking.subject} • {booking.duration} min</div>
                  <div className="muted">
                    {booking.date}, {booking.time} ({booking.timezone})
                  </div>
                </div>
              </div>
            </div>
            <div className="ck-box">
              <div className="ck-label">Receipt</div>
              <div className="sum-row"><span>Lesson price</span><span>{CAD(pricing.base)}</span></div>
              {pricing.discount > 0 && (
                <div className="sum-row small green">
                  <span>Promo {usedPromo ? `(${usedPromo})` : ''}</span>
                  <span>− {CAD(pricing.discount)}</span>
                </div>
              )}
              <div className="sum-row"><span>Service fee (3%)</span><span>{CAD(pricing.serviceFee)}</span></div>
              <div className="sum-row"><span>Tax (13%)</span><span>{CAD(pricing.tax)}</span></div>
              <div className="sum-row total"><span>Total</span><span>{CAD(pricing.total)}</span></div>
            </div>
          </div>

          <div className="ck-actions">
            <button className="btn" onClick={() => navigate(`/messages?to=${tutor._id}`)}>
              Message tutor
            </button>
            <button className="btn ghost" onClick={() => navigate('/tutors')}>Find another tutor</button>
          </div>
        </section>
      </div>
    </DashboardLayout>
  );
}
