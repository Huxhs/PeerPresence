import React, { useEffect, useState } from 'react';
import api from '../services/api';

const Feed = () => {
  const [posts, setPosts] = useState([]);
  const [busy, setBusy] = useState(false);
  const me = JSON.parse(localStorage.getItem('user') || '{}');

  const load = async () => {
    try {
      const { data } = await api.get('/api/posts');
      setPosts(data);
    } catch {
      // ignore for now
    }
  };

  useEffect(() => { load(); }, []);

  const vote = async (id, value) => {
    try {
      setBusy(true);
      const { data } = await api.patch(`/api/posts/${id}/vote`, { value });
      setPosts(p =>
        p.map(x => x._id === id ? { ...x, score: data.score, myVote: data.myVote } : x)
      );
    } finally {
      setBusy(false);
    }
  };

  const toggleSave = async (id) => {
    try {
      const { data } = await api.post(`/api/posts/${id}/toggle-save`);
      setPosts(p => p.map(x => x._id === id ? { ...x, saved: data.saved } : x));
    } catch {}
  };

  if (!posts.length) {
    return (
      <div className="card">
        <h4>Welcome back, {me?.name || 'there'}!</h4>
        <p className="muted">No posts yet. (You can seed some on the backend at <code>/api/posts/seed/sample</code>.)</p>
      </div>
    );
  }

  return (
    <div className="feed-grid">
      {posts.map(p => (
        <article key={p._id} className="post-card card">
          {p.imageUrl && (
            <div className="post-media">
              <img src={p.imageUrl} alt={p.title} loading="lazy" />
            </div>
          )}
          <div className="post-body">
            <h3 className="post-title">{p.title}</h3>
            <p className="post-desc">{p.description}</p>

            <div className="post-actions">
              <div className="vote">
                <button
                  className={`vote-btn up ${p.myVote === 1 ? 'active' : ''}`}
                  disabled={busy}
                  onClick={() => vote(p._id, 1)}
                  aria-label="Upvote"
                >▲</button>
                <span className="score">{p.score ?? 0}</span>
                <button
                  className={`vote-btn down ${p.myVote === -1 ? 'active' : ''}`}
                  disabled={busy}
                  onClick={() => vote(p._id, -1)}
                  aria-label="Downvote"
                >▼</button>
              </div>

              <button
                className={`btn ${p.saved ? 'btn-primary' : ''}`}
                onClick={() => toggleSave(p._id)}
              >
                {p.saved ? 'Saved' : 'Save'}
              </button>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
};

export default Feed;
