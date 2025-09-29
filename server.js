import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import connectDB from "./dbConfig.js";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

dotenv.config();

const app = express();

// ✅ CORS setup (multiple allowed origins)
const allowedOrigins = process.env.FRONTEND_URL.split(",");

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true); // mobile apps / Postman (no origin)
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    } else {
      const msg = `The CORS policy does not allow access from: ${origin}`;
      return callback(new Error(msg), false);
    }
  },
  credentials: true,
}));

app.use(express.json());

// --- Schemas ---

// Device schema
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

// User schema
const userSchema = new mongoose.Schema({
  email: String,
  password: String, // hashed password
  name: String,
});
const User = mongoose.model("User", userSchema);

// --- Routes ---

// Register device
app.post("/api/device/register", async (req, res) => {
  try {
    const { userId, deviceName, imei, notes, status, createdAt } = req.body;
    if (!deviceName || !imei) return res.status(400).json({ error: "Device name and IMEI required" });

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
    const query = userId ? { userId } : {};
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

    // Hash password before saving
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ email, password: hashedPassword, name });
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
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ error: "Invalid credentials" });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ error: "Invalid credentials" });

    res.json({ email: user.email, name: user.name });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- Start server ---
connectDB().then(() => {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Server running on http://0.0.0.0:${PORT}`);
  });
});
