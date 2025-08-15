// client/src/pages/Settings.jsx
import React, { useEffect, useMemo, useState } from 'react';
import DashboardLayout from './DashboardLayout';
import api from '../services/api';
import '../assets/Settings.css';

const FALLBACK_AVATAR = 'https://i.pravatar.cc/96?img=5';

const Settings = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  const [form, setForm] = useState({
    name: '',
    email: '',
    bio: '',
    avatarUrl: '',
    subjects: '',
  });

  const [pw, setPw] = useState({ currentPassword: '', newPassword: '' });

  const load = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/api/account/me');
      setForm({
        name: data.name || '',
        email: data.email || '',
        bio: data.bio || '',
        avatarUrl: data.avatarUrl || '',
        subjects: (data.subjects || []).join(', '),
      });
    } catch (e) {
      console.error(e);
      setMsg('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const saveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMsg('');
    try {
      const payload = {
        name: form.name.trim(),
        email: form.email.trim(),
        bio: form.bio,
        avatarUrl: form.avatarUrl.trim(),
        subjects: form.subjects
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
      };

      // PATCH profile
      const { data: updatedFromServer } = await api.patch('/api/account/me', payload);

      // Prefer server response (it may add/normalize fields). Fallback to payload.
      const updatedUser = {
        ...(JSON.parse(localStorage.getItem('user') || '{}')),
        ...(updatedFromServer || {}),
        name: (updatedFromServer?.name ?? payload.name) || '',
        email: (updatedFromServer?.email ?? payload.email) || '',
        avatarUrl: (updatedFromServer?.avatarUrl ?? payload.avatarUrl) || '',
      };

      localStorage.setItem('user', JSON.stringify(updatedUser));
      // notify Navbar (same tab) to refresh name/avatar immediately
      window.dispatchEvent(new CustomEvent('user:updated', { detail: updatedUser }));

      setMsg('Profile saved ✅');
    } catch (e) {
      console.error(e);
      setMsg(e.response?.data?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMsg('');
    try {
      await api.patch('/api/account/password', pw);
      setPw({ currentPassword: '', newPassword: '' });
      setMsg('Password updated ✅');
    } catch (e) {
      console.error(e);
      setMsg(e.response?.data?.message || 'Password change failed');
    } finally {
      setSaving(false);
    }
  };

  const deleteAccount = async () => {
    if (!window.confirm('This will permanently delete your account. Continue?')) return;
    try {
      await api.delete('/api/account/me');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/';
    } catch (e) {
      console.error(e);
      setMsg('Delete failed');
    }
  };

  // Prefer provided URL; otherwise a simple initials/fallback
  const previewSrc = useMemo(() => {
    const url = form.avatarUrl?.trim();
    if (url) return url;
    const seed = encodeURIComponent(form.name || 'User');
    return `https://api.dicebear.com/7.x/initials/svg?seed=${seed}`;
  }, [form.avatarUrl, form.name]);

  return (
    <DashboardLayout hideChat>
      <div className="card">
        <h3>Account Settings</h3>
        {msg && <div className="info mt-8">{msg}</div>}

        {loading ? (
          <p className="muted mt-12">Loading…</p>
        ) : (
          <>
            {/* Profile */}
            <div className="card mt-16">
              <h4>Profile</h4>
              <form onSubmit={saveProfile} className="stack mt-12">
                {/* Name / Email */}
                <div className="grid-2">
                  <div>
                    <label className="label">Name</label>
                    <input
                      className="input"
                      name="name"
                      value={form.name}
                      onChange={onChange}
                      required
                    />
                  </div>
                  <div>
                    <label className="label">Email</label>
                    <input
                      className="input"
                      type="email"
                      name="email"
                      value={form.email}
                      onChange={onChange}
                      required
                    />
                  </div>
                </div>

                {/* Avatar + Subjects (left) | Preview (right) */}
                <div className="grid-2">
                  <div className="stack">
                    <div>
                      <label className="label">Avatar URL</label>
                      <input
                        className="input"
                        name="avatarUrl"
                        value={form.avatarUrl}
                        onChange={onChange}
                        placeholder="https://…"
                      />
                      <small className="muted">
                        Host later with Cloudinary; for now paste a URL.
                      </small>
                    </div>

                    <div>
                      <label className="label">Subjects (comma‑separated)</label>
                      <input
                        className="input"
                        name="subjects"
                        value={form.subjects}
                        onChange={onChange}
                      />
                    </div>
                  </div>

                  {/* Large preview */}
                  <div
                    className="settings-avatar"
                    style={{ alignItems: 'center', justifyContent: 'flex-start' }}
                  >
                    <img
                      src={previewSrc}
                      alt="avatar preview"
                      width={96}
                      height={96}
                      style={{ width: 96, height: 96, borderRadius: '50%', objectFit: 'cover' }}
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = FALLBACK_AVATAR;
                      }}
                    />
                    <small className="muted">Preview</small>
                  </div>
                </div>

                <div>
                  <label className="label">Bio</label>
                  <textarea
                    className="input"
                    rows={4}
                    name="bio"
                    value={form.bio}
                    onChange={onChange}
                  />
                </div>

                <button className="btn btn-primary" disabled={saving}>
                  {saving ? 'Saving…' : 'Save changes'}
                </button>
              </form>
            </div>

            {/* Password */}
            <div className="card mt-16">
              <h4>Change Password</h4>
              <form onSubmit={changePassword} className="grid-2 mt-12">
                <div>
                  <label className="label">Current password</label>
                  <input
                    className="input"
                    type="password"
                    value={pw.currentPassword}
                    onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="label">New password</label>
                  <input
                    className="input"
                    type="password"
                    value={pw.newPassword}
                    onChange={(e) => setPw({ ...pw, newPassword: e.target.value })}
                    required
                  />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <button className="btn btn-primary" disabled={saving}>
                    {saving ? 'Updating…' : 'Update password'}
                  </button>
                </div>
              </form>
            </div>

            {/* Danger zone */}
            <div className="card mt-16">
              <h4>Danger Zone</h4>
              <p className="muted">Delete your account permanently.</p>
              <button className="btn btn-danger mt-8" onClick={deleteAccount}>
                Delete account
              </button>
            </div>
          </>
        )}
      </div>
      
    </DashboardLayout>
  );
};

export default Settings;
