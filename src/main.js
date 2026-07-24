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

    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || ('ontouchstart' in window);
    this.renderer = new THREE.WebGLRenderer({ antialias: !isMobile, powerPreference: 'high-performance' });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.25 : 2));
    this.renderer.shadowMap.enabled = !isMobile;
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
      // CTRL key mouse lock toggle!
      if (e.code === 'ControlLeft' || e.code === 'ControlRight' || e.key === 'Control') {
        if (this.player.isPointerLocked) {
          this.player.unlockPointer();
          this.toast('🔓 تم تحرير الماوس [CTRL]');
        } else {
          this.player.requestLock(this.container);
          this.toast('🔒 تم قفل الكاميرا والماوس [CTRL]');
        }
      }

      // Escape key closes any open modal!
      if (e.code === 'Escape') {
        this.closeAllModals();
      }

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

    // Close modal when clicking backdrop outside modal card
    document.querySelectorAll('.fullscreen-overlay').forEach(overlay => {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay && !overlay.id.includes('start-overlay')) {
          this.closeAllModals();
        }
      });
    });
  }

  closeAllModals() {
    const modalIds = [
      'shop-modal', 'fishdex-modal', 'settings-modal',
      'vendor-sell-modal', 'server-browser-modal',
      'trade-modal', 'challenge-modal'
    ];
    let closedAny = false;
    modalIds.forEach(id => {
      const el = document.getElementById(id);
      if (el && !el.classList.contains('hidden')) {
        el.classList.add('hidden');
        closedAny = true;
      }
    });
    if (closedAny && this.gameState === 'ROAMING') {
      this.player.requestLock(this.container);
    }
  }

  setHotbar(n) {
    this.player.setActiveSlot(n);
    document.querySelectorAll('.hotbar-slot').forEach(el => {
      el.classList.toggle('active', parseInt(el.dataset.slot) === n);
    });
  }

  handleE() {
    const pos = this.player.camera.position;

    // 1. Check distance to Abu Yacoub (Selling Modal)
    if (this.env.pierVendorMesh) {
      const dVendor = pos.distanceTo(this.env.pierVendorMesh.position);
      if (dVendor < 9.5) {
        this.sellFish('عمي بويعقوب');
        return;
      }
    }

    // 2. Check distance to Cooler (Storing Fish)
    if (this.env.coolerMesh && !this.isCarryingCooler) {
      const dCooler = pos.distanceTo(this.env.coolerMesh.position);
      if (dCooler < 8) {
        this.storeFishInCooler();
        return;
      }
    }

    // 3. Fallback: If player has fish in hand, store it!
    let hasFishInHand = false;
    for (let i = 0; i < 4; i++) {
      if (this.player.heldFishData[i]) { hasFishInHand = true; break; }
    }

    if (hasFishInHand) {
      this.storeFishInCooler();
    } else {
      this.toast('⚠️ اقترب من العم بويعقوب للبيع، أو اقترب من الثلاجة لتخزين الأسماك!');
    }
  }

  // COOLER RELOCATION VIA [Y] KEY / TOUCH BUTTON
  handleY() {
    if (!this.env.coolerMesh) return;
    const pos = this.player.camera.position;

    if (!this.isCarryingCooler) {
      const d = pos.distanceTo(this.env.coolerMesh.position);
      if (d < 10) {
        this.isCarryingCooler = true;
        this.env.coolerMesh.visible = false;
        if (sounds.playStoreSound) sounds.playStoreSound();
        this.toast('🧊 حملت الثلاجة! تحرك لمكان الصيد ثم اضغط الأيقونة لوضعها!');
      } else {
        this.toast('⚠️ اقترب من الثلاجة أولاً لنقلها!');
      }
    } else {
      if (pos.z >= -10 && pos.z <= 70 && pos.x >= -15 && pos.x <= 15) {
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
    let fish = null;
    let slotIdx = -1;

    // 1. Check active slot first
    const s = this.player.activeSlot;
    if (s >= 2 && this.player.heldFishData[s - 2]) {
      fish = this.player.heldFishData[s - 2];
      slotIdx = s - 2;
    } else {
      // 2. Find first held fish in hand
      for (let i = 0; i < 4; i++) {
        if (this.player.heldFishData[i]) {
          fish = this.player.heldFishData[i];
          slotIdx = i;
          break;
        }
      }
    }

    if (!fish) {
      this.toast('⚠️ لا توجد أسماك في يدك لحفظها بالثلاجة!');
      return;
    }

    if (this.coolerStoredFish.length >= this.coolerCapacity) {
      this.toast('⚠️ الثلاجة ممتلئة! بع الأسماك لـ بويعقوب [E]');
      return;
    }

    this.coolerStoredFish.push(fish);
    this.player.heldFishData[slotIdx] = null;

    const hotbarSlotNum = slotIdx + 2;
    const icon = document.getElementById(`slot-${hotbarSlotNum}-icon`);
    const lbl = document.getElementById(`slot-${hotbarSlotNum}-label`);
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
      if (this.multiplayer) this.multiplayer.requestServerRefresh();
      this.renderServerBrowser();
      document.getElementById('server-browser-modal').classList.remove('hidden');
    });

    // Settings Modal Listeners
    const btnSettings = document.getElementById('btn-settings');
    const modalSettings = document.getElementById('settings-modal');
    const btnCloseSettings = document.getElementById('btn-close-settings');
    const btnSaveSettings = document.getElementById('btn-save-settings');

    if (btnSettings && modalSettings) {
      btnSettings.addEventListener('click', () => {
        this.player.unlockPointer();
        modalSettings.classList.remove('hidden');
      });
    }

    if (btnCloseSettings && modalSettings) {
      btnCloseSettings.addEventListener('click', () => {
        modalSettings.classList.add('hidden');
        if (this.gameState === 'ROAMING') this.player.requestLock(this.container);
      });
    }

    if (btnSaveSettings) {
      btnSaveSettings.addEventListener('click', () => {
        const btnScale = document.getElementById('setting-btn-size').value;
        const quality = document.getElementById('setting-quality').value;
        this.applySettings(btnScale, quality);
        if (modalSettings) modalSettings.classList.add('hidden');
        if (this.gameState === 'ROAMING') this.player.requestLock(this.container);
        if (sounds.playClick) sounds.playClick();
        this.toast('✅ تم تطبيق الإعدادات بنجاح!');
      });
    }

    // Load saved settings
    try {
      const savedStr = localStorage.getItem('manama_settings');
      if (savedStr) {
        const s = JSON.parse(savedStr);
        if (s.btnScalePct) document.getElementById('setting-btn-size').value = s.btnScalePct;
        if (s.quality) document.getElementById('setting-quality').value = s.quality;
        this.applySettings(s.btnScalePct || '100', s.quality || 'medium');
      }
    } catch(e) {}

    document.getElementById('btn-create-server-confirm').addEventListener('click', () => {
      const nameInput = document.getElementById('new-server-name-input');
      const name = (nameInput && nameInput.value.trim()) ? nameInput.value.trim() : `سيرفر ${this.multiplayer.playerName}`;
      this.multiplayer.createServer(name);
      document.getElementById('server-browser-modal').classList.add('hidden');
      document.getElementById('multiplayer-status').innerText = `🌐 ${name}`;
      this.player.requestLock(this.container);
      this.gameState = 'ROAMING';
    });

    // Trade & PvP incoming modal listeners
    const btnConfirmTrade = document.getElementById('btn-confirm-trade');
    if (btnConfirmTrade) btnConfirmTrade.addEventListener('click', () => this.confirmTradeSend());

    const btnAcceptTrade = document.getElementById('btn-accept-trade');
    if (btnAcceptTrade) btnAcceptTrade.addEventListener('click', () => this.acceptIncomingTrade());

    const btnDeclineTrade = document.getElementById('btn-decline-trade');
    if (btnDeclineTrade) btnDeclineTrade.addEventListener('click', () => this.declineIncomingTrade());

    const btnSendChallenge = document.getElementById('btn-send-challenge-confirm');
    if (btnSendChallenge) btnSendChallenge.addEventListener('click', () => this.confirmPvPChallengeSend());

    const btnAcceptChallenge = document.getElementById('btn-accept-challenge');
    if (btnAcceptChallenge) btnAcceptChallenge.addEventListener('click', () => this.acceptIncomingPvP());

    const btnDeclineChallenge = document.getElementById('btn-decline-challenge');
    if (btnDeclineChallenge) btnDeclineChallenge.addEventListener('click', () => this.declineIncomingPvP());

    // Hide mobile button size setting if playing on PC
    const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || ('ontouchstart' in window);
    const mobileSizeGroup = document.getElementById('setting-group-mobile-size');
    if (mobileSizeGroup && !isMobileDevice) {
      mobileSizeGroup.style.display = 'none';
    }

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

    const btnMobileInteract = document.getElementById('mobile-btn-interact');
    if (btnMobileInteract) {
      btnMobileInteract.addEventListener('touchstart', (e) => {
        e.preventDefault();
        this.handleE();
      });
      btnMobileInteract.addEventListener('click', () => this.handleE());
    }

    const btnMobileCooler = document.getElementById('mobile-btn-cooler');
    if (btnMobileCooler) {
      btnMobileCooler.addEventListener('touchstart', (e) => {
        e.preventDefault();
        this.handleY();
      });
      btnMobileCooler.addEventListener('click', () => this.handleY());
    }

    const promptEl = document.getElementById('interaction-prompt');
    if (promptEl) {
      promptEl.addEventListener('touchstart', (e) => {
        e.preventDefault();
        this.handleE();
      });
      promptEl.addEventListener('click', () => this.handleE());
    }

    document.getElementById('btn-sound').addEventListener('click', () => {
      const m = sounds.toggleMute ? sounds.toggleMute() : false;
      document.getElementById('btn-sound').innerText = m ? '🔇' : '🔊';
    });

    const btnCamera = document.getElementById('btn-camera');
    if (btnCamera) {
      btnCamera.addEventListener('click', () => {
        if (this.player) this.player.toggleCameraMode();
        this.toast(`📷 تم تغيير نمط الكاميرا (${this.player.cameraMode === '3RD' ? 'منظور الشخص الثالث 3D' : 'منظور الشخص الأول'})`);
      });
    }

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

  applySettings(btnScalePct, quality) {
    const pct = parseFloat(btnScalePct) || 100;
    const scaleVal = pct / 100;

    // Apply scale variable to root and mobile controls element directly
    document.documentElement.style.setProperty('--mobile-scale', scaleVal.toString());

    const mc = document.getElementById('mobile-controls');
    if (mc) {
      mc.style.transform = `scale(${scaleVal})`;
      mc.style.transformOrigin = 'bottom center';
    }

    const jz = document.getElementById('joystick-zone');
    if (jz) {
      jz.style.width = `${Math.round(100 * scaleVal)}px`;
      jz.style.height = `${Math.round(100 * scaleVal)}px`;
    }

    // Graphics quality
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || ('ontouchstart' in window);
    if (quality === 'low') {
      this.renderer.setPixelRatio(1.0);
      this.renderer.shadowMap.enabled = false;
    } else if (quality === 'medium') {
      this.renderer.setPixelRatio(1.25);
      this.renderer.shadowMap.enabled = !isMobile;
    } else if (quality === 'high') {
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2.0));
      this.renderer.shadowMap.enabled = true;
    }

    try {
      localStorage.setItem('manama_settings', JSON.stringify({ btnScalePct: pct.toString(), quality }));
    } catch (e) {}
  }

  triggerConfetti(opts) {
    try {
      if (typeof confetti === 'function') confetti(opts);
      else if (window.confetti) window.confetti(opts);
    } catch (e) {}
  }

  catchVictory() {
    this.gameState = 'CATCH_MODAL';
    if (sounds.playVictorySound) sounds.playVictorySound();
    document.getElementById('fishing-hud').classList.add('hidden');
    this.player.unlockPointer();
    this.triggerConfetti({ particleCount: 120, spread: 85, origin: { y: 0.6 } });

    if (!this.unlockedFishSet) this.unlockedFishSet = new Set();
    this.unlockedFishSet.add(this.currentFish.id);
    this.saveData();

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
        heldFishData: this.player ? this.player.heldFishData : [],
        coolerStoredFish: this.player ? this.player.coolerStoredFish : [],
        unlockedFishArray: this.unlockedFishSet ? Array.from(this.unlockedFishSet) : []
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
        if (data.unlockedFishArray) this.unlockedFishSet = new Set(data.unlockedFishArray);

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

        if (data.coolerStoredFish && this.player) {
          this.player.coolerStoredFish = data.coolerStoredFish;
        }
      }
    } catch (e) {}
    if (!this.unlockedFishSet) this.unlockedFishSet = new Set();
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

    this.selectedSellHeld = new Set();
    this.selectedSellCooler = new Set();

    let html = '';
    let total = 0;

    // 1. Fish held in Hand (Hotbar 2-5)
    for (let i = 0; i < 4; i++) {
      const f = this.player.heldFishData[i];
      if (f) {
        this.selectedSellHeld.add(i);
        total += f.calculatedPrice;
        html += `
          <div class="shop-item-card" style="display:flex;justify-content:space-between;align-items:center">
            <label style="display:flex;align-items:center;gap:10px;cursor:pointer">
              <input type="checkbox" checked class="chk-sell-held" data-idx="${i}" />
              <span><b>✋ [في اليد] ${f.nameAr}</b> (${f.weight} كجم)</span>
            </label>
            <span style="color:#2ecc71;font-weight:800">${f.calculatedPrice} دينار</span>
          </div>
        `;
      }
    }

    // 2. Fish stored in Cooler
    this.coolerStoredFish.forEach((f, cIdx) => {
      this.selectedSellCooler.add(cIdx);
      total += f.calculatedPrice;
      html += `
        <div class="shop-item-card" style="display:flex;justify-content:space-between;align-items:center;background:rgba(0,210,255,0.08)">
          <label style="display:flex;align-items:center;gap:10px;cursor:pointer">
            <input type="checkbox" checked class="chk-sell-cooler" data-cidx="${cIdx}" />
            <span><b>🧊 [في الثلاجة] ${f.nameAr}</b> (${f.weight} كجم)</span>
          </label>
          <span style="color:#2ecc71;font-weight:800">${f.calculatedPrice} دينار</span>
        </div>
      `;
    });

    container.innerHTML = html || '<p style="color:#aaa;text-align:center">لا توجد أسماك في يدك أو بالثلاجة حالياً!</p>';
    if (totalEl) totalEl.innerText = total;

    const updateTotal = () => {
      let newTotal = 0;
      this.selectedSellHeld.forEach(fi => {
        if (this.player.heldFishData[fi]) newTotal += this.player.heldFishData[fi].calculatedPrice;
      });
      this.selectedSellCooler.forEach(ci => {
        if (this.coolerStoredFish[ci]) newTotal += this.coolerStoredFish[ci].calculatedPrice;
      });
      if (totalEl) totalEl.innerText = newTotal;
    };

    container.querySelectorAll('.chk-sell-held').forEach(chk => {
      chk.addEventListener('change', (e) => {
        const idx = parseInt(e.target.dataset.idx);
        if (e.target.checked) this.selectedSellHeld.add(idx);
        else this.selectedSellHeld.delete(idx);
        updateTotal();
      });
    });

    container.querySelectorAll('.chk-sell-cooler').forEach(chk => {
      chk.addEventListener('change', (e) => {
        const cidx = parseInt(e.target.dataset.cidx);
        if (e.target.checked) this.selectedSellCooler.add(cidx);
        else this.selectedSellCooler.delete(cidx);
        updateTotal();
      });
    });
  }

  confirmVendorSell() {
    let earned = 0;
    let count = 0;

    // Sell selected Held fish
    this.selectedSellHeld.forEach(idx => {
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

    // Sell selected Cooler fish
    const remainingCoolerFish = [];
    this.coolerStoredFish.forEach((f, cIdx) => {
      if (this.selectedSellCooler.has(cIdx)) {
        earned += f.calculatedPrice;
        count++;
      } else {
        remainingCoolerFish.push(f);
      }
    });
    this.coolerStoredFish = remainingCoolerFish;

    document.getElementById('vendor-sell-modal').classList.add('hidden');
    if (this.gameState === 'ROAMING') this.player.requestLock(this.container);

    if (count > 0) {
      this.coins += earned;
      this.catchesCount += count;
      this.updateHUD();
      if (sounds.playSellSound) sounds.playSellSound();
      this.triggerConfetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
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
    if (!container) return;
    container.innerHTML = '';

    BAHRAINI_FISHES.forEach((f, idx) => {
      const d = this.inventory[f.id];
      const isUnlocked = !!d || (this.unlockedFishSet && this.unlockedFishSet.has(f.id));

      const card = document.createElement('div');
      card.className = `fishdex-card ${isUnlocked ? '' : 'fish-locked'}`;

      const iconBox = document.createElement('div');
      iconBox.className = 'fishdex-preview-canvas';
      iconBox.style.display = 'flex';
      iconBox.style.alignItems = 'center';
      iconBox.style.justifyContent = 'center';
      iconBox.style.fontSize = '3.2rem';
      iconBox.style.background = isUnlocked ? `radial-gradient(circle, #${f.color.toString(16).padStart(6, '0')}44 0%, rgba(0,0,0,0.6) 80%)` : 'rgba(0,210,255,0.1)';

      if (isUnlocked) {
        iconBox.innerHTML = '🐟';
      } else {
        iconBox.innerHTML = '❓';
      }
      card.appendChild(iconBox);

      const textContainer = document.createElement('div');
      if (isUnlocked) {
        textContainer.innerHTML = `
          <h4 style="color:#00d2ff;margin-bottom:2px;font-weight:900">${f.nameAr}</h4>
          <small style="color:#aaa">${f.nameEn}</small>
          <div style="margin-top:6px;font-size:0.8rem;color:#2ecc71;font-weight:700">✅ ${d ? d.count : 1} صيد | أضخم: ${d ? d.maxWeight : f.minWeight} كجم</div>
          <p style="font-size:0.75rem;color:#ddd;margin-top:4px">${f.description}</p>
        `;
      } else {
        textContainer.innerHTML = `
          <h4 style="color:#a0aec0;margin-bottom:2px">❓ ??? (غير مكتشف)</h4>
          <small style="color:#718096">Mystery Bahraini Fish</small>
          <div style="margin-top:6px;font-size:0.8rem;color:#3182ce;font-weight:700">💙 اصطد السمكة في البحر لإلغاء القفل!</div>
        `;
      }
      card.appendChild(textContainer);
      container.appendChild(card);
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

  confirmTradeSend() {
    const selectEl = document.getElementById('trade-player-select');
    const targetPeerId = selectEl ? selectEl.value : null;
    if (!targetPeerId) {
      this.toast('⚠️ لا يوجد صياد آخر أونلاين لمشاطرته المبادلة!');
      return;
    }

    let fishIndex = -1;
    for (let i = 0; i < 4; i++) {
      if (this.player.heldFishData[i]) {
        fishIndex = i;
        break;
      }
    }

    if (fishIndex === -1) {
      this.toast('⚠️ لا توجد أسماك في يدك لإهدائها!');
      return;
    }

    const fishData = this.player.heldFishData[fishIndex];
    this.player.heldFishData[fishIndex] = null;
    if (this.player.activeSlot === fishIndex + 2) {
      this.player.activeSlot = 1;
    }
    this.player.updateHotbarIcons();

    if (this.multiplayer) {
      this.multiplayer.broadcastMessage('manama3d/rooms/trade', {
        type: 'TRADE_OFFER',
        senderName: this.multiplayer.playerName,
        senderPeerId: this.multiplayer.peerId,
        targetPeerId: targetPeerId,
        fish: fishData
      });
    }

    document.getElementById('trade-modal').classList.add('hidden');
    if (this.gameState === 'ROAMING') this.player.requestLock(this.container);
    this.toast(`🤝 تم إرسال السمكة [${fishData.nameAr}] كهدية للصياد!`);
  }

  receiveTradeOffer(data) {
    this.pendingTradeData = data;
    const modal = document.getElementById('trade-incoming-modal');
    const textEl = document.getElementById('trade-incoming-text');
    const detailsEl = document.getElementById('trade-incoming-details');

    if (textEl) textEl.innerText = `🤝 أرسل لك الصياد [${data.senderName}] سمكة كهدية!`;
    if (detailsEl) detailsEl.innerText = `🐟 ${data.fish.nameAr} (${data.fish.weight} كجم - بقيمة ${data.fish.calculatedPrice} دينار)`;

    if (modal) {
      this.player.unlockPointer();
      modal.classList.remove('hidden');
    }
  }

  acceptIncomingTrade() {
    const modal = document.getElementById('trade-incoming-modal');
    if (modal) modal.classList.add('hidden');

    if (!this.pendingTradeData || !this.pendingTradeData.fish) return;
    const fish = this.pendingTradeData.fish;

    // 1. Check Hand Inventory (slots 0-3)
    let addedToHand = false;
    for (let i = 0; i < 4; i++) {
      if (!this.player.heldFishData[i]) {
        this.player.heldFishData[i] = fish;
        addedToHand = true;
        this.player.updateHotbarIcons();
        this.toast(`🎁 استلمت سمكة [${fish.nameAr}] وحُفظت في الانفنتوري!`);
        break;
      }
    }

    if (!addedToHand) {
      // 2. Check Cooler Storage
      if (this.player.coolerStoredFish.length < this.player.coolerCapacity) {
        this.player.coolerStoredFish.push(fish);
        this.updateHUD();
        this.toast(`🧊 الانفنتوري ممتلئ! تم إيداع سمكة [${fish.nameAr}] في ثلاجتك تلقائياً!`);
      } else {
        // 3. Both full -> Auto-sell to Abu Yacoub!
        const earned = fish.calculatedPrice || 10;
        this.coins += earned;
        this.updateHUD();
        if (sounds.playSellSound) sounds.playSellSound();
        this.triggerConfetti({ particleCount: 80, spread: 60, origin: { y: 0.6 } });
        this.toast(`💰 الانفنتوري والثلاجة ممتلئتان! تم بيع [${fish.nameAr}] تلقائياً لـ بويعقوب وإضافة ${earned} دينار لحسابك!`);
      }
    }

    this.pendingTradeData = null;
    if (this.gameState === 'ROAMING') this.player.requestLock(this.container);
  }

  declineIncomingTrade() {
    const modal = document.getElementById('trade-incoming-modal');
    if (modal) modal.classList.add('hidden');
    this.pendingTradeData = null;
    if (this.gameState === 'ROAMING') this.player.requestLock(this.container);
    this.toast('✕ تم رفض طلب الهدية/المبادلة.');
  }

  confirmPvPChallengeSend() {
    const selectEl = document.getElementById('challenge-player-select');
    const targetPeerId = selectEl ? selectEl.value : null;
    if (!targetPeerId) {
      this.toast('⚠️ لا يوجد صياد آخر محدد للتحدي!');
      return;
    }

    if (this.coins < 100) {
      this.toast('⚠️ تحتاج إلى 100 دينار على الأقل لدخول رهان التحدي!');
      return;
    }

    if (this.multiplayer) {
      this.multiplayer.broadcastMessage('manama3d/rooms/pvp', {
        type: 'PVP_OFFER',
        senderName: this.multiplayer.playerName,
        senderPeerId: this.multiplayer.peerId,
        targetPeerId: targetPeerId,
        wager: 100
      });
    }

    document.getElementById('challenge-modal').classList.add('hidden');
    if (this.gameState === 'ROAMING') this.player.requestLock(this.container);
    this.toast('⚔️ تم إرسال تحدي الـ 100 دينار للصياد!');
  }

  receivePvPOffer(data) {
    this.pendingPvPData = data;
    const modal = document.getElementById('challenge-incoming-modal');
    const textEl = document.getElementById('challenge-incoming-text');

    if (textEl) textEl.innerText = `⚔️ يتحداك الصياد [${data.senderName}] في مسابقة صيد 60 ثانية برهان 100 دينار!`;

    if (modal) {
      this.player.unlockPointer();
      modal.classList.remove('hidden');
    }
  }

  acceptIncomingPvP() {
    const modal = document.getElementById('challenge-incoming-modal');
    if (modal) modal.classList.add('hidden');

    if (!this.pendingPvPData) return;

    if (this.coins < 100) {
      this.toast('⚠️ ليس لديك 100 دينار لدخول رهان التحدي!');
      return;
    }

    // Deduct 100 wager
    this.coins -= 100;
    this.updateHUD();

    if (this.multiplayer) {
      this.multiplayer.broadcastMessage('manama3d/rooms/pvp', {
        type: 'PVP_ACCEPT',
        senderPeerId: this.multiplayer.peerId,
        targetPeerId: this.pendingPvPData.senderPeerId,
        acceptorName: this.multiplayer.playerName
      });
    }

    const oppName = this.pendingPvPData.senderName;
    this.pendingPvPData = null;
    this.start1v1Challenge(oppName);
  }

  declineIncomingPvP() {
    const modal = document.getElementById('challenge-incoming-modal');
    if (modal) modal.classList.add('hidden');
    this.pendingPvPData = null;
    if (this.gameState === 'ROAMING') this.player.requestLock(this.container);
    this.toast('✕ تم رفض دعوة التحدي.');
  }

  receivePvPAccept(data) {
    if (this.coins >= 100) {
      this.coins -= 100;
      this.updateHUD();
      this.start1v1Challenge(data.acceptorName);
    }
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
    this.toast(`⚔️ بدأ تحدي الصيد 1v1 برهان (200 دينار) ضد [${targetName}]!`);

    clearInterval(this._challengeInterval);
    this._challengeInterval = setInterval(() => {
      this.challengeTimer--;
      document.getElementById('challenge-time-left').innerText = `${this.challengeTimer} ثانية`;

      if (Math.random() < 0.2) {
        this.oppChallengeScore++;
        document.getElementById('opp-challenge-score').innerText = this.oppChallengeScore;
      }

      if (this.challengeTimer <= 0) {
        clearInterval(this._challengeInterval);
        this.isChallengeActive = false;
        hud.classList.add('hidden');

        if (this.myChallengeScore > this.oppChallengeScore) {
          const reward = 200; // Full 200 Coin pot!
          this.coins += reward;
          this.updateHUD();
          if (sounds.playVictorySound) sounds.playVictorySound();
          this.triggerConfetti({ particleCount: 180, spread: 100, origin: { y: 0.5 } });
          this.toast(`🏆 مبروك! فزت بالتحدي على [${targetName}] (${this.myChallengeScore} مقابل ${this.oppChallengeScore}) وربحت 200 دينار كاملة!`);
        } else if (this.myChallengeScore < this.oppChallengeScore) {
          this.toast(`💔 خسرت التحدي أمام [${targetName}] (${this.myChallengeScore} مقابل ${this.oppChallengeScore}) وخسرت الرهان!`);
        } else {
          this.coins += 100; // Refund wager
          this.updateHUD();
          this.toast(`🤝 تعادل في مسابقة الصيد ضد [${targetName}] وتم استرجاع الـ 100 دينار!`);
        }
      }
    }, 1000);
  }
}

window.addEventListener('DOMContentLoaded', () => new GameController());
