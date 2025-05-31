const pool = require("../config/db"); // ✅ Import `pool` only
const bcrypt = require("bcryptjs");

exports.updateProfile = async (req, res) => {
  const userId = req.user.id;
  const { name, email } = req.body;
  const profileImage = req.file ? req.file.filename : null;

  if (!name && !email && !profileImage) {
    return res.status(400).json({ error: "No data to update" });
  }

  let query = "UPDATE users SET ";
  let values = [];

  if (name) {
    query += "name = ?, ";
    values.push(name);
  }
  if (email) {
    query += "email = ?, ";
    values.push(email);
  }
  if (profileImage) {
    query += "profile_image = ?, ";
    values.push(profileImage);
  }

  query = query.slice(0, -2);
  query += " WHERE id = ?";
  values.push(userId);

  try {
    const [result] = await pool.query(query, values); // ✅ Use `pool.query()`

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    res.status(200).json({ message: "Profile updated successfully" });
  } catch (err) {
    console.error("Database Error:", err);
    res.status(500).json({ error: "Error updating profile" });
  }
};

exports.changePassword = async (req, res) => {
  const userId = req.user.id;
  const { oldPassword, newPassword, confirmPassword } = req.body;

  if (!oldPassword || !newPassword || !confirmPassword) {
    return res.status(400).json({ error: "All fields are required" });
  }

  if (newPassword !== confirmPassword) {
    return res.status(400).json({ error: "New passwords do not match" });
  }

  try {
    const [results] = await pool.query(
      "SELECT password FROM users WHERE id = ?",
      [userId]
    );

    if (results.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const hashedPassword = results[0].password;
    const isMatch = await bcrypt.compare(oldPassword, hashedPassword);

    if (!isMatch) {
      return res.status(400).json({ error: "Old password is incorrect" });
    }

    const salt = await bcrypt.genSalt(10);
    const newHashedPassword = await bcrypt.hash(newPassword, salt);

    await pool.query("UPDATE users SET password = ? WHERE id = ?", [
      newHashedPassword,
      userId,
    ]);

    res.status(200).json({ message: "Password updated successfully" });
  } catch (error) {
    console.error("Server Error:", error);
    res.status(500).json({ error: "Server error" });
  }
};
