// client/src/App.js
import React from 'react';
import { Routes, Route } from 'react-router-dom';

import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import PrivateRoute from './components/PrivateRoute';
import Courses from './pages/Courses';
import Tutors from './pages/Tutors';
import Messages from './pages/Messages';
import Settings from './pages/Settings';
import Subjects from './pages/Subjects';
import Saved from './pages/Saved';
import TutorProfile from './pages/TutorProfile';
import SearchResults from './pages/SearchResults';
import BookTutor from './pages/BookTutor';
import Checkout from './pages/Checkout';
import CheckoutSuccess from './pages/CheckoutSuccess';

import { ChatProvider } from './components/ChatContext';

function App() {
  return (
    <ChatProvider>
      <Routes>
        {/* Public */}
        <Route path="/" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Private */}
        <Route
          path="/dashboard"
          element={
            <PrivateRoute>
              <Dashboard />
            </PrivateRoute>
          }
        />
        <Route
          path="/courses"
          element={
            <PrivateRoute>
              <Courses />
            </PrivateRoute>
          }
        />
        <Route
          path="/tutors"
          element={
            <PrivateRoute>
              <Tutors />
            </PrivateRoute>
          }
        />
        <Route
          path="/messages"
          element={
            <PrivateRoute>
              <Messages />
            </PrivateRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <PrivateRoute>
              <Settings />
            </PrivateRoute>
          }
        />
        <Route
          path="/subjects"
          element={
            <PrivateRoute>
              <Subjects />
            </PrivateRoute>
          }
        />
        <Route
          path="/saved"
          element={
            <PrivateRoute>
              <Saved />
            </PrivateRoute>
          }
        />

        {/* Profiles / search */}
        <Route path="/tutors/:id" element={<TutorProfile />} />
        <Route path="/search" element={<SearchResults />} />

        {/* Booking — canonical + alias */}
        <Route path="/book/:tutorId" element={<BookTutor />} />
        <Route path="/tutors/:tutorId/book" element={<BookTutor />} />

        <Route path="/checkout" element={<Checkout />} />
        <Route path="/checkout/success" element={<CheckoutSuccess />} />
      </Routes>
    </ChatProvider>
  );
}

export default App;
