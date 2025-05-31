// upload.js
const multer = require("multer");

// Multer setup to handle file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "./uploads"); // Folder where the image will be stored
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname); // Naming the file with a timestamp
  },
});

const upload = multer({ storage: storage });

module.exports = upload; // Export the upload middleware
