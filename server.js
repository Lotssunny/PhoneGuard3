import express from "express";
import mongoose from "mongoose";
import connectDB from "./dbConfig.js";
import dotenv from "dotenv";
import cors from "cors";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// ✅ Device schema
const deviceSchema = new mongoose.Schema({
  id: String,
  userId: String,
  name: String,
  imei: String,
  status: String,
  lastSeen: String,
  latitude: Number,
  longitude: Number,
  notes: String,
  createdAt: String,
});
const Device = mongoose.model("Device", deviceSchema);

// ✅ User schema
const userSchema = new mongoose.Schema({
  email: String,
  password: String, // NOTE: hash in production
  name: String,
});
const User = mongoose.model("User", userSchema);

// --- API Routes ---

// Register a device
app.post("/api/device/register", async (req, res) => {
  try {
    const { userId, deviceName, imei, notes, status, createdAt } = req.body;

    if (!deviceName || !imei) {
      return res.status(400).json({ error: "Device name and IMEI are required" });
    }

    const deviceData = {
      userId: userId || "tempUserId",
      name: deviceName,
      imei,
      notes: notes || null,
      status: status || "Active",
      createdAt: createdAt || new Date().toISOString(),
      id: `DEV_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };

    const device = new Device(deviceData);
    await device.save();
    res.status(201).json({ message: "Device registered", device });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get devices
app.get("/api/devices", async (req, res) => {
  try {
    const { userId } = req.query;
    let query = {};
    if (userId) query.userId = userId;
    const devices = await Device.find(query).lean();
    res.json(devices);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update device status
app.put("/api/devices/:id/status", async (req, res) => {
  try {
    const { status } = req.body;
    await Device.updateOne({ id: req.params.id }, { status });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Register user
app.post("/api/users/register", async (req, res) => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password) return res.status(400).json({ error: "Email and password required" });

    const exists = await User.findOne({ email });
    if (exists) return res.status(409).json({ error: "User already exists" });

    const user = new User({ email, password, name });
    await user.save();
    res.status(201).json({ message: "User registered" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Login user
app.post("/api/users/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email, password });
    if (!user) return res.status(401).json({ error: "Invalid credentials" });
    res.json({ email: user.email, name: user.name });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ✅ Start server
connectDB().then(() => {
  app.listen(process.env.PORT || 3000, "0.0.0.0", () =>
    console.log(`🚀 Server running on http://192.168.138.247:${process.env.PORT || 3000}`)
  );
});
