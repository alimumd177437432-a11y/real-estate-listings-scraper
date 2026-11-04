// store.js
// مسؤول عن حفظ وقراءة "بصمات" الإعلانات اللي تم سحبها قبل هيك
// البصمة المستخدمة هي رابط الإعلان نفسه (فريد ومستقر لكل إعلان على الموقع)

const fs = require('fs');
const path = require('path');
const config = require('./config');

const SEEN_PATH = path.resolve(__dirname, config.SEEN_FILE);

function ensureDataDir() {
  const dir = path.dirname(SEEN_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * بيرجع Set فيه كل روابط الإعلانات اللي انسحبت سابقاً
 */
function loadSeen() {
  ensureDataDir();
  if (!fs.existsSync(SEEN_PATH)) {
    return new Set();
  }
  try {
    const raw = fs.readFileSync(SEEN_PATH, 'utf-8');
    const arr = JSON.parse(raw);
    return new Set(arr);
  } catch (err) {
    console.error('⚠️  ملف seen.json تالف أو فاضي، رح نبدأ من جديد:', err.message);
    return new Set();
  }
}

/**
 * بيحفظ الـ Set كامل بملف JSON (يستبدل المحتوى القديم بالكامل)
 */
function saveSeen(seenSet) {
  ensureDataDir();
  const arr = Array.from(seenSet);
  fs.writeFileSync(SEEN_PATH, JSON.stringify(arr, null, 2), 'utf-8');
}

module.exports = { loadSeen, saveSeen };
