const express = require("express");
const http = require("http");
const socketIO = require("socket.io");
const app = express();
const server = http.createServer(app);
const io = socketIO(server);

let rooms = [];

// Handle WebSocket connections
io.on("connection", (socket) => {
  console.log("A user connected", socket.id);

  // Get rooms list
  socket.on("get-rooms", () => {
    const roomIds = rooms.map((room) => room.roomId);
    console.log("Room list", roomIds);
    socket.emit("room-list", roomIds);
  });

  // Handle joining a room
  socket.on("join", (room) => {
    // Create room if it doesn't exist
    if (!rooms.find((r) => r.roomId === room)) {
      rooms.push({ roomId: room, users: [], owner: socket.id });
    }
    socket.join(room);
    console.log(`User joined room: ${room}`);

    // Broadcast a message to everyone in the room (including the sender)
    io.to(room).emit("user-joined", socket.id);

    socket.on("join-as-viewer", (viewerId) => {
      io.to(room).emit("viewer-connected", viewerId);
    });

    // Handle disconnect
    socket.on("disconnect", () => {
      console.log("User disconnected");
      io.to(room).emit("user-left", socket.id);
      if (rooms.find((r) => r.owner === socket.id)) {
        rooms = rooms.filter((r) => r.roomId !== room);
        console.log("Room list", rooms);
      }
    });
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
