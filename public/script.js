// ---------- بارگذاری تنظیمات از سرور ----------
async function loadConfig() {
  try {
    const res = await fetch('/api/config');
    const cfg = await res.json();
    document.getElementById('question-text').textContent = `${cfg.name} جان، ${cfg.question}`;
    document.getElementById('message-text').textContent = cfg.message;
  } catch (e) {
    console.error('خطا در بارگذاری تنظیمات', e);
  }
}
loadConfig();

// ---------- قلب‌های شناور پس‌زمینه ----------
const heartsBg = document.getElementById('hearts-bg');
const heartEmojis = ['❤️', '💕', '💖', '💗', '💓', '💘'];
function spawnHeart() {
  const heart = document.createElement('div');
  heart.className = 'floating-heart';
  heart.textContent = heartEmojis[Math.floor(Math.random() * heartEmojis.length)];
  heart.style.left = Math.random() * 100 + 'vw';
  heart.style.fontSize = 16 + Math.random() * 24 + 'px';
  const duration = 6 + Math.random() * 6;
  heart.style.animationDuration = duration + 's';
  heartsBg.appendChild(heart);
  setTimeout(() => heart.remove(), duration * 1000);
}
setInterval(spawnHeart, 350);

// ---------- دکمه "نه" که فرار می‌کند ----------
const noBtn = document.getElementById('noBtn');
const btnRow = document.querySelector('.btn-row');

function dodgeNo() {
  const rowRect = btnRow.getBoundingClientRect();
  const btnRect = noBtn.getBoundingClientRect();
  const maxX = rowRect.width - btnRect.width;
  const maxY = 40;
  const randX = (Math.random() - 0.5) * maxX;
  const randY = (Math.random() - 0.5) * maxY * 2;
  noBtn.style.position = 'relative';
  noBtn.style.transform = `translate(${randX}px, ${randY}px)`;
}

noBtn.addEventListener('mouseenter', dodgeNo);
noBtn.addEventListener('click', (e) => {
  e.preventDefault();
  dodgeNo();
});
// برای موبایل هم با touchstart فرار کنه
noBtn.addEventListener('touchstart', (e) => {
  e.preventDefault();
  dodgeNo();
});

// ---------- دکمه "بله" ----------
document.getElementById('yesBtn').addEventListener('click', async () => {
  document.getElementById('stage-question').classList.add('hidden');
  document.getElementById('stage-answer').classList.remove('hidden');
  launchConfetti();
  try {
    await fetch('/api/yes', { method: 'POST' });
  } catch (e) { /* بی‌خیال خطا */ }
});

// ---------- کانفتی ساده روی کانواس ----------
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
  const colors = ['#ff4b6e', '#ff8fab', '#ffd166', '#ffffff', '#c06c84'];
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
