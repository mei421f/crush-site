const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
const DATA_FILE = path.join(__dirname, 'data', 'config.json');

app.use(express.json());

function isAccessBlocked(access) {
  if (!access) return false;
  if (access.expiresAt && new Date() > new Date(access.expiresAt)) return 'expired';
  if (access.maxVisits && access.visitCount >= access.maxVisits) return 'limit';
  return false;
}

// صفحه‌ی اصلی: قبل از سرو کردن، انقضا/محدودیت بازدید رو چک می‌کنه
app.get('/', (req, res) => {
  // پیش‌نمایش پنل ادمین نه شمرده میشه نه مسدود -- همیشه قابل مشاهده‌ست
  if (req.query.preview === '1') {
    return res.sendFile(path.join(__dirname, 'public', 'index.html'));
  }
  const cfg = readConfig();
  const blocked = isAccessBlocked(cfg.access);
  if (blocked) {
    return res.status(410).sendFile(path.join(__dirname, 'public', 'expired.html'));
  }
  cfg.access.visitCount = (cfg.access.visitCount || 0) + 1;

  // اعلان لحظه‌ای: فقط اگه تلگرام تنظیم شده و بازه‌ی خنک‌سازی رد شده باشه
  // (تا رفرش‌های پشت‌سرهم چند بار پشت‌هم بهت پیام ندن)
  const lastNotified = cfg.access.lastOpenNotifiedAt ? new Date(cfg.access.lastOpenNotifiedAt).getTime() : 0;
  const shouldNotify = cfg.notifyOnOpen !== false
    && cfg.telegram?.botToken && cfg.telegram?.chatId
    && (Date.now() - lastNotified > NOTIFY_COOLDOWN_MS);

  if (shouldNotify) cfg.access.lastOpenNotifiedAt = new Date().toISOString();
  writeConfig(cfg);

  // جواب رو فوری بفرست، بعد (بدون منتظر موندن) پیام تلگرام رو در پس‌زمینه بفرست
  // تا اعلان باعث کندی باز شدن صفحه برای طرف نشه
  res.sendFile(path.join(__dirname, 'public', 'index.html'));

  if (shouldNotify) {
    const who = (req.query.to && String(req.query.to).trim()) || cfg.name || 'یکی';
    sendTelegram(cfg.telegram.botToken, cfg.telegram.chatId, `👀 ${who} لینک رو باز کرد! (بازدید #${cfg.access.visitCount})\nهنوز جواب نداده -- فعلاً فقط بازش کرده`)
      .catch(() => {});
  }
});

app.use(express.static(path.join(__dirname, 'public')));

const NOTIFY_COOLDOWN_MS = 30 * 1000; // برای جلوگیری از اسپم تلگرام روی رفرش‌های پشت‌سرهم

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
      notifyOnOpen: true,
      quiz: {
        enabled: true,
        questions: [
          { q: 'اولین باری که همو دیدیم کجا بود؟', options: ['دانشگاه', 'مهمونی یه دوست', 'کافه', 'آنلاین'], correctIndex: 1 },
          { q: 'غذای مورد علاقه‌م چیه؟', options: ['پیتزا', 'قرمه‌سبزی', 'سوشی', 'کباب'], correctIndex: 1 },
          { q: 'اگه یه روز تعطیل بی‌برنامه داشته باشم، چیکار می‌کنم؟', options: ['فیلم می‌بینم', 'میرم بیرون', 'می‌خوابم', 'کتاب می‌خونم'], correctIndex: 2 }
        ]
      },
      telegram: {
        botToken: process.env.TELEGRAM_BOT_TOKEN || '',
        chatId: process.env.TELEGRAM_CHAT_ID || ''
      },
      access: {
        expiresAt: null,
        maxVisits: null,
        visitCount: 0,
        lastOpenNotifiedAt: null
      }
    }, null, 2));
  }
}
ensureDataFile();

function readConfig() {
  ensureDataFile();
  const cfg = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
  if (!cfg.access) cfg.access = { expiresAt: null, maxVisits: null, visitCount: 0, lastOpenNotifiedAt: null };
  if (cfg.access.lastOpenNotifiedAt === undefined) cfg.access.lastOpenNotifiedAt = null;
  if (!cfg.quiz) cfg.quiz = { enabled: false, questions: [] };
  if (cfg.notifyOnOpen === undefined) cfg.notifyOnOpen = true;
  return cfg;
}

function writeConfig(cfg) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(cfg, null, 2));
}

async function sendTelegram(botToken, chatId, text) {
  const tgRes = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text }),
  });
  return tgRes.json();
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
  const {
    password, name, message, question, dateHeading, dateMessage,
    telegramBotToken, telegramChatId, accessExpiresAt, accessMaxVisits,
    notifyOnOpen, quiz
  } = req.body;
  if (password !== ADMIN_PASSWORD) return res.status(401).json({ error: 'رمز اشتباهه' });

  const current = readConfig();
  const updated = {
    name: name?.trim() || current.name,
    message: message?.trim() || current.message,
    question: question?.trim() || current.question,
    dateHeading: dateHeading?.trim() || current.dateHeading,
    dateMessage: dateMessage?.trim() || current.dateMessage,
    notifyOnOpen: notifyOnOpen !== undefined ? Boolean(notifyOnOpen) : current.notifyOnOpen,
    quiz: quiz !== undefined ? {
      enabled: Boolean(quiz.enabled),
      questions: Array.isArray(quiz.questions) ? quiz.questions
        .filter(q => q && q.q && Array.isArray(q.options) && q.options.length >= 2)
        .map(q => ({
          q: String(q.q).trim(),
          options: q.options.map(o => String(o).trim()).filter(Boolean),
          correctIndex: Number.isInteger(q.correctIndex) ? q.correctIndex : 0
        })) : []
    } : current.quiz,
    telegram: {
      botToken: telegramBotToken !== undefined ? telegramBotToken.trim() : current.telegram?.botToken || '',
      chatId: telegramChatId !== undefined ? telegramChatId.trim() : current.telegram?.chatId || ''
    },
    access: {
      expiresAt: accessExpiresAt !== undefined ? (accessExpiresAt || null) : current.access?.expiresAt || null,
      maxVisits: accessMaxVisits !== undefined ? (accessMaxVisits ? Number(accessMaxVisits) : null) : current.access?.maxVisits || null,
      visitCount: current.access?.visitCount || 0,
      lastOpenNotifiedAt: current.access?.lastOpenNotifiedAt || null
    }
  };
  writeConfig(updated);
  res.json({ success: true, config: updated });
});

// ریست کردن شمارنده بازدید
app.post('/api/admin/reset-visits', (req, res) => {
  const { password } = req.body;
  if (password !== ADMIN_PASSWORD) return res.status(401).json({ error: 'رمز اشتباهه' });
  const cfg = readConfig();
  cfg.access.visitCount = 0;
  writeConfig(cfg);
  res.json({ success: true });
});

// تست اتصال تلگرام از پنل ادمین -- یه پیام آزمایشی می‌فرسته
app.post('/api/admin/test-telegram', async (req, res) => {
  const { password, botToken, chatId } = req.body;
  if (password !== ADMIN_PASSWORD) return res.status(401).json({ error: 'رمز اشتباهه' });

  const cfg = readConfig();
  const token = botToken?.trim() || cfg.telegram?.botToken;
  const chat = chatId?.trim() || cfg.telegram?.chatId;

  if (!token || !chat) {
    return res.status(400).json({ error: 'Token یا Chat ID خالیه' });
  }

  try {
    const tgData = await sendTelegram(token, chat, '✅ اتصال تست شد! پیام‌های دیت از همینجا برات میان.');
    if (!tgData.ok) {
      return res.status(400).json({ error: tgData.description || 'ارسال ناموفق بود' });
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'خطا در اتصال به تلگرام' });
  }
});

// ثبت پاسخ "بله" به سؤال اصلی
app.post('/api/yes', (req, res) => {
  const { name } = req.body || {};
  console.log(`🎉 ${new Date().toISOString()} - جواب بله دریافت شد!${name ? ' (' + name + ')' : ''}`);
  res.json({ success: true });
});

// درخواست دیت -> ارسال پیام به تلگرام
app.post('/api/date-response', async (req, res) => {
  const { accepted, day, time, note, name } = req.body;
  const cfg = readConfig();
  const { botToken, chatId } = cfg.telegram || {};
  const who = name ? `${name} ` : '';

  console.log(`💌 درخواست دیت: accepted=${accepted}, day=${day}, time=${time}, note=${note}, name=${name}`);

  if (!accepted) {
    return res.json({ success: true, telegramSent: false });
  }

  if (!botToken || !chatId) {
    console.warn('تلگرام تنظیم نشده -- پیام ارسال نشد');
    return res.json({ success: true, telegramSent: false, warning: 'تلگرام تو پنل ادمین تنظیم نشده' });
  }

  const text = [
    `💘 خبر خوب! ${who}درخواست دیت رو تایید کرد!`,
    day ? `📅 روز پیشنهادی: ${day}` : null,
    time ? `⏰ ساعت پیشنهادی: ${time}` : null,
    note ? `📝 یادداشت: ${note}` : null,
  ].filter(Boolean).join('\n');

  try {
    const tgData = await sendTelegram(botToken, chatId, text);
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
