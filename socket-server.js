const { createServer } = require('http');
const express = require('express');
const { Server } = require('socket.io');

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: process.env.NEXT_PUBLIC_APP_URL || "*",
    methods: ["GET", "POST"],
    credentials: true
  },
  // Keep the connection alive aggressively for snappy collab
  pingTimeout: 30000,
  pingInterval: 10000,
});

// projectId -> Map<socketId, username>
const projectUsers = new Map();

function activeUsersFor(projectId) {
  const m = projectUsers.get(projectId);
  return m ? Array.from(m.values()) : [];
}

function addUser(projectId, socketId, username) {
  if (!projectUsers.has(projectId)) projectUsers.set(projectId, new Map());
  projectUsers.get(projectId).set(socketId, username);
}

function removeUser(socketId) {
  const left = []; // [{ projectId, username }]
  for (const [projectId, users] of projectUsers.entries()) {
    if (users.has(socketId)) {
      const username = users.get(socketId);
      users.delete(socketId);
      left.push({ projectId, username });
      if (users.size === 0) projectUsers.delete(projectId);
    }
  }
  return left;
}

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    connections: io.engine.clientsCount,
    projects: projectUsers.size,
  });
});

io.on('connection', (socket) => {
  console.log('✅ User connected:', socket.id);

  socket.on('join-project', ({ projectId, username }) => {
    if (!projectId) return;
    socket.join(projectId);
    addUser(projectId, socket.id, username || `User-${socket.id.slice(0, 4)}`);
    socket.data.projectId = projectId;
    socket.data.username = username;

    const activeUsers = activeUsersFor(projectId);
    console.log(`📂 ${username} joined ${projectId} (${activeUsers.length} total)`);

    // Tell the room someone joined
    io.to(projectId).emit('user-joined', { username, activeUsers });
    // Tell the joiner who's already there
    socket.emit('active-users', { activeUsers });
  });

  socket.on('typing', ({ projectId, content, username }) => {
    if (!projectId) return;
    socket.to(projectId).emit('receive-changes', { content, username });
  });

  // Cursor / selection sync — optional but cheap; emit only to peers
  socket.on('cursor', ({ projectId, position, username }) => {
    if (!projectId) return;
    socket.to(projectId).emit('peer-cursor', { socketId: socket.id, position, username });
  });

  socket.on('leave-project', ({ projectId }) => {
    if (!projectId) return;
    socket.leave(projectId);
    const m = projectUsers.get(projectId);
    if (m) {
      const username = m.get(socket.id);
      m.delete(socket.id);
      if (m.size === 0) projectUsers.delete(projectId);
      io.to(projectId).emit('user-left', { username, activeUsers: activeUsersFor(projectId) });
    }
  });

  socket.on('disconnect', () => {
    const left = removeUser(socket.id);
    for (const { projectId, username } of left) {
      io.to(projectId).emit('user-left', {
        username,
        activeUsers: activeUsersFor(projectId),
      });
      console.log(`❌ ${username} disconnected from ${projectId}`);
    }
  });
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`🚀 Socket.IO server running on port ${PORT}`);
});
