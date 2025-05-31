const bcrypt = require("bcryptjs"); // Ensure bcryptjs is used (not bcrypt)
const pool = require("../config/db"); // Use `pool` instead of `db`
const jwt = require("jsonwebtoken");

// Signup Controller
exports.signup = async (req, res) => {
  const { name, email, password, role } = req.body;

  if (!name || !email || !password || !role) {
    return res.status(400).json({ error: "All fields are required" });
  }

  try {
    const [existingUser] = await pool.query(
      "SELECT * FROM users WHERE email = ?",
      [email]
    );

    if (existingUser.length > 0) {
      return res.status(400).json({ error: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await pool.query(
      "INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)",
      [name, email, hashedPassword, role]
    );

    res.status(201).json({ message: "User registered successfully" });
  } catch (error) {
    console.error("Database error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

// Login Controller
exports.login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "All fields are required" });
  }

  try {
    const [users] = await pool.query("SELECT * FROM users WHERE email = ?", [
      email,
    ]);

    if (users.length === 0) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const user = users[0];
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.status(200).json({
      message: "Login successful",
      token,
      role: user.role,
    });
  } catch (error) {
    console.error("Server error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

// Get all users
exports.getAllUsers = async (req, res) => {
  try {
    const [users] = await pool.query("SELECT id, name, email, role FROM users");
    res.json(users);
  } catch (error) {
    console.error("Database error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

// Delete a user
exports.deleteUser = async (req, res) => {
  const { email } = req.params;

  try {
    const [result] = await pool.query("DELETE FROM users WHERE email = ?", [
      email,
    ]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "User not found!" });
    }

    res.status(200).json({ message: "User deleted successfully!" });
  } catch (error) {
    console.error("Database error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

// Get user profile
exports.getUserProfile = async (req, res) => {
  const userId = req.user.id;

  try {
    const [users] = await pool.query(
      "SELECT name, email, profile_image FROM users WHERE id = ?",
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    res.status(200).json({
      name: users[0].name,
      email: users[0].email,
      profile: users[0].profile_image,
    });
  } catch (error) {
    console.error("Database error:", error);
    res.status(500).json({ error: "Server error" });
  }
};
