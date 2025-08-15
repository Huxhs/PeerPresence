import React, { useEffect, useMemo, useState } from 'react';
import DashboardLayout from './DashboardLayout';
import api from '../services/api';
import '../assets/Courses.css'; // reuse card styles, or add your own small CSS

const Saved = () => {
  const me = useMemo(() => JSON.parse(localStorage.getItem('user') || '{}'), []);
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState([]);
  const [msg, setMsg] = useState('');

  const load = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/api/posts/saved');
      const withFlags = data.map(p => ({
        ...p,
        _saved: true, // everything on this page is saved
      }));
      setPosts(withFlags);
    } catch (e) {
      console.error(e);
      setMsg(e.response?.data?.message || 'Failed to load saved posts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const toggleSave = async (post) => {
    // optimistic remove from list
    const prev = posts;
    setPosts(prev.filter(p => p._id !== post._id));
    try {
      await api.patch(`/api/posts/${post._id}/favorite`);
      // success: nothing else to do
    } catch (e) {
      // rollback
      setPosts(prev);
      alert('Could not toggle save.');
    }
  };

  return (
    <DashboardLayout>
      <div className="card">
        <h3>Saved Posts</h3>
        <p className="muted">Quick access to items you bookmarked.</p>
      </div>

      {msg && <div className="card mt-12"><div className="info">{msg}</div></div>}

      <div className="mt-16" />

      {loading ? (
        <div className="card"><p>Loading…</p></div>
      ) : posts.length === 0 ? (
        <div className="card">
          <p className="muted">Nothing saved yet. Go to the Dashboard and hit “Save”.</p>
        </div>
      ) : (
        <div className="post-grid">
          {posts.map(p => (
            <article key={p._id} className="post-card card">
              <div className="post-image-wrap">
                <img className="post-image" src={p.imageUrl || 'https://picsum.photos/seed/placeholder/800/450'} alt={p.title} />
              </div>
              <div className="post-body">
                <h4 className="post-title">{p.title}</h4>
                <p className="post-desc">{p.description}</p>

                <div className="post-actions">
                  <span className="chip" title="Upvotes">▲ {p.likes}</span>
                  <span className="chip" title="Downvotes">▼ {p.dislikes}</span>
                  <button
                    className="chip save chip-on"
                    onClick={() => toggleSave(p)}
                    title="Unsave"
                    style={{ marginLeft: 'auto' }}
                  >
                    ★ Unsave
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
};

export default Saved;
