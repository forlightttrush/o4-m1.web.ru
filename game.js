const FIELD_WIDTH = 800;
const FIELD_HEIGHT = 600;
const ROCKET_WIDTH = 50;
const ROCKET_HEIGHT = 50;
const ROCKET_BOTTOM_OFFSET = 20;
const COIN_SPAWN_INTERVAL = 2000;
const ASTEROID_SPAWN_INTERVAL = 2000;
const AMMO_BOX_SPAWN_INTERVAL = 10000;
const MEDKIT_SPAWN_INTERVAL = 10000;
const MEDKIT_SIZE = 26;
const HEAL_AMOUNT = 10;
const ENEMY_FIRST_SPAWN = 10000;
const ENEMY_RESPAWN_AFTER = 15000;
const ENEMY_SHOOT_INTERVAL = 1000;
const ENEMY_BULLET_SPEED = 8;
const SCROLL_SPEED = 1.2;
const COIN_SPEED = 0.8;
const ASTEROID_SPEED = 2;
const BULLET_SPEED = 12;
const ASTEROID_TYPES = [
    { size: 22, speed: 2.5, damage: 10 },
    { size: 36, speed: 1.8, damage: 20 },
    { size: 50, speed: 1.2, damage: 35 }
];
const ENEMY_SPEED =2;
const PLAYER_SPEED = 5;
const BULLET_OFFSET =5;
const COIN_SIZE =24;
const ASTEROID_SIZE = 36;
const AMMO_BOX_SIZE = 28;
const BULLET_WIDTH = 6;
const ENEMY_WIDTH = 44;
const ENEMY_HEIGHT = 36;
const HEALTH_MAX = 100;
const DAMAGE_ASTEROID = 20;
const DAMAGE_BULLET = 10;
const COINS_FOR_SHIELD = 5;
const AMMO_PER_BOX = 10;
const START_AMMO= 30;
const API_URL = '';


let playerName ='';
let gameState = null;
let animationId= null;
let lastTime = 0;
let keys = {left: false, right: false, up: false, down: false, fire: false};
let lastAxisX = 0, lastAxisY = 0;
let fireCooldown = 0;
const FIRE_COOLDOWN_MS = 150;
let paused = false;

const startScreen = document.getElementById('start-screen');
const gameScreen = document.getElementById('game-screen');
const gameoverScreen = document.getElementById('gameover-screen');
const canvas = document.getElementById('game-canvas');
const playerNameInput = document.getElementById('player-name');
const ctx = canvas.getContext('2d');
const startBtn = document.getElementById('start-btn');
const timerEl = document.getElementById('timer');
const coinsEl = document.getElementById('coins');
const ammoEl = document.getElementById('ammo');
const healthProgress = document.getElementById('health-progress');
const healthValueEl = document.getElementById('health-value');
const finalTimeEl = document.getElementById('final-time');
const leaderboardEl = document.getElementById('leaderboard');
const restartbtn = document.getElementById('restart-btn');
const exitBtn = document.getElementById('exit-btn');
const screenFullRadio = document.getElementById('screen-full');
const fullscreenBtn = document.getElementById('fullscreen-btn');

function isFullscreen(){
    return !!(document.fullscreenElement || document.webkitFullscreenElement || document.mozFullscreenElement || document.msFullscreenElement);
}

function requestFullscreen(el) {
    const e = el || gameScreen;
    if (e.requestFullscreen) return e.requestFullscreen();
    if (e.webkitRequestFullscreen) return e.webkitRequestFullscreen();
    if (e.msRequestFullscreen) return e.msRequestFullscreen();
    if (e.msRequestFullscreen) return e.msRequestFullscreen();
    return Promise.reject(new Error('Fullscreen not supported'));
}

function ExitFullscreen() {
    if (document.exitFullscreen) return document.exitFullscreen();
    if (document.webkitExitFullscreen) return document.webkitExitFullscreen();
    if (document.mozCancelFullScreen) return document.mozCancelFullScreen();
    if (document.msExitFullscreen) return document.msExitFullscreen();
    return Promise.reject(new Error('Fullscreen not supported'));
}

function updateFullScreenButton() {
    if (!fullscreenBtn) return;
    fullscreenBtn.textContent = isFullscreen() ? 'Выйти из полного экрана' : 'полный экран';
}
startBtn.disabled = !playerNameInput.value.trim();
playerNameInput.addEventListener('input', () => {
    startBtn.disabled = !playerNameInput.value.trim();
});

playerNameInput.addEventListener('keydown', (e) => {
    if (e.key ==='Enter' && !startBtn.disabled) startGame()
});
startBtn.addEventListener('click', startGame);
if (restartbtn) restartbtn.addEventListener('click', () => {
    if (gameoverScreen) gameoverScreen.classList.remove('active');
    startScreen.classList.add('active');
});

document.addEventListener('keydown', (e) => {
    const k = e.code;
    if (k === 'KeyW') keys.up = true;
    if (k === 'KeyS') keys.down = true;
    if (k === 'KeyA') keys.left = true;
    if (k === 'KeyD') keys.right = true;
    if (k === 'Space') { keys.fire = true; e.preventDefault(); }
    if (k === 'Escape') { paused = !paused; e.preventDefault(); }
    if (k === 'KeyE' && gameState && gameState.rocket && gameState.rocket.coins >= COINS_FOR_SHIELD && !gameState.rocket.shield) {
        gameState.rocket.coins -= COINS_FOR_SHIELD;
        gameState.rocket.shield = true;
        e.preventDefault();
    }
});
document.addEventListener('keyup', (e) => {
    const k = e.code;
    if (k === 'KeyW') keys.up = false;
    if (k === 'KeyS') keys.down = false;
    if (k === 'KeyA') keys.left = false;
    if (k === 'KeyD') keys.right = false;
    if (k === 'Space') keys.fire = false;
});



function startGame() {
    playerName = playerNameInput.value.trim();
    if (!playerName) return;
    startScreen.classList.remove('active');
    gameScreen.classList.add('active');
    initGame();
    paused = false;
    updateFullScreenButton();
    if (screenFullRadio && screenFullRadio.checked) {
        requestFullscreen(gameScreen).catch(() => {});
    }
    lastTime = performance.now();
    requestAnimationFrame(gameLoop);

}

function initGame() {
    if (animationId != null) cancelAnimationFrame(animationId);
    gameState = {
        rocket: {
            x: (FIELD_WIDTH - ROCKET_WIDTH) /2, 
            y: FIELD_HEIGHT - ROCKET_BOTTOM_OFFSET - ROCKET_HEIGHT,
            w: ROCKET_WIDTH,
            h: ROCKET_HEIGHT,
            health: HEALTH_MAX,
            coins: 0,
            ammo: START_AMMO,
            shield: false, 
            shieldFrames: 0
        },
        scrollY: 0,
        stars: initStars(),
        coins: [],
        asteroids: [],
        ammoBoxes: [],
        medkits: [],
        playerBullets: [],
        enemyBullets: [],
        enemy: null,
        asteroidExplosions: [],
        explosions: [],
        startTime: Date.now(),
        lastCoinSpawn: 0,
        lastAsteroidSpawn: 0,
        lastAmmoSpawn: 0,
        lastMedkitSpawn: 0,
        enemyLastShot: 0,
        lastEnemyKill: 0,
        running: true,
    };
    updateUI();
}

function initStars(){
    const stars = [];
    for (let i = 0; i < 120; i++) {
        stars.push({
            x: Math.random() * FIELD_WIDTH,
            y: Math.random() * FIELD_HEIGHT,
            size: Math.random()* 1.5 + 0.5,
            speed: 0.5 + Math.random() * 1.5,
        });
    }
    return stars;
}

function update(dt) {
    const g = gameState;
    if (!g || !g.running || paused) return;
    const r = g.rocket;
    const sp = PLAYER_SPEED * (dt / 16);
    if (keys.left) r.x = Math.max(0, r.x - sp);
    if (keys.right) r.x = Math.min(FIELD_WIDTH - r.w, r.x + sp);
    if (keys.up) r.y = Math.max(0, r.y - sp);
    if (keys.down) r.y = Math.min(FIELD_HEIGHT - r.h, r.y + sp);
    const rx = r.x + r.w / 2, ry = r.y + r.h / 2, rr = (r.w + r.h) / 4;

    fireCooldown -= dt;
    if (keys.fire && fireCooldown <= 0 && r.ammo > 0) {
        fireCooldown = FIRE_COOLDOWN_MS;
        r.ammo--;
        g.playerBullets.push({
            x: r.x + r.w / 2 - BULLET_WIDTH / 2,
            y: r.y,
            w: BULLET_WIDTH,
            h: BULLET_WIDTH * 2,
            speed: BULLET_SPEED
        });
    }
    g.playerBullets.forEach(b => { b.y -= b.speed * (dt / 16); });
    g.playerBullets = g.playerBullets.filter(b => b.y + b.h > 0);

    const now = Date.now();
    const elapsedMs = now - g.startTime;
    if (!g.enemy && elapsedMs >= ENEMY_FIRST_SPAWN) {
        const sinceKill = g.lastEnemyKill ? now - g.lastEnemyKill : elapsedMs;
        if (g.lastEnemyKill === 0 || sinceKill >= ENEMY_RESPAWN_AFTER) {
            g.enemy = { x: FIELD_WIDTH / 2 - ENEMY_WIDTH / 2, y: 20, w: ENEMY_WIDTH, h: ENEMY_HEIGHT, dir: 1, lastShot: now };
        }
    }
    if (g.enemy) {
        g.enemy.x += ENEMY_SPEED * g.enemy.dir * (dt / 16);
        if (g.enemy.x <= 0) { g.enemy.x = 0; g.enemy.dir = 1; }
        if (g.enemy.x >= FIELD_WIDTH - ENEMY_WIDTH) { g.enemy.x = FIELD_WIDTH - ENEMY_WIDTH; g.enemy.dir = -1; }
        if (now - g.enemy.lastShot >= ENEMY_SHOOT_INTERVAL) {
            g.enemy.lastShot = now;
            g.enemyBullets.push({
                x: g.enemy.x + g.enemy.w / 2 - BULLET_WIDTH / 2,
                y: g.enemy.y + g.enemy.h,
                w: BULLET_WIDTH,
                h: BULLET_WIDTH * 2,
                speed: ENEMY_BULLET_SPEED,
                damage: DAMAGE_BULLET
            });
        }
    }
    g.enemyBullets.forEach(b => { b.y += b.speed * (dt / 16); });
    g.enemyBullets = g.enemyBullets.filter(b => b.y < FIELD_HEIGHT + 20);
    g.enemyBullets = g.enemyBullets.filter(b => {
        const bx = b.x + b.w / 2, by = b.y + b.h / 2;
        if (Math.hypot(bx - rx, by - ry) < rr + b.w) {
            if (r.shield) r.shield = false;
            else r.health = Math.max(0, r.health - (b.damage || DAMAGE_BULLET));
            return false;
        }
        return true;
    });
    if (now - g.lastAsteroidSpawn >= ASTEROID_SPAWN_INTERVAL) {
        const type = ASTEROID_TYPES[Math.floor(Math.random() * ASTEROID_TYPES.length)];
        const sz = type.size;
        g.asteroids.push({
            x: Math.random() * (FIELD_WIDTH - sz),
            y: -sz,
            size: sz,
            speed: type.speed,
            damage: type.damage
        });
        g.lastAsteroidSpawn = now;
    }
    g.asteroids.forEach(a => { a.y += a.speed * (dt / 16); });
    g.asteroids = g.asteroids.filter(a => a.y < FIELD_HEIGHT + a.size);


    if (now - g.lastCoinSpawn >= COIN_SPAWN_INTERVAL) {
        g.coins.push({ x: Math.random() * (FIELD_WIDTH - COIN_SIZE), y: -COIN_SIZE, size: COIN_SIZE, speed: COIN_SPEED });
        g.lastCoinSpawn = now;
    }
    if (now - g.lastAmmoSpawn >= AMMO_BOX_SPAWN_INTERVAL) {
        g.ammoBoxes.push({ x: Math.random() * (FIELD_WIDTH - AMMO_BOX_SIZE), y: -AMMO_BOX_SIZE, size: AMMO_BOX_SIZE, speed: COIN_SPEED });
        g.lastAmmoSpawn = now;
    }
    if (now - g.lastMedkitSpawn >= MEDKIT_SPAWN_INTERVAL) {
        g.medkits.push({ x: Math.random() * (FIELD_WIDTH - MEDKIT_SIZE), y: -MEDKIT_SIZE, size: MEDKIT_SIZE, speed: COIN_SPEED });
        g.lastMedkitSpawn = now;
    }
    g.coins.forEach(c => { c.y += c.speed * (dt / 16); });
    g.ammoBoxes.forEach(b => { b.y += b.speed * (dt / 16); });
    g.medkits.forEach(m => { m.y += m.speed * (dt / 16); });
    g.coins = g.coins.filter(c => c.y < FIELD_HEIGHT + c.size);
    g.ammoBoxes = g.ammoBoxes.filter(b => b.y < FIELD_HEIGHT + b.size);
    g.medkits = g.medkits.filter(m => m.y < FIELD_HEIGHT + m.size);

    const hitRocket = (ox, oy, sz) => {
        const dx = (ox + sz / 2) - rx, dy = (oy + sz / 2) - ry;
        return Math.hypot(dx, dy) < rr + sz / 2;
    };
    g.coins = g.coins.filter(c => { if (hitRocket(c.x, c.y, c.size)) { r.coins++; return false; } return true; });
    g.ammoBoxes = g.ammoBoxes.filter(b => { if (hitRocket(b.x, b.y, b.size)) { r.ammo += AMMO_PER_BOX; return false; } return true; });
    g.medkits = g.medkits.filter(m => { if (hitRocket(m.x, m.y, m.size)) { r.health = Math.min(HEALTH_MAX, r.health + HEAL_AMOUNT); return false; } return true; });

    g.playerBullets = g.playerBullets.filter(b => {
        const bx = b.x + b.w / 2, by = b.y + b.h / 2;
        if (g.enemy) {
            const e = g.enemy;
            const ex = e.x + e.w / 2, ey = e.y + e.h / 2;
            if (bx > e.x && bx < e.x + e.w && by > e.y && by < e.y + e.h) {
                g.explosions.push({ x: ex, y: ey, t: 0, maxT: 35, r0: 25 });
                g.enemy = null;
                g.lastEnemyKill = now;
                return false;
            }
        }
        for (let i = 0; i < g.asteroids.length; i++) {
            const a = g.asteroids[i];
            const ax = a.x + a.size / 2, ay = a.y + a.size / 2;
            if (Math.hypot(bx - ax, by - ay) < b.w / 2 + a.size / 2) {
                const parts = [];
                for (let j = 0; j < 10; j++) {
                    const angle = (Math.PI * 2 * j) / 10 + Math.random();
                    const v = 2 + Math.random() * 3;
                    parts.push({ x: ax, y: ay, vx: Math.cos(angle) * v, vy: Math.sin(angle) * v, life: 1 });
                }
                g.asteroidExplosions.push({ parts, t: 0, maxT: 22 });
                g.explosions.push({ x: ax, y: ay, t: 0, maxT: 25, r0: a.size / 2 });
                g.asteroids.splice(i, 1);
                return false;
            }
        }
        return true;
    });

    g.asteroids = g.asteroids.filter(a => {
        const ax = a.x + a.size / 2, ay = a.y + a.size / 2;
        const d = Math.hypot(rx - ax, ry - ay);
        if (d < rr + a.size / 2) {
            if (r.shield) r.shield = false;
            else r.health = Math.max(0, r.health - (a.damage || DAMAGE_ASTEROID));
            return false;
        }
        return true;
    });

    const elapsed = Math.floor((Date.now() - g.startTime) / 1000);
    const mm = Math.floor(elapsed / 60);
    const ss = elapsed % 60;
    const timeStr = `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
    if (timerEl) timerEl.textContent = timeStr;
    updateUI();
    g.asteroidExplosions.forEach(ex => {
        ex.t++;
        ex.parts.forEach(p => { p.x += p.vx; p.y += p.vy; p.life -= 1 / ex.maxT; });
    });
    g.asteroidExplosions = g.asteroidExplosions.filter(ex => ex.t <= ex.maxT);
    g.explosions.forEach(ex => { ex.t++; });
    g.explosions = g.explosions.filter(ex => ex.t <= ex.maxT);

    if (r.health <= 0) {
        g.running = false;
        gameScreen.classList.remove('active');
        if (gameoverScreen) gameoverScreen.classList.add('active');
        if (finalTimeEl) finalTimeEl.textContent = timeStr;
    }
}

function draw() {
    if (!ctx || !gameState) return;
    const g = gameState;
    ctx.fillStyle = '#0a0a12';
    ctx.fillRect(0, 0, FIELD_WIDTH, FIELD_HEIGHT);
    if (paused) {
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(0, 0, FIELD_WIDTH, FIELD_HEIGHT);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 48px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('ПАУЗА', FIELD_WIDTH / 2, FIELD_HEIGHT / 2);
        ctx.font = '24px sans-serif';
        ctx.fillText('Escape — продолжить', FIELD_WIDTH / 2, FIELD_HEIGHT / 2 + 50);
        ctx.textAlign = 'left';
        return;
    }
    g.stars.forEach(s => {
        s.y += s.speed * 0.5;
        if (s.y > FIELD_HEIGHT) s.y = 0;
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
        ctx.fill();
    });
    g.asteroidExplosions.forEach(ex => {
        ex.parts.forEach(p => {
            if (p.life <= 0) return;
            ctx.fillStyle = `rgba(200, 120, 60, ${p.life})`;
            ctx.beginPath();
            ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
            ctx.fill();
        });
    });
    g.coins.forEach(c => {
        const cx = c.x + c.size / 2, cy = c.y + c.size / 2;
        ctx.fillStyle = '#ffd700';
        ctx.beginPath();
        ctx.arc(cx, cy, c.size / 2 - 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#b8860b';
        ctx.lineWidth = 2;
        ctx.stroke();
    });
    g.ammoBoxes.forEach(b => {
        ctx.fillStyle = '#8d6e63';
        ctx.fillRect(b.x, b.y, b.size, b.size * 0.7);
        ctx.strokeStyle = '#5d4037';
        ctx.strokeRect(b.x, b.y, b.size, b.size * 0.7);
    });
    g.medkits.forEach(m => {
        ctx.fillStyle = '#c62828';
        ctx.beginPath();
        ctx.moveTo(m.x + m.size / 2, m.y);
        ctx.lineTo(m.x + m.size, m.y + m.size);
        ctx.lineTo(m.x + m.size / 2, m.y + m.size * 0.8);
        ctx.lineTo(m.x, m.y + m.size);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#b71c1c';
        ctx.lineWidth = 1;
        ctx.stroke();
    });
    g.asteroids.forEach(a => {
        const radius = a.size / 2;
        ctx.fillStyle = a.size >= 44 ? '#5a4a3f' : a.size >= 30 ? '#6b5b4f' : '#7a6b5f';
        ctx.beginPath();
        ctx.arc(a.x + radius, a.y + radius, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#4a3d34';
        ctx.lineWidth = 2;
        ctx.stroke();
    });
    g.playerBullets.forEach(b => {
        ctx.fillStyle = '#ffeb3b';
        ctx.fillRect(b.x, b.y, b.w, b.h);
    });
    g.explosions.forEach(ex => {
        const p = ex.t / ex.maxT;
        const r = ex.r0 * (1 + p * 2);
        const alpha = 1 - p;
        ctx.fillStyle = `rgba(255, 120, 30, ${alpha * 0.6})`;
        ctx.beginPath();
        ctx.arc(ex.x, ex.y, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = `rgba(255, 200, 80, ${alpha * 0.9})`;
        ctx.beginPath();
        ctx.arc(ex.x, ex.y, r * 0.5, 0, Math.PI * 2);
        ctx.fill();
    });
    g.enemyBullets.forEach(b => {
        ctx.fillStyle = '#f44336';
        ctx.fillRect(b.x, b.y, b.w, b.h);
    });
    if (g.enemy) {
        const e = g.enemy;
        ctx.fillStyle = '#e91e63';
        ctx.beginPath();
        ctx.moveTo(e.x + e.w / 2, e.y + e.h);
        ctx.lineTo(e.x + e.w, e.y);
        ctx.lineTo(e.x + e.w / 2, e.y + 8);
        ctx.lineTo(e.x, e.y);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#ad1457';
        ctx.lineWidth = 2;
        ctx.stroke();
    }
    const r = g.rocket;
    ctx.fillStyle = '#4fc3f7';
    ctx.beginPath();
    ctx.moveTo(r.x + r.w / 2, r.y);
    ctx.lineTo(r.x + r.w, r.y + r.h);
    ctx.lineTo(r.x + r.w / 2, r.y + r.h - 8);
    ctx.lineTo(r.x, r.y + r.h);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#0288d1';
    ctx.lineWidth = 2;
    ctx.stroke();
    if (r.shield) {
        ctx.strokeStyle = 'rgba(0, 255, 200, 0.8)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(r.x + r.w / 2, r.y + r.h / 2, (r.w + r.h) / 2 + 8, 0, Math.PI * 2);
        ctx.stroke();
    }
}

function updateUI() {
    if (!gameState) return;
    const r = gameState.rocket;
    const hp = Math.max(0, Math.floor(r.health));
    if (coinsEl) coinsEl.textContent = r.coins;
    if (ammoEl) ammoEl.textContent = r.ammo;
    if (healthProgress) healthProgress.style.width = hp + '%';
    if (healthValueEl) healthValueEl.textContent = hp;
    const shieldHint = document.getElementById('shield-hint');
    if (shieldHint) shieldHint.textContent = r.shield ? 'Щит активен' : (r.coins >= COINS_FOR_SHIELD ? 'E — щит (5 монет)' : '');
}

function gameLoop(now) {
    const g = gameState;
    if (!g || !g.running) return;
    const dt = Math.min(now - lastTime, 100);
    lastTime = now;
    if (!paused) update(dt);
    draw();
    animationId = requestAnimationFrame(gameLoop);
}


if (paused) {
    ctx.fillStyle = 'rbga(0, 0, 0, 0.6)';
    ctx.fillRect(0, 0, FIELD_WIDTH, FIELD_HEIGHT);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 48px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('ПАУЗА', FIELD_WIDTH / 2, FIELD_HEIGHT / 2 + 50);
    ctx.font = '20px sans-serif';
}









