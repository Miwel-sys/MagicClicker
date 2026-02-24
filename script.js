document.addEventListener('DOMContentLoaded', () => {
    // --- ESTADO INICIAL ---
    let gameState = {
        mana: 0,
        totalManaHistory: 0,
        manaGoal: 1000000, // Objetivo: 1 Millón (Ajustado para ~30 mins)
        structures: [
            { id: 'candle', name: 'Velas Rituales', cost: 15, mps: 1, owned: 0, color: '#ffcc00', type: 'static' },
            { id: 'mana_stone', name: 'Piedras de Maná', cost: 150, mps: 5, owned: 0, color: '#00d4ff', type: 'static' },
            { id: 'apprentice', name: 'Aprendices de hechicería', cost: 1100, mps: 32, owned: 0, color: '#b464ff', type: 'walker' },
            { id: 'portal', name: 'Esferas de vacío', cost: 12000, mps: 150, owned: 0, color: '#ff00ff', type: 'orbital' }
        ],
        apprenticeEntities: [] // Para guardar posición individual de cada aprendiz
    };

    const canvas = document.getElementById('visual-canvas');
    const ctx = canvas.getContext('2d');
    const manaDisplay = document.getElementById('mana-display');
    const mpsDisplay = document.getElementById('mps-display');
    const rewardBtn = document.getElementById('reward-btn');

    // --- MODAL DE BIENVENIDA ---
    const welcomeModal = document.getElementById('welcome-modal');
    const startBtn = document.getElementById('start-game-btn');
    
    if (startBtn) {
        startBtn.addEventListener('click', () => {
            welcomeModal.style.display = 'none';
            // Iniciar música si el navegador lo permite tras interacción
            if (bgMusic && bgMusic.paused) bgMusic.play().catch(() => {});
        });
    }

    // --- MÚSICA DE FONDO ---
    const bgMusic = document.getElementById('bg-music');
    if (bgMusic) {
        bgMusic.volume = 0.2; // Volumen bajo (20%)
        // Intentar reproducir automáticamente
        bgMusic.play().catch(() => {
            // Si el navegador bloquea el autoplay, esperar a la primera interacción
            const playOnInteraction = () => {
                bgMusic.play();
                document.removeEventListener('click', playOnInteraction);
            };
            document.addEventListener('click', playOnInteraction);
        });

        // --- CONTROLES DE AUDIO ---
        const muteBtn = document.getElementById('mute-btn');
        const volumeSlider = document.getElementById('volume-slider');

        if (muteBtn && volumeSlider) {
            muteBtn.addEventListener('click', () => {
                bgMusic.muted = !bgMusic.muted;
                muteBtn.textContent = bgMusic.muted ? '🔇' : '🎵';
            });

            volumeSlider.addEventListener('input', (e) => {
                bgMusic.volume = parseFloat(e.target.value);
            });
        }
    }

    function resize() {
        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;
    }
    window.addEventListener('resize', resize);
    resize();

    // --- MOTOR VISUAL (DIBUJO) ---
    function drawVisuals() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;

        // Lógica de movimiento de Aprendices (Caminantes)
        const apprenticeStruct = gameState.structures.find(s => s.id === 'apprentice');
        
        // Sincronizar entidades visuales con la cantidad comprada
        while (gameState.apprenticeEntities.length < apprenticeStruct.owned) {
            gameState.apprenticeEntities.push({
                x: centerX + (Math.random() - 0.5) * 200,
                y: centerY + (Math.random() - 0.5) * 200,
                targetX: centerX + (Math.random() - 0.5) * 300,
                targetY: centerY + (Math.random() - 0.5) * 300,
                state: 'walking', // 'walking' o 'idle'
                timer: 0
            });
        }

        // Actualizar posición de aprendices
        gameState.apprenticeEntities.forEach(entity => {
            if (entity.state === 'walking') {
                const dx = entity.targetX - entity.x;
                const dy = entity.targetY - entity.y;
                const dist = Math.sqrt(dx*dx + dy*dy);
                
                if (dist < 2) {
                    entity.state = 'idle';
                    entity.timer = 50 + Math.random() * 100; // Tiempo quieto
                } else {
                    entity.x += (dx / dist) * 0.5; // Velocidad
                    entity.y += (dy / dist) * 0.5;
                }
            } else {
                entity.timer--;
                if (entity.timer <= 0) {
                    entity.state = 'walking';
                    entity.targetX = centerX + (Math.random() - 0.5) * 400; // Nuevo destino aleatorio
                    entity.targetY = centerY + (Math.random() - 0.5) * 400;
                }
            }
        });

        gameState.structures.forEach((s, sIdx) => {
            const drawCount = Math.min(s.owned, 80); // Límite para rendimiento
            
            for (let i = 0; i < drawCount; i++) {
                if (s.type === 'static') {
                    // Posición fija basada en el índice para que no se muevan
                    let radius = 135 + (sIdx * 25);
                    let angle = (i * 0.4) + (sIdx * 1.5);
                    let x = centerX + Math.cos(angle) * radius;
                    let y = centerY + Math.sin(angle) * radius;

                    if (s.id === 'candle') {
                        // Vela: Cuerpo blanco y llama parpadeante
                        ctx.fillStyle = "#ffffff";
                        ctx.fillRect(x, y, 3, 7);
                        ctx.fillStyle = Math.random() > 0.5 ? "#ffae00" : "#ff4400";
                        ctx.fillRect(x, y-3, 3, 3);
                    } else {
                        // Piedras: Rombo azul neón
                        ctx.fillStyle = s.color;
                        ctx.beginPath();
                        ctx.moveTo(x, y-7);
                        ctx.lineTo(x+5, y);
                        ctx.lineTo(x, y+7);
                        ctx.lineTo(x-5, y);
                        ctx.fill();
                    }
                } else if (s.type === 'walker') {
                    // Aprendices caminando
                    const entity = gameState.apprenticeEntities[i];
                    if (entity) {
                        ctx.fillStyle = s.color;
                        ctx.fillRect(entity.x, entity.y, 4, 4); // cabeza
                        ctx.fillRect(entity.x-2, entity.y+4, 8, 8); // túnica
                    }
                } else if (s.type === 'orbital') {
                    // Esferas de vacío orbitando
                    let time = Date.now() * 0.0008;
                    let speed = 0.5 + (sIdx * 0.3);
                    let radius = 190 + (sIdx * 50); 
                    
                    let x = centerX + Math.cos(time * speed + i) * (radius + Math.sin(i) * 12);
                    let y = centerY + Math.sin(time * speed + i) * (radius + Math.cos(i) * 12);

                    ctx.fillStyle = s.color;
                    ctx.globalAlpha = 0.6 + Math.random() * 0.4;
                    ctx.beginPath();
                    ctx.arc(x, y, 6, 0, Math.PI * 2); // Esfera
                    ctx.fill();
                    ctx.globalAlpha = 1.0;
                }
            }
        });
        requestAnimationFrame(drawVisuals);
    }

    // --- LÓGICA DE JUEGO ---
    function getMps() {
        let base = gameState.structures.reduce((t, s) => t + (s.owned * s.mps), 0);
        return base;
    }

    function updateUI() {
        manaDisplay.textContent = Math.floor(gameState.mana).toLocaleString();
        mpsDisplay.textContent = getMps().toFixed(1) + " Maná/s";
        
        // Actualizar barra de objetivo
        const progress = Math.min((gameState.mana / gameState.manaGoal) * 100, 100);
        document.getElementById('goal-progress').style.width = `${progress}%`;
        document.getElementById('goal-percentage').textContent = `${progress.toFixed(1)}% Completado`;

        // Botón de recompensa
        if (gameState.mana >= gameState.manaGoal) {
            rewardBtn.disabled = false;
            document.getElementById('reward-hint').textContent = "¡Disponible!";
        } else {
            rewardBtn.disabled = true;
            document.getElementById('reward-hint').textContent = "Bloqueado";
        }

        gameState.structures.forEach((s) => {
            const btn = document.getElementById(`buy-${s.id}`);
            if(btn) btn.disabled = gameState.mana < s.cost;
        });
    }

    window.buyStructure = (idx) => {
        let s = gameState.structures[idx];
        if (gameState.mana >= s.cost) {
            gameState.mana -= s.cost;
            s.owned++;
            s.cost = Math.ceil(s.cost * 1.18); // Incremento de precio

            // Efecto de sonido DING al comprar
            const dingSound = document.getElementById('ding-sound');
            if (dingSound) {
                dingSound.cloneNode(true).play().catch(() => {});
            }

            renderShop();
            updateUI();
        }
    };

    function renderShop() {
        const list = document.getElementById('structures-list');
        const stats = document.getElementById('grimorio-stats');

        list.innerHTML = '';
        gameState.structures.forEach((s, i) => {
            list.innerHTML += `
                <div class="structure">
                    <strong>${s.name}</strong>
                    <small>Cantidad: ${s.owned}</small>
                    <div style="color: #8b4513; margin: 4px 0;">Coste: ${s.cost.toLocaleString()} ✧</div>
                    <div style="color: #6d4c41; font-size: 0.9rem;">Bonificación: +${s.mps} Maná/s</div>
                    <button class="pixel-btn-book" id="buy-${s.id}" onclick="buyStructure(${i})">Inscribir Runa</button>
                </div>
            `;
        });

        // Actualizar estadísticas en la página izquierda del Grimorio
        if (stats) {
            let totalMps = getMps();
            let html = `<div style="margin-top: 20px; border-top: 2px solid #8b4513; padding-top: 10px;">`;
            html += `<h3 style="margin: 0 0 10px 0; font-size: 1.1rem; text-align: center; color: #5d4037;">Registro de Poder</h3>`;
            html += `<ul style="list-style: none; padding: 0; margin: 0; font-size: 0.95rem;">`;
            
            gameState.structures.forEach(s => {
                html += `<li style="display: flex; justify-content: space-between; margin-bottom: 4px; color: ${s.owned > 0 ? '#3e2723' : '#aaa'};">
                            <span>${s.name}:</span>
                            <span>x${s.owned}</span>
                         </li>`;
            });

            html += `</ul>`;
            
            let clickPower = 1 + Math.floor(totalMps * 0.10);
            html += `<div style="margin-top: 8px; border-top: 1px dashed #8b4513; padding-top: 5px; display: flex; justify-content: space-between; color: #4e342e;">
                        <span>Poder de Click:</span>
                        <strong>${clickPower.toLocaleString()}</strong>
                     </div>`;

            html += `<div style="margin-top: 5px; text-align: right; font-weight: bold; color: #b71c1c;">
                        Total: ${totalMps.toFixed(1)} Maná/s
                     </div>`;
            html += `</div>`;
            stats.innerHTML = html;
        }
    }

    // --- CLICS ---
    document.getElementById('arcane-orb').addEventListener('click', () => {
        // Click dinámico: Base 1 + 10% de tu producción actual
        let clickVal = 1 + Math.floor(getMps() * 0.10);
        gameState.mana += clickVal;
        gameState.totalManaHistory += clickVal;

        // Efecto de sonido POP (clonamos el nodo para permitir superposición de sonidos rápidos)
        const popSound = document.getElementById('pop-sound');
        if (popSound) {
            popSound.cloneNode(true).play().catch(() => {});
        }

        // --- EFECTO VISUAL DE CHISPA ---
        const container = document.querySelector('.ritual-container');
        const spark = document.createElement('div');
        spark.classList.add('spark');

        // Posición aleatoria alrededor del centro (radio aprox 100px)
        const angle = Math.random() * Math.PI * 2;
        const radius = 80 + Math.random() * 40; // Entre 80 y 120px del centro
        const startX = Math.cos(angle) * radius;
        const startY = Math.sin(angle) * radius;

        // Configurar variables CSS para la animación de movimiento
        spark.style.left = `calc(50% + ${startX}px)`;
        spark.style.top = `calc(50% + ${startY}px)`;
        spark.style.setProperty('--tx', `${Math.cos(angle) * 30}px`); // Moverse un poco más hacia afuera
        spark.style.setProperty('--ty', `${Math.sin(angle) * 30}px`);

        container.appendChild(spark);
        setTimeout(() => spark.remove(), 600); // Eliminar tras la animación

        updateUI();
    });

    // --- MODAL DE VICTORIA ---
    const victoryModal = document.getElementById('victory-modal');
    const closeVictoryBtn = document.getElementById('close-victory-btn');
    if (closeVictoryBtn) {
        closeVictoryBtn.addEventListener('click', () => victoryModal.style.display = 'none');
    }

    rewardBtn.addEventListener('click', () => {
        if (victoryModal) victoryModal.style.display = 'flex';
        rewardBtn.textContent = "RECOMPENSA RECLAMADA";
        rewardBtn.disabled = true;
    });

    // Bucle principal (10 veces por segundo)
    setInterval(() => {
        let prod = getMps() / 10;
        gameState.mana += prod;
        gameState.totalManaHistory += prod;
        updateUI();
    }, 100);

    // --- SISTEMA DE GUARDADO (LocalStorage) ---
    function saveGame() {
        const saveObject = {
            mana: gameState.mana,
            totalManaHistory: gameState.totalManaHistory,
            structures: gameState.structures.map(s => ({
                id: s.id,
                owned: s.owned,
                cost: s.cost
            }))
        };
        localStorage.setItem('magicClickerSave', JSON.stringify(saveObject));
    }

    function loadGame() {
        const savedData = localStorage.getItem('magicClickerSave');
        if (savedData) {
            try {
                const parsedData = JSON.parse(savedData);
                if (parsedData.mana !== undefined) gameState.mana = parsedData.mana;
                if (parsedData.totalManaHistory !== undefined) gameState.totalManaHistory = parsedData.totalManaHistory;

                if (parsedData.structures) {
                    parsedData.structures.forEach(savedS => {
                        const targetS = gameState.structures.find(s => s.id === savedS.id);
                        if (targetS) {
                            targetS.owned = savedS.owned;
                            targetS.cost = savedS.cost;
                        }
                    });
                }
            } catch (e) { console.error("Error al cargar partida:", e); }
        }
    }

    // --- REINICIAR PROGRESO ---
    const resetBtn = document.getElementById('reset-btn');
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            if (confirm("¿Estás seguro de que quieres reiniciar todo el progreso? Esta acción no se puede deshacer.")) {
                window.removeEventListener('beforeunload', saveGame);
                localStorage.removeItem('magicClickerSave');
                location.reload();
            }
        });
    }

    // Inicio
    loadGame();
    setInterval(saveGame, 30000); // Autoguardado cada 30s
    window.addEventListener('beforeunload', saveGame); // Guardar al cerrar
    renderShop();
    drawVisuals();
});