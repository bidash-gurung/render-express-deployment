const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const authRoutes = require("./routes/authRoute"); // Correct path to your routes file
const indicatorRoutes = require("./routes/indicatorRoute");
const graphRoutes = require("./routes/graphRoute");
const excelRoutes = require("./routes/excelRoute"); // Correct path to your routes file
require("dotenv").config(); // Make sure dotenv is correctly required
const path = require("path"); // Import path to serve static files
const userDataRoutes = require("./routes/generalDashboardRoute");
const app = express();
const notificationRoutes = require("./routes/notificationRoute");
const dataRoutes = require("./routes/previewRoute");
const countRoutes = require("./routes/countRoute");

// CORS configuration
const allowedOrigins = [
  "https://gentle-zabaione-679b14.netlify.app", // Existing allowed origin
  "https://tourmaline-malasada-08e671.netlify.app", // New allowed origin
  // Add more origins as needed
];

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or Postman)
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-User-Email"],
  credentials: true,
};

// Apply CORS middleware
app.use(cors(corsOptions)); // Enable cross-origin resource sharing
// Handle preflight requests
app.options("*", cors(corsOptions));

app.use(bodyParser.json()); // Parse incoming JSON requests

// Serve static files (uploads)
app.use("/uploads", express.static(path.join(__dirname, "uploads"))); // Serve files from uploads folder

// API Routes
app.use("/api", authRoutes); // Register routes with the "/api" prefix
app.use("/api", excelRoutes);
app.use("/api/indicators", indicatorRoutes);
app.use("/api", graphRoutes);
app.use("/api", userDataRoutes);
app.use("/api", notificationRoutes);
app.use("/api/data", dataRoutes);
app.use("/api", countRoutes);

// Start the server
const PORT = process.env.PORT || 5000; // Use port from .env or default to 5000
app.listen(PORT, () => {
  console.log(`Server is running on http://0.0.0.0:${PORT}`);
});
