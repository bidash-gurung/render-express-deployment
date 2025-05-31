const jwt = require("jsonwebtoken");

// Middleware to authenticate JWT
const verifyToken = (req, res, next) => {
  const token = req.headers["authorization"]?.split(" ")[1]; // Extract the token from the Authorization header

  if (!token) {
    return res.status(403).json({ error: "Token is required" });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: "Invalid or expired token" });
    }

    // Set the decoded user information to req.user
    req.user = decoded;
    next(); // Continue to the next middleware/route handler
  });
};

module.exports = verifyToken;
