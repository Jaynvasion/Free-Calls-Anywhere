
// THE DARK PLAN — Socket.IO signaling + static hosting (Cloudflare-ready)
require('dotenv').config();
const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  // Cloudflare tunnel friendly defaults
  cors: { origin: true, methods: ['GET','POST'] },
  serveClient: true
});

// static files
app.use(express.static(path.join(__dirname, 'public')));

// ICE servers from env (optional)
let iceServers = [
  { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] }
];
try {
  if (process.env.ICE_SERVERS_JSON) {
    const parsed = JSON.parse(process.env.ICE_SERVERS_JSON);
    if (Array.isArray(parsed) && parsed.length) iceServers = parsed;
  }
} catch (e) {
  console.warn('Invalid ICE_SERVERS_JSON in .env; using defaults.');
}

app.get('/config.json', (_req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ iceServers }));
});

// rooms: roomId -> { peers: Map<peerId, { socketId, displayName }> }
const rooms = new Map();

function getRoom(roomId) {
  if (!rooms.has(roomId)) rooms.set(roomId, { peers: new Map() });
  return rooms.get(roomId);
}

function broadcastToRoom(roomId, event, payload, exceptSocketId = null) {
  const r = rooms.get(roomId);
  if (!r) return;
  for (const { socketId } of r.peers.values()) {
    if (socketId === exceptSocketId) continue;
    io.to(socketId).emit(event, payload);
  }
}

io.on('connection', (socket) => {
  let joinedRoom = null;
  let myPeerId = null;

  socket.on('join', ({ roomId, peerId, displayName }, ack) => {
    if (!roomId || !peerId) { ack && ack({ ok:false, error:'missing roomId/peerId' }); return; }

    const room = getRoom(roomId);
    joinedRoom = roomId;
    myPeerId = peerId;
    room.peers.set(peerId, { socketId: socket.id, displayName: displayName || 'Guest' });
    socket.join(roomId);

    // send existing peers to newcomer
    const peers = [];
    for (const [pid, info] of room.peers.entries()) {
      if (pid === peerId) continue;
      peers.push({ peerId: pid, displayName: info.displayName });
    }
    socket.emit('peers', { peers });

    // notify others
    broadcastToRoom(roomId, 'peer-joined', { peer: { peerId, displayName: displayName || 'Guest' } }, socket.id);

    ack && ack({ ok:true });
  });

  socket.on('signal', ({ roomId, target, from, data }) => {
    const room = rooms.get(roomId);
    if (!room) return;
    const targetInfo = room.peers.get(target);
    if (!targetInfo) return;
    io.to(targetInfo.socketId).emit('signal', { from, data });
  });

  socket.on('leave', ({ roomId, peerId }) => {
    const room = rooms.get(roomId);
    if (!room) return;
    room.peers.delete(peerId);
    broadcastToRoom(roomId, 'peer-left', { peerId }, socket.id);
    if (room.peers.size === 0) rooms.delete(roomId);
    socket.leave(roomId);
  });

  socket.on('disconnect', () => {
    if (joinedRoom && myPeerId) {
      const room = rooms.get(joinedRoom);
      if (room) {
        room.peers.delete(myPeerId);
        broadcastToRoom(joinedRoom, 'peer-left', { peerId: myPeerId }, socket.id);
        if (room.peers.size === 0) rooms.delete(joinedRoom);
      }
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`THE DARK PLAN running on http://localhost:${PORT}`);
});
