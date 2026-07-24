import * as THREE from 'three';
import confetti from 'canvas-confetti';
import { sounds } from './audio.js';
import { BAHRAINI_FISHES, create3DFishMesh } from './fishData.js';
import { EnvironmentManager } from './environment.js';
import { PlayerAndRodManager } from './playerAndRod.js';
import { RealtimeMultiplayerManager } from './multiplayer.js';

class GameController {
  constructor() {
    window.gameController = this;

    this.container = document.getElementById('game-container');
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 1500);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.container.appendChild(this.renderer.domElement);

    this.env = new EnvironmentManager(this.scene);
    this.player = new PlayerAndRodManager(this.camera, this.scene);
    this.multiplayer = new RealtimeMultiplayerManager(this);

    // Economy & Single Purchase Persistence
    this.coins = 200;
    this.catchesCount = 0;
    this.inventory = {};
    this.purchasedItems = { 'rod-classic': true };
    this.equippedRodId = 'rod-classic';

    this.maxTensionLimit = 100;
    this.reelSpeed = 1.0;

    // Cooler & Relocation State
    this.coolerCapacity = 4;
    this.coolerStoredFish = [];
    this.isCarryingCooler = false;

    // Swimming fish
    this.swimmingFishGroup = new THREE.Group();
    this.scene.add(this.swimmingFishGroup);
    this.spawnUnderwaterFish();

    // Game state
    this.gameState = 'START_MENU';
    this.currentFish = null;
    this.fishDistance = 30;

    // Two-meter minigame
    this.catchProgress = 0;
    this.lineHealth = 100;
    this.isFishStruggling = false;
    this.struggleTimer = 0;
    this.isHoldingLeftClick = false;

    // Catch preview modal
    this.catchPreviewScene = new THREE.Scene();
    this.catchPreviewCamera = new THREE.PerspectiveCamera(45, 1, 0.1, 10);
    this.catchPreviewCamera.position.set(0, 0.2, 3.5);
    const pvLight = new THREE.DirectionalLight(0xffffff, 2.5);
    pvLight.position.set(2, 4, 5);
    this.catchPreviewScene.add(pvLight);
    this.catchPreviewScene.add(new THREE.AmbientLight(0xffffff, 1.5));
    this.catchPreviewRenderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    this.catchPreviewRenderer.setSize(200, 180);
    this.catchPreviewMeshGroup = null;

    const previewContainer = document.getElementById('fish-3d-canvas-container');
    if (previewContainer) previewContainer.appendChild(this.catchPreviewRenderer.domElement);

    this.fishdexRenderers = [];

    this.setupUI();
    this.setupKeys();
    this.setupMouse();
    this.setupShopTabs();

    this.clock = new THREE.Clock();
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);

    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  toast(msg) {
    const t = document.getElementById('status-toast');
    if (!t) return;
    t.innerText = msg;
    t.classList.remove('hidden');
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => t.classList.add('hidden'), 3200);
  }

  spawnUnderwaterFish() {
    for (let i = 0; i < 35; i++) {
      const ft = BAHRAINI_FISHES[Math.floor(Math.random() * BAHRAINI_FISHES.length)];
      const m = create3DFishMesh(ft);
      m.scale.set(1.8, 1.8, 1.8);
      m.position.set((Math.random() - 0.5) * 80, -1.5 - Math.random() * 4, 15 + Math.random() * 55);
      m.userData = { speed: 0.5 + Math.random() * 1.5, rotSpd: (Math.random() - 0.5) * 0.4 };
      this.swimmingFishGroup.add(m);
    }
  }

  setupKeys() {
    window.addEventListener('keydown', (e) => {
      if (['Digit1','Digit2','Digit3','Digit4','Digit5'].includes(e.code)) {
        const n = parseInt(e.code.replace('Digit', ''));
        this.setHotbar(n);
        if (sounds.playClick) sounds.playClick();
      }
      if (e.code === 'KeyE') this.handleE();
      if (e.code === 'KeyY') this.handleY(); // COOLER RELOCATION VIA [Y] KEY!
      if (e.code === 'KeyP') {
        const m = document.getElementById('shop-modal');
        if (m.classList.contains('hidden')) {
          this.player.unlockPointer();
          this.renderShop();
          m.classList.remove('hidden');
        } else {
          m.classList.add('hidden');
          if (this.gameState === 'ROAMING') this.player.requestLock(this.container);
        }
        if (sounds.playClick) sounds.playClick();
      }
      if (e.code === 'KeyM') {
        const m = document.getElementById('fishdex-modal');
        if (m.classList.contains('hidden')) {
          this.player.unlockPointer();
          this.renderFishdex();
          m.classList.remove('hidden');
        } else {
          m.classList.add('hidden');
          if (this.gameState === 'ROAMING') this.player.requestLock(this.container);
        }
        if (sounds.playClick) sounds.playClick();
      }
    });
  }

  setHotbar(n) {
    this.player.setActiveSlot(n);
    document.querySelectorAll('.hotbar-slot').forEach(el => {
      el.classList.toggle('active', parseInt(el.dataset.slot) === n);
    });
  }

  handleE() {
    const pos = this.player.camera.position;

    // SELLING IS ONLY ALLOWED AT UNCLE ABU YACOUB AT THE PIER!
    if (this.env.pierVendorMesh) {
      const d = pos.distanceTo(this.env.pierVendorMesh.position);
      if (d < 6) { this.sellFish('عمي بويعقوب'); return; }
    }
    if (this.env.coolerMesh && !this.isCarryingCooler) {
      const d = pos.distanceTo(this.env.coolerMesh.position);
      if (d < 5) { this.storeFishInCooler(); return; }
    }
  }

  // COOLER RELOCATION VIA [Y] KEY
  handleY() {
    if (!this.env.coolerMesh) return;
    const pos = this.player.camera.position;

    if (!this.isCarryingCooler) {
      // Pick up cooler if nearby
      const d = pos.distanceTo(this.env.coolerMesh.position);
      if (d < 5) {
        this.isCarryingCooler = true;
        this.env.coolerMesh.visible = false;
        if (sounds.playStoreSound) sounds.playStoreSound();
        this.toast('🧊 حملت الثلاجة [Y]! تحرك لمكان الصيد واضغط Y لوضعها!');
      } else {
        this.toast('⚠️ اقترب من الثلاجة أولاً لنقلها [Y]!');
      }
    } else {
      // Place down cooler (CONSTRAINT: ONLY INSIDE FISHING PIER AREA z: 0 to 62, x: -10 to 10)
      if (pos.z >= 0 && pos.z <= 62 && pos.x >= -10 && pos.x <= 10) {
        this.isCarryingCooler = false;
        this.env.coolerMesh.position.set(pos.x, 3.4, pos.z + 1.2);
        this.env.coolerMesh.visible = true;
        if (sounds.playStoreSound) sounds.playStoreSound();
        this.toast('✅ تم وضع الثلاجة في مكان الصيد الجديد!');
      } else {
        this.toast('⚠️ يمكن وضع الثلاجة فقط داخل منطقة الصيد للجسر الخشبي!');
      }
    }
  }

  storeFishInCooler() {
    const s = this.player.activeSlot;
    if (s < 2) {
      this.toast('⚠️ حدد السمكة في يدك من الشريط السفي لتخزينها!');
      return;
    }
    const fish = this.player.heldFishData[s - 2];
    if (!fish) {
      this.toast('⚠️ هذه الخانة فارغة!');
      return;
    }
    if (this.coolerStoredFish.length >= this.coolerCapacity) {
      this.toast('⚠️ الثلاجة ممتلئة! بع الأسماك لـ بويعقوب [E]');
      return;
    }
    this.coolerStoredFish.push(fish);
    this.player.heldFishData[s - 2] = null;
    this.player.setActiveSlot(s);

    const icon = document.getElementById(`slot-${s}-icon`);
    const lbl = document.getElementById(`slot-${s}-label`);
    if (icon) icon.innerText = '✋';
    if (lbl) lbl.innerText = 'فارغ';
    this.updateHUD();
    if (sounds.playStoreSound) sounds.playStoreSound();
    this.toast(`✅ تم حفظ ${fish.nameAr} بالثلاجة (${this.coolerStoredFish.length}/${this.coolerCapacity})`);
  }

  sellFish(vendor) {
    this.openVendorSellModal();
  }

  setupUI() {
    // 3rna studio splash screen fade
    setTimeout(() => {
      const splash = document.getElementById('splash-screen');
      if (splash) {
        splash.style.opacity = '0';
        setTimeout(() => splash.classList.add('hidden'), 600);
      }
    }, 2200);

    this.loadSaveData();
    this.updateHUD();

    window.addEventListener('beforeunload', () => this.saveData());
    window.addEventListener('pagehide', () => this.saveData());
    setInterval(() => this.saveData(), 3000);

    const getEnteredName = () => {
      const inp = document.getElementById('player-name-input');
      return (inp && inp.value.trim()) ? inp.value.trim() : 'صياد_المنامة';
    };

    const startOffline = () => {
      if (sounds.init) sounds.init();
      const name = getEnteredName();
      this.multiplayer.setPlayerName(name);
      this.multiplayer.setOnlineMode(false); // Fully isolate offline mode!
      document.getElementById('start-overlay').classList.add('hidden');
      document.getElementById('multiplayer-status').innerText = `🎮 لعب فردي (${name})`;
      this.player.requestLock(this.container);
      this.gameState = 'ROAMING';
    };

    const startOnline = () => {
      if (sounds.init) sounds.init();
      const name = getEnteredName();
      this.multiplayer.setPlayerName(name);
      document.getElementById('start-overlay').classList.add('hidden');
      this.player.unlockPointer();
      this.renderServerBrowser();
      document.getElementById('server-browser-modal').classList.remove('hidden');
    };

    const btnOffline = document.getElementById('btn-mode-offline');
    if (btnOffline) btnOffline.addEventListener('click', startOffline);

    const btnOnline = document.getElementById('btn-mode-online');
    if (btnOnline) btnOnline.addEventListener('click', startOnline);

    const btnStart = document.getElementById('btn-start-game');
    if (btnStart) btnStart.addEventListener('click', startOffline);

    document.getElementById('btn-servers').addEventListener('click', () => {
      this.player.unlockPointer();
      this.renderServerBrowser();
      document.getElementById('server-browser-modal').classList.remove('hidden');
    });

    document.getElementById('btn-close-servers').addEventListener('click', () => {
      document.getElementById('server-browser-modal').classList.add('hidden');
      if (this.gameState === 'ROAMING') this.player.requestLock(this.container);
    });

    document.getElementById('btn-create-server-confirm').addEventListener('click', () => {
      const nameInput = document.getElementById('new-server-name-input');
      const name = (nameInput && nameInput.value.trim()) ? nameInput.value.trim() : `سيرفر ${this.multiplayer.playerName}`;
      this.multiplayer.createServer(name);
      document.getElementById('server-browser-modal').classList.add('hidden');
      document.getElementById('multiplayer-status').innerText = `🌐 ${name}`;
      this.player.requestLock(this.container);
      this.gameState = 'ROAMING';
    });

    const btnCloseVendorSell = document.getElementById('btn-close-vendor-sell');
    if (btnCloseVendorSell) {
      btnCloseVendorSell.addEventListener('click', () => {
        document.getElementById('vendor-sell-modal').classList.add('hidden');
        if (this.gameState === 'ROAMING') this.player.requestLock(this.container);
      });
    }

    const btnConfirmVendorSell = document.getElementById('btn-confirm-vendor-sell');
    if (btnConfirmVendorSell) {
      btnConfirmVendorSell.addEventListener('click', () => {
        this.confirmVendorSell();
      });
    }

    document.getElementById('btn-sound').addEventListener('click', () => {
      const m = sounds.toggleMute ? sounds.toggleMute() : false;
      document.getElementById('btn-sound').innerText = m ? '🔇' : '🔊';
    });

    // Trade Modal Button
    document.getElementById('btn-trade').addEventListener('click', () => {
      this.player.unlockPointer();
      this.renderTrade();
      document.getElementById('trade-modal').classList.remove('hidden');
    });

    document.getElementById('btn-close-trade').addEventListener('click', () => {
      document.getElementById('trade-modal').classList.add('hidden');
      if (this.gameState === 'ROAMING') this.player.requestLock(this.container);
    });

    document.getElementById('btn-confirm-trade').addEventListener('click', () => {
      const sel = document.getElementById('trade-player-select');
      const targetName = sel ? sel.value : 'صياد الأونلاين';
      document.getElementById('trade-modal').classList.add('hidden');
      if (this.gameState === 'ROAMING') this.player.requestLock(this.container);
      if (sounds.playSellSound) sounds.playSellSound();
      this.toast(`🤝 تم إرسال طلب المبادلة للصياد [${targetName}] بنجاح!`);
    });

    // 1v1 Challenge Modal Button
    document.getElementById('btn-challenge').addEventListener('click', () => {
      this.player.unlockPointer();
      this.renderChallengeModal();
      document.getElementById('challenge-modal').classList.remove('hidden');
    });

    document.getElementById('btn-close-challenge').addEventListener('click', () => {
      document.getElementById('challenge-modal').classList.add('hidden');
      if (this.gameState === 'ROAMING') this.player.requestLock(this.container);
    });

    document.getElementById('btn-send-challenge-confirm').addEventListener('click', () => {
      const sel = document.getElementById('challenge-player-select');
      const targetName = sel ? sel.value : 'الخصم';
      document.getElementById('challenge-modal').classList.add('hidden');
      this.start1v1Challenge(targetName);
    });

    document.getElementById('btn-shop').addEventListener('click', () => {
      this.player.unlockPointer();
      this.renderShop();
      document.getElementById('shop-modal').classList.remove('hidden');
    });

    document.getElementById('btn-close-shop').addEventListener('click', () => {
      document.getElementById('shop-modal').classList.add('hidden');
      if (this.gameState === 'ROAMING') this.player.requestLock(this.container);
    });

    document.getElementById('btn-fishdex').addEventListener('click', () => {
      this.player.unlockPointer();
      this.renderFishdex();
      document.getElementById('fishdex-modal').classList.remove('hidden');
    });

    document.getElementById('btn-close-fishdex').addEventListener('click', () => {
      document.getElementById('fishdex-modal').classList.add('hidden');
      if (this.gameState === 'ROAMING') this.player.requestLock(this.container);

      this.fishdexRenderers.forEach(r => r.renderer.dispose());
      this.fishdexRenderers = [];
    });

    document.getElementById('btn-store-hand').addEventListener('click', () => {
      if (this.currentFish) {
        let idx = -1;
        for (let i = 0; i < 4; i++) {
          if (!this.player.heldFishData[i]) { idx = i; break; }
        }
        if (idx !== -1) {
          this.player.heldFishData[idx] = this.currentFish;
          const sn = idx + 2;
          const icon = document.getElementById(`slot-${sn}-icon`);
          const lbl = document.getElementById(`slot-${sn}-label`);
          if (icon) icon.innerText = '🐟';
          if (lbl) lbl.innerText = this.currentFish.nameAr.substring(0, 6);
          this.setHotbar(sn);
          if (sounds.playStoreSound) sounds.playStoreSound();
        } else {
          this.toast('⚠️ الانفنتوري ممتلئ! بع الأسماك لـ بويعقوب [E]');
        }
      }
      document.getElementById('catch-modal').classList.add('hidden');
      this.gameState = 'ROAMING';
      this.player.retrieveLine();
      this.player.requestLock(this.container);
    });

    document.getElementById('btn-close-catch').addEventListener('click', () => {
      document.getElementById('catch-modal').classList.add('hidden');
      this.gameState = 'ROAMING';
      this.player.retrieveLine();
      this.player.requestLock(this.container);
    });
  }

  setupShopTabs() {
    const tabs = document.querySelectorAll('.shop-tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        const targetId = `shop-${tab.dataset.tab}-content`;
        document.querySelectorAll('.shop-content').forEach(c => c.classList.add('hidden'));
        const el = document.getElementById(targetId);
        if (el) el.classList.remove('hidden');
        if (sounds.playClick) sounds.playClick();
      });
    });
  }

  setupMouse() {
    window.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      this.isHoldingLeftClick = true;
      if (this.gameState === 'ROAMING' && this.player.isPointerLocked && this.player.activeSlot === 1) {
        this.startCast();
      }
    });
    window.addEventListener('mouseup', (e) => { if (e.button === 0) this.isHoldingLeftClick = false; });

    const btnMobileCast = document.getElementById('mobile-btn-cast');
    if (btnMobileCast) {
      btnMobileCast.addEventListener('touchstart', (e) => {
        e.preventDefault();
        this.isHoldingLeftClick = true;
        if (this.gameState === 'ROAMING' && this.player.activeSlot === 1) {
          this.startCast();
        }
      });
      btnMobileCast.addEventListener('touchend', (e) => {
        e.preventDefault();
        this.isHoldingLeftClick = false;
      });
    }
  }

  startCast() {
    if (this.player.castLine(25 + Math.floor(Math.random() * 15))) {
      this.gameState = 'WAITING_FOR_BITE';
      if (sounds.playCastSound) sounds.playCastSound();
      setTimeout(() => { if (this.gameState === 'WAITING_FOR_BITE') this.fishBite(); }, 2500 + Math.random() * 3000);
    } else {
      this.toast('⚠️ يجب أن تنظر إلى البحر لرمي السنارة!');
    }
  }

  fishBite() {
    this.gameState = 'REELING';
    if (sounds.playBiteSound) sounds.playBiteSound();

    const r = Math.random();
    let selectedFish = BAHRAINI_FISHES[0];
    if (r > 0.35) selectedFish = BAHRAINI_FISHES.find(f => f.rarityClass === 'uncommon') || selectedFish;
    if (r > 0.65) selectedFish = BAHRAINI_FISHES.find(f => f.rarityClass === 'rare') || selectedFish;
    if (r > 0.88) selectedFish = BAHRAINI_FISHES.find(f => f.rarityClass === 'epic') || selectedFish;
    if (r > 0.96) selectedFish = BAHRAINI_FISHES.find(f => f.rarityClass === 'legendary') || selectedFish;

    this.currentFish = { ...selectedFish };
    if (!this.currentFish.minWeight) this.currentFish.minWeight = 0.5;
    if (!this.currentFish.maxWeight) this.currentFish.maxWeight = 2.0;
    if (!this.currentFish.basePrice) this.currentFish.basePrice = 10;

    const w = +(this.currentFish.minWeight + Math.random() * (this.currentFish.maxWeight - this.currentFish.minWeight)).toFixed(2);
    this.currentFish.weight = w;
    this.currentFish.calculatedPrice = Math.round(this.currentFish.basePrice * (w / this.currentFish.minWeight));

    if (!this.inventory[this.currentFish.id]) this.inventory[this.currentFish.id] = { count: 1, maxWeight: w };
    else { this.inventory[this.currentFish.id].count++; this.inventory[this.currentFish.id].maxWeight = Math.max(this.inventory[this.currentFish.id].maxWeight, w); }

    this.catchProgress = 10;
    this.lineHealth = 100;
    this.isFishStruggling = false;
    this.struggleTimer = 0;
    this.fishDistance = 25;

    document.getElementById('fishing-hud').classList.remove('hidden');
    this.toast(`🚨 عضت ${this.currentFish.nameAr}! اسحب بحذر!`);
  }

  updateFishing(dt) {
    if (this.gameState !== 'REELING') return;

    this.struggleTimer += dt * 1000;
    const interval = this.currentFish.resistInterval || 2200;

    if (this.struggleTimer > interval) {
      this.struggleTimer = 0;
      this.isFishStruggling = !this.isFishStruggling;
      const tag = document.getElementById('fish-behavior-tag');
      if (tag) {
        if (this.isFishStruggling) {
          tag.innerText = '⚡ السمكة تقاوم وتتحرك!';
          tag.style.color = '#ff4757';
        } else {
          tag.innerText = '😴 السمكة متوقفة (اسحب الكلك!)';
          tag.style.color = '#2ed573';
        }
      }
    }

    const pull = this.currentFish.pullForce || 1.0;

    if (this.isHoldingLeftClick) {
      if (sounds.playReelClick) sounds.playReelClick();

      if (this.isFishStruggling) {
        this.lineHealth -= dt * 32 * pull;
      } else {
        this.catchProgress += dt * 28;
        this.fishDistance -= dt * 7 * this.reelSpeed;
      }
    } else {
      if (this.isFishStruggling) {
        this.lineHealth += dt * 12;
      } else {
        this.catchProgress -= dt * 4;
      }
    }

    this.catchProgress = THREE.MathUtils.clamp(this.catchProgress, 0, 100);
    this.lineHealth = THREE.MathUtils.clamp(this.lineHealth, 0, 100);
    this.fishDistance = Math.max(1, this.fishDistance);

    const progressFill = document.getElementById('catch-progress-fill');
    if (progressFill) progressFill.style.width = `${this.catchProgress}%`;
    const progressText = document.getElementById('catch-progress-val');
    if (progressText) progressText.innerText = `${Math.round(this.catchProgress)}%`;

    const healthFill = document.getElementById('line-health-fill');
    if (healthFill) {
      healthFill.style.width = `${this.lineHealth}%`;
      if (this.lineHealth < 30) healthFill.className = 'meter-fill health-red-fill';
      else if (this.lineHealth < 60) healthFill.className = 'meter-fill health-yellow-fill';
      else healthFill.className = 'meter-fill health-green-fill';
    }

    const healthText = document.getElementById('line-health-val');
    if (healthText) healthText.innerText = `${Math.round(this.lineHealth)}%`;

    const distTag = document.getElementById('fish-distance');
    if (distTag) distTag.innerText = `📏 ${this.fishDistance.toFixed(1)} م`;

    if (this.lineHealth <= 0) {
      this.gameState = 'ROAMING';
      if (sounds.playLineSnapSound) sounds.playLineSnapSound();
      document.getElementById('fishing-hud').classList.add('hidden');
      this.player.retrieveLine();
      this.toast('💥 انقطع الحبل بسبب زيادة الشد أثناء مقاومة السمكة!');
      return;
    }

    if (this.catchProgress >= 100) {
      this.catchVictory();
    }
  }

  catchVictory() {
    this.gameState = 'CATCH_MODAL';
    if (sounds.playVictorySound) sounds.playVictorySound();
    document.getElementById('fishing-hud').classList.add('hidden');
    this.player.unlockPointer();
    confetti({ particleCount: 120, spread: 85, origin: { y: 0.6 } });

    document.getElementById('catch-title').innerText = `اصطدت ${this.currentFish.nameAr}!`;
    document.getElementById('catch-name-ar').innerText = this.currentFish.nameAr;
    document.getElementById('catch-name-en').innerText = this.currentFish.nameEn;
    document.getElementById('catch-weight').innerText = `${this.currentFish.weight} كجم`;
    document.getElementById('catch-rarity-val').innerText = this.currentFish.rarity || 'عادي';
    document.getElementById('catch-price').innerText = `${this.currentFish.calculatedPrice} دينار`;
    document.getElementById('catch-desc').innerText = this.currentFish.description || '';
    document.getElementById('catch-rarity-ribbon').innerText = this.currentFish.rarity || 'عادي';

    if (this.catchPreviewMeshGroup) this.catchPreviewScene.remove(this.catchPreviewMeshGroup);
    this.catchPreviewMeshGroup = create3DFishMesh(this.currentFish);
    this.catchPreviewMeshGroup.scale.set(1.6, 1.6, 1.6);
    this.catchPreviewScene.add(this.catchPreviewMeshGroup);
    document.getElementById('catch-modal').classList.remove('hidden');
  }

  saveData() {
    try {
      const data = {
        coins: this.coins,
        catchesCount: this.catchesCount,
        purchasedItems: this.purchasedItems,
        equippedRodId: this.equippedRodId,
        coolerCapacity: this.coolerCapacity,
        heldFishData: this.player ? this.player.heldFishData : [null, null, null, null],
        coolerStoredFish: this.coolerStoredFish || []
      };
      localStorage.setItem('manama_fishing_save', JSON.stringify(data));
    } catch (e) {}
  }

  loadSaveData() {
    try {
      const str = localStorage.getItem('manama_fishing_save');
      if (str) {
        const data = JSON.parse(str);
        if (data.coins !== undefined) this.coins = data.coins;
        if (data.catchesCount !== undefined) this.catchesCount = data.catchesCount;
        if (data.purchasedItems) this.purchasedItems = data.purchasedItems;
        if (data.equippedRodId) this.equippedRodId = data.equippedRodId;
        if (data.coolerCapacity) this.coolerCapacity = data.coolerCapacity;

        if (data.heldFishData && this.player) {
          this.player.heldFishData = data.heldFishData;
          for (let i = 0; i < 4; i++) {
            const f = this.player.heldFishData[i];
            const slotNum = i + 2;
            const icon = document.getElementById(`slot-${slotNum}-icon`);
            const lbl = document.getElementById(`slot-${slotNum}-label`);
            if (f) {
              if (icon) icon.innerText = '🐟';
              if (lbl) lbl.innerText = f.nameAr;
            } else {
              if (icon) icon.innerText = '✋';
              if (lbl) lbl.innerText = 'فارغ';
            }
          }
        }

        if (data.coolerStoredFish) {
          this.coolerStoredFish = data.coolerStoredFish;
        }
      }
    } catch (e) {}
  }

  updateHUD() {
    document.getElementById('coins-count').innerText = this.coins;
    document.getElementById('cooler-count').innerText = `${this.coolerStoredFish.length}/${this.coolerCapacity}`;
    document.getElementById('catches-count').innerText = this.catchesCount;
    this.saveData();
  }

  openVendorSellModal() {
    this.player.unlockPointer();
    this.renderVendorSellModal();
    document.getElementById('vendor-sell-modal').classList.remove('hidden');
  }

  renderVendorSellModal() {
    const container = document.getElementById('vendor-fish-list');
    const totalEl = document.getElementById('vendor-total-price');
    if (!container) return;

    this.selectedSellIndices = new Set();

    let html = '';
    let total = 0;

    for (let i = 0; i < 4; i++) {
      const f = this.player.heldFishData[i];
      if (f) {
        this.selectedSellIndices.add(i);
        total += f.calculatedPrice;
        html += `
          <div class="shop-item-card" style="display:flex;justify-content:space-between;align-items:center">
            <label style="display:flex;align-items:center;gap:10px;cursor:pointer">
              <input type="checkbox" checked id="chk-fish-${i}" class="chk-sell-fish" data-idx="${i}" />
              <span><b>🐟 ${f.nameAr}</b> (${f.weight} كجم)</span>
            </label>
            <span style="color:#2ecc71;font-weight:800">${f.calculatedPrice} دينار</span>
          </div>
        `;
      }
    }

    container.innerHTML = html || '<p style="color:#aaa;text-align:center">لا توجد أسماك في يدك حالياً!</p>';
    if (totalEl) totalEl.innerText = total;

    // Checkbox listeners
    container.querySelectorAll('.chk-sell-fish').forEach(chk => {
      chk.addEventListener('change', (e) => {
        const idx = parseInt(e.target.dataset.idx);
        if (e.target.checked) this.selectedSellIndices.add(idx);
        else this.selectedSellIndices.delete(idx);

        let newTotal = 0;
        this.selectedSellIndices.forEach(fi => {
          if (this.player.heldFishData[fi]) newTotal += this.player.heldFishData[fi].calculatedPrice;
        });
        if (totalEl) totalEl.innerText = newTotal;
      });
    });
  }

  confirmVendorSell() {
    let earned = 0;
    let count = 0;

    this.selectedSellIndices.forEach(idx => {
      const f = this.player.heldFishData[idx];
      if (f) {
        earned += f.calculatedPrice;
        count++;
        this.player.heldFishData[idx] = null;
        const sn = idx + 2;
        const icon = document.getElementById(`slot-${sn}-icon`);
        const lbl = document.getElementById(`slot-${sn}-label`);
        if (icon) icon.innerText = '✋';
        if (lbl) lbl.innerText = 'فارغ';
      }
    });

    document.getElementById('vendor-sell-modal').classList.add('hidden');
    if (this.gameState === 'ROAMING') this.player.requestLock(this.container);

    if (count > 0) {
      this.coins += earned;
      this.catchesCount += count;
      this.updateHUD();
      if (sounds.playSellSound) sounds.playSellSound();
      confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
      this.toast(`🎉 بعت ${count} أسماك لـ العم بويعقوب وربحت ${earned} دينار!`);
    } else {
      this.toast('⚠️ لم تحدد أي سمكة لبيعها!');
    }
  }

  renderShop() {
    const skins = [
      { id: 'rod-classic', name: 'سنارة كلاسيكية 🎣', desc: 'السنارة القياسية المتينة', cost: 0, style: 'basic' },
      { id: 'rod-gold', name: 'سنارة ذهبية 👑', desc: 'تزيد أرباح البيع +25%', cost: 25, style: 'gold' },
      { id: 'rod-neon', name: 'سنارة نيون ⚡', desc: 'تزيد سرعة السحب +35%', cost: 40, style: 'neon' },
      { id: 'rod-crimson', name: 'سنارة ياقوتية 🔴', desc: 'تزيد فرصة صيد الأسطوري +40%', cost: 65, style: 'dragon' },
      { id: 'rod-emerald', name: 'سنارة زمردية 🟢', desc: 'تقلل شد الخيط ومقاومة السمكة', cost: 90, style: 'emerald' },
      { id: 'rod-violet', name: 'سنارة سايبر بايو المائية 🟣', desc: 'عتاد الصيد الأسطوري الكامل', cost: 140, style: 'violet' }
    ];

    document.getElementById('rods-shop-list').innerHTML = skins.map(s => {
      const isEquipped = this.equippedRodId === s.id;
      const isPurchased = this.purchasedItems[s.id];
      let btnHtml = '';
      if (isEquipped) btnHtml = `<button class="btn-buy" disabled style="background:#2ecc71;color:#fff">مجهزة حالياً ✅</button>`;
      else if (isPurchased) btnHtml = `<button class="btn-buy" id="btn-equip-${s.id}">تجهيز 🎣</button>`;
      else btnHtml = `<button class="btn-buy" id="btn-buy-${s.id}">شراء (${s.cost} د)</button>`;

      return `<div class="shop-item-card"><h5>${s.name}</h5><p>${s.desc}</p>${btnHtml}</div>`;
    }).join('');

    skins.forEach(s => {
      const buyBtn = document.getElementById(`btn-buy-${s.id}`);
      if (buyBtn) {
        buyBtn.addEventListener('click', () => {
          if (this.coins >= s.cost) {
            this.coins -= s.cost;
            this.purchasedItems[s.id] = true;
            this.equippedRodId = s.id;
            this.player.setRodStyle(s.style);
            this.player.setActiveSlot(1);
            this.updateHUD();
            this.renderShop();
            if (sounds.playSellSound) sounds.playSellSound();
            this.toast(`🎉 تم شراء وتجهيز ${s.name}!`);
          } else {
            this.toast('⚠️ دنانير غير كافية!');
          }
        });
      }
      const equipBtn = document.getElementById(`btn-equip-${s.id}`);
      if (equipBtn) {
        equipBtn.addEventListener('click', () => {
          this.equippedRodId = s.id;
          this.player.setRodStyle(s.style);
          this.player.setActiveSlot(1);
          this.renderShop();
          if (sounds.playClick) sounds.playClick();
          this.toast(`🎣 تم تجهيز ${s.name}!`);
        });
      }
    });

    const upgrades = [
      { id: 'upg-130', name: 'بكرة قوية ⚡', desc: 'سرعة السحب +30%', cost: 100, speed: 1.3 },
      { id: 'upg-160', name: 'بكرة جبارة 🔥', desc: 'سرعة السحب +60%', cost: 250, speed: 1.6 },
      { id: 'upg-200', name: 'بكرة أسطورية 👑', desc: 'سرعة السحب +100%', cost: 500, speed: 2.0 }
    ];

    document.getElementById('rod-upgrades-list').innerHTML = upgrades.map(u => {
      const isPurchased = this.purchasedItems[u.id];
      const btn = isPurchased
        ? `<button class="btn-buy" disabled style="background:#2ecc71;color:#fff">تم التطوير ✅</button>`
        : `<button class="btn-buy" id="btn-buy-${u.id}">تطوير (${u.cost} د)</button>`;
      return `<div class="shop-item-card"><h5>${u.name}</h5><p>${u.desc}</p>${btn}</div>`;
    }).join('');

    upgrades.forEach(u => {
      const b = document.getElementById(`btn-buy-${u.id}`);
      if (b) {
        b.addEventListener('click', () => {
          if (this.coins >= u.cost) {
            this.coins -= u.cost;
            this.purchasedItems[u.id] = true;
            this.reelSpeed = u.speed;
            this.updateHUD();
            this.renderShop();
            if (sounds.playSellSound) sounds.playSellSound();
            this.toast(`⚡ تم تطوير ${u.name}!`);
          } else {
            this.toast('⚠️ دنانير غير كافية!');
          }
        });
      }
    });

    const coolerUpgrades = [
      { id: 'cooler-8', name: 'ثلاجة 8 أسماك 🧊', desc: 'تزيد السعة إلى 8', cost: 100, cap: 8 },
      { id: 'cooler-16', name: 'ثلاجة 16 سمكة 📦', desc: 'تزيد السعة إلى 16', cost: 250, cap: 16 },
      { id: 'cooler-24', name: 'ثلاجة عملاقة 24 سمكة 🏆', desc: 'تزيد السعة إلى 24', cost: 450, cap: 24 }
    ];

    document.getElementById('cooler-shop-list').innerHTML = coolerUpgrades.map(c => {
      const isPurchased = this.purchasedItems[c.id];
      const btn = isPurchased
        ? `<button class="btn-buy" disabled style="background:#2ecc71;color:#fff">تم الترقية ✅</button>`
        : `<button class="btn-buy" id="btn-buy-${c.id}">ترقية (${c.cost} د)</button>`;
      return `<div class="shop-item-card"><h5>${c.name}</h5><p>${c.desc}</p>${btn}</div>`;
    }).join('');

    coolerUpgrades.forEach(c => {
      const b = document.getElementById(`btn-buy-${c.id}`);
      if (b) {
        b.addEventListener('click', () => {
          if (this.coins >= c.cost) {
            this.coins -= c.cost;
            this.purchasedItems[c.id] = true;
            this.coolerCapacity = c.cap;
            this.updateHUD();
            this.renderShop();
            if (sounds.playSellSound) sounds.playSellSound();
            this.toast(`🧊 تم ترقية الثلاجة!`);
          } else {
            this.toast('⚠️ دنانير غير كافية!');
          }
        });
      }
    });
  }

  renderFishdex() {
    const container = document.getElementById('fishdex-grid-container');
    container.innerHTML = '';

    BAHRAINI_FISHES.forEach((f, idx) => {
      const d = this.inventory[f.id];
      const isUnlocked = !!d;

      const card = document.createElement('div');
      card.className = `fishdex-card ${isUnlocked ? '' : 'locked'}`;

      const canvasContainer = document.createElement('div');
      canvasContainer.className = 'fishdex-preview-canvas';
      canvasContainer.id = `fishdex-canvas-${idx}`;
      card.appendChild(canvasContainer);

      const textContainer = document.createElement('div');
      textContainer.innerHTML = `<h4>${f.nameAr}</h4><small>${f.nameEn}</small>
        <div style="margin-top:6px;font-size:0.8rem">${isUnlocked ? `✅ ${d.count} صيد | أضخم: ${d.maxWeight} كجم` : '🔒 لم تُصطد بعد'}</div>`;
      card.appendChild(textContainer);

      container.appendChild(card);

      setTimeout(() => {
        const domEl = document.getElementById(`fishdex-canvas-${idx}`);
        if (!domEl) return;

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(45, domEl.clientWidth / domEl.clientHeight, 0.1, 10);
        camera.position.set(0, 0, 4);

        const light = new THREE.DirectionalLight(0xffffff, 2.5);
        light.position.set(2, 4, 5);
        scene.add(light);
        scene.add(new THREE.AmbientLight(0xffffff, 1.5));

        const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
        renderer.setSize(domEl.clientWidth, domEl.clientHeight);
        domEl.appendChild(renderer.domElement);

        const mesh = create3DFishMesh(f);
        mesh.scale.set(1.5, 1.5, 1.5);
        if (!isUnlocked) {
          mesh.traverse(c => {
            if (c.material) c.material = new THREE.MeshBasicMaterial({ color: 0x333333 });
          });
        }
        scene.add(mesh);

        this.fishdexRenderers.push({ scene, camera, renderer, mesh });
      }, 50);
    });
  }

  updateInteractionPrompt() {
    if (this.gameState !== 'ROAMING') {
      const p = document.getElementById('interaction-prompt');
      if (p) p.classList.add('hidden');
      return;
    }

    const pos = this.player.camera.position;
    const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(this.player.camera.quaternion);

    let target = null;
    let key = '';
    let msg = '';

    // SELLING IS ONLY AT UNCLE ABU YACOUB AT THE PIER!
    if (this.env.pierVendorMesh) {
      const vDir = new THREE.Vector3().subVectors(this.env.pierVendorMesh.position, pos);
      const dist = vDir.length();
      if (dist < 6) {
        vDir.normalize();
        if (dir.dot(vDir) > 0.75) { target = 'vendor'; key = 'E'; msg = 'بيع السمك للتاجر بويعقوب'; }
      }
    }

    if (!target && this.env.coolerMesh && !this.isCarryingCooler) {
      const vDir = new THREE.Vector3().subVectors(this.env.coolerMesh.position, pos);
      const dist = vDir.length();
      if (dist < 5) {
        vDir.normalize();
        if (dir.dot(vDir) > 0.75) { target = 'cooler'; key = 'Y (نقل) / E (تخزين)'; msg = 'نقل الثلاجة [Y] أو تخزين سمكة [E]'; }
      }
    }

    const promptEl = document.getElementById('interaction-prompt');
    if (promptEl) {
      if (target) {
        document.getElementById('prompt-key').innerText = key;
        document.getElementById('prompt-text').innerText = msg;
        promptEl.classList.remove('hidden');
      } else {
        promptEl.classList.add('hidden');
      }
    }
  }

  animate() {
    requestAnimationFrame(this.animate);
    const dt = this.clock.getDelta();
    const t = this.clock.getElapsedTime();

    this.env.update(dt, t);
    this.player.update(dt, 100 - this.lineHealth);
    this.updateInteractionPrompt();

    this.swimmingFishGroup.children.forEach(f => {
      f.position.x += Math.sin(t + f.position.z) * dt * f.userData.speed;
      f.rotation.y += Math.cos(t * 0.5) * dt * f.userData.rotSpd;
    });

    this.updateFishing(dt);
    this.renderer.render(this.scene, this.camera);

    if (this.gameState === 'CATCH_MODAL' && this.catchPreviewMeshGroup) {
      this.catchPreviewMeshGroup.rotation.y += dt * 1.4;
      this.catchPreviewRenderer.render(this.catchPreviewScene, this.catchPreviewCamera);
    }

    if (this.gameState !== 'ROAMING' && document.getElementById('fishdex-modal') && !document.getElementById('fishdex-modal').classList.contains('hidden')) {
      this.fishdexRenderers.forEach(r => {
        r.mesh.rotation.y += dt * 1.0;
        r.renderer.render(r.scene, r.camera);
      });
    }
  }

  renderServerBrowser() {
    const container = document.getElementById('servers-list-container');
    if (!container) return;

    const servers = this.multiplayer ? this.multiplayer.getServerListArray() : [];
    container.innerHTML = servers.map(s => {
      return `
        <div class="shop-item-card" style="display:flex;justify-content:space-between;align-items:center">
          <div>
            <h5 style="margin:0;font-size:1.1rem;color:#00d2ff">🌐 ${s.name}</h5>
            <small style="color:#aaa">المستضيف: ${s.hostName} | الصيادين: (${s.playerCount}/8)</small>
          </div>
          <button class="btn-buy" id="btn-join-${s.serverId}">دخول 🎮</button>
        </div>
      `;
    }).join('');

    servers.forEach(s => {
      const b = document.getElementById(`btn-join-${s.serverId}`);
      if (b) {
        b.addEventListener('click', () => {
          this.multiplayer.joinServer(s.serverId);
          document.getElementById('server-browser-modal').classList.add('hidden');
          document.getElementById('multiplayer-status').innerText = `🌐 ${s.name}`;
          this.player.requestLock(this.container);
          this.gameState = 'ROAMING';
        });
      }
    });
  }

  renderTrade() {
    const myContainer = document.getElementById('my-trade-items');
    const partnerContainer = document.getElementById('partner-trade-items');
    const selectEl = document.getElementById('trade-player-select');
    if (!myContainer || !partnerContainer) return;

    // Populate player dropdown from REAL connected players only
    const players = this.multiplayer ? this.multiplayer.getConnectedPlayersList() : [];
    if (selectEl) {
      if (players.length > 0) {
        selectEl.innerHTML = players.map(p => `<option value="${p.name}">${p.name} (أونلاين 🌐)</option>`).join('');
      } else {
        selectEl.innerHTML = '<option value="">لا يوجد صيادين آخرين في السيرفر حالياً</option>';
      }
    }

    let myHtml = '';
    for (let i = 0; i < 4; i++) {
      const f = this.player.heldFishData[i];
      if (f) {
        myHtml += `<div class="shop-item-card"><h5>🐟 ${f.nameAr} (${f.weight} كجم)</h5><p>قيمة: ${f.calculatedPrice} دينار</p></div>`;
      }
    }
    myContainer.innerHTML = myHtml || '<p style="color:#aaa">لا توجد أسماك في يدك حالياً!</p>';

    partnerContainer.innerHTML = `
      <div class="shop-item-card" style="text-align:center;color:#aaa"><p>⏳ في انتظار وضع أسماك من الصياد المقابل...</p></div>
    `;
  }

  renderChallengeModal() {
    const selectEl = document.getElementById('challenge-player-select');
    if (!selectEl) return;

    const players = this.multiplayer ? this.multiplayer.getConnectedPlayersList() : [];
    if (players.length > 0) {
      selectEl.innerHTML = players.map(p => `<option value="${p.name}">${p.name} (أونلاين 🌐)</option>`).join('');
    } else {
      selectEl.innerHTML = '<option value="">لا يوجد صيادين آخرين في السيرفر حالياً</option>';
    }
  }

  receiveTradeRequest(data) {
    this.toast(`🤝 أرسل لك الصياد [${data.senderName}] طلب مبادلة الأسماك! [اضغط K للتداول]`);
  }

  receiveChallengeRequest(data) {
    this.toast(`⚔️ أرسل لك الصياد [${data.senderName}] تحدي صيد 1v1!`);
    this.start1v1Challenge(data.senderName);
  }

  start1v1Challenge(targetName = 'الخصم') {
    const hud = document.getElementById('challenge-hud');
    if (!hud) return;

    this.isChallengeActive = true;
    this.challengeTimer = 60;
    this.myChallengeScore = 0;
    this.oppChallengeScore = 0;

    const oppEl = document.getElementById('challenge-opp-name');
    if (oppEl) oppEl.innerText = targetName;

    hud.classList.remove('hidden');
    this.toast(`⚔️ بدأ تحدي الصيد 1v1 ضد [${targetName}]! اصطد أكبر عدد خلال 60 ثانية!`);

    clearInterval(this._challengeInterval);
    this._challengeInterval = setInterval(() => {
      this.challengeTimer--;
      document.getElementById('challenge-time-left').innerText = `${this.challengeTimer} ثانية`;

      if (Math.random() < 0.25) {
        this.oppChallengeScore++;
        document.getElementById('opp-challenge-score').innerText = this.oppChallengeScore;
      }

      if (this.challengeTimer <= 0) {
        clearInterval(this._challengeInterval);
        this.isChallengeActive = false;
        hud.classList.add('hidden');

        if (this.myChallengeScore > this.oppChallengeScore) {
          const reward = 100;
          this.coins += reward;
          this.updateHUD();
          if (sounds.playVictorySound) sounds.playVictorySound();
          confetti({ particleCount: 150, spread: 90, origin: { y: 0.5 } });
          this.toast(`🏆 مبروك! فزت على [${targetName}] (${this.myChallengeScore} مقابل ${this.oppChallengeScore}) وربحت 100 دينار!`);
        } else if (this.myChallengeScore < this.oppChallengeScore) {
          const penalty = Math.min(this.coins, 50);
          this.coins -= penalty;
          this.updateHUD();
          this.toast(`💔 خسرت التحدي أمام [${targetName}] (${this.myChallengeScore} مقابل ${this.oppChallengeScore}) وتم خصم ${penalty} دينار!`);
        } else {
          this.toast(`🤝 تعادل في مسابقة الصيد ضد [${targetName}]!`);
        }
      }
    }, 1000);
  }
}

window.addEventListener('DOMContentLoaded', () => new GameController());
