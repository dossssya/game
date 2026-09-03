(function() {
    "use strict";

    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    const scoreSpan = document.getElementById('scoreDisplay');
    const livesSpan = document.getElementById('livesDisplay');
    const levelSpan = document.getElementById('levelDisplay');
    const restartBtn = document.getElementById('restartBtn');

    const W = 800, H = 500;

    let player = {
        x: 120,
        y: 380,
        radius: 16,
        vy: 0,
        gravity: 0.4,
        jumpPower: -8.5,
        grounded: false
    };

    let obstacles = [];
    let score = 0;
    let lives = 3;
    let level = 1;
    let gameOver = false;
    let frameId = null;
    let spawnTimer = 0;
    const BASE_SPAWN_DELAY = 35;
    let spawnDelay = BASE_SPAWN_DELAY;
    let starField = [];
    let jumpCooldown = false;

    function initStars() {
        starField = [];
        for (let i = 0; i < 140; i++) {
            starField.push({
                x: Math.random() * W,
                y: Math.random() * H,
                r: Math.random() * 1.8 + 0.5,
                bright: Math.random() * 0.7 + 0.3,
                speed: Math.random() * 0.2 + 0.05
            });
        }
    }
    initStars();

    function resetGame() {
        player.x = 120;
        player.y = 380;
        player.vy = 0;
        player.grounded = false;
        obstacles = [];
        score = 0;
        lives = 3;
        level = 1;
        gameOver = false;
        spawnTimer = 0;
        spawnDelay = BASE_SPAWN_DELAY;
        jumpCooldown = false;
        updateUI();
    }

    function spawnObstacle() {
        if (gameOver) return;

        const type = Math.random() < 0.5 ? 0 : (Math.random() < 0.5 ? 1 : 2);
        let yPos, width, height, color, label;

        switch(type) {
            case 0: {
                const size = 24 + Math.floor(Math.random() * 28);
                yPos = 380 + Math.random() * 70;
                width = size;
                height = size;
                color = '#b07a5a';
                label = '☄️';
                break;
            }
            case 1: {
                const size = 20 + Math.floor(Math.random() * 22);
                yPos = 90 + Math.random() * 180;
                width = size;
                height = size;
                color = '#7a9ec7';
                label = '🛸';
                break;
            }
            default: {
                width = 50 + Math.floor(Math.random() * 70);
                height = 16;
                yPos = 40 + Math.random() * 120;
                color = '#4f8a5a';
                label = '🟩';
                break;
            }
        }

        const speed = 1.8 + level * 0.25 + Math.random() * 0.6;
        obstacles.push({
            x: W + 20,
            y: yPos,
            w: width,
            h: height,
            speed: Math.min(speed, 5.0),
            type: type,
            color: color,
            label: label,
            radius: (type === 2) ? null : Math.max(width, height) * 0.45,
            scored: false
        });
    }

    function updateUI() {
        scoreSpan.textContent = score;
        const hearts = '❤️'.repeat(Math.max(0, lives)) + '🖤'.repeat(Math.max(0, 3 - lives));
        livesSpan.textContent = hearts || '💀';
        levelSpan.textContent = level;

        if (lives <= 0 && !gameOver) {
            gameOver = true;
        }
    }

    function circleRectCollision(cx, cy, cr, rx, ry, rw, rh) {
        const nearX = Math.max(rx, Math.min(cx, rx + rw));
        const nearY = Math.max(ry, Math.min(cy, ry + rh));
        const dx = cx - nearX;
        const dy = cy - nearY;
        return (dx * dx + dy * dy) < (cr * cr);
    }

    function update() {
        if (gameOver) return;

        player.vy += player.gravity;
        player.y += player.vy;

        if (player.y + player.radius > H - 10) {
            player.y = H - 10 - player.radius;
            player.vy = 0;
            player.grounded = true;
        } else {
            player.grounded = false;
        }

        if (player.y - player.radius < 0) {
            player.y = player.radius;
            player.vy = 0;
        }

        for (let i = obstacles.length - 1; i >= 0; i--) {
            const ob = obstacles[i];
            ob.x -= ob.speed;

            if (ob.x + ob.w < -40) {
                obstacles.splice(i, 1);
                continue;
            }

            let collision = false;
            if (ob.type === 2) {
                if (circleRectCollision(player.x, player.y, player.radius, ob.x, ob.y, ob.w, ob.h)) {
                    collision = true;
                    if (player.vy > 0 && player.y + player.radius - ob.y < 24) {
                        player.y = ob.y - player.radius;
                        player.vy = 0;
                        player.grounded = true;
                        collision = false;
                    }
                }
            } else {
                const dx = player.x - (ob.x + ob.w/2);
                const dy = player.y - (ob.y + ob.h/2);
                const dist = Math.sqrt(dx*dx + dy*dy);
                const radSum = player.radius + (ob.radius || 20);
                if (dist < radSum) {
                    collision = true;
                }
            }

            if (collision) {
                lives--;
                updateUI();
                obstacles.splice(i, 1);
                player.vy = -6;
                player.y -= 20;
                if (lives <= 0) {
                    gameOver = true;
                    updateUI();
                }
                continue;
            }

            if (ob.x + ob.w < player.x - 20 && !ob.scored) {
                ob.scored = true;
                score += 10 + Math.floor(level * 1.5);
                updateUI();
            }
        }

        const newLevel = 1 + Math.floor(score / 120);
        if (newLevel > level) {
            level = newLevel;
            spawnDelay = Math.max(12, BASE_SPAWN_DELAY - level * 1.8);
            updateUI();
        }

        spawnTimer++;
        if (spawnTimer >= spawnDelay) {
            spawnTimer = 0;
            const count = Math.random() < 0.3 * (level / 4) ? 2 : 1;
            for (let i = 0; i < count; i++) {
                spawnObstacle();
            }
        }

        if (lives <= 0) gameOver = true;

        if (jumpCooldown) {
            jumpCooldown = false;
        }
    }

    function draw() {
        ctx.clearRect(0, 0, W, H);

        const grad = ctx.createRadialGradient(300, 100, 50, 400, 200, 600);
        grad.addColorStop(0, '#101b3a');
        grad.addColorStop(1, '#030612');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, W, H);

        starField.forEach(star => {
            ctx.beginPath();
            ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 240, 200, ${star.bright * (0.6 + 0.4 * Math.sin(Date.now() * 0.001 + star.x))})`;
            ctx.fill();
        });

        for (const ob of obstacles) {
            ctx.shadowColor = '#b0d0ff66';
            ctx.shadowBlur = 20;
            if (ob.type === 2) {
                ctx.fillStyle = ob.color;
                ctx.shadowColor = '#6fcf97';
                ctx.shadowBlur = 18;
                ctx.beginPath();
                ctx.roundRect(ob.x, ob.y, ob.w, ob.h, 8);
                ctx.fill();
                ctx.fillStyle = '#a7e0b0';
                ctx.font = '18px sans-serif';
                ctx.shadowBlur = 0;
                ctx.fillText('⬛', ob.x + 8, ob.y + 26);
            } else {
                ctx.shadowColor = '#ffbb66';
                ctx.shadowBlur = 25;
                ctx.beginPath();
                ctx.arc(ob.x + ob.w/2, ob.y + ob.h/2, ob.w/2, 0, Math.PI*2);
                ctx.fillStyle = ob.color;
                ctx.fill();
                ctx.shadowBlur = 0;
                ctx.font = (ob.type === 0 ? '28px' : '30px') + ' sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillStyle = '#fff6e0';
                ctx.fillText(ob.label, ob.x + ob.w/2, ob.y + ob.h/2 + 2);
            }
        }

        ctx.shadowColor = '#6ab0ff';
        ctx.shadowBlur = 40;
        ctx.beginPath();
        ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
        const gradPlayer = ctx.createRadialGradient(
            player.x - 6, player.y - 6, 4,
            player.x, player.y, player.radius + 4
        );
        gradPlayer.addColorStop(0, '#b0e4ff');
        gradPlayer.addColorStop(0.8, '#2470b0');
        ctx.fillStyle = gradPlayer;
        ctx.fill();
        ctx.strokeStyle = '#8ec8ff';
        ctx.lineWidth = 2.5;
        ctx.stroke();

        ctx.shadowBlur = 30;
        ctx.fillStyle = '#ffaa44';
        ctx.beginPath();
        ctx.ellipse(player.x - 18, player.y + 4, 8, 14, 0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ff7b2b';
        ctx.beginPath();
        ctx.ellipse(player.x - 24, player.y + 8, 6, 10, 0.1, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(player.x - 2, player.y - 6, 7, 0, Math.PI*2);
        ctx.fillStyle = '#d6f0ff';
        ctx.fill();

        if (!player.grounded) {
            ctx.shadowBlur = 15;
            ctx.font = '16px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillStyle = 'rgba(255, 255, 100, 0.6)';
            ctx.fillText('', player.x, player.y - 35);
        }

        if (window.innerWidth <= 768 && !gameOver) {
            ctx.shadowBlur = 10;
            ctx.font = '14px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.fillText('👆 Тапни по экрану чтобы прыгнуть', W/2, H - 20);
        }

        if (gameOver) {
            ctx.shadowBlur = 30;
            ctx.font = 'bold 58px "Segoe UI", system-ui';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = '#ffb0b0';
            ctx.shadowColor = '#ff000066';
            ctx.fillText('💥 ИГРА ОКОНЧЕНА', W/2, 140);
            ctx.font = '26px sans-serif';
            ctx.fillStyle = '#b0d0ff';
            ctx.fillText('нажмите "Перезапуск"', W/2, 210);
        }

        ctx.shadowBlur = 0;
        ctx.shadowColor = 'transparent';
    }

    CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
        if (w < 2 * r) r = w / 2;
        if (h < 2 * r) r = h / 2;
        this.moveTo(x + r, y);
        this.lineTo(x + w - r, y);
        this.quadraticCurveTo(x + w, y, x + w, y + r);
        this.lineTo(x + w, y + h - r);
        this.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        this.lineTo(x + r, y + h);
        this.quadraticCurveTo(x, y + h, x, y + h - r);
        this.lineTo(x, y + r);
        this.quadraticCurveTo(x, y, x + r, y);
        this.closePath();
        return this;
    };

    function performJump(e) {
        if (e) {
            e.preventDefault();
            if (e.target && e.target.closest && e.target.closest('#restartBtn')) {
                return;
            }
        }
        if (gameOver) return;
        if (jumpCooldown) return;

        player.vy = player.jumpPower;
        player.grounded = false;
        jumpCooldown = true;

        if (navigator.vibrate) {
            navigator.vibrate(10);
        }
    }



    document.addEventListener('click', function(e) {
        // Игнорируем клики по кнопке перезапуска (она обрабатывается отдельно)
        if (e.target.closest && e.target.closest('#restartBtn')) {
            return;
        }
        performJump(e);
    });


    document.addEventListener('touchstart', function(e) {

        if (e.target.closest && e.target.closest('#restartBtn')) {
            return;
        }
        performJump(e);
    }, { passive: false });


    function handleKeyDown(e) {
        if (e.key === ' ' || e.key === 'Space' || e.key === 'ArrowUp') {
            e.preventDefault();
            performJump(e);
        }
        if (e.key === 'r' || e.key === 'R') {
            e.preventDefault();
            startGame();
        }
    }

    function gameLoop() {
        update();
        draw();
        frameId = requestAnimationFrame(gameLoop);
    }

    function startGame() {
        if (frameId) cancelAnimationFrame(frameId);
        resetGame();
        gameLoop();
    }

    window.addEventListener('keydown', handleKeyDown);


    restartBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        startGame();
    });

    document.addEventListener('contextmenu', (e) => e.preventDefault());

    document.addEventListener('touchmove', (e) => {
        e.preventDefault();
    }, { passive: false });

    startGame();

})();