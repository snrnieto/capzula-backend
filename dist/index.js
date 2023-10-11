import express from "express";
import http from "http";
import { Server } from "socket.io";
const app = express();
const server = http.createServer(app);
const io = new Server(server);
let rooms = [];
const indexOfRoom = (room) => rooms.findIndex((r) => r.roomId === room);
// Handle WebSocket connections
io.on("connection", (socket) => {
    console.log("A user connected", socket.id);
    // Get rooms list
    socket.on("get-rooms", () => {
        const roomIds = rooms.map((room) => room.roomId);
        console.log("Room list", roomIds);
        socket.emit("room-list", roomIds);
    });
    socket.on("remoteStream", ({ stream, room }) => {
        console.log("remoteStream", { stream, room });
        console.log(typeof stream);
        const index = indexOfRoom(room);
        if (index !== -1) {
            rooms[index].chunks.push(stream);
        }
    });
    // Handle joining a room
    socket.on("join", (room) => {
        // Create room if it doesn't exist
        if (!rooms.find((r) => r.roomId === room)) {
            rooms.push({ roomId: room, users: [], owner: socket.id, chunks: [] });
        }
        socket.join(room);
        console.log(`User joined room: ${room}`);
        // Broadcast a message to everyone in the room (including the sender)
        io.to(room).emit("user-joined", socket.id);
        socket.on("join-as-viewer", (viewerId) => {
            io.to(room).emit("viewer-connected", viewerId);
        });
        // Handle disconnect
        socket.on("disconnect", async () => {
            console.log("User disconnected", socket.id);
            io.to(room).emit("user-left", socket.id);
            if (rooms.find((r) => r.owner === socket.id)) {
                // Generate mp4 file from chunks nodejs
                const index = indexOfRoom(room);
                console.log("Getting chunks room", index);
                const blob = new Blob(rooms[index].chunks, {
                    type: "video/mp4",
                });
                console.log("Blob", { blob });
                // const buffer = Buffer.from(await blob.arrayBuffer());
                // fs.writeFile(`./${room}.mp4`, buffer, function (err: any) {
                //   console.log("File created");
                // });
                const formData = new FormData();
                formData.append("file", blob, `${room}.mp4`);
                formData.append("upload_preset", "ml_default");
                fetch("https://api.cloudinary.com/v1_1/dnn2xvqgg/upload", {
                    method: "POST",
                    body: formData,
                })
                    .then((response) => {
                    if (response.ok) {
                        // Handle success
                        console.log("File uploaded successfully");
                    }
                    else {
                        // Handle error
                        console.error("File upload failed");
                    }
                })
                    .catch((error) => {
                    // Handle network or other errors
                    console.error("An error occurred:", error);
                });
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
//# sourceMappingURL=index.js.map