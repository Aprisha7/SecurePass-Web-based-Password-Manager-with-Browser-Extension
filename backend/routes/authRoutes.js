const express = require("express");
const router = express.Router();
const User = require("../models/User");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const speakeasy = require("speakeasy");
const qrcode = require("qrcode");
const authMiddleware = require("../middleware/auth"); 

// REGISTER ROUTE
router.post("/register", async (req, res) => {
  try {
    const { email, masterPassword } = req.body;
    if (!email || !masterPassword) {
      return res.status(400).json({ error: "Email and master password are required" });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(400).json({ error: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(masterPassword, 10);

    // Auto-admin for first user
    const userCount = await User.countDocuments();
    const role = userCount === 0 ? "admin" : "user";

    const user = new User({
      email: normalizedEmail,
      masterPassword: hashedPassword,
      role  // Set role
    });

    await user.save();
    res.json({ message: `User registered successfully as ${role}` ,
    user: {
        id: user._id,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    });
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// LOGIN ROUTE 
router.post("/login", async (req, res) => {
  try {
    const { email, masterPassword } = req.body;
    if (!email || !masterPassword) {
      return res.status(400).json({ error: "Email and master password are required" });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(400).json({ error: "Invalid email or password" });
    }

    const isMatch = await bcrypt.compare(masterPassword, user.masterPassword);
    if (!isMatch) {
      return res.status(400).json({ error: "Invalid email or password" });
    }

    // Include role in JWT
    const token = jwt.sign(
        {
          userId: user._id,
          email: user.email,
          role: user.role,
        },
        process.env.JWT_SECRET,
        { expiresIn: "1h" }
      );

    res.json({ 
      message: "Login successful", 
      token, 
      user: { id: user._id, email: user.email, role: user.role }
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
