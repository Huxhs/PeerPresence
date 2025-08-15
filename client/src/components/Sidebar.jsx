// client/src/components/Sidebar.jsx
import React from 'react';
import { NavLink } from 'react-router-dom';

const item = (to, label, onClick) => (
  <li>
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) => (isActive ? 'active' : undefined)}
    >
      {label}
    </NavLink>
  </li>
);

const Sidebar = ({ onLinkClick }) => {
  return (
    <nav className="sidebar">
      <h3 className="sidebar-title">Menu</h3>
      <ul className="sidebar-list">
        {item('/dashboard', 'Home', onLinkClick)}
        {item('/courses', 'Browse Courses', onLinkClick)}
        {item('/tutors', 'View Tutors', onLinkClick)}
        {item('/messages', 'Messages', onLinkClick)}
        {item('/settings', 'Account Settings', onLinkClick)}
      </ul>

      <div className="sidebar-section">
        <h4 className="sidebar-subtitle">Shortcuts</h4>
        <ul className="sidebar-list small">
          {item('/subjects', 'My Subjects', onLinkClick)}
          {item('/saved', 'Saved Posts', onLinkClick)}
        </ul>
      </div>
    </nav>
  );
};

export default Sidebar;
