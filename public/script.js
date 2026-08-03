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
  if (soundOn) {
    playTone(660, 0.06);
    startAmbientMusic();
  } else {
    stopAmbientMusic();
  }
});

let audioCtx;
// روی Safari موبایل (iOS)، بعد از new AudioContext() وضعیتش "suspended"
// می‌مونه تا وقتی resume() کامل تموم بشه. resume() یه Promise هست و اگه
// بلافاصله بعدش (بدون صبر کردن) osc.start() صدا زده بشه، اوسیلاتور توی یه
// کانتکست هنوز-معلق پخش میشه و عملاً هیچ صدایی شنیده نمیشه -- برخلاف
// کروم دسکتاپ که این حالت رو نادیده می‌گیره و صدا رو پخش می‌کنه.
async function ensureAudioCtx() {
  audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === 'suspended') {
    try { await audioCtx.resume(); } catch (e) { /* بی‌صدا رد شو */ }
  }
  return audioCtx;
}
async function playTone(freq, duration, type = 'sine') {
  if (!soundOn) return;
  try {
    const ctx = await ensureAudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch (e) { /* بی‌صدا رد شو */ }
}
function playChord() {
  playTone(523.25, 0.35);
  setTimeout(() => playTone(659.25, 0.4), 90);
  setTimeout(() => playTone(783.99, 0.5), 180);
}

// ---------- موسیقی ملایم پس‌زمینه (ساخته‌شده با Web Audio، بدون فایل خارجی) ----------
let ambientNodes = null;
let ambientStarting = false;
async function startAmbientMusic() {
  if (ambientNodes || ambientStarting || !soundOn || isPreview) return;
  ambientStarting = true;
  try {
    const ctx = await ensureAudioCtx();
    // ممکنه در فاصله‌ی صبر برای resume، کاربر صدا رو خاموش کرده باشه
    if (!soundOn || ambientNodes) { ambientStarting = false; return; }

    const master = ctx.createGain();
    master.gain.setValueAtTime(0.0001, ctx.currentTime);
    master.gain.linearRampToValueAtTime(0.05, ctx.currentTime + 4);
    master.connect(ctx.destination);

    const notes = [261.63, 329.63, 392.0, 523.25]; // C4 E4 G4 C5 - آکورد ماژور نرم
    const voices = notes.map((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const gain = ctx.createGain();
      gain.gain.value = 0.02;
      osc.connect(gain).connect(master);
      osc.start();

      // یه نوسان خیلی کند رو گین هر نُت تا حس تنفس/موج بده
      const lfo = ctx.createOscillator();
      lfo.type = 'sine';
      lfo.frequency.value = 0.045 + i * 0.011;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 0.018;
      lfo.connect(lfoGain).connect(gain.gain);
      lfo.start();

      return { osc, gain, lfo };
    });

    ambientNodes = { master, voices };
  } catch (e) { /* بی‌صدا رد شو */ }
  ambientStarting = false;
}
function stopAmbientMusic() {
  if (!ambientNodes) return;
  const { master, voices } = ambientNodes;
  const now = audioCtx.currentTime;
  master.gain.cancelScheduledValues(now);
  master.gain.setValueAtTime(master.gain.value, now);
  master.gain.linearRampToValueAtTime(0.0001, now + 1);
  setTimeout(() => {
    voices.forEach(v => { try { v.osc.stop(); v.lfo.stop(); } catch (e) {} });
  }, 1100);
  ambientNodes = null;
}
function tryStartMusicOnce() {
  if (soundOn) startAmbientMusic();
}
['pointerdown', 'touchstart', 'keydown'].forEach(evt =>
  document.addEventListener(evt, tryStartMusicOnce, { once: true, passive: true })
);

// ---------- قلب‌های شناور ملایم پس‌زمینه ----------
const heartsBg = document.getElementById('hearts-bg');
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

function spawnHeart() {
  const heart = document.createElement('div');
  heart.className = 'floating-heart';
  const size = 12 + Math.random() * 20;
  const filled = Math.random() > 0.4;
  heart.innerHTML = filled
    ? '<svg width="' + size + '" height="' + size + '" viewBox="0 0 24 24"><path d="M12 21s-7.2-4.4-9.7-9C.7 8.6 2 5.2 5.2 4.4 7.4 3.8 9.6 4.8 12 7.1c2.4-2.3 4.6-3.3 6.8-2.7 3.2.8 4.5 4.2 3 7.6C19.2 16.6 12 21 12 21z" fill="currentColor"/></svg>'
    : '<svg width="' + size + '" height="' + size + '" viewBox="0 0 24 24"><path d="M12 21s-7.2-4.4-9.7-9C.7 8.6 2 5.2 5.2 4.4 7.4 3.8 9.6 4.8 12 7.1c2.4-2.3 4.6-3.3 6.8-2.7 3.2.8 4.5 4.2 3 7.6C19.2 16.6 12 21 12 21z" fill="none" stroke="currentColor" stroke-width="1.4"/></svg>';
  heart.style.left = Math.random() * 100 + 'vw';
  heart.style.setProperty('--heart-opacity', (0.18 + Math.random() * 0.22).toFixed(2));
  const duration = 10 + Math.random() * 9;
  heart.style.animationDuration = duration + 's';
  heartsBg.appendChild(heart);
  setTimeout(() => heart.remove(), duration * 1000);
}
let heartTimer = null;
if (!reduceMotion) {
  heartTimer = setInterval(spawnHeart, 900);
  for (let i = 0; i < 4; i++) setTimeout(spawnHeart, i * 300);
}

// ---------- لینک اختصاصی: ?to=اسم ----------
// اگه لینک با ?to=اسم باز بشه، همون‌جا رو نمایش و پیام‌های تلگرام اولویت داره؛
// این‌طوری میشه از یه دیپلوی، لینک‌های شخصی‌سازی‌شده برای چند نفر مختلف ساخت
const urlToName = (new URLSearchParams(location.search).get('to') || '').trim();
function getRecipientName() {
  return urlToName || currentConfig.name || '';
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
  const displayName = urlToName || cfg.name;
  document.getElementById('eyebrow').textContent = displayName ? `برای ${displayName}` : 'برای یه نفر خاص';
  document.getElementById('question-text').textContent = displayName ? `${displayName} جان، ${cfg.question}` : cfg.question;
  document.getElementById('message-text').textContent = cfg.message;
  document.getElementById('date-heading').textContent = cfg.dateHeading || 'بریم یه دیت باحال؟';
  document.getElementById('date-message').textContent = cfg.dateMessage || '';
  if (!isPreview) setupQuiz(cfg.quiz);
}

// اگر داخل iframe پیش‌نمایش پنل ادمین باز شده باشه، تایپ زنده رو نشون بده
const isPreview = new URLSearchParams(location.search).get('preview') === '1';
if (isPreview) {
  // پیش‌نمایش همیشه مستقیم سؤال اصلی رو نشون می‌ده، بدون بازی، تا تایپ زنده قابل دیدن باشه
  document.getElementById('stage-quiz').classList.remove('active');
  document.getElementById('stage-question').classList.add('active');
  document.getElementById('progress').classList.remove('hidden');
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
  document.getElementById('progress').classList.remove('hidden');
  if (step) setProgress(step);
}

// ---------- بازی «چقدر همو می‌شناسیم» (قبل از سؤال اصلی) ----------
const quizCorrectMsgs = ['آفرین! دقیقاً همینه 🎉', 'وای بلدی‌ها!', 'صد درصد درست بود ✨', 'یه امتیاز واسه تو!'];
const quizWrongMsgs = ['نچ، دوباره امتحان کن', 'نزدیک بود ولی نه :)', 'یه بار دیگه فکر کن', 'اینو نه، یکی دیگه رو بزن'];
let quizState = { index: 0, questions: [] };

function setupQuiz(quizCfg) {
  const quizStage = document.getElementById('stage-quiz');
  const enabled = quizCfg?.enabled && Array.isArray(quizCfg.questions) && quizCfg.questions.length > 0;
  if (!enabled) {
    // بدون بازی: مستقیم برو سراغ سؤال اصلی
    quizStage.classList.remove('active');
    document.getElementById('stage-question').classList.add('active');
    document.getElementById('progress').classList.remove('hidden');
    return;
  }
  document.querySelectorAll('.stage').forEach(s => s.classList.remove('active'));
  quizStage.classList.add('active');
  document.getElementById('progress').classList.add('hidden');
  quizState = { index: 0, questions: quizCfg.questions };
  renderQuizQuestion();
}

function renderQuizQuestion() {
  const q = quizState.questions[quizState.index];
  document.getElementById('quiz-question').textContent = q.q;
  document.getElementById('quiz-progress-text').textContent = `سؤال ${quizState.index + 1} از ${quizState.questions.length}`;
  document.getElementById('quiz-feedback').textContent = '';
  document.getElementById('quiz-feedback').className = 'quiz-feedback';
  const optsWrap = document.getElementById('quiz-options');
  optsWrap.innerHTML = '';
  q.options.forEach((opt, i) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'quiz-opt';
    btn.textContent = opt;
    btn.addEventListener('click', () => handleQuizAnswer(i, btn));
    optsWrap.appendChild(btn);
  });
}

function handleQuizAnswer(i, btn) {
  const q = quizState.questions[quizState.index];
  const feedback = document.getElementById('quiz-feedback');
  if (i === q.correctIndex) {
    document.querySelectorAll('.quiz-opt').forEach(b => { b.disabled = true; });
    btn.classList.add('correct');
    feedback.textContent = quizCorrectMsgs[Math.floor(Math.random() * quizCorrectMsgs.length)];
    feedback.className = 'quiz-feedback good';
    playTone(700, 0.1);
    setTimeout(() => {
      quizState.index++;
      if (quizState.index < quizState.questions.length) {
        renderQuizQuestion();
      } else {
        finishQuiz();
      }
    }, 850);
  } else {
    btn.classList.add('wrong');
    feedback.textContent = quizWrongMsgs[Math.floor(Math.random() * quizWrongMsgs.length)];
    feedback.className = 'quiz-feedback bad';
    playTone(180, 0.15, 'triangle');
    setTimeout(() => btn.classList.remove('wrong'), 450);
  }
}

function finishQuiz() {
  document.getElementById('quiz-question').textContent = 'قبول شدی! خیلی خوب می‌شناسیم همو 🎉';
  document.getElementById('quiz-progress-text').textContent = '';
  document.getElementById('quiz-feedback').textContent = '';
  const optsWrap = document.getElementById('quiz-options');
  optsWrap.innerHTML = '';
  const goBtn = document.createElement('button');
  goBtn.type = 'button';
  goBtn.className = 'btn btn-primary full';
  goBtn.textContent = 'برو سراغ سؤال اصلی';
  goBtn.addEventListener('click', () => goToStage('stage-question', 1));
  optsWrap.appendChild(goBtn);
  launchConfetti();
  playChord();
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
  try {
    await fetch('/api/yes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: getRecipientName() }),
    });
  } catch (e) {}
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
      body: JSON.stringify({ accepted: false, name: getRecipientName() }),
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
      body: JSON.stringify({ accepted: true, day, time, note, name: getRecipientName() }),
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
