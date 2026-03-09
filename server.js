require('dotenv').config();
const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
const { generateVerdict } = require('./compareLogic');
const fs = require('fs');
const path = require('path');

const app = express();
const port = process.env.PORT || 5001;

// Initialize Firebase Admin SDK
// Check if a local serviceAccountKey.json exists (used for local testing)
// Or fallback to environment variables (used for cloud hosting like Render)
const serviceAccountPath = path.join(__dirname, 'serviceAccountKey.json');

if (fs.existsSync(serviceAccountPath)) {
  const serviceAccount = require(serviceAccountPath);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
  console.log("Firebase initialized using local serviceAccountKey.json.");
} else if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  // Option for cloud hosts: Pass the JSON string as an environment variable
  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    console.log("Firebase initialized using FIREBASE_SERVICE_ACCOUNT environment variable.");
  } catch (err) {
    console.error("Failed to parse FIREBASE_SERVICE_ACCOUNT env var:", err);
    process.exit(1);
  }
} else {
  console.log("No serviceAccountKey.json found and FIREBASE_SERVICE_ACCOUNT env var missing. Falling back to applicationDefault().");
  admin.initializeApp({
    credential: admin.credential.applicationDefault()
  });
}

const db = admin.firestore();

// Middleware
app.use(cors());
app.use(express.json());

// ==========================================
// API ENDPOINTS (FIRESTORE)
// ==========================================

// 1. GET /devices -> Return all devices, with optional query params like brand, os, or ram
app.get("/devices", async (req, res) => {
  try {
    const { brand, os, ram, limit, offset } = req.query;
    let devicesRef = db.collection('devices');
    
    // Firestore filters based on exact lowercase matching
    if (brand) {
      devicesRef = devicesRef.where('brand_lower', '==', brand.toLowerCase());
    }
    if (os) {
      devicesRef = devicesRef.where('os_lower', '==', os.toLowerCase());
    }
    if (ram) {
      devicesRef = devicesRef.where('ram_str', '==', ram);
    }
    
    devicesRef = devicesRef.orderBy('id', 'asc');
    
    let finalLimit = parseInt(limit, 10) || 50; // Default limit 50 to avoid massive reads
    devicesRef = devicesRef.limit(finalLimit);
    
    let finalOffset = parseInt(offset, 10) || 0;
    if (finalOffset > 0) {
      devicesRef = devicesRef.offset(finalOffset);
    }

    const snapshot = await devicesRef.get();
    const rows = [];
    snapshot.forEach(doc => {
      rows.push(doc.data());
    });
    
    res.json(rows);
  } catch (error) {
    console.error("Error fetching devices:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// 2. GET /compare?ids=1,2,3 -> Return up to 5 devices by ID
app.get("/compare", async (req, res) => {
  try {
    const { ids } = req.query;

    if (!ids) {
      return res.status(400).json({ error: "Please provide ids parameter (e.g., /compare?ids=1,2,3)" });
    }

    const idArray = ids
      .split(",")
      .map((id) => parseInt(id.trim(), 10))
      .filter((id) => !isNaN(id));

    if (idArray.length === 0) {
      return res.status(400).json({ error: "Invalid ids provided." });
    }

    if (idArray.length > 5) {
      return res.status(400).json({ error: "You can only compare up to 5 devices at a time." });
    }

    // Firestore 'in' query supports up to 10 items natively.
    const snapshot = await db.collection('devices')
        .where('id', 'in', idArray)
        .get();
        
    const rows = [];
    snapshot.forEach(doc => rows.push(doc.data()));

    // Sort them in the order they were requested
    const sortedRows = idArray
      .map((id) => rows.find((row) => row.id === id))
      .filter(Boolean);

    const verdict = generateVerdict(sortedRows);

    res.json({
        devices: sortedRows,
        verdict: verdict
    });
  } catch (error) {
    console.error("Error fetching devices for comparison:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// 3. GET /devices/:id -> Return single device by ID
app.get("/devices/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid device ID" });
    }

    const deviceIdInt = parseInt(id, 10);
    const snapshot = await db.collection('devices').where('id', '==', deviceIdInt).limit(1).get();

    if (snapshot.empty) {
      return res.status(404).json({ error: "Device not found" });
    }

    res.json(snapshot.docs[0].data());
  } catch (error) {
    console.error("Error fetching single device:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Default root response
app.get("/", (req, res) => {
  res.json({ message: "Device Compare API is running via Native Node+Firestore!" });
});

// Start the server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
