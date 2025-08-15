// server/server.js
const express = require('express');
const http = require('http');
const cors = require('cors');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const { Server } = require('socket.io');

dotenv.config();

// Models used by the socket normalizer
const User = require('./models/User');
const Tutor = require('./models/Tutor');

// Routes
const authRoutes = require('./routes/authRoutes');
const subjectRoutes = require('./routes/subjectRoutes');            // subjects
const tutorRoutes = require('./routes/tutorRoutes');                // tutor list + profile + reviews
const conversationRoutes = require('./routes/conversationRoutes');  // DMs
const messageRoutes = require('./routes/messageRoutes');            // DMs
const courseRoutes = require('./routes/courseRoutes');              // courses
const userRoutes = require('./routes/userRoutes');                  // account
const postRoutes = require('./routes/postRoutes');                  // dashboard posts
const searchRoutes = require('./routes/searchRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const accountRoutes = require('./routes/accountRoutes');

// Global (legacy) live-chat model
const GlobalMessage = require('./models/GlobalMessage');

const app = express();
const server = http.createServer(app);

// ---------- Config ----------
const PORT = process.env.PORT || 5001;

// Allow both Vite (5173) and CRA (3000) during development
const ALLOWED_ORIGINS = ['http://localhost:5173', 'http://localhost:3000'];

// ---------- Middleware ----------
app.use(cors({ origin: ALLOWED_ORIGINS, credentials: true }));
app.use(express.json());

// ---------- Mongo ----------
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB Connected'))
  .catch((err) => console.error('MongoDB Error:', err));

// ---------- REST ROUTES ----------
app.use('/api/auth', authRoutes);

// core data
app.use('/api/courses', courseRoutes);
app.use('/api/subjects', subjectRoutes);
app.use('/api/account', userRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/account', accountRoutes);

// tutors (list/search + profile + reviews)
app.use('/api/tutors', tutorRoutes);

// DMs (1:1)
app.use('/api/conversations', conversationRoutes);
app.use('/api/messages', messageRoutes);

// Global live chat history (used by ChatBox.jsx when no DM is selected)
app.get('/api/chat/messages', async (req, res) => {
  try {
    const messages = await GlobalMessage.find().sort({ createdAt: 1 });
    res.json(messages);
  } catch (err) {
    console.error('Fetch live-chat messages error:', err);
    res.status(500).json({ error: 'Server error while fetching chat messages' });
  }
});

// ---------- SOCKET.IO (normalize user id so tutors join the right room) ----------
const io = new Server(server, {
  cors: {
    origin: ALLOWED_ORIGINS,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
  },
  path: '/socket.io',
});

// Expose io to routes (messageRoutes emits to rooms)
app.set('io', io);

// Helper: normalize any incoming id (User or Tutor) to a **User** _id
async function resolveToUserId(rawId) {
  const id = String(rawId || '');
  if (!mongoose.Types.ObjectId.isValid(id)) return null;

  const userHit = await User.findById(id).select('_id').lean();
  if (userHit?._id) return String(userHit._id);

  const tutor = await Tutor.findById(id).select('userId').lean();
  if (tutor?.userId) return String(tutor.userId);

  return null;
}

const onlineUsers = new Set();

io.on('connection', async (socket) => {
  try {
    console.log('✅ Socket connected:', socket.id);

    // Presence: client passes ?userId= (may be a User or Tutor id)
    const rawId = socket.handshake.query?.userId;
    const normalizedUserId = await resolveToUserId(rawId);

    if (normalizedUserId) {
      onlineUsers.add(normalizedUserId);

      // Personal DM notifications room (must match messageRoutes emits)
      socket.join(`user:${normalizedUserId}`);

      // (Optional) keep a convenience room without prefix if you like
      // socket.join(normalizedUserId);

      io.emit('presence:update', Array.from(onlineUsers));
    }

    // Join/leave a DM conversation room to receive targeted events
    // (Your client currently uses { conversationId } with event name 'join'/'leave')
    socket.on('join', ({ conversationId }) => {
      if (conversationId) socket.join(String(conversationId));
    });
    socket.on('leave', ({ conversationId }) => {
      if (conversationId) socket.leave(String(conversationId));
    });

    // Typing indicator relay for DMs
    socket.on('typing', ({ conversationId, from, isTyping }) => {
      if (conversationId) {
        socket.to(String(conversationId)).emit('typing', { conversationId, from, isTyping });
      }
    });

    // ----- Legacy global chat (kept as-is) -----
    socket.on('chat message', async (payload) => {
      try {
        const saved = await GlobalMessage.create({
          sender: payload?.sender || 'User',
          text: payload?.text || '',
          timestamp: payload?.timestamp || '',
        });
        io.emit('chat message', saved);
      } catch (err) {
        console.warn('Error saving live-chat message:', err);
      }
    });

    socket.on('disconnect', () => {
      console.log('❌ Socket disconnected:', socket.id);
      if (normalizedUserId) {
        onlineUsers.delete(normalizedUserId);
        io.emit('presence:update', Array.from(onlineUsers));
      }
    });
  } catch (e) {
    console.error('socket connection error:', e);
  }
});

// ---------- Start ----------
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
