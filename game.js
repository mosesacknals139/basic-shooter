// Game configuration
const config = {
    playerSpeed: 8,
    bulletSpeed: 10,
    enemySpeed: 2,
    enemySpawnRate: 120,
    enemyBulletSpeed: 4,
    enemyShootRate: 0.02,
    shootCooldown: 10
};

// Game state
let gameState = {
    running: false,
    score: 0,
    level: 1,
    health: 150,
    maxHealth: 150,
    highScore: localStorage.getItem('highScore') || 0,
    lastGiftScore: 0
};

// Canvas setup
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = 900;
canvas.height = 600;

// Game objects
let player = {
    x: canvas.width / 2,
    y: canvas.height - 80,
    width: 40,
    height: 40,
    speed: config.playerSpeed
};

let bullets = [];
let enemies = [];
let enemyBullets = [];
let gifts = [];
let particles = [];
let keys = {};
let frameCount = 0;
let shootCooldownCounter = 0;
let damageFlashCounter = 0;

// Event Listeners
document.getElementById('startBtn').addEventListener('click', startGame);
document.getElementById('restartBtn').addEventListener('click', startGame);
document.getElementById('menuBtn').addEventListener('click', showMenu);

document.addEventListener('keydown', (e) => {
    keys[e.key] = true;
    if (e.key === ' ' && gameState.running) {
        e.preventDefault();
        shoot();
    }
});

document.addEventListener('keyup', (e) => {
    keys[e.key] = false;
});

// Initialize high score display
document.getElementById('highScore').textContent = gameState.highScore;

function startGame() {
    // Reset game state
    gameState = {
        running: true,
        score: 0,
        level: 1,
        maxHealth: 150,
        highScore: gameState.highScore,
        lastGiftScore: 0
    };

    // Reset game objects
    player.x = canvas.width / 2;
    player.y = canvas.height - 80;
    bullets = [];
    enemies = [];
    enemyBullets = [];
    gifts = [];
    particles = [];
    frameCount = 0;

    // Update UI
    updateUI();
    showScreen('gameScreen');

    // Start game loop
    gameLoop();
}

function showMenu() {
    showScreen('startScreen');
}

function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.add('hidden');
    });
    document.getElementById(screenId).classList.remove('hidden');
}

function gameLoop() {
    if (!gameState.running) return;

    update();
    draw();

    requestAnimationFrame(gameLoop);
}

function update() {
    frameCount++;

    // Update player position
    if (keys['ArrowLeft'] && player.x > player.width / 2) {
        player.x -= player.speed;
    }
    if (keys['ArrowRight'] && player.x < canvas.width - player.width / 2) {
        player.x += player.speed;
    }

    // Handle player shooting with cooldown
    if (keys[' ']) {
        if (shootCooldownCounter <= 0) {
            shoot();
            shootCooldownCounter = config.shootCooldown;
        }
    }
    if (shootCooldownCounter > 0) {
        shootCooldownCounter--;
    }

    // Update bullets
    bullets = bullets.filter(bullet => {
        bullet.y -= config.bulletSpeed;
        return bullet.y > 0;
    });

    // Spawn enemies
    if (frameCount % config.enemySpawnRate === 0) {
        spawnEnemy();
    }

    // Update enemies
    enemies = enemies.filter(enemy => {
        enemy.y += config.enemySpeed * (1 + gameState.level * 0.1);

        // Enemy shooting
        if (Math.random() < config.enemyShootRate) {
            enemyShoot(enemy);
        }

        // Check collision with player
        if (checkCollision(player, enemy)) {
            takeDamage(15);
            createExplosion(enemy.x, enemy.y, '#f5576c');
            return false;
        }

        return enemy.y < canvas.height;
    });

    // Update enemy bullets
    enemyBullets = enemyBullets.filter(bullet => {
        bullet.y += config.enemyBulletSpeed;

        // Check collision with player
        if (checkCollision(player, bullet)) {
            takeDamage(8);
            createExplosion(bullet.x, bullet.y, '#f5576c');
            return false;
        }

        return bullet.y < canvas.height;
    });

    // Check bullet-enemy collisions
    bullets.forEach((bullet, bulletIndex) => {
        enemies.forEach((enemy, enemyIndex) => {
            if (checkCollision(bullet, enemy)) {
                bullets.splice(bulletIndex, 1);
                enemies.splice(enemyIndex, 1);
                addScore(100);
                createExplosion(enemy.x, enemy.y, '#667eea');
            }
        });
    });

    // Update particles
    particles = particles.filter(particle => {
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.life -= 0.02;
        particle.size *= 0.95;
        return particle.life > 0;
    });

    // Spawn gifts every 500 points
    if (gameState.score > 0 && gameState.score >= gameState.lastGiftScore + 500) {
        spawnGift();
        gameState.lastGiftScore = Math.floor(gameState.score / 500) * 500;
    }

    // Update gifts
    gifts = gifts.filter(gift => {
        gift.y += config.enemySpeed * 0.8; // Gifts move slightly slower than enemies

        // Check collision with player
        if (checkCollision(player, gift)) {
            collectGift();
            createExplosion(gift.x, gift.y, '#10b981'); // Green explosion for collection
            return false;
        }

        return gift.y < canvas.height;
    });

    // Level up
    if (gameState.score > 0 && gameState.score % 1000 === 0) {
        levelUp();
    }
}

function draw() {
    // Clear canvas
    ctx.fillStyle = 'rgba(9, 10, 15, 0.2)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw player
    drawPlayer();

    // Draw bullets
    bullets.forEach(bullet => {
        ctx.fillStyle = '#667eea';
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#667eea';
        ctx.fillRect(bullet.x - 2, bullet.y - 10, 4, 10);
        ctx.shadowBlur = 0;
    });

    // Draw enemies
    enemies.forEach(enemy => {
        drawEnemy(enemy);
    });

    // Draw gifts
    gifts.forEach(gift => {
        drawGift(gift);
    });

    // Draw enemy bullets
    enemyBullets.forEach(bullet => {
        ctx.fillStyle = '#f5576c';
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#f5576c';
        ctx.fillRect(bullet.x - 2, bullet.y - 5, 4, 10);
        ctx.shadowBlur = 0;
    });

    // Draw particles
    particles.forEach(particle => {
        ctx.fillStyle = particle.color;
        ctx.globalAlpha = particle.life;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
    });
}

function drawPlayer() {
    // Apply damage flash effect
    if (player.isFlashing) {
        ctx.globalAlpha = 0.5 + Math.sin(frameCount * 0.5) * 0.2; // Pulsating transparency
    } else {
        ctx.globalAlpha = 1;
    }

    // Player body (triangle spaceship)
    ctx.fillStyle = '#667eea';
    ctx.shadowBlur = 20;
    ctx.shadowColor = '#667eea';

    ctx.beginPath();
    ctx.moveTo(player.x, player.y - player.height / 2);
    ctx.lineTo(player.x - player.width / 2, player.y + player.height / 2);
    ctx.lineTo(player.x + player.width / 2, player.y + player.height / 2);
    ctx.closePath();
    ctx.fill();

    // Player glow
    ctx.strokeStyle = '#764ba2';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1; // Reset global alpha after drawing player
}

function drawEnemy(enemy) {
    // Enemy body
    ctx.fillStyle = '#f5576c';
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#f5576c';

    ctx.beginPath();
    ctx.moveTo(enemy.x, enemy.y + enemy.height / 2);
    ctx.lineTo(enemy.x - enemy.width / 2, enemy.y - enemy.height / 2);
    ctx.lineTo(enemy.x + enemy.width / 2, enemy.y - enemy.height / 2);
    ctx.closePath();
    ctx.fill();

    ctx.shadowBlur = 0;
}

function shoot() {
    bullets.push({
        x: player.x,
        y: player.y - player.height / 2,
        width: 4,
        height: 10
    });
}

function enemyShoot(enemy) {
    enemyBullets.push({
        x: enemy.x,
        y: enemy.y + enemy.height / 2,
        width: 4,
        height: 10
    });
}

function spawnEnemy() {
    enemies.push({
        x: Math.random() * (canvas.width - 60) + 30,
        y: -30,
        width: 30,
        height: 30
    });
}

function spawnGift() {
    gifts.push({
        x: Math.random() * (canvas.width - 60) + 30,
        y: -30,
        width: 35,
        height: 35,
        pulse: 0
    });
}

function drawGift(gift) {
    gift.pulse += 0.05;
    const pulseSize = Math.sin(gift.pulse) * 5;

    ctx.fillStyle = '#10b981'; // Vibrant green
    ctx.shadowBlur = 15 + pulseSize;
    ctx.shadowColor = '#10b981';

    // Draw box with a "ribbon" pattern
    ctx.fillRect(gift.x - gift.width / 2, gift.y - gift.height / 2, gift.width, gift.height);

    // Ribbon
    ctx.fillStyle = '#fff';
    ctx.fillRect(gift.x - 2, gift.y - gift.height / 2, 4, gift.height);
    ctx.fillRect(gift.x - gift.width / 2, gift.y - 2, gift.width, 4);

    ctx.shadowBlur = 0;
}

function collectGift() {
    // Health boost
    gameState.health = Math.min(gameState.maxHealth, gameState.health + 30);
    updateUI();

    // Show brief feedback
    const message = document.createElement('div');
    message.style.position = 'fixed';
    message.style.top = '50%';
    message.style.left = '50%';
    message.style.transform = 'translate(-50%, -50%)';
    message.style.color = '#10b981';
    message.style.fontFamily = 'Orbitron, sans-serif';
    message.style.fontSize = '2rem';
    message.style.pointerEvents = 'none';
    message.style.animation = 'fadeOut 1s forwards';
    message.textContent = '+30 HEALTH';
    document.body.appendChild(message);

    setTimeout(() => {
        message.remove();
    }, 1000);
}

function checkCollision(obj1, obj2) {
    return obj1.x < obj2.x + obj2.width / 2 &&
        obj1.x + obj1.width / 2 > obj2.x &&
        obj1.y < obj2.y + obj2.height / 2 &&
        obj1.y + obj1.height / 2 > obj2.y;
}

function takeDamage(amount) {
    gameState.health -= amount;
    updateUI();
    flashScreen();

    if (gameState.health <= 0) {
        gameState.health = 0;
        gameOver();
    }
}

function addScore(points) {
    gameState.score += points;
    updateUI();
}

function levelUp() {
    gameState.level++;
    updateUI();
}

function createExplosion(x, y, color) {
    for (let i = 0; i < 20; i++) {
        particles.push({
            x: x,
            y: y,
            vx: (Math.random() - 0.5) * 6,
            vy: (Math.random() - 0.5) * 6,
            size: Math.random() * 4 + 2,
            life: 1,
            color: color
        });
    }
}

function flashScreen() {
    // Create a brief damage flash effect
    damageFlashCounter = 15;
}

function updateUI() {
    document.getElementById('score').textContent = gameState.score;
    document.getElementById('level').textContent = gameState.level;

    // Update segmented health bar
    const healthPercent = (gameState.health / gameState.maxHealth) * 100;
    const segmentCount = 5;
    const healthPerSegment = gameState.maxHealth / segmentCount;

    for (let i = 0; i < segmentCount; i++) {
        const segment = document.getElementById(`healthSegment${i}`);
        if (!segment) continue;

        const segmentStartHealth = i * healthPerSegment;
        const segmentEndHealth = (i + 1) * healthPerSegment;

        if (gameState.health >= segmentEndHealth) {
            // Segment is full
            segment.style.width = '100%';
            segment.style.opacity = '1';
        } else if (gameState.health > segmentStartHealth) {
            // Segment is partially filled
            const segmentFill = ((gameState.health - segmentStartHealth) / healthPerSegment) * 100;
            segment.style.width = segmentFill + '%';
            segment.style.opacity = '1';
        } else {
            // Segment is empty
            segment.style.width = '0%';
            segment.style.opacity = '0.3';
        }

        // Color based on health percentage
        if (healthPercent > 60) {
            segment.style.background = 'linear-gradient(90deg, #10b981 0%, #059669 100%)';
            segment.style.boxShadow = '0 0 10px rgba(16, 185, 129, 0.6)';
        } else if (healthPercent > 40) {
            segment.style.background = 'linear-gradient(90deg, #fbbf24 0%, #f59e0b 100%)';
            segment.style.boxShadow = '0 0 10px rgba(251, 191, 36, 0.6)';
        } else if (healthPercent > 20) {
            segment.style.background = 'linear-gradient(90deg, #fb923c 0%, #f97316 100%)';
            segment.style.boxShadow = '0 0 10px rgba(251, 146, 60, 0.6)';
        } else {
            segment.style.background = 'linear-gradient(90deg, #f093fb 0%, #f5576c 100%)';
            segment.style.boxShadow = '0 0 15px rgba(245, 87, 108, 0.8)';
        }
    }

    // Update health percentage text
    const healthText = document.getElementById('healthText');
    if (healthText) {
        healthText.textContent = Math.max(0, Math.round(healthPercent)) + '%';
    }

    // Critical health warning
    const criticalWarning = document.getElementById('criticalWarning');
    if (criticalWarning) {
        if (gameState.health <= 30 && gameState.health > 0) {
            criticalWarning.classList.remove('hidden');
        } else {
            criticalWarning.classList.add('hidden');
        }
    }
}

function gameOver() {
    gameState.running = false;

    // Update high score
    if (gameState.score > gameState.highScore) {
        gameState.highScore = gameState.score;
        localStorage.setItem('highScore', gameState.highScore);
    }

    // Update final stats
    document.getElementById('finalScore').textContent = gameState.score;
    document.getElementById('finalLevel').textContent = gameState.level;
    document.getElementById('highScore').textContent = gameState.highScore;

    // Show game over screen
    setTimeout(() => {
        showScreen('gameOverScreen');
    }, 500);
}
