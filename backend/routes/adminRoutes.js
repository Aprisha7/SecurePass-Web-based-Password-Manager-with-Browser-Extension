const express = require("express");
const router = express.Router();
const User = require("../models/User");
const authMiddleware = require("../middleware/auth");  
const { adminMiddleware } = require("../middleware/admin"); 


// PROMOTE USER
router.put("/promote", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email is required" });
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ error: "User not found" });

    if (user._id.toString() === req.user.id) {
      return res.status(400).json({ error: "Cannot promote yourself" });
    }
    
    user.role = "admin";
    await user.save();
    res.json({ message: `${email} has been promoted to admin` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// DEMOTE USER
router.put("/demote", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email is required" });
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ error: "User not found" });

    if (user._id.toString() === req.user.id) {
      return res.status(400).json({ error: "Cannot demote yourself" });
    }

    user.role = "user";
    await user.save();
    res.json({ message: `${email} has been demoted to user` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
