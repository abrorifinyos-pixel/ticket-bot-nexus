const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');

let db = null;

async function connectDB() {
  if (process.env.MONGODB_URI) {
    try {
      await mongoose.connect(process.env.MONGODB_URI);
      console.log('✅ Connected to MongoDB');
      db = 'mongo';
      return;
    } catch (err) {
      console.warn('⚠️ MongoDB connection failed, falling back to JSON storage:', err.message);
    }
  }

  const dataDir = path.join(__dirname, '../../data');
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  db = 'json';
  console.log('✅ Using JSON file storage');
}

function getDataPath(name) {
  return path.join(__dirname, '../../data', `${name}.json`);
}

function readJSON(name) {
  const p = getDataPath(name);
  if (!fs.existsSync(p)) return {};
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return {}; }
}

function writeJSON(name, data) {
  fs.writeFileSync(getDataPath(name), JSON.stringify(data, null, 2));
}

module.exports = { connectDB, readJSON, writeJSON };
