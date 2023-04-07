import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { connectDB } from "./config/db.js";
import { userRoutes } from "./routes/userRoutes.js";
import cookieParser from "cookie-parser";
import { chatRoutes } from "./routes/chatRoutes.js";
import { messageRoutes } from "./routes/messageRoutes.js";
import {Server} from "socket.io";

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3001;
connectDB();

app.use(cors({ credentials: true, origin: `${process.env.CLIENT_URL}` }));
app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: false }));

app.get("/", (req, res) => {
  res.send("Messenger Chat App");
});

app.use("/api/user", userRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/message", messageRoutes);

const server = app.listen(PORT, () => console.log(`Server started at port ${PORT}`));

const io = new Server(server, {
  pingTimeout: 60000,
  cors: {
    origin: `${process.env.CLIENT_URL}`,
  }
});

io.on("connection", (socket) => {
  console.log("Connected to socket.io");

  socket.on("setup", (userData) => {
    socket.join(userData._id);
    socket.emit("connected");
  });

  socket.on("join_chat", (room) => {
    socket.join(room);
    console.log("Joined room: "+room )
  });

  socket.on("typing", (room) => socket.in(room).emit("typing"));
  socket.on("stop_typing", (room) => socket.in(room).emit("stop_typing"));

  socket.on("new_message", (newMsgReceived) => {
    let chat = newMsgReceived.chat;

    if(!chat.users) return console.log("chat.users not defined");

    chat.users.forEach((user) =>{
      if(user._id === newMsgReceived.sender._id) return;

      socket.in(user._id).emit("message_received", newMsgReceived);
    });
  });

  socket.off("setup", () => {
    console.log("User disconnected");
    socket.leave(userData._id);
  })
})
