// client/src/pages/DashboardLayout.jsx
import React, { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import Feed from '../components/Feed';
import ChatBox from '../components/ChatBox';
import '../assets/DashboardLayout.css';

const CHAT_KEY = 'pp.chat.collapsed'; // "1" = collapsed, "0" = open

const DashboardLayout = ({ currentUser, children, hideChat = false }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // default open on first visit; persist between pages/refresh
  const [chatCollapsed, setChatCollapsed] = useState(() => {
    try {
      return localStorage.getItem(CHAT_KEY) === '1';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(CHAT_KEY, chatCollapsed ? '1' : '0');
    } catch {}
  }, [chatCollapsed]);

  return (
    <div className="dash-shell">
      <Navbar
        currentUser={currentUser}
        onToggleSidebar={() => setSidebarOpen((s) => !s)}
      />

      <div className="dash-main">
        <aside className={`dash-left ${sidebarOpen ? 'open' : ''}`}>
          <Sidebar onLinkClick={() => setSidebarOpen(false)} />
        </aside>

        <main className="dash-center">
          {children || <Feed currentUser={currentUser} />}
        </main>

        {/* Right rail: keep mounted so chat state/connection persists; just hide via CSS */}
        {!hideChat && (
          <aside className={`dash-right ${chatCollapsed ? 'collapsed' : ''}`}>
            <div className="card">
              <div className="card-title chat-card-header">
                <span>Live Chat</span>
                <button
                  type="button"
                  className="icon-btn chat-close"
                  aria-label="Minimize chat"
                  title="Minimize"
                  onClick={() => setChatCollapsed(true)}
                >
                  ×
                </button>
              </div>
              <ChatBox currentUser={currentUser} />
            </div>
          </aside>
        )}
      </div>

      {/* Floating reopen button when collapsed (and not globally hidden) */}
      {!hideChat && chatCollapsed && (
        <button
          type="button"
          className="chat-fab"
          aria-label="Open chat"
          title="Open chat"
          onClick={() => setChatCollapsed(false)}
        >
          💬 Chat
        </button>
      )}

      {sidebarOpen && (
        <button
          aria-label="Close sidebar overlay"
          className="dash-overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
};

export default DashboardLayout;
