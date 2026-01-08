const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  email: { 
    type: String, 
    required: true, 
    unique: true,
    lowercase: true,
    match: /.+\@.+\..+/
  },
  masterPassword: { type: String, required: true },
  role: { 
    type: String, 
    enum: ['user', 'admin'],  
    default: "user" 
  },
  twoFactorEnabled: { type: Boolean, default: false },
  twoFactorSecret: { type: String }, // base32 TOTP secret
  },
 { timestamps: true });

module.exports = mongoose.model("User", UserSchema);
