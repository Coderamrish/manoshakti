import dotenv from "dotenv";
import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import cors from "cors";
import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import path from "path";
import admin from "firebase-admin";
import http from "http";
import { Server } from "socket.io";
import { readFileSync } from "fs";

dotenv.config();

// Initialize Express App
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});

// Firebase Admin SDK
const serviceAccount = JSON.parse(readFileSync("./firebaseConfig.json"));
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://healthista-main.firebaseio.com",
});
const db = admin.firestore(); // Firestore Database

const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || "amrishkumartiwary";

// Middleware
app.use(cors({ origin: "http://localhost:3000", credentials: true }));
app.use(bodyParser.json());
app.use(cookieParser());
app.use(express.static(path.join(process.cwd(), "public")));

// Import graqai.mjs dynamically
const { main } = await import("./graqai.mjs");

// Routes
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "login.html"));
});

app.get("/index.html", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.post("/signup", async (req, res) => {
  const { name, email, password } = req.body;
  try {
    if (!name || !email || !password) {
      return res.status(400).json({ error: "All fields are required" });
    }
    const usersRef = db.collection("users");
    const existingUser = await usersRef.where("email", "==", email).get();
    if (!existingUser.empty) {
      return res.status(400).json({ error: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    await usersRef.add({ name, email, password: hashedPassword });

    res.status(201).json({ message: "User registered successfully" });
  } catch (error) {
    res.status(500).json({ error: "Error signing up" });
  }
});

app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    if (!email || !password) {
      return res.status(400).json({ error: "All fields are required" });
    }
    const usersRef = db.collection("users");
    const userSnapshot = await usersRef.where("email", "==", email).get();

    if (userSnapshot.empty) {
      return res.status(400).json({ error: "User not found" });
    }

    const user = userSnapshot.docs[0].data();
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign({ email }, JWT_SECRET, { expiresIn: "1h" });
    res.cookie("token", token, { httpOnly: true, secure: process.env.NODE_ENV === "production" });
    res.status(200).json({ message: "Login successful", redirect: "/index.html" });
  } catch (error) {
    res.status(500).json({ error: "Error logging in" });
  }
});

app.post("/logout", (req, res) => {
  res.clearCookie("authtoken");
  res.status(200).json({ message: "Logout successful" });
});

app.get("/dashboard", (req, res) => {
  const token = req.cookies.token;
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  try {
    const verified = jwt.verify(token, JWT_SECRET);
    res.status(200).json({ message: "Welcome to the dashboard", email: verified.email });
  } catch (error) {
    res.status(401).json({ error: "Invalid token" });
  }
});

app.post("/groq", async (req, res) => {
  const { question } = req.body;
  if (!question) {
    return res.status(400).json({ error: "Question is required" });
  }

  try {
    const response = await main(question);
    res.status(200).json({ response });
  } catch (error) {
    console.error("Error fetching data from Groq API:", error);
    res.status(500).json({ error: "Error fetching data from Groq API" });
  }
});

// Socket.IO for Real-Time Features
const onlineUsers = new Map(); // Track online users
const onlineTherapists = new Set(); // Track online therapists

io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);

  // User joins the server
  socket.on("join-server", ({ user, therapist }) => {
    onlineUsers.set(socket.id, user);
    if (therapist) {
      onlineTherapists.add(therapist);
    }
    io.emit("user-connected", user);
    io.emit("online-users", Array.from(onlineUsers.values()));
    io.emit("online-therapists", Array.from(onlineTherapists));
    console.log(`${user} joined ${therapist}'s server`);
  });

  // Chat messages
  socket.on("chatMessage", (msg) => {
    const username = onlineUsers.get(socket.id);
    const timestamp = new Date().toLocaleTimeString();
    io.emit("message", { username, msg, timestamp });
  });

  // Typing indicator
  socket.on("typing", () => {
    const username = onlineUsers.get(socket.id);
    socket.broadcast.emit("typing", username);
  });

  // Stop typing indicator
  socket.on("stop-typing", () => {
    socket.broadcast.emit("stop-typing");
  });

  // Video call signaling
  socket.on("video-offer", (offer) => {
    socket.broadcast.emit("video-offer", offer);
  });

  socket.on("video-answer", (answer) => {
    socket.broadcast.emit("video-answer", answer);
  });

  socket.on("video-candidate", (candidate) => {
    socket.broadcast.emit("video-candidate", candidate);
  });

  // Audio call signaling
  socket.on("audio-offer", (offer) => {
    socket.broadcast.emit("audio-offer", offer);
  });

  socket.on("audio-answer", (answer) => {
    socket.broadcast.emit("audio-answer", answer);
  });

  socket.on("audio-candidate", (candidate) => {
    socket.broadcast.emit("audio-candidate", candidate);
  });

  // User disconnects
  socket.on("disconnect", () => {
    const username = onlineUsers.get(socket.id);
    onlineUsers.delete(socket.id);
    io.emit("user-disconnected", username);
    io.emit("online-users", Array.from(onlineUsers.values()));
    console.log("User disconnected:", socket.id);
  });
});

// Start Server
server.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));