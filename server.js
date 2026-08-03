const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
const DATA_FILE = path.join(__dirname, 'data', 'config.json');

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

function ensureDataFile() {
  const dir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify({
      name: 'دوست‌داشتنی',
      message: 'یه چیزی هست که مدت‌هاست می‌خوام بهت بگم...',
      question: 'میشه مال من بشی؟',
      dateHeading: 'بریم یه دیت باحال؟',
      dateMessage: 'یه جای خوب سراغ دارم، فقط بگو کی و کجا برات خوبه',
      telegram: {
        botToken: process.env.TELEGRAM_BOT_TOKEN || '',
        chatId: process.env.TELEGRAM_CHAT_ID || ''
      }
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

// تنظیمات عمومی -- بدون اطلاعات حساس تلگرام
app.get('/api/config', (req, res) => {
  const cfg = readConfig();
  const { telegram, ...publicCfg } = cfg;
  res.json(publicCfg);
});

// گرفتن تنظیمات کامل برای پنل ادمین (نیاز به رمز)
app.post('/api/admin/config', (req, res) => {
  const { password } = req.body;
  if (password !== ADMIN_PASSWORD) return res.status(401).json({ error: 'رمز اشتباهه' });
  res.json(readConfig());
});

// آپدیت تنظیمات
app.post('/api/config', (req, res) => {
  const { password, name, message, question, dateHeading, dateMessage, telegramBotToken, telegramChatId } = req.body;
  if (password !== ADMIN_PASSWORD) return res.status(401).json({ error: 'رمز اشتباهه' });

  const current = readConfig();
  const updated = {
    name: name?.trim() || current.name,
    message: message?.trim() || current.message,
    question: question?.trim() || current.question,
    dateHeading: dateHeading?.trim() || current.dateHeading,
    dateMessage: dateMessage?.trim() || current.dateMessage,
    telegram: {
      botToken: telegramBotToken !== undefined ? telegramBotToken.trim() : current.telegram?.botToken || '',
      chatId: telegramChatId !== undefined ? telegramChatId.trim() : current.telegram?.chatId || ''
    }
  };
  writeConfig(updated);
  res.json({ success: true, config: updated });
});

// ثبت پاسخ "بله" به سؤال اصلی
app.post('/api/yes', (req, res) => {
  console.log(`🎉 ${new Date().toISOString()} - جواب بله دریافت شد!`);
  res.json({ success: true });
});

// درخواست دیت -> ارسال پیام به تلگرام
app.post('/api/date-response', async (req, res) => {
  const { accepted, day, time, note } = req.body;
  const cfg = readConfig();
  const { botToken, chatId } = cfg.telegram || {};

  console.log(`💌 درخواست دیت: accepted=${accepted}, day=${day}, time=${time}, note=${note}`);

  if (!accepted) {
    return res.json({ success: true, telegramSent: false });
  }

  if (!botToken || !chatId) {
    console.warn('تلگرام تنظیم نشده -- پیام ارسال نشد');
    return res.json({ success: true, telegramSent: false, warning: 'تلگرام تو پنل ادمین تنظیم نشده' });
  }

  const text = [
    '💘 خبر خوب! درخواست دیت تایید شد!',
    day ? `📅 روز پیشنهادی: ${day}` : null,
    time ? `⏰ ساعت پیشنهادی: ${time}` : null,
    note ? `📝 یادداشت: ${note}` : null,
  ].filter(Boolean).join('\n');

  try {
    const tgRes = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text }),
    });
    const tgData = await tgRes.json();
    if (!tgData.ok) {
      console.error('خطای تلگرام:', tgData);
      return res.json({ success: true, telegramSent: false, warning: 'ارسال به تلگرام ناموفق بود' });
    }
    res.json({ success: true, telegramSent: true });
  } catch (err) {
    console.error('خطا در اتصال به تلگرام:', err);
    res.json({ success: true, telegramSent: false, warning: 'خطا در اتصال به تلگرام' });
  }
});

app.listen(PORT, () => {
  console.log(`سرور روی پورت ${PORT} روشنه ❤️`);
});
