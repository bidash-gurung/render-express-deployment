const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const otpController = require("../controllers/otpController");
const verifyToken = require("../middleware/authMiddleware"); // Middleware to authenticate JWT
const profileController = require("../controllers/profileController"); // Import the profile controller
const upload = require("../middleware/upload"); // Import multer setup

// Login Route
router.post("/login", authController.login);

// Signup Route
router.post("/signup", authController.signup);

// Get all users
router.get("/users", authController.getAllUsers);

// Delete user
router.delete("/users/:email", authController.deleteUser);

// Protected route to get user profile
router.get("/user/profile", verifyToken, authController.getUserProfile);

// Add route to update the user profile (name, email, profile image)
router.put(
  "/user/profile",
  verifyToken,
  upload.single("profileImage"),
  profileController.updateProfile
);

// change password
router.put(
  "/user/change-password",
  verifyToken,
  profileController.changePassword
);

// Add the route for verifying email before sending OTP
router.post("/verify-email", otpController.verifyEmail);

// OTP Controller: Send OTP
router.post("/send-otp", otpController.sendOtp);

// OTP Controller: Verify OTP
router.post("/verify-otp", otpController.verifyOtp);

// Password Reset Routes
router.post("/reset-password", otpController.resetPassword);

module.exports = router;
