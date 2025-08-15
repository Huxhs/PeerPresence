// client/src/pages/Messages.jsx
import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import io from 'socket.io-client';
import DashboardLayout from './DashboardLayout';
import '../assets/Messages.css';
import {
  listConversations,
  startOrGetConversation,
  getMessages,
  sendMessage,
} from '../services/chat';
import api from '../services/api';

const fallbackAvatar = (id) => `https://i.pravatar.cc/100?u=${id}`;

function useQuery() {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
}

const Messages = () => {
  const location = useLocation();
  const query = useQuery();

  // Current logged in user
  const me = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('user') || '{}');
    } catch {
      return {};
    }
  }, []);
  const myId = String(me?._id || me?.id || '');

  const [convos, setConvos] = useState([]);
  const [active, setActive] = useState(null);
  const [msgs, setMsgs] = useState([]);
  const [draft, setDraft] = useState('');
  const [onlineIds, setOnlineIds] = useState([]);
  const [typingFrom, setTypingFrom] = useState(null);
  const [unread, setUnread] = useState({}); // { [conversationId]: count }

  const socketRef = useRef(null);
  const roomRef = useRef(null);
  const bottomRef = useRef(null);
  const typingTimerRef = useRef(null);

  // In-memory message cache: Map<conversationId, Message[]>
  const cacheRef = useRef(new Map());

  const baseURL = api.defaults.baseURL?.replace('/api', '') || 'http://localhost:5001';

  const scrollToBottom = useCallback((behavior = 'auto') => {
    bottomRef.current?.scrollIntoView({ behavior, block: 'end' });
  }, []);

  const isOnline = useCallback((id) => onlineIds.includes(String(id)), [onlineIds]);

  // Cache helpers
  const setCache = useCallback(
    (conversationId, nextList) => {
      const key = String(conversationId);
      cacheRef.current.set(key, nextList);
      if (active && String(active._id) === key) setMsgs(nextList);
    },
    [active]
  );

  const appendToCache = useCallback(
    (conversationId, message) => {
      const key = String(conversationId);
      const prev = cacheRef.current.get(key) || [];
      const next = [...prev, message];
      cacheRef.current.set(key, next);
      if (active && String(active._id) === key) setMsgs(next);
    },
    [active]
  );

  // 1) Connect socket once
  useEffect(() => {
    if (!myId) return;
    const s = io(baseURL, {
      query: { userId: myId },
      withCredentials: true,
    });
    socketRef.current = s;

    s.on('presence:update', (ids) => setOnlineIds(ids || []));

    s.on('typing', ({ conversationId, from, isTyping }) => {
      if (!active || String(active._id) !== String(conversationId)) return;
      if (isTyping && String(from) !== myId) {
        setTypingFrom({ from, until: Date.now() + 1600 });
      }
    });

    // Recipient-level DM notification
    s.on('notify:dm', async ({ conversationId, text, createdAt }) => {
      const convId = String(conversationId);
      setConvos((prev) => {
        const exists = prev.some((c) => String(c._id) === convId);
        if (!exists) {
          (async () => {
            const items = await listConversations();
            setConvos(items || []);
            (items || []).forEach((c) =>
              cacheRef.current.set(String(c._id), cacheRef.current.get(String(c._id)) || [])
            );
          })();
        }
        return prev.map((c) =>
          String(c._id) === convId
            ? { ...c, lastMessageText: text, lastMessageAt: createdAt || new Date().toISOString() }
            : c
        );
      });
      if (!active || String(active._id) !== convId) {
        setUnread((prev) => ({ ...prev, [convId]: (prev[convId] || 0) + 1 }));
      }
    });

    // In-thread real-time updates
    s.on('message:new', (m) => {
      const convId = String(m.conversation);
      appendToCache(convId, m);
      setConvos((prev) =>
        prev.map((c) =>
          String(c._id) === convId
            ? { ...c, lastMessageText: m.text || m.content, lastMessageAt: m.createdAt }
            : c
        )
      );
      if (!active || String(active._id) !== convId) {
        setUnread((prev) => ({ ...prev, [convId]: (prev[convId] || 0) + 1 }));
      } else {
        scrollToBottom('smooth');
      }
    });

    return () => s.disconnect();
  }, [myId, appendToCache, scrollToBottom, active?._id]); // ✅ fixed dependency typo

  // Clear navbar badge on landing
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('dm:clear'));
  }, []);

  // 2) Load conversations on mount
  useEffect(() => {
    (async () => {
      const items = await listConversations();
      setConvos(items || []);
      (items || []).forEach((c) => cacheRef.current.set(String(c._id), []));
    })();
  }, []);

  // 3) Start/open from ?to= or state.startWithTutorId
  useEffect(() => {
    const to = query.get('to') || location?.state?.startWithTutorId || null;
    if (!to) return;
    (async () => {
      const convo = await startOrGetConversation(to);
      if (!convos.some((c) => String(c._id) === String(convo._id))) {
        setConvos((prev) => [convo, ...prev]);
      }
      cacheRef.current.set(String(convo._id), []);
      setActive(convo);
    })();
  }, [location.state, query, convos]);

  // 4) When active changes
  useEffect(() => {
    if (!active?._id || !socketRef.current) return;
    const convoId = String(active._id);

    // Room join/leave
    if (roomRef.current && roomRef.current !== convoId) {
      socketRef.current.emit('leave', { conversationId: roomRef.current });
    }
    socketRef.current.emit('join', { conversationId: convoId });
    roomRef.current = convoId;

    // Show cached first
    setMsgs(cacheRef.current.get(convoId) || []);
    scrollToBottom();

    // Fetch fresh
    (async () => {
      const data = await getMessages(convoId);
      setCache(convoId, data || []);
      scrollToBottom();
      setUnread((prev) => {
        const copy = { ...prev };
        delete copy[convoId];
        return copy;
      });
      window.dispatchEvent(new CustomEvent('dm:clear'));
    })();
  }, [active?._id, setCache, scrollToBottom]);

  // Typing emit
  const onDraftChange = (e) => {
    const value = e.target.value;
    setDraft(value);
    if (!active?._id || !socketRef.current) return;
    socketRef.current.emit('typing', { conversationId: active._id, from: myId, isTyping: true });
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      socketRef.current.emit('typing', { conversationId: active._id, from: myId, isTyping: false });
    }, 900);
  };

  // Typing bubble timeout
  useEffect(() => {
    if (!typingFrom) return;
    const id = setInterval(() => {
      if (Date.now() > typingFrom.until) {
        setTypingFrom(null);
        clearInterval(id);
      }
    }, 300);
    return () => clearInterval(id);
  }, [typingFrom]);

  // Send message
  const handleSend = async () => {
    const text = draft.trim();
    if (!text || !active?._id) return;
    await sendMessage(active._id, text);
    setDraft('');
    scrollToBottom('smooth');
  };

  const renderTime = (ts) =>
    ts ? new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

  return (
    <DashboardLayout>
      <div className="dm-wrap">
        {/* Sidebar */}
        <aside className="dm-sidebar">
          <h4>Your conversations</h4>
          {convos.length === 0 ? (
            <p className="muted">No conversations yet.</p>
          ) : (
            <ul className="convo-list">
              {convos.map((c) => {
                const p = c.peer || {};
                const badge = unread[c._id] || 0;
                return (
                  <li
                    key={c._id}
                    className={active?._id === c._id ? 'conv-item active' : 'conv-item'}
                    onClick={() => {
                      setMsgs(cacheRef.current.get(String(c._id)) || []);
                      setActive(c);
                    }}
                  >
                    <img
                      className={`conv-avatar ${isOnline(p._id) ? 'status-online' : ''}`}
                      src={p.avatar || fallbackAvatar(p._id)}
                      alt={p.name || 'User'}
                    />
                    <div className="conv-main">
                      <div className="conv-name">{p.name || 'User'}</div>
                      <div className="conv-snippet">
                        {c.lastMessageText || 'Start a conversation'}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      {c.lastMessageAt && <div className="conv-time">{renderTime(c.lastMessageAt)}</div>}
                      {badge > 0 && <span className="conv-badge">{badge}</span>}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </aside>

        {/* Chat */}
        <section className="dm-chat">
          {active ? (
            <>
              <header className="dm-header">
                <img
                  className={`conv-avatar ${isOnline(active.peer?._id) ? 'status-online' : 'status-offline'}`}
                  src={active.peer?.avatar || fallbackAvatar(active.peer?._id)}
                  alt={active.peer?.name || 'User'}
                  style={{ width: 40, height: 40 }}
                />
                <div>
                  <div className="name">{active.peer?.name || 'User'}</div>
                  <div className="role">{isOnline(active.peer?._id) ? 'Online' : 'Offline'}</div>
                </div>
              </header>

              <div className="dm-stream">
                {msgs.map((m) => {
                  const mine = String(m.from) === myId;
                  return (
                    <div key={m._id} className={`msg-row ${mine ? 'me' : 'other'}`}>
                      {!mine && (
                        <img
                          className="conv-avatar"
                          src={active.peer?.avatar || fallbackAvatar(active.peer?._id)}
                          alt=""
                          style={{ width: 28, height: 28 }}
                        />
                      )}
                      <div className="msg-bubble">
                        {m.text || m.content}
                        <div className="msg-time">{renderTime(m.createdAt)}</div>
                      </div>
                    </div>
                  );
                })}

                {typingFrom && (
                  <div className="msg-row other">
                    <div className="msg-bubble typing">
                      <span className="dot" />
                      <span className="dot" />
                      <span className="dot" />
                    </div>
                  </div>
                )}

                <div ref={bottomRef} />
              </div>

              <div className="dm-composer">
                <input
                  className="dm-input"
                  placeholder="Type a message…"
                  value={draft}
                  onChange={onDraftChange}
                  onKeyDown={(e) => e.key === 'Enter' && draft.trim() && handleSend()}
                />
                <button className="dm-send" onClick={handleSend} disabled={!draft.trim()}>
                  Send
                </button>
              </div>
            </>
          ) : (
            <div className="center" style={{ padding: 20 }}>
              <p className="muted">Select a conversation to start chatting.</p>
            </div>
          )}
        </section>
      </div>
    </DashboardLayout>
  );
};

export default Messages;
