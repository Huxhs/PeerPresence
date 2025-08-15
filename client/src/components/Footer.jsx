import React from 'react';
import '../assets/Footer.css';
import { FaFacebookF, FaInstagram, FaLinkedinIn, FaYoutube } from 'react-icons/fa';
import { FaXTwitter } from 'react-icons/fa6';

const Footer = () => {
  return (
    <footer className="footer">
      <div className="footer-container">
        <div className="footer-left">
          <h3 className="footer-logo">PeerPresence</h3>
          <p>Connecting students and tutors worldwide.</p>
          <p>© {new Date().getFullYear()} PeerPresence. All rights reserved.</p>
        </div>

        <div className="footer-center">
          <h4>Quick Links</h4>
          <ul>
            <li><a href="/courses">Browse Courses</a></li>
            <li><a href="/tutors">View Tutors</a></li>
            <li><a href="/messages">Messages</a></li>
            <li><a href="/settings">Account Settings</a></li>
          </ul>
        </div>

        <div className="footer-right">
  <h4>Follow Us</h4>
  <div className="social-icons">
    <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" aria-label="Facebook">
      <FaFacebookF />
    </a>
    <a href="https://x.com" target="_blank" rel="noopener noreferrer" aria-label="X (Twitter)">
      <FaXTwitter />
    </a>
    <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" aria-label="Instagram">
      <FaInstagram />
    </a>
    <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn">
      <FaLinkedinIn />
    </a>
    <a href="https://youtube.com" target="_blank" rel="noopener noreferrer" aria-label="YouTube">
      <FaYoutube />
    </a>
  </div>
</div>

      </div>
    </footer>
  );
};

export default Footer;
