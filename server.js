const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
const DATA_FILE = path.join(__dirname, 'data', 'config.json');

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// اطمینان از وجود فایل دیتا
function ensureDataFile() {
  const dir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify({
      name: 'دوست‌داشتنی',
      message: 'یه چیزی هست که مدت‌هاست می‌خوام بهت بگم...',
      question: 'میشه مال من بشی؟'
    }, null, 2));
  }
}
ensureDataFile();

function readConfig() {
  ensureDataFile();
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
}

function writeConfig(cfg) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(cfg, null, 2));
}

// گرفتن تنظیمات فعلی (برای صفحه اصلی)
app.get('/api/config', (req, res) => {
  const cfg = readConfig();
  res.json(cfg);
});

// آپدیت تنظیمات (فقط با رمز ادمین)
app.post('/api/config', (req, res) => {
  const { password, name, message, question } = req.body;
  if (password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'رمز اشتباهه' });
  }
  const current = readConfig();
  const updated = {
    name: name && name.trim() ? name.trim() : current.name,
    message: message && message.trim() ? message.trim() : current.message,
    question: question && question.trim() ? question.trim() : current.question,
  };
  writeConfig(updated);
  res.json({ success: true, config: updated });
});

// ثبت پاسخ "بله" (اختیاری - فقط لاگ می‌کنیم)
app.post('/api/yes', (req, res) => {
  console.log(`🎉 ${new Date().toISOString()} - جواب بله دریافت شد!`);
  res.json({ success: true });
});

app.listen(PORT, () => {
  console.log(`سرور روی پورت ${PORT} روشنه ❤️`);
});
