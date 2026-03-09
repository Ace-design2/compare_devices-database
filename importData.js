const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const serviceAccountPath = path.join(__dirname, 'serviceAccountKey.json');

if (fs.existsSync(serviceAccountPath)) {
  const serviceAccount = require(serviceAccountPath);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
  console.log("Firebase Admin initialized using local serviceAccountKey.json.");
} else {
  console.error("ERROR: Missing serviceAccountKey.json!");
  console.error("Please download the service account key from your Firebase Project Settings -> Service Accounts.");
  console.error("Save it as 'serviceAccountKey.json' in this folder and run again.");
  process.exit(1);
}

const db = admin.firestore();

// Load the raw JSON file
const dataPath = './data/data.json';
console.log(`Loading data from ${dataPath}...`);
const rawData = fs.readFileSync(dataPath, 'utf-8');
const devices = JSON.parse(rawData);
console.log(`Loaded ${devices.length} devices from JSON.`);

// Helper to extract numbers for better Firestore querying later
const extractNumber = (text, regex) => {
    if (!text) return 0;
    const match = text.match(regex);
    return match && match[1] ? parseFloat(match[1]) : 0;
};

async function importData() {
  try {
    console.log('Beginning Firestore Batch Import...');
    console.log('NOTE: Ensure you do not run this repeatedly without manual cleanup, as it will append duplicates.');

    // Break data into chunks of 500 max as required by Firestore Batch
    const batchSize = 490;
    let insertedCount = 0;
    
    for (let i = 0; i < devices.length; i += batchSize) {
      const chunk = devices.slice(i, i + batchSize);
      const batch = db.batch();
      
      chunk.forEach((device, index) => {
        const docRef = db.collection('devices').doc(); // Auto-generate ID
        
        const specs = device.specs || {};
        const memoryStr = (specs.Memory && specs.Memory.Internal) ? specs.Memory.Internal : '';
        const ramVal = extractNumber(memoryStr, /(\d{1,2})\s*GB\s*RAM/i) || extractNumber(memoryStr, /(\d{1,2})\s*GB/i);
        const osVal = (specs.Platform && specs.Platform.OS) ? specs.Platform.OS : '';
        const originalId = i + index + 1; // Keeping the original integer ID for integer queries
        
        const structuredDevice = {
          id: originalId,
          brand: device.phone_brand || 'Unknown',
          brand_lower: (device.phone_brand || 'Unknown').toLowerCase(),
          model: device.phone_model || 'Unknown',
          price: device.price || null,
          specs: specs,
          os_lower: osVal.toLowerCase(),
          ram_str: String(ramVal) // query purposes
        };
        
        batch.set(docRef, structuredDevice);
      });
      
      await batch.commit();
      insertedCount += chunk.length;
      console.log(`Committed batch... ${insertedCount} / ${devices.length} inserted.`);
    }

    console.log('Firebase Firestore Database matching complete!');
  } catch (error) {
    console.error('Error importing data:', error);
  }
}

importData();
