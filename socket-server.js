const { createServer } = require('http');
const { Server } = require('socket.io');
const express = require('express');

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: process.env.NEXT_PUBLIC_APP_URL || "*",
    methods: ["GET", "POST"],
    credentials: true
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', connections: io.engine.clientsCount });
});

io.on('connection', (socket) => {
  console.log('✅ User connected:', socket.id);
  
  socket.on('join-project', ({ projectId, username }) => {
    socket.join(projectId);
    console.log(`📂 ${username} joined project: ${projectId}`);
  });

  socket.on('typing', ({ projectId, content, username }) => {
    socket.to(projectId).emit('receive-changes', { content, username });
  });

  socket.on('disconnect', () => {
    console.log('❌ User disconnected');
  });
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`🚀 Socket.IO server running on port ${PORT}`);
});