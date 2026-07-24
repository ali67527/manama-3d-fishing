import * as THREE from 'three';
import { sounds } from './audio.js';
import { create3DFishMesh } from './fishData.js';

export class PlayerAndRodManager {
  constructor(camera, scene) {
    this.camera = camera;
    this.scene = scene;

    this.scene.add(this.camera);

    this.moveForward = false;
    this.moveBackward = false;
    this.moveLeft = false;
    this.moveRight = false;
    this.isSprinting = false;

    this.velocityY = 0;
    this.isGrounded = true;
    this.gravity = -20;
    this.jumpForce = 7;

    this.pitch = 0;
    this.yaw = 0;
    this.isPointerLocked = false;

    this.activeSlot = 1; // 1=Rod, 2-5=Fish slots
    this.heldFishData = [null, null, null, null];
    this.equippedRodStyle = 'basic';

    this.cameraMode = '1ST';
    this.position = new THREE.Vector3(0, 5.0, 35);
    this.camera.position.copy(this.position);

    this.rodGroup = null;
    this.heldFishMesh = null;
    this.rodTipMarker = null;

    this.bobberMesh = null;
    this.lineMesh = null;
    this.isCasted = false;
    this.bobberPos = new THREE.Vector3();
    this.castAnim = null;

    this.setupControls();
    this.buildRod();
    this.buildBobberAndLine();
    this.setActiveSlot(1);
  }

  setupControls() {
    window.addEventListener('keydown', (e) => {
      switch (e.code) {
        case 'KeyW': case 'ArrowUp':    this.moveForward = true; break;
        case 'KeyS': case 'ArrowDown':  this.moveBackward = true; break;
        case 'KeyA': case 'ArrowLeft':  this.moveLeft = true; break;
        case 'KeyD': case 'ArrowRight': this.moveRight = true; break;
        case 'ShiftLeft': case 'ShiftRight': this.isSprinting = true; break;
        case 'KeyV': this.toggleCameraMode(); break;
        case 'Space':
          if (this.isGrounded) {
            this.velocityY = this.jumpForce;
            this.isGrounded = false;
            if (sounds.playJumpSound) sounds.playJumpSound();
          }
          break;
      }
    });

    window.addEventListener('keyup', (e) => {
      switch (e.code) {
        case 'KeyW': case 'ArrowUp':    this.moveForward = false; break;
        case 'KeyS': case 'ArrowDown':  this.moveBackward = false; break;
        case 'KeyA': case 'ArrowLeft':  this.moveLeft = false; break;
        case 'KeyD': case 'ArrowRight': this.moveRight = false; break;
        case 'ShiftLeft': case 'ShiftRight': this.isSprinting = false; break;
      }
    });

    window.addEventListener('wheel', (e) => {
      if (!this.isPointerLocked) return;
      if (e.deltaY > 0) {
        let next = this.activeSlot + 1;
        if (next > 5) next = 1;
        if (window.gameController) window.gameController.setHotbar(next);
      } else if (e.deltaY < 0) {
        let prev = this.activeSlot - 1;
        if (prev < 1) prev = 5;
        if (window.gameController) window.gameController.setHotbar(prev);
      }
    });

    window.addEventListener('mousemove', (e) => {
      if (!this.isPointerLocked) return;
      this.yaw -= e.movementX * 0.002;
      this.pitch -= e.movementY * 0.002;
      this.pitch = Math.max(-1.2, Math.min(1.2, this.pitch));
      this.camera.quaternion.setFromEuler(new THREE.Euler(this.pitch, this.yaw, 0, 'YXZ'));
    });

    this.setupMobileTouchControls();
  }

  setupMobileTouchControls() {
    let touchStartX = 0, touchStartY = 0;

    // Mobile Touch Drag for Camera Rotation
    window.addEventListener('touchstart', (e) => {
      if (e.target.closest('#mobile-controls') || e.target.closest('.glass-card') || e.target.closest('.fullscreen-overlay')) return;
      if (e.touches.length > 0) {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
      }
    }, { passive: true });

    window.addEventListener('touchmove', (e) => {
      if (e.target.closest('#mobile-controls') || e.target.closest('.glass-card') || e.target.closest('.fullscreen-overlay')) return;
      if (e.touches.length > 0) {
        const deltaX = e.touches[0].clientX - touchStartX;
        const deltaY = e.touches[0].clientY - touchStartY;
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;

        this.yaw -= deltaX * 0.005;
        this.pitch -= deltaY * 0.005;
        this.pitch = Math.max(-1.2, Math.min(1.2, this.pitch));
        this.camera.quaternion.setFromEuler(new THREE.Euler(this.pitch, this.yaw, 0, 'YXZ'));
      }
    }, { passive: true });

    // Touch Joystick for WASD Walking
    const jZone = document.getElementById('joystick-zone');
    const jKnob = document.getElementById('joystick-knob');
    if (jZone && jKnob) {
      let jActive = false;
      let jCenterX = 0, jCenterY = 0;

      const resetJoystick = () => {
        jActive = false;
        jKnob.style.transform = `translate(0px, 0px)`;
        this.moveForward = false;
        this.moveBackward = false;
        this.moveLeft = false;
        this.moveRight = false;
      };

      jZone.addEventListener('touchstart', (e) => {
        jActive = true;
        const rect = jZone.getBoundingClientRect();
        jCenterX = rect.left + rect.width / 2;
        jCenterY = rect.top + rect.height / 2;
      }, { passive: true });

      jZone.addEventListener('touchmove', (e) => {
        if (!jActive || e.touches.length === 0) return;
        const touch = e.touches[0];
        let dx = touch.clientX - jCenterX;
        let dy = touch.clientY - jCenterY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const maxR = 40;

        if (dist > maxR) {
          dx = (dx / dist) * maxR;
          dy = (dy / dist) * maxR;
        }

        jKnob.style.transform = `translate(${dx}px, ${dy}px)`;

        this.moveForward = dy < -10;
        this.moveBackward = dy > 10;
        this.moveLeft = dx < -10;
        this.moveRight = dx > 10;
      }, { passive: true });

      jZone.addEventListener('touchend', resetJoystick, { passive: true });
      jZone.addEventListener('touchcancel', resetJoystick, { passive: true });
    }

    // Touch Action Buttons
    const btnJump = document.getElementById('mobile-btn-jump');
    if (btnJump) {
      btnJump.addEventListener('touchstart', (e) => {
        e.preventDefault();
        if (this.isGrounded) {
          this.velocityY = this.jumpForce;
          this.isGrounded = false;
          if (sounds.playJumpSound) sounds.playJumpSound();
        }
      });
    }

    const btnInteract = document.getElementById('mobile-btn-interact');
    if (btnInteract) {
      btnInteract.addEventListener('touchstart', (e) => {
        e.preventDefault();
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'e', code: 'KeyE' }));
      });
    }
  }

  requestLock(el) {
    try {
      if (el && el.requestPointerLock && !('ontouchstart' in window)) {
        el.requestPointerLock();
      }
    } catch (e) {}
    this.isPointerLocked = true;
  }

  unlockPointer() {
    try {
      if (document.pointerLockElement) document.exitPointerLock();
    } catch (e) {}
    this.isPointerLocked = false;
  }

  setActiveSlot(num) {
    this.activeSlot = num;

    if (this.rodGroup) this.rodGroup.visible = false;
    if (this.heldFishMesh) {
      this.camera.remove(this.heldFishMesh);
      this.heldFishMesh = null;
    }

    if (num === 1) {
      if (this.rodGroup) this.rodGroup.visible = true;
    } else {
      const fishData = this.heldFishData[num - 2];
      if (fishData) {
        this.heldFishMesh = create3DFishMesh(fishData);
        this.heldFishMesh.scale.set(0.3, 0.3, 0.3);
        this.heldFishMesh.position.set(0.3, -0.35, -0.95);
        this.heldFishMesh.rotation.set(0, Math.PI / 4, Math.PI / 8);
        this.camera.add(this.heldFishMesh);
      }
    }
  }

  setRodStyle(style) {
    this.equippedRodStyle = style;
    this.buildRod();
  }

  buildRod() {
    if (this.rodGroup) this.camera.remove(this.rodGroup);

    this.rodGroup = new THREE.Group();

    let mainColor = 0x1e272e; // Dark Carbon Fiber
    let accentColor = 0x00d2ff;

    if (this.equippedRodStyle === 'neon') {
      mainColor = 0x00d2ff;
      accentColor = 0x9b59b6;
    } else if (this.equippedRodStyle === 'gold') {
      mainColor = 0xffd700;
      accentColor = 0xff8c00;
    } else if (this.equippedRodStyle === 'dragon') {
      mainColor = 0xd63031;
      accentColor = 0xfdc830;
    }

    // Ergonomic EVA Foam Handle
    const handleGeo = new THREE.CylinderGeometry(0.035, 0.04, 0.45, 16);
    const handleMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 });
    const handle = new THREE.Mesh(handleGeo, handleMat);
    handle.position.set(0, 0, 0);
    this.rodGroup.add(handle);

    // Chrome Metallic Reel Seat
    const metalMat = new THREE.MeshStandardMaterial({ color: accentColor, metalness: 0.9, roughness: 0.1 });
    const reelSeat = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.14, 16), metalMat);
    reelSeat.position.set(0, 0.16, 0);
    this.rodGroup.add(reelSeat);

    // Spinning Reel with Spool and Crank Handle
    const reelGroup = new THREE.Group();
    reelGroup.position.set(0, 0.16, -0.06);
    const spool = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.07, 16), metalMat);
    spool.rotation.x = Math.PI / 2;
    const handleArm = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.08, 0.015), metalMat);
    handleArm.position.set(0.04, 0, 0);
    const handleKnob = new THREE.Mesh(new THREE.SphereGeometry(0.022), handleMat);
    handleKnob.position.set(0.04, 0.04, 0);
    reelGroup.add(spool, handleArm, handleKnob);
    this.rodGroup.add(reelGroup);

    // Tapered Carbon Fiber Shaft
    const shaftGeo = new THREE.CylinderGeometry(0.007, 0.032, 1.9, 16);
    const shaftMat = new THREE.MeshStandardMaterial({
      color: mainColor,
      roughness: 0.2,
      metalness: 0.4
    });
    const shaft = new THREE.Mesh(shaftGeo, shaftMat);
    shaft.position.set(0, 1.15, 0);
    this.rodGroup.add(shaft);

    // Stainless Steel Line Guide Rings along Shaft
    for (let i = 1; i <= 5; i++) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.024 - i * 0.003, 0.004, 8, 16), metalMat);
      ring.position.set(0, 0.35 + i * 0.32, -0.02);
      this.rodGroup.add(ring);
    }

    this.rodTipMarker = new THREE.Object3D();
    this.rodTipMarker.position.set(0, 2.1, 0);
    this.rodGroup.add(this.rodTipMarker);

    this.rodGroup.position.set(0.32, -0.38, -0.55);
    this.rodGroup.rotation.set(-1.1, 0.2, -0.15);

    this.camera.add(this.rodGroup);
  }

  buildBobberAndLine() {
    const bobberGeo = new THREE.SphereGeometry(0.18, 16, 16);
    const bobberMat = new THREE.MeshStandardMaterial({ color: 0xff3333, roughness: 0.3 });
    this.bobberMesh = new THREE.Mesh(bobberGeo, bobberMat);
    const topCap = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.15), new THREE.MeshStandardMaterial({ color: 0xffffff }));
    topCap.position.y = 0.12;
    this.bobberMesh.add(topCap);
    this.bobberMesh.visible = false;
    this.scene.add(this.bobberMesh);

    const lineGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(30 * 3);
    lineGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const lineMat = new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 2, transparent: true, opacity: 0.85 });
    this.lineMesh = new THREE.Line(lineGeo, lineMat);
    this.lineMesh.frustumCulled = false;
    this.scene.add(this.lineMesh);
  }

  castLine(distance = 25) {
    const camDir = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);

    if (camDir.z < 0.15) return false;

    this.isCasted = true;
    this.bobberMesh.visible = true;

    const startPos = new THREE.Vector3();
    this.rodTipMarker.getWorldPosition(startPos);

    const targetPos = new THREE.Vector3().copy(this.camera.position).addScaledVector(camDir, distance);
    targetPos.y = 0.15;

    this.bobberPos.copy(targetPos);

    this.castAnim = {
      startPos: startPos.clone(),
      endPos: targetPos.clone(),
      progress: 0,
      duration: 0.7
    };

    return true;
  }

  retrieveLine() {
    this.isCasted = false;
    this.bobberMesh.visible = false;
    this.castAnim = null;
    if (this.lineMesh) this.lineMesh.geometry.setDrawRange(0, 0);
  }

  getFloorHeight(pos) {
    if (pos.z > 0 && pos.x >= -11 && pos.x <= 11) return 5.0;
    if (pos.z <= 0 && pos.x >= -180 && pos.x <= 180) return 5.7;
    return 5.0;
  }

  update(delta, tension = 0) {
    if (!this.isPointerLocked) return;

    // Limit delta to 0.05 max to prevent lag spikes or drop frames
    const clampedDelta = Math.min(delta, 0.05);

    const isMoving = this.moveForward || this.moveBackward || this.moveLeft || this.moveRight;
    if (isMoving && this.isGrounded && sounds.playFootstep) sounds.playFootstep();

    const speed = (this.isSprinting ? 10 : 5.5) * clampedDelta;
    
    // Direction vectors derived from yaw
    const fwd = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw)).normalize();
    const right = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw)).normalize();

    if (!this.position) this.position = this.camera.position.clone();

    if (this.moveForward) this.position.addScaledVector(fwd, speed);
    if (this.moveBackward) this.position.addScaledVector(fwd, -speed);
    if (this.moveLeft) this.position.addScaledVector(right, -speed);
    if (this.moveRight) this.position.addScaledVector(right, speed);

    this.velocityY += this.gravity * clampedDelta;
    this.position.y += this.velocityY * clampedDelta;

    const floorY = this.getFloorHeight(this.position);
    if (this.position.y <= floorY) {
      this.position.y = floorY;
      if (this.velocityY < -2 && sounds.playLandSound) sounds.playLandSound();
      this.velocityY = 0;
      this.isGrounded = true;
    }

    const p = this.position;
    if (p.z > 0) {
      p.x = THREE.MathUtils.clamp(p.x, -9.5, 9.5);
      p.z = THREE.MathUtils.clamp(p.z, 0, 64);
    } else {
      p.x = THREE.MathUtils.clamp(p.x, -180, 180);
      p.z = THREE.MathUtils.clamp(p.z, -21, 0);
    }

    // Camera Mode positioning
    if (this.cameraMode === '3RD') {
      if (!this.playerAvatarMesh) this.buildPlayerAvatarMesh();
      if (this.playerAvatarMesh) {
        this.playerAvatarMesh.position.set(p.x, p.y - 1.6, p.z);
        this.playerAvatarMesh.rotation.y = this.yaw + Math.PI;
        this.playerAvatarMesh.visible = true;
      }
      if (this.rodGroup) this.rodGroup.visible = false;

      // 3rd Person Follow Camera offset
      const dist = 3.8;
      const camX = p.x + Math.sin(this.yaw) * dist;
      const camZ = p.z + Math.cos(this.yaw) * dist;
      const camY = p.y + 1.4 + Math.sin(this.pitch) * 1.5;

      this.camera.position.set(camX, Math.max(camY, floorY + 0.5), camZ);
      this.camera.lookAt(p.x, p.y + 0.3, p.z);
    } else {
      // 1st Person Camera
      if (this.playerAvatarMesh) this.playerAvatarMesh.visible = false;
      if (this.rodGroup) this.rodGroup.visible = (this.activeSlot === 1);

      this.camera.position.copy(p);
      this.camera.quaternion.setFromEuler(new THREE.Euler(this.pitch, this.yaw, 0, 'YXZ'));
    }

    if (this.rodGroup && this.rodGroup.visible) {
      this.rodGroup.rotation.x = -1.1 - (tension * 0.003);
    }

    if (this.castAnim) {
      this.castAnim.progress += clampedDelta / this.castAnim.duration;
      if (this.castAnim.progress >= 1) {
        this.castAnim.progress = 1;
        this.bobberMesh.position.copy(this.castAnim.endPos);
        this.castAnim = null;
      } else {
        const t = this.castAnim.progress;
        const sp = this.castAnim.startPos;
        const ep = this.castAnim.endPos;
        const x = sp.x + (ep.x - sp.x) * t;
        const z = sp.z + (ep.z - sp.z) * t;
        const peakHeight = Math.max(sp.y, ep.y) + 6;
        const y = sp.y + (ep.y - sp.y) * t + peakHeight * 4 * t * (1 - t) - sp.y * 4 * t * (1 - t);
        this.bobberMesh.position.set(x, Math.max(y, ep.y), z);
      }
    }

    if (this.isCasted && !this.castAnim) {
      this.bobberPos.y = Math.sin(Date.now() * 0.003) * 0.12 + 0.15;
      this.bobberMesh.position.y = this.bobberPos.y;
    }

    if (this.isCasted && this.lineMesh && this.rodTipMarker) {
      const tipPos = new THREE.Vector3();
      this.rodTipMarker.getWorldPosition(tipPos);
      const bobPos = this.bobberMesh.position;

      const attr = this.lineMesh.geometry.attributes.position;
      const segments = 30;
      for (let i = 0; i < segments; i++) {
        const t = i / (segments - 1);
        const x = tipPos.x + (bobPos.x - tipPos.x) * t;
        const z = tipPos.z + (bobPos.z - tipPos.z) * t;
        const sag = -Math.sin(t * Math.PI) * 0.5 * (1 - Math.abs(t - 0.5) * 2);
        const y = tipPos.y + (bobPos.y - tipPos.y) * t + sag;
        attr.setXYZ(i, x, y, z);
      }
      attr.needsUpdate = true;
      this.lineMesh.geometry.setDrawRange(0, segments);
    }
  }

  toggleCameraMode() {
    if (!this.cameraMode) this.cameraMode = '1ST';
    this.cameraMode = (this.cameraMode === '3RD') ? '1ST' : '3RD';

    if (!this.playerAvatarMesh) this.buildPlayerAvatarMesh();

    if (this.cameraMode === '3RD') {
      // Move camera back for 3rd person view
      this.playerAvatarMesh.visible = true;
      if (this.rodGroup) this.rodGroup.visible = false;
      this._savedCamOffset = true;
    } else {
      // Restore 1st person
      this.playerAvatarMesh.visible = false;
      if (this.rodGroup) this.rodGroup.visible = (this.activeSlot === 1);
      this._savedCamOffset = false;
    }
  }

  buildPlayerAvatarMesh(thobeColorHex = 0xffffff, headwearType = 'ghutra', outfitStyle = 'thobe') {
    if (this.playerAvatarMesh) {
      this.scene.remove(this.playerAvatarMesh);
      this.playerAvatarMesh = null;
    }

    this.currentAvatarOutfit = { thobeColorHex, headwearType, outfitStyle };
    this.playerAvatarMesh = new THREE.Group();

    // Body Outfit
    const bodyMat = new THREE.MeshStandardMaterial({ color: thobeColorHex, roughness: 0.4 });
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.28, 1.8, 16), bodyMat);
    body.position.y = 0.9;
    body.name = 'thobe';

    // Bisht Golden Trim if Bisht selected
    if (outfitStyle === 'bisht') {
      const goldMat = new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.8 });
      const trimL = new THREE.Mesh(new THREE.BoxGeometry(0.04, 1.7, 0.04), goldMat);
      trimL.position.set(-0.15, 0.9, 0.28);
      const trimR = new THREE.Mesh(new THREE.BoxGeometry(0.04, 1.7, 0.04), goldMat);
      trimR.position.set(0.15, 0.9, 0.28);
      this.playerAvatarMesh.add(trimL, trimR);
    }

    // Head
    const headMat = new THREE.MeshStandardMaterial({ color: 0xd2b48c, roughness: 0.6 });
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.28, 16, 16), headMat);
    head.position.y = 2.0;

    // Prominent 3D Face Features facing forward (+Z)
    const faceGroup = new THREE.Group();

    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const pupilMat = new THREE.MeshBasicMaterial({ color: 0x0f172a });

    const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.045, 12, 12), eyeMat);
    eyeL.position.set(-0.09, 2.05, 0.25);
    const pupilL = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 8), pupilMat);
    pupilL.position.set(-0.09, 2.05, 0.29);

    const eyeR = new THREE.Mesh(new THREE.SphereGeometry(0.045, 12, 12), eyeMat);
    eyeR.position.set(0.09, 2.05, 0.25);
    const pupilR = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 8), pupilMat);
    pupilR.position.set(0.09, 2.05, 0.29);

    const browMat = new THREE.MeshBasicMaterial({ color: 0x111111 });
    const browL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.015, 0.02), browMat);
    browL.position.set(-0.09, 2.12, 0.27);
    browL.rotation.z = 0.05;
    const browR = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.015, 0.02), browMat);
    browR.position.set(0.09, 2.12, 0.27);
    browR.rotation.z = -0.05;

    const noseMat = new THREE.MeshStandardMaterial({ color: 0xc8a27a });
    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.09, 8), noseMat);
    nose.rotation.x = -Math.PI / 6;
    nose.position.set(0, 2.0, 0.28);

    const mouthMat = new THREE.MeshBasicMaterial({ color: 0x7f1d1d });
    const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.02, 0.03), mouthMat);
    mouth.position.set(0, 1.91, 0.26);

    const stacheMat = new THREE.MeshBasicMaterial({ color: 0x111111 });
    const stache = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.03, 0.035), stacheMat);
    stache.position.set(0, 1.95, 0.27);

    faceGroup.add(eyeL, pupilL, eyeR, pupilR, browL, browR, nose, mouth, stache);

    // Headwear Options
    const headwearGroup = new THREE.Group();
    headwearGroup.name = 'headwear-group';

    if (headwearType === 'ghutra') {
      const ghutraMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 });
      const ghutra = new THREE.Mesh(new THREE.ConeGeometry(0.34, 0.45, 14), ghutraMat);
      ghutra.position.set(0, 2.3, 0);

      const agalMat = new THREE.MeshBasicMaterial({ color: 0x111111 });
      const agal = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.045, 8, 16), agalMat);
      agal.rotation.x = Math.PI / 2;
      agal.position.set(0, 2.22, 0);

      headwearGroup.add(ghutra, agal);
    } else if (headwearType === 'hair-curly') {
      const hairMat = new THREE.MeshStandardMaterial({ color: 0x221810, roughness: 0.9 });
      for (let i = 0; i < 7; i++) {
        const puff = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 8), hairMat);
        const angle = (i / 7) * Math.PI * 2;
        puff.position.set(Math.cos(angle) * 0.18, 2.15 + (i % 2) * 0.05, Math.sin(angle) * 0.18);
        headwearGroup.add(puff);
      }
      const topPuff = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 8), hairMat);
      topPuff.position.set(0, 2.25, 0);
      headwearGroup.add(topPuff);
    } else if (headwearType === 'cap') {
      const capMat = new THREE.MeshStandardMaterial({ color: 0x1e272e, roughness: 0.5 });
      const capDome = new THREE.Mesh(new THREE.SphereGeometry(0.29, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2), capMat);
      capDome.position.set(0, 2.05, 0);
      const visor = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.02, 0.22), capMat);
      visor.position.set(0, 2.08, 0.28);
      headwearGroup.add(capDome, visor);
    } else if (headwearType === 'hair-short') {
      const hairMat = new THREE.MeshStandardMaterial({ color: 0x1c1917, roughness: 0.8 });
      const hairCap = new THREE.Mesh(new THREE.SphereGeometry(0.29, 16, 12, 0, Math.PI * 2, 0, Math.PI / 1.8), hairMat);
      hairCap.position.set(0, 2.05, 0);
      headwearGroup.add(hairCap);
    }

    // 3D Fishing Rod attached to Avatar's Right Hand for 3rd Person View!
    const avatarRodGroup = new THREE.Group();
    avatarRodGroup.name = 'avatar-rod';
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.03, 3.2), new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.8 }));
    shaft.position.set(0, 1.6, 0);
    const reel = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.08), new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.9 }));
    reel.rotation.x = Math.PI / 2;
    reel.position.set(0, 0.35, -0.05);
    avatarRodGroup.add(shaft, reel);
    avatarRodGroup.position.set(0.35, 1.0, 0.3);
    avatarRodGroup.rotation.x = Math.PI / 3.5;

    this.playerAvatarMesh.add(body, head, faceGroup, headwearGroup, avatarRodGroup);
    this.playerAvatarMesh.visible = (this.cameraMode === '3RD');
    this.scene.add(this.playerAvatarMesh);
  }

  updateAvatarStyle(thobeColorHex = 0xffffff, headwearType = 'ghutra', outfitStyle = 'thobe') {
    this.buildPlayerAvatarMesh(thobeColorHex, headwearType, outfitStyle);
  }
}
