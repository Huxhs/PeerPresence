// client/src/components/Navbar.jsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import io from 'socket.io-client';
import api from '../services/api';
import '../assets/Navbar.css';
import { searchTutors, searchSubjects } from '../services/search';

const readUser = () => {
  try {
    return JSON.parse(localStorage.getItem('user') || '{}');
  } catch {
    return {};
  }
};
const firstNameOf = (u = {}) =>
  (u.name || u.email?.split('@')[0] || 'User').split(/\s+/)[0];
const avatarOf = (u = {}) =>
  u.avatarUrl ||
  `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
    u.name || u.email || 'user'
  )}&radius=50&bold=true`;

const Navbar = ({
  currentUser: currentUserProp,
  onToggleSidebar,
  onSearch,
  unreadCount = 0,
}) => {
  const navigate = useNavigate();
  useLocation(); // keep NavLink highlights in sync

  // --- current user
  const [user, setUser] = useState(
    Object.keys(currentUserProp || {}).length ? currentUserProp : readUser()
  );
  useEffect(() => {
    if (currentUserProp && Object.keys(currentUserProp).length) {
      setUser(currentUserProp);
    }
  }, [currentUserProp]);
  useEffect(() => {
    const s = (e) => {
      if (e.key === 'user') setUser(readUser());
    };
    const u = (e) => setUser(e.detail || readUser());
    window.addEventListener('storage', s);
    window.addEventListener('user:updated', u);
    return () => {
      window.removeEventListener('storage', s);
      window.removeEventListener('user:updated', u);
    };
  }, []);

  // --- theme
  const [theme, setTheme] = useState('light');
  useEffect(() => {
    const stored = localStorage.getItem('pp-theme');
    const initial =
      stored ??
      (window.matchMedia?.('(prefers-color-scheme: dark)')?.matches
        ? 'dark'
        : 'light');
    setTheme(initial);
    document.documentElement.setAttribute('data-theme', initial);
  }, []);
  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem('pp-theme', next);
    document.documentElement.setAttribute('data-theme', next);
  };

  // --- search state
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState({ tutors: [], subjects: [] });
  const [cursor, setCursor] = useState(-1);
  const inputRef = useRef(null);
  const boxRef = useRef(null);
  const debounceRef = useRef(null);

  const combinedList = useMemo(() => {
    const t = (suggestions.tutors || []).map((x) => ({ ...x, _kind: 'tutor' }));
    const s = (suggestions.subjects || []).map((x) => ({
      ...x,
      _kind: 'subject',
    }));
    return [...t, ...s];
  }, [suggestions]);

  const runSearch = async (value) => {
    const query = value.trim();
    if (query.length < 2) {
      setSuggestions({ tutors: [], subjects: [] });
      setOpen(false);
      return;
    }
    setLoading(true);
    try {
      const [t, s] = await Promise.all([
        searchTutors(query, 5),
        searchSubjects(query, 5),
      ]);
      setSuggestions({ tutors: t || [], subjects: s || [] });
      setOpen(true);
      setCursor(-1);
    } catch (e) {
      console.error('autocomplete search error', e);
    } finally {
      setLoading(false);
    }
  };

  const onChange = (e) => {
    const value = e.target.value;
    setQ(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runSearch(value), 250);
  };

  const submitSearch = (e) => {
    e?.preventDefault?.();
    const query = q.trim();
    if (!query) return;
    onSearch?.(query);
    setOpen(false);
    navigate(`/search?q=${encodeURIComponent(query)}`);
  };

  const chooseSuggestion = (item) => {
    if (!item) return;
    setOpen(false);
    if (item._kind === 'tutor' && item._id) {
      navigate(`/tutors/${item._id}`);
      return;
    }
    if (item._kind === 'subject') {
      const subject = item.name || item.title || q.trim();
      navigate(`/tutors?subject=${encodeURIComponent(subject)}`);
      return;
    }
    const query = q.trim() || item.name || item.title || '';
    if (query) navigate(`/search?q=${encodeURIComponent(query)}`);
  };

  const onKeyDown = (e) => {
    if (!open) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setCursor((c) => Math.min(c + 1, combinedList.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setCursor((c) => Math.max(c - 1, -1));
    } else if (e.key === 'Enter') {
      if (cursor >= 0) {
        e.preventDefault();
        chooseSuggestion(combinedList[cursor]);
      } else {
        submitSearch(e);
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  useEffect(() => {
    const onClick = (e) => {
      const inBox = boxRef.current?.contains(e.target);
      const inInput = inputRef.current?.contains(e.target);
      if (!inBox && !inInput) setOpen(false);
    };
    window.addEventListener('click', onClick);
    return () => window.removeEventListener('click', onClick);
  }, []);

  const firstName = firstNameOf(user);
  const avatarSrc = avatarOf(user);

  // --- DM badge via Socket.io (personal room notifications)
  const [dmCount, setDmCount] = useState(unreadCount || 0);
  useEffect(() => {
    const me = readUser();
    const myId = String(me?._id || me?.id || '');
    if (!myId) return;

    const baseURL =
      api.defaults.baseURL?.replace('/api', '') || 'http://localhost:5001';
    const s = io(baseURL, { query: { userId: myId } });

    // server emits 'notify:dm' to room `user:<id>`
    s.on('notify:dm', () => setDmCount((prev) => prev + 1));

    const clear = () => setDmCount(0);
    window.addEventListener('dm:clear', clear);

    return () => {
      window.removeEventListener('dm:clear', clear);
      s.disconnect();
    };
  }, []);

  const openMessages = () => {
    setDmCount(0);
    window.dispatchEvent(new CustomEvent('dm:clear'));
    navigate('/messages');
  };

  // --- User menu (Settings / Logout)
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const toggleMenu = () => setMenuOpen((v) => !v);
  const closeMenu = () => setMenuOpen(false);

  useEffect(() => {
    const onClickAway = (e) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    const onEsc = (e) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    window.addEventListener('click', onClickAway);
    window.addEventListener('keydown', onEsc);
    return () => {
      window.removeEventListener('click', onClickAway);
      window.removeEventListener('keydown', onEsc);
    };
  }, []);

  const goSettings = () => {
    closeMenu();
    navigate('/settings');
  };
  const logout = () => {
    closeMenu();
    localStorage.clear();
    navigate('/');
  };

  return (
    <header className="navbar sticky">
      <div className="nav-bg">
        <div className="nav-inner">
          {/* Left */}
          <div className="nav-left">
            <button
              className="hamburger"
              onClick={onToggleSidebar}
              aria-label="Toggle sidebar"
            >
              ☰
            </button>
            <div className="brand" onClick={() => navigate('/')} role="button" title="Home">
              <span className="brand-logo" aria-hidden>🧑‍🏫</span>
              <span className="brand-name">PeerPresence</span>
            </div>
            <nav className="nav-links">
              <NavLink to="/" end className={({ isActive }) => (isActive ? 'link active' : 'link')}>Home</NavLink>
              <NavLink to="/courses" className={({ isActive }) => (isActive ? 'link active' : 'link')}>Courses</NavLink>
              <NavLink to="/tutors" className={({ isActive }) => (isActive ? 'link active' : 'link')}>Tutors</NavLink>
              <NavLink to="/messages" className={({ isActive }) => (isActive ? 'link active' : 'link')}>Messages</NavLink>
            </nav>
          </div>

          {/* Center: search + suggestions */}
          <div className="nav-center" ref={boxRef}>
            <form onSubmit={submitSearch} className="search-wrap">
              <span className="search-icon" aria-hidden></span>
              <input
                ref={inputRef}
                className="nav-search"
                placeholder="Search subjects, tutors…"
                value={q}
                onChange={onChange}
                onKeyDown={onKeyDown}
                onFocus={() => q.trim().length >= 2 && setOpen(true)}
              />
              {open && (suggestions.tutors.length || suggestions.subjects.length) > 0 && (
                <div className="search-suggest">
                  {suggestions.tutors.length > 0 && (
                    <>
                      <div className="sg-title">Tutors</div>
                      {suggestions.tutors.map((t, i) => {
                        const idx = i;
                        const isActive = cursor === idx;
                        return (
                          <div
                            key={t._id}
                            className={`sg-item ${isActive ? 'active' : ''}`}
                            onMouseEnter={() => setCursor(idx)}
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => chooseSuggestion({ ...t, _kind: 'tutor' })}
                          >
                            <img
                              className="sg-avatar"
                              src={
                                t.avatar ||
                                t.avatarUrl ||
                                `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
                                  t.name || 'Tutor'
                                )}`
                              }
                              alt=""
                            />
                            <div className="sg-main">
                              <div className="sg-name">{t.name}</div>
                              <div className="sg-sub">
                                {(Array.isArray(t.subjects) ? t.subjects.slice(0, 3) : []).join(', ')}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </>
                  )}

                  {suggestions.subjects.length > 0 && (
                    <>
                      <div className="sg-title">Subjects</div>
                      {suggestions.subjects.map((s, j) => {
                        const idx = (suggestions.tutors?.length || 0) + j;
                        const isActive = cursor === idx;
                        return (
                          <div
                            key={s._id}
                            className={`sg-item ${isActive ? 'active' : ''}`}
                            onMouseEnter={() => setCursor(idx)}
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => chooseSuggestion({ ...s, _kind: 'subject' })}
                          >
                            <div className="sg-dot" />
                            <div className="sg-main">
                              <div className="sg-name">{s.name}</div>
                              <div className="sg-sub">{(s.description || '').slice(0, 60)}</div>
                            </div>
                          </div>
                        );
                      })}
                    </>
                  )}

                  {loading && <div className="sg-loading">Searching…</div>}
                </div>
              )}
            </form>
          </div>

          {/* Right */}
          <div className="nav-right">
            <button
              className="icon-btn"
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              onClick={toggleTheme}
              aria-label="Toggle dark mode"
            >
              {theme === 'dark' ? '🌙' : '☀️'}
            </button>

            <button
              className="icon-btn bell"
              onClick={openMessages}
              title="Direct Messages"
              aria-label="Notifications"
            >
              🔔
              {dmCount > 0 && <span className="badge">{dmCount}</span>}
            </button>

            {/* User dropdown */}
            <div className="user-wrap" ref={menuRef}>
              <button
                className="user-btn"
                onClick={toggleMenu}
                aria-haspopup="menu"
                aria-expanded={menuOpen ? 'true' : 'false'}
                title="Account"
              >
                <img className="avatar" src={avatarSrc} alt={firstName} />
                <span className="hello">Hi, {firstName}</span>
                <span className="chev" aria-hidden>▾</span>
              </button>

              {menuOpen && (
                <div className="menu" role="menu">{/* <-- was user-menu; now matches CSS */}
                  <button className="menu-item" role="menuitem" onClick={goSettings}>
                    Settings
                  </button>
                  <div className="menu-sep" />
                  <button className="menu-item danger" role="menuitem" onClick={logout}>
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
