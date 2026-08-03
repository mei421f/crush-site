// ---------- تم (روشن/تیره) ----------
const themeBtn = document.getElementById('themeBtn');
const root = document.documentElement;
function applyTheme(theme) {
  root.setAttribute('data-theme', theme);
  themeBtn.querySelector('.icon-sun').hidden = theme === 'dark';
  themeBtn.querySelector('.icon-moon').hidden = theme !== 'dark';
}
const savedTheme = localStorage.getItem('crush-theme');
applyTheme(savedTheme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));
themeBtn.addEventListener('click', () => {
  const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  applyTheme(next);
  localStorage.setItem('crush-theme', next);
  playTone(520, 0.05);
});

// ---------- صدا (فیدبک لمسی سبک) ----------
const soundBtn = document.getElementById('soundBtn');
let soundOn = localStorage.getItem('crush-sound') !== 'off';
function reflectSoundIcon() {
  soundBtn.querySelector('.icon-sound-on').hidden = !soundOn;
  soundBtn.querySelector('.icon-sound-off').hidden = soundOn;
}
reflectSoundIcon();
soundBtn.addEventListener('click', () => {
  soundOn = !soundOn;
  localStorage.setItem('crush-sound', soundOn ? 'on' : 'off');
  reflectSoundIcon();
  if (soundOn) playTone(660, 0.06);
});

let audioCtx;
function playTone(freq, duration, type = 'sine') {
  if (!soundOn) return;
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);
    osc.connect(gain).connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + duration);
  } catch (e) { /* بی‌صدا رد شو */ }
}
function playChord() {
  playTone(523.25, 0.35);
  setTimeout(() => playTone(659.25, 0.4), 90);
  setTimeout(() => playTone(783.99, 0.5), 180);
}

// ---------- بارگذاری تنظیمات از سرور ----------
let currentConfig = {};
async function loadConfig() {
  try {
    const res = await fetch('/api/config');
    const cfg = await res.json();
    currentConfig = cfg;
    renderConfig(cfg);
  } catch (e) {
    console.error('خطا در بارگذاری تنظیمات', e);
  }
}

function renderConfig(cfg) {
  document.getElementById('eyebrow').textContent = cfg.name ? `برای ${cfg.name}` : 'برای یه نفر خاص';
  document.getElementById('question-text').textContent = cfg.name ? `${cfg.name} جان، ${cfg.question}` : cfg.question;
  document.getElementById('message-text').textContent = cfg.message;
  document.getElementById('date-heading').textContent = cfg.dateHeading || 'بریم یه دیت باحال؟';
  document.getElementById('date-message').textContent = cfg.dateMessage || '';
}

// اگر داخل iframe پیش‌نمایش پنل ادمین باز شده باشه، تایپ زنده رو نشون بده
const isPreview = new URLSearchParams(location.search).get('preview') === '1';
if (isPreview) {
  window.addEventListener('message', (e) => {
    if (e.data && e.data.type === 'crush-preview') {
      renderConfig({ ...currentConfig, ...e.data.payload });
    }
  });
}
loadConfig();

// ---------- نشانگر مراحل ----------
function setProgress(step) {
  document.querySelectorAll('.progress .dot').forEach(dot => {
    const n = Number(dot.dataset.step);
    dot.classList.toggle('active', n === step);
    dot.classList.toggle('done', n < step);
  });
}

// ---------- تغییر مرحله با انیمیشن ----------
function goToStage(id, step) {
  document.querySelectorAll('.stage').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  if (step) setProgress(step);
}

// ---------- دکمه "نه" که فرار می‌کند + پیام‌های شیطنت‌آمیز ----------
const noBtn = document.getElementById('noBtn');
const nudge = document.getElementById('nudge');
const nudgeMessages = [
  'مطمئنی؟',
  'یه بار دیگه فکر کن...',
  'وا، سخت نگیر',
  'باشه ولی پشیمون میشیا!',
  'آخرین شانسته‌ها',
  'خب دیگه داری اذیت می‌کنی'
];
let dodgeCount = 0;
const card = document.getElementById('card');

function dodgeNo() {
  const cardRect = card.getBoundingClientRect();
  const btnRect = noBtn.getBoundingClientRect();
  const margin = 14;
  const halfRangeX = Math.max((cardRect.width - btnRect.width) / 2 - margin, 24);
  const halfRangeY = Math.max(Math.min((cardRect.height - btnRect.height) / 2 - margin, 60), 20);
  const randX = (Math.random() - 0.5) * 2 * halfRangeX;
  const randY = (Math.random() - 0.5) * 2 * halfRangeY;
  noBtn.style.transform = `translate(${randX}px, ${randY}px)`;
  nudge.textContent = nudgeMessages[Math.min(dodgeCount, nudgeMessages.length - 1)];
  dodgeCount++;
  playTone(300 + dodgeCount * 15, 0.08, 'triangle');
}
noBtn.addEventListener('mouseenter', dodgeNo);
noBtn.addEventListener('click', (e) => { e.preventDefault(); dodgeNo(); });
noBtn.addEventListener('touchstart', (e) => { e.preventDefault(); dodgeNo(); });

// ---------- مرحله ۱ -> مرحله ۲ ----------
document.getElementById('yesBtn').addEventListener('click', async () => {
  goToStage('stage-date', 2);
  launchConfetti();
  playChord();
  try { await fetch('/api/yes', { method: 'POST' }); } catch (e) {}
});

// ---------- بخش دعوت به دیت ----------
const dateYesBtn = document.getElementById('dateYesBtn');
const dateLaterBtn = document.getElementById('dateLaterBtn');
const dateForm = document.getElementById('date-form');
const finalTitle = document.getElementById('final-title');
const finalText = document.getElementById('final-text');

dateYesBtn.addEventListener('click', () => {
  dateForm.classList.remove('hidden');
  dateYesBtn.parentElement.classList.add('hidden');
  dateForm.scrollIntoView({ behavior: 'smooth', block: 'center' });
});

dateLaterBtn.addEventListener('click', async () => {
  finalTitle.textContent = 'باشه، هر وقت خواستی بگو';
  finalText.textContent = 'هر وقت آماده بودی، بهم خبر بده.';
  goToStage('stage-final', 3);
  try {
    await fetch('/api/date-response', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accepted: false }),
    });
  } catch (e) {}
});

dateForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const sendBtn = document.getElementById('sendDateBtn');
  sendBtn.textContent = 'در حال ارسال...';
  sendBtn.disabled = true;

  const day = document.getElementById('date-day').value;
  const time = document.getElementById('date-time').value;
  const note = document.getElementById('date-note').value;

  try {
    const res = await fetch('/api/date-response', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accepted: true, day, time, note }),
    });
    const data = await res.json();
    finalTitle.textContent = 'درخواستت ثبت شد!';
    finalText.textContent = data.telegramSent
      ? 'پیامت مستقیم رسید دستش، به زودی جواب می‌گیری'
      : 'ثبت شد! به زودی هماهنگ می‌کنیم';
  } catch (err) {
    finalTitle.textContent = 'درخواستت ثبت شد!';
    finalText.textContent = 'یه مشکلی تو ارسال بود ولی نگران نباش، بازم بهش بگو';
  }

  goToStage('stage-final', 3);
  launchConfetti();
  playChord();
});

// ---------- کارت خاطره (تصویر قابل دانلود) ----------
document.getElementById('saveCardBtn').addEventListener('click', () => {
  const canvas = document.getElementById('memory-canvas');
  const ctx = canvas.getContext('2d');
  const W = 1080, H = 1350;
  canvas.width = W; canvas.height = H;

  const dark = root.getAttribute('data-theme') === 'dark';
  const bg = dark ? '#000000' : '#fbfbfd';
  const surface = dark ? '#1c1c1e' : '#ffffff';
  const ink = dark ? '#f5f5f7' : '#1d1d1f';
  const inkSoft = dark ? '#98989d' : '#6e6e73';
  const rose = '#ff375f';

  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  const grad = ctx.createRadialGradient(W * 0.85, H * 0.05, 50, W * 0.85, H * 0.05, 700);
  grad.addColorStop(0, 'rgba(255,55,95,0.25)');
  grad.addColorStop(1, 'rgba(255,55,95,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  roundRect(ctx, 60, 220, W - 120, H - 440, 48);
  ctx.fillStyle = surface;
  ctx.fill();

  ctx.textAlign = 'center';
  ctx.fillStyle = rose;
  ctx.font = '700 100px Vazirmatn, sans-serif';
  ctx.fillText('❤', W / 2, 400);

  ctx.fillStyle = ink;
  ctx.font = '700 58px Vazirmatn, sans-serif';
  wrapText(ctx, currentConfig.question || 'میشه مال من بشی؟', W / 2, 520, W - 260, 72);

  ctx.fillStyle = inkSoft;
  ctx.font = '400 34px Vazirmatn, sans-serif';
  wrapText(ctx, currentConfig.message || '', W / 2, 700, W - 300, 50);

  ctx.fillStyle = rose;
  ctx.font = '600 32px Vazirmatn, sans-serif';
  ctx.fillText('جوابش رو داد ✨', W / 2, H - 280);

  ctx.fillStyle = inkSoft;
  ctx.font = '400 26px Vazirmatn, sans-serif';
  ctx.fillText(new Date().toLocaleDateString('fa-IR'), W / 2, H - 220);

  const link = document.createElement('a');
  link.download = 'khatereh.png';
  link.href = canvas.toDataURL('image/png');
  link.click();
});

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = String(text).split(' ');
  let line = '';
  let lines = [];
  words.forEach(word => {
    const test = line ? line + ' ' + word : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  });
  if (line) lines.push(line);
  lines = lines.slice(0, 4);
  const startY = y - ((lines.length - 1) * lineHeight) / 2;
  lines.forEach((l, i) => ctx.fillText(l, x, startY + i * lineHeight));
}

// ---------- کانفتی (پالت محدود، ظریف) ----------
const canvas = document.getElementById('confetti');
const cctx = canvas.getContext('2d');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
window.addEventListener('resize', () => {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
});

let particles = [];
function launchConfetti() {
  const colors = ['#ff375f', '#ffb3c6', '#ffffff'];
  const originX = canvas.width / 2;
  const originY = canvas.height / 2.4;
  particles = [];
  for (let i = 0; i < 90; i++) {
    particles.push({
      x: originX,
      y: originY,
      vx: (Math.random() - 0.5) * 11,
      vy: (Math.random() - 1.4) * 11,
      size: 3 + Math.random() * 5,
      color: colors[Math.floor(Math.random() * colors.length)],
      gravity: 0.22 + Math.random() * 0.08,
      life: 90 + Math.random() * 50,
      rot: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.3,
    });
  }
  requestAnimationFrame(animateConfetti);
}

function animateConfetti() {
  cctx.clearRect(0, 0, canvas.width, canvas.height);
  particles.forEach(p => {
    p.vy += p.gravity;
    p.x += p.vx;
    p.y += p.vy;
    p.rot += p.vr;
    p.life -= 1;
    cctx.save();
    cctx.translate(p.x, p.y);
    cctx.rotate(p.rot);
    cctx.fillStyle = p.color;
    cctx.globalAlpha = Math.max(p.life / 140, 0);
    cctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
    cctx.restore();
  });
  particles = particles.filter(p => p.life > 0 && p.y < canvas.height + 50);
  if (particles.length > 0) {
    requestAnimationFrame(animateConfetti);
  } else {
    cctx.clearRect(0, 0, canvas.width, canvas.height);
  }
}
