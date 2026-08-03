// ---------- بارگذاری تنظیمات از سرور ----------
async function loadConfig() {
  try {
    const res = await fetch('/api/config');
    const cfg = await res.json();
    document.getElementById('question-text').textContent = `${cfg.name} جان، ${cfg.question}`;
    document.getElementById('message-text').textContent = cfg.message;
    document.getElementById('date-heading').textContent = cfg.dateHeading || 'بریم یه دیت باحال؟';
    document.getElementById('date-message').textContent = cfg.dateMessage || '';
  } catch (e) {
    console.error('خطا در بارگذاری تنظیمات', e);
  }
}
loadConfig();

// ---------- قلب‌های شناور پس‌زمینه ----------
const heartsBg = document.getElementById('hearts-bg');
const heartEmojis = ['❤️', '💕', '💖', '💗', '💓', '💘', '✨'];
function spawnHeart() {
  const heart = document.createElement('div');
  heart.className = 'floating-heart';
  heart.textContent = heartEmojis[Math.floor(Math.random() * heartEmojis.length)];
  heart.style.left = Math.random() * 100 + 'vw';
  heart.style.fontSize = 14 + Math.random() * 22 + 'px';
  const duration = 7 + Math.random() * 7;
  heart.style.animationDuration = duration + 's';
  heartsBg.appendChild(heart);
  setTimeout(() => heart.remove(), duration * 1000);
}
setInterval(spawnHeart, 400);

// ---------- تغییر مرحله با انیمیشن ----------
function goToStage(id) {
  document.querySelectorAll('.stage').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

// ---------- دکمه "نه" که فرار می‌کند + پیام‌های شیطنت‌آمیز ----------
const noBtn = document.getElementById('noBtn');
const btnRow = document.getElementById('btn-row');
const nudge = document.getElementById('nudge');
const nudgeMessages = [
  'مطمئنی؟ 🤔',
  'یه بار دیگه فکر کن...',
  'وا، سخت نگیر 😅',
  'باشه ولی پشیمون میشیا!',
  'آخرین شانستـه‌ها 😌',
  'خب دیگه داری اذیت می‌کنی 😂'
];
let dodgeCount = 0;

const card = document.getElementById('card');

function dodgeNo() {
  const cardRect = card.getBoundingClientRect();
  const btnRect = noBtn.getBoundingClientRect();

  // فضای امن داخل کارت (با کمی حاشیه) تا دکمه هیچ‌وقت از کارت بیرون نزنه
  const margin = 14;
  const halfRangeX = Math.max((cardRect.width - btnRect.width) / 2 - margin, 24);
  const halfRangeY = Math.max(Math.min((cardRect.height - btnRect.height) / 2 - margin, 60), 20);

  const randX = (Math.random() - 0.5) * 2 * halfRangeX;
  const randY = (Math.random() - 0.5) * 2 * halfRangeY;
  noBtn.style.transform = `translate(${randX}px, ${randY}px)`;

  nudge.textContent = nudgeMessages[Math.min(dodgeCount, nudgeMessages.length - 1)];
  dodgeCount++;
}

noBtn.addEventListener('mouseenter', dodgeNo);
noBtn.addEventListener('click', (e) => { e.preventDefault(); dodgeNo(); });
noBtn.addEventListener('touchstart', (e) => { e.preventDefault(); dodgeNo(); });

// ---------- مرحله ۱ -> مرحله ۲ ----------
document.getElementById('yesBtn').addEventListener('click', async () => {
  goToStage('stage-date');
  launchConfetti();
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
  dateYesBtn.parentElement.classList.add('hidden'); // مخفی کردن دکمه‌های اولیه
  dateForm.scrollIntoView({ behavior: 'smooth', block: 'center' });
});

dateLaterBtn.addEventListener('click', async () => {
  finalTitle.textContent = 'باشه، هر وقت خواستی بگو 💌';
  finalText.textContent = 'هر وقت آماده بودی، بهم خبر بده.';
  goToStage('stage-final');
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
    finalTitle.textContent = 'درخواستت ثبت شد! 🎉';
    finalText.textContent = data.telegramSent
      ? 'پیامت مستقیم رسید دستش، به زودی جواب می‌گیری 💕'
      : 'ثبت شد! به زودی هماهنگ می‌کنیم 💕';
  } catch (err) {
    finalTitle.textContent = 'درخواستت ثبت شد!';
    finalText.textContent = 'یه مشکلی تو ارسال بود ولی نگران نباش، بازم بهش بگو 😊';
  }

  goToStage('stage-final');
  launchConfetti();
});

// ---------- کانفتی ----------
const canvas = document.getElementById('confetti');
const ctx = canvas.getContext('2d');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
window.addEventListener('resize', () => {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
});

let particles = [];
function launchConfetti() {
  const colors = ['#ff5c8a', '#ff9ec4', '#ffcf7a', '#ffffff', '#8a4fff'];
  particles = [];
  for (let i = 0; i < 150; i++) {
    particles.push({
      x: canvas.width / 2,
      y: canvas.height / 2,
      vx: (Math.random() - 0.5) * 14,
      vy: (Math.random() - 1) * 14,
      size: 4 + Math.random() * 6,
      color: colors[Math.floor(Math.random() * colors.length)],
      gravity: 0.25 + Math.random() * 0.1,
      life: 100 + Math.random() * 60,
    });
  }
  requestAnimationFrame(animateConfetti);
}

function animateConfetti() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  particles.forEach(p => {
    p.vy += p.gravity;
    p.x += p.vx;
    p.y += p.vy;
    p.life -= 1;
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x, p.y, p.size, p.size);
  });
  particles = particles.filter(p => p.life > 0 && p.y < canvas.height + 50);
  if (particles.length > 0) {
    requestAnimationFrame(animateConfetti);
  } else {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
}
