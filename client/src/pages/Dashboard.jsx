import React, { useEffect, useState, useMemo } from 'react';
import DashboardLayout from './DashboardLayout';
import api from '../services/api';
import '../assets/Courses.css'; // reuse card styles if you like, or your own
import Footer from '../components/Footer';

const Dashboard = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const me = useMemo(() => JSON.parse(localStorage.getItem('user') || '{}'), []);

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await api.get('/api/posts');
        // decorate with local flags for toggling and saved state
        const decorated = data.map(p => ({
          ...p,
          _liked: false,
          _disliked: false,
          _saved: Array.isArray(p.favorites)
            ? p.favorites.some(f => String(f) === String(me.id))
            : false,
        }));
        setPosts(decorated);
      } catch (e) {
        console.error('Failed to load posts', e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [me.id]);

  const optimisticUpdate = (id, updater) => {
    setPosts(prev => prev.map(p => (p._id === id ? updater(p) : p)));
  };

  const handleLike = async (post) => {
    const toggled = !post._liked;
    // Optimistic UI: adjust likes and flags
    optimisticUpdate(post._id, p => ({
      ...p,
      _liked: toggled,
      _disliked: toggled ? false : p._disliked,
      likes: Math.max(0, p.likes + (toggled ? 1 : -1)),
      // if we are turning on like and a dislike was on, undo one dislike
      dislikes: p._disliked && toggled ? Math.max(0, p.dislikes - 1) : p.dislikes,
    }));

    try {
      await api.patch(`/api/posts/${post._id}/like`, { liked: toggled });
      if (post._disliked && toggled) {
        // also tell backend we removed the dislike
        await api.patch(`/api/posts/${post._id}/dislike`, { disliked: false });
      }
    } catch (e) {
      // rollback on failure
      optimisticUpdate(post._id, p => ({
        ...p,
        _liked: post._liked,
        _disliked: post._disliked,
        likes: post.likes,
        dislikes: post.dislikes,
      }));
      console.error('Like failed', e);
      alert('Could not update like.');
    }
  };

  const handleDislike = async (post) => {
    const toggled = !post._disliked;
    optimisticUpdate(post._id, p => ({
      ...p,
      _disliked: toggled,
      _liked: toggled ? false : p._liked,
      dislikes: Math.max(0, p.dislikes + (toggled ? 1 : -1)),
      likes: p._liked && toggled ? Math.max(0, p.likes - 1) : p.likes,
    }));

    try {
      await api.patch(`/api/posts/${post._id}/dislike`, { disliked: toggled });
      if (post._liked && toggled) {
        await api.patch(`/api/posts/${post._id}/like`, { liked: false });
      }
    } catch (e) {
      optimisticUpdate(post._id, p => ({
        ...p,
        _liked: post._liked,
        _disliked: post._disliked,
        likes: post.likes,
        dislikes: post.dislikes,
      }));
      console.error('Dislike failed', e);
      alert('Could not update dislike.');
    }
  };

  const handleSave = async (post) => {
    const toggled = !post._saved;
    optimisticUpdate(post._id, p => ({
      ...p,
      _saved: toggled,
    }));

    try {
      await api.patch(`/api/posts/${post._id}/favorite`);
    } catch (e) {
      optimisticUpdate(post._id, p => ({ ...p, _saved: post._saved }));
      console.error('Save failed', e);
      alert('Could not toggle save.');
    }
  };

  return (
    <>
    <DashboardLayout>
      <div className="card">
        <h3>Welcome back, {me?.name || 'student'}!</h3>
      </div>

      <div className="mt-16" />

      {loading ? (
        <div className="card"><p>Loading posts…</p></div>
      ) : posts.length === 0 ? (
        <div className="card">
          <p className="muted">No posts yet. (You can seed some on the backend at <code>/api/posts/seed/sample</code>.)</p>
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
                  <button
                    className={`chip ${p._liked ? 'chip-on' : ''}`}
                    onClick={() => handleLike(p)}
                    title="Upvote"
                  >
                    ▲ {p.likes}
                  </button>
                  <button
                    className={`chip ${p._disliked ? 'chip-on chip-danger' : ''}`}
                    onClick={() => handleDislike(p)}
                    title="Downvote"
                  >
                    ▼ {p.dislikes}
                  </button>

                  <button
                    className={`chip save ${p._saved ? 'chip-on' : ''}`}
                    onClick={() => handleSave(p)}
                    title={p._saved ? 'Unsave' : 'Save'}
                  >
                    {p._saved ? '★ Saved' : '☆ Save'}
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </DashboardLayout>
    <Footer/>
    </>
  );
};

export default Dashboard;
