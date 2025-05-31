const db = require("../config/db");

const User = {
  // Method to find a user by email
  findByEmail: (email, callback) => {
    const query = "SELECT * FROM users WHERE email = ?";
    db.query(query, [email], callback);
  },

  // Method to create a new user
  create: (userData, callback) => {
    const query = "INSERT INTO users (email, password) VALUES (?, ?)";
    db.query(query, [userData.email, userData.password], callback);
  },
};

// Correct export
module.exports = User;
