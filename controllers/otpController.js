const nodemailer = require("nodemailer");
const bcrypt = require("bcrypt");
const pool = require("../config/db");

// Generate OTP
function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000); // 6-digit OTP
}

exports.verifyEmail = async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: "Email is required" });
  }

  try {
    const [results] = await pool.query("SELECT * FROM users WHERE email = ?", [
      email,
    ]);

    if (results.length === 0) {
      return res.status(400).json({ error: "Email not found" });
    }

    // If email exists
    return res.status(200).json({ message: "Email verified. Proceed to OTP." });
  } catch (error) {
    console.error("Database error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// Send OTP
exports.sendOtp = (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: "Verify email first" });
  }

  const otp = generateOtp();

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: "bidashgurung2020@gmail.com",
      pass: "bgzw sgrw njlt smzb",
    },
    tls: { rejectUnauthorized: false },
  });

  const mailOptions = {
    from: "bidashgurung2020@gmail.com",
    to: email,
    subject: "Your OTP Code",
    text: `Your OTP is ${otp}`,
  };

  transporter.sendMail(mailOptions, (err, info) => {
    if (err) {
      console.error("Error sending email:", err);
      return res.status(500).json({ error: "Failed to send OTP" });
    }
    res.status(200).json({ message: "OTP sent successfully!", email });
    pool.query(
      "UPDATE users SET otp = ? WHERE email = ?",
      [otp, email],
      (err) => {
        if (err) {
          console.error("Database error:", err);
          return res.status(500).json({ error: "Failed to save OTP" });
        }

        res.status(200).json({ message: "OTP sent successfully!", email });
      }
    );
  });
};
exports.verifyOtp = async (req, res) => {
  const { email, otp } = req.body;

  // Check if email and OTP are provided
  if (!email || !otp) {
    return res.status(400).json({ error: "Email and OTP are required" });
  }

  try {
    const [results] = await pool.query(
      "SELECT otp FROM users WHERE email = ?",
      [email]
    );

    if (results.length === 0) {
      return res.status(400).json({ error: "Email not found" });
    }

    // Assuming OTP stored in the database is a string
    if (results[0].otp === otp) {
      return res
        .status(200)
        .json({ message: "OTP verified. Enter new password." });
    }

    return res.status(400).json({ error: "Invalid OTP" });
  } catch (err) {
    console.error("Database error:", err);
    return res.status(500).json({ error: "Database error" });
  }
};

// Reset Password
exports.resetPassword = async (req, res) => {
  let { email, newPassword } = req.body;

  if (!email) {
    email = req.headers["x-user-email"];
  }

  if (!email || !newPassword) {
    return res.status(400).json({ error: "Invalid input" });
  }

  try {
    const [results] = await pool.query("SELECT * FROM users WHERE email = ?", [
      email,
    ]);

    if (results.length === 0) {
      return res.status(400).json({ error: "Email not found" });
    }

    // Hash the new password
    const hash = await bcrypt.hash(newPassword, 10);

    // Update password in the database
    await pool.query(
      "UPDATE users SET password = ?, otp = NULL WHERE email = ?",
      [hash, email]
    );

    res.status(200).json({ message: "Password reset successfully!" });
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};
