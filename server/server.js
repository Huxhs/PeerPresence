// server/server.js
const express = require('express');
const http = require('http');
const cors = require('cors');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const { Server } = require('socket.io');

dotenv.config();

// REST routes
const authRoutes = require('./routes/authRoutes');
const subjectRoutes = require('./routes/subjectRoutes');             // courses/subjects
const tutorRoutes = require('./routes/tutorRoutes');                 // tutors list/search
const conversationRoutes = require('./routes/conversationRoutes');   // DM feature
const messageRoutes = require('./routes/messageRoutes');             // DM feature
const courseRoutes = require('./routes/courseRoutes');
const userRoutes = require('./routes/userRoutes');
const postRoutes = require('./routes/postRoutes');


// Use a dedicated model for the GLOBAL (legacy) live chat
const GlobalMessage = require('./models/GlobalMessage');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
  },
});

// Middleware
app.use(cors());
app.use(express.json());
app.use('/api/courses', courseRoutes);
app.use('/api/subjects', courseRoutes);
app.use('/api/account', userRoutes);
app.use('/api/posts', postRoutes);

// Mongo
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB Connected'))
  .catch((err) => console.error('MongoDB Error:', err));

// ---------- REST ROUTES ----------
// Auth & core data
app.use('/api/auth', authRoutes);
app.use('/api/subjects', subjectRoutes);
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

// ---------- SOCKET.IO: Global live chat only ----------
io.on('connection', (socket) => {
  console.log('✅ Socket connected:', socket.id);

  // Expect payload: { sender: string, text: string, timestamp?: string }
  socket.on('chat message', async (payload) => {
    try {
      const saved = await GlobalMessage.create({
        sender: payload?.sender || 'User',
        text: payload?.text || '',
        timestamp: payload?.timestamp || '',
      });

      // Broadcast saved doc to all clients
      io.emit('chat message', saved);
    } catch (err) {
      console.warn('Error saving live-chat message:', err);
    }
  });

  socket.on('disconnect', () => {
    console.log('❌ Socket disconnected:', socket.id);
  });
});

// Start
const PORT = process.env.PORT || 5001;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
