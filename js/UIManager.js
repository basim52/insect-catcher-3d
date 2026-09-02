// UI, HUD, Radar, Minimap & Insect Encyclopedia Manager
class UIManager {
  constructor(insectManager, audioSystem, environment) {
    this.insectManager = insectManager;
    this.audio = audioSystem;
    this.environment = environment;

    // Game stats
    this.score = 0;
    this.totalCaught = 0;
    this.combo = 1;
    this.comboResetTimeout = null;
    this.caughtCounts = {
      butterfly: 0,
      dragonfly: 0,
      hornet: 0,
      beetle: 0,
      firefly: 0
    };

    // Cache UI Elements
    this.scoreEl = document.getElementById('stat-score');
    this.caughtEl = document.getElementById('stat-caught');
    this.comboEl = document.getElementById('stat-combo');
    this.staminaBarEl = document.getElementById('stamina-bar');
    this.toastEl = document.getElementById('catch-toast');
    this.toastIcon = document.getElementById('toast-icon');
    this.toastTitle = document.getElementById('toast-title');
    this.toastDesc = document.getElementById('toast-desc');
    this.modalEl = document.getElementById('encyclopedia-modal');
    this.insectsGridEl = document.getElementById('insects-grid');
    this.radarCanvas = document.getElementById('radar-canvas');
    this.radarCtx = this.radarCanvas ? this.radarCanvas.getContext('2d') : null;

    this.initEventListeners();
    this.renderEncyclopedia();
  }

  initEventListeners() {
    // Encyclopedia Toggle
    const btnBook = document.getElementById('btn-book');
    const btnCloseModal = document.getElementById('btn-close-modal');
    if (btnBook) {
      btnBook.addEventListener('click', () => {
        this.openEncyclopedia();
      });
    }
    if (btnCloseModal) {
      btnCloseModal.addEventListener('click', () => {
        this.closeEncyclopedia();
      });
    }

    // Audio Toggle
    const btnAudio = document.getElementById('btn-audio');
    if (btnAudio) {
      btnAudio.addEventListener('click', () => {
        const isMuted = this.audio.toggleMute();
        btnAudio.textContent = isMuted ? '🔇 كتم الصوت' : '🔊 الصوت: مفعّل';
        btnAudio.classList.toggle('active', !isMuted);
      });
    }

    // Lighting Cycle Toggle
    const btnLighting = document.getElementById('btn-lighting');
    const presets = ['day', 'sunset', 'night'];
    const presetLabels = { day: '☀️ نهار مشمس', sunset: '🌅 غروب ذهبي', night: '🌙 ليل ساحر' };
    let currentIdx = 0;
    if (btnLighting) {
      btnLighting.addEventListener('click', () => {
        currentIdx = (currentIdx + 1) % presets.length;
        const preset = presets[currentIdx];
        this.environment.setTimeOfDay(preset);
        btnLighting.textContent = presetLabels[preset];
      });
    }
  }

  // Handle insect catch event
  onInsectCaught(insect) {
    const pts = insect.def.points * this.combo;
    this.score += pts;
    this.totalCaught++;
    this.caughtCounts[insect.type] = (this.caughtCounts[insect.type] || 0) + 1;

    // Increment combo
    this.combo++;
    clearTimeout(this.comboResetTimeout);
    this.comboResetTimeout = setTimeout(() => {
      this.combo = 1;
      this.updateHUD();
    }, 4500);

    // Play chime sound
    this.audio.playCatchSound(this.combo);

    // Show celebratory Toast
    this.showToast(insect, pts);

    // Update HUD and encyclopedia
    this.updateHUD();
    this.renderEncyclopedia();
  }

  showToast(insect, pts) {
    if (!this.toastEl) return;
    const icons = {
      butterfly: '🦋',
      dragonfly: '🪰',
      hornet: '🐝',
      beetle: '🪲',
      firefly: '✨'
    };

    this.toastIcon.textContent = icons[insect.type] || '🎯';
    this.toastTitle.textContent = `تم اصطياد ${insect.def.nameAr}!`;
    this.toastDesc.textContent = `+${pts} نقطة ${this.combo > 1 ? `(مضاعف ×${this.combo})` : ''}`;

    this.toastEl.classList.add('show');
    clearTimeout(this.toastHideTimer);
    this.toastHideTimer = setTimeout(() => {
      this.toastEl.classList.remove('show');
    }, 2800);
  }

  updateHUD() {
    if (this.scoreEl) this.scoreEl.textContent = this.score.toLocaleString('ar-EG');
    if (this.caughtEl) this.caughtEl.textContent = this.totalCaught.toLocaleString('ar-EG');
    if (this.comboEl) this.comboEl.textContent = `×${this.combo}`;
  }

  updateStamina(stamina, maxStamina) {
    if (this.staminaBarEl) {
      const pct = Math.max(0, Math.min(100, (stamina / maxStamina) * 100));
      this.staminaBarEl.style.width = `${pct}%`;
      if (pct < 25) {
        this.staminaBarEl.style.background = '#ef4444';
      } else {
        this.staminaBarEl.style.background = 'linear-gradient(90deg, #10b981, #34d399)';
      }
    }
  }

  // Draw 2D Minimap / Radar
  updateRadar(playerPos, playerRotY) {
    if (!this.radarCtx || !this.radarCanvas) return;
    const ctx = this.radarCtx;
    const w = this.radarCanvas.width;
    const h = this.radarCanvas.height;
    const cx = w / 2;
    const cy = h / 2;
    const radarRange = 45; // meters in world space

    ctx.clearRect(0, 0, w, h);

    // Radar concentric distance circles
    ctx.strokeStyle = 'rgba(16, 185, 129, 0.25)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, cx * 0.35, 0, Math.PI * 2);
    ctx.arc(cx, cy, cx * 0.7, 0, Math.PI * 2);
    ctx.arc(cx, cy, cx * 0.95, 0, Math.PI * 2);
    ctx.stroke();

    // Cross axes
    ctx.beginPath();
    ctx.moveTo(cx, 0); ctx.lineTo(cx, h);
    ctx.moveTo(0, cy); ctx.lineTo(w, cy);
    ctx.stroke();

    // Draw Nearby Flying Insects as colored blips
    const insects = this.insectManager.insects;
    for (let i = 0; i < insects.length; i++) {
      const ins = insects[i];
      if (ins.state === "caught") continue;

      const dx = ins.group.position.x - playerPos.x;
      const dz = ins.group.position.z - playerPos.z;
      const dist = Math.hypot(dx, dz);

      if (dist < radarRange) {
        // Transform coordinates relative to player rotation
        const angle = Math.atan2(dz, dx) - playerRotY;
        const mappedDist = (dist / radarRange) * (cx * 0.9);
        const bx = cx + Math.sin(angle) * mappedDist;
        const by = cy - Math.cos(angle) * mappedDist;

        // Draw Blip
        ctx.fillStyle = '#' + ins.def.color.toString(16).padStart(6, '0');
        ctx.beginPath();
        ctx.arc(bx, by, 3.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 0.8;
        ctx.stroke();
      }
    }

    // Player position at center (green arrow pointing forward)
    ctx.fillStyle = '#10b981';
    ctx.beginPath();
    ctx.moveTo(cx, cy - 6);
    ctx.lineTo(cx + 5, cy + 5);
    ctx.lineTo(cx - 5, cy + 5);
    ctx.closePath();
    ctx.fill();
  }

  renderEncyclopedia() {
    if (!this.insectsGridEl) return;
    const defs = this.insectManager.speciesDefs;
    const icons = {
      butterfly: '🦋',
      dragonfly: '🪰',
      hornet: '🐝',
      beetle: '🪲',
      firefly: '✨'
    };
    const rarityLabels = {
      common: { label: 'شائع', class: 'badge-common' },
      rare: { label: 'نادر', class: 'badge-rare' },
      epic: { label: 'أسطوري', class: 'badge-epic' }
    };

    let html = '';
    for (const [key, def] of Object.entries(defs)) {
      const count = this.caughtCounts[key] || 0;
      const rarity = rarityLabels[def.rarity] || rarityLabels.common;

      html += `
        <div class="insect-card">
          <div class="insect-card-head">
            <div class="insect-icon-badge">${icons[key] || '🪲'}</div>
            <span class="insect-badge ${rarity.class}">${rarity.label}</span>
          </div>
          <h3>${def.nameAr}</h3>
          <p>${def.desc}</p>
          <div class="insect-meta">
            <div>النقاط: <span>+${def.points}</span></div>
            <div>تم صيدها: <span>${count}</span></div>
          </div>
        </div>
      `;
    }
    this.insectsGridEl.innerHTML = html;
  }

  openEncyclopedia() {
    if (this.modalEl) this.modalEl.classList.add('open');
  }

  closeEncyclopedia() {
    if (this.modalEl) this.modalEl.classList.remove('open');
  }
}

window.UIManager = UIManager;
