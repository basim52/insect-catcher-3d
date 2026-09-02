// Main Game Controller - WebGL Setup, Third-Person Orbit Camera, Input Listeners & Core Game Loop
class Game {
  constructor() {
    this.container = document.getElementById('canvas-container');
    this.canvas = document.getElementById('canvas3d');
    this.clock = new THREE.Clock();

    // Input States
    this.input = {
      forward: false,
      backward: false,
      left: false,
      right: false,
      sprint: false,
      jump: false,
      moveVector: { x: 0, z: 0 }
    };

    // Camera Orbit States
    this.cameraAngleY = 0; // Horizontal Yaw
    this.cameraPitch = 0.25; // Vertical Pitch
    this.cameraDist = 5.2;
    this.targetCameraDist = 5.2;
    this.mouseSensitivity = 0.0028;
    this.isPointerLocked = false;
    this.isDragging = false;
    this.prevMouseX = 0;
    this.prevMouseY = 0;

    this.initThree();
    this.initGameSystems();
    this.initControls();
    this.animate();
  }

  initThree() {
    // 1. Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xa7d8f0);

    // 2. Camera
    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      300
    );

    // 3. Renderer with High-End Visuals
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      powerPreference: "high-performance"
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;

    // Window Resize Handler
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  initGameSystems() {
    // 1. Audio Synthesizer
    this.audio = new AudioSystem();

    // 2. Natural 3D Environment
    this.environment = new Environment(this.scene);

    // 3. 3D Human Safari Hunter Character
    this.character = new Character(this.scene, this.environment, this.audio);

    // 4. Flying Insects Manager
    this.insectManager = new InsectManager(this.scene, this.environment, this.audio);

    // 5. UI and HUD Manager
    this.ui = new UIManager(this.insectManager, this.audio, this.environment);
  }

  initControls() {
    // Keyboard Event Listeners
    window.addEventListener('keydown', (e) => {
      this.handleKey(e.code, true);
    });

    window.addEventListener('keyup', (e) => {
      this.handleKey(e.code, false);
    });

    // Pointer Lock & Mouse Look
    const canvas = this.canvas;
    const instructionsModal = document.getElementById('instructions-modal');
    const btnStart = document.getElementById('btn-start');

    this.startGame = () => {
      if (instructionsModal) {
        instructionsModal.style.opacity = '0';
        instructionsModal.style.pointerEvents = 'none';
        setTimeout(() => {
          instructionsModal.style.display = 'none';
        }, 200);
      }
      try {
        if (this.audio) this.audio.init();
      } catch (err) {
        console.warn('Audio init error:', err);
      }
      try {
        if (canvas && canvas.requestPointerLock) {
          const req = canvas.requestPointerLock();
          if (req && req.catch) {
            req.catch(() => {});
          }
        }
      } catch (err) {
        console.warn('Pointer lock request error:', err);
      }
    };
    window.startGame = () => this.startGame();

    if (btnStart) {
      btnStart.addEventListener('click', () => this.startGame());
      btnStart.addEventListener('touchstart', () => this.startGame(), { passive: true });
    }

    document.addEventListener('pointerlockchange', () => {
      this.isPointerLocked = document.pointerLockElement === canvas;
    });

    // Mouse movement
    window.addEventListener('mousemove', (e) => {
      if (this.isPointerLocked) {
        this.cameraAngleY -= e.movementX * this.mouseSensitivity;
        this.cameraPitch = THREE.MathUtils.clamp(
          this.cameraPitch + e.movementY * this.mouseSensitivity,
          -0.1,
          0.85
        );
      } else if (this.isDragging) {
        const dx = e.clientX - this.prevMouseX;
        const dy = e.clientY - this.prevMouseY;
        this.prevMouseX = e.clientX;
        this.prevMouseY = e.clientY;

        this.cameraAngleY -= dx * this.mouseSensitivity;
        this.cameraPitch = THREE.MathUtils.clamp(
          this.cameraPitch + dy * this.mouseSensitivity,
          -0.1,
          0.85
        );
      }
    });

    // Mouse Drag support if not pointer locked
    canvas.addEventListener('mousedown', (e) => {
      if (e.button === 0) { // Left click
        if (!this.isPointerLocked) {
          this.isDragging = true;
          this.prevMouseX = e.clientX;
          this.prevMouseY = e.clientY;
        }
        // Swing Net!
        this.triggerSwing();
      }
    });

    window.addEventListener('mouseup', (e) => {
      if (e.button === 0) {
        this.isDragging = false;
      }
    });

    // Mouse wheel zoom
    window.addEventListener('wheel', (e) => {
      this.targetCameraDist = THREE.MathUtils.clamp(
        this.targetCameraDist + e.deltaY * 0.003,
        2.8,
        8.5
      );
    });

    // Mobile Touch Controls
    this.initTouchControls();
  }

  initTouchControls() {
    // 1. Virtual Joystick
    const joystickZone = document.getElementById('joystick-zone');
    const joystickStick = document.getElementById('joystick-stick');
    let joystickTouchId = null;
    let joystickCenter = { x: 0, y: 0 };
    const maxRadius = 45;

    if (joystickZone) {
      joystickZone.addEventListener('touchstart', (e) => {
        e.preventDefault();
        const touch = e.changedTouches[0];
        joystickTouchId = touch.identifier;
        const rect = joystickZone.getBoundingClientRect();
        joystickCenter = {
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2
        };
        this.updateJoystick(touch.clientX, touch.clientY, joystickCenter, maxRadius, joystickStick);
      }, { passive: false });

      joystickZone.addEventListener('touchmove', (e) => {
        e.preventDefault();
        for (let i = 0; i < e.changedTouches.length; i++) {
          const touch = e.changedTouches[i];
          if (touch.identifier === joystickTouchId) {
            this.updateJoystick(touch.clientX, touch.clientY, joystickCenter, maxRadius, joystickStick);
            break;
          }
        }
      }, { passive: false });

      const resetJoystick = (e) => {
        for (let i = 0; i < e.changedTouches.length; i++) {
          if (e.changedTouches[i].identifier === joystickTouchId) {
            joystickTouchId = null;
            if (joystickStick) {
              joystickStick.style.transform = 'translate(-50%, -50%)';
            }
            this.input.moveVector = { x: 0, z: 0 };
            break;
          }
        }
      };

      joystickZone.addEventListener('touchend', resetJoystick, { passive: false });
      joystickZone.addEventListener('touchcancel', resetJoystick, { passive: false });
    }

    // 2. Action Buttons
    const btnSwing = document.getElementById('btn-touch-swing');
    const btnSprint = document.getElementById('btn-touch-sprint');
    const btnJump = document.getElementById('btn-touch-jump');

    if (btnSwing) {
      btnSwing.addEventListener('touchstart', (e) => {
        e.preventDefault();
        this.triggerSwing();
      }, { passive: false });
    }

    if (btnSprint) {
      btnSprint.addEventListener('touchstart', (e) => {
        e.preventDefault();
        this.input.sprint = !this.input.sprint;
        btnSprint.classList.toggle('active', this.input.sprint);
      }, { passive: false });
    }

    if (btnJump) {
      btnJump.addEventListener('touchstart', (e) => {
        e.preventDefault();
        this.character.jump();
      }, { passive: false });
    }

    // 3. Camera Touch Drag (Orbit around character)
    let cameraTouchId = null;
    let prevCamX = 0;
    let prevCamY = 0;
    let pinchStartDist = 0;

    window.addEventListener('touchstart', (e) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        const target = touch.target;
        if (target.closest('#joystick-zone') || target.closest('#mobile-actions') || target.closest('.btn-glass') || target.closest('.modal-content') || target.closest('.start-box')) {
          continue;
        }
        if (cameraTouchId === null) {
          cameraTouchId = touch.identifier;
          prevCamX = touch.clientX;
          prevCamY = touch.clientY;
        }
      }

      // Two-finger pinch zoom detection
      if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        pinchStartDist = Math.hypot(dx, dy);
      }
    }, { passive: true });

    window.addEventListener('touchmove', (e) => {
      // Two-finger pinch zoom
      if (e.touches.length === 2 && pinchStartDist > 0) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const dist = Math.hypot(dx, dy);
        const diff = pinchStartDist - dist;
        this.targetCameraDist = THREE.MathUtils.clamp(
          this.targetCameraDist + diff * 0.012,
          2.8,
          8.5
        );
        pinchStartDist = dist;
        return;
      }

      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        if (touch.identifier === cameraTouchId) {
          const dx = touch.clientX - prevCamX;
          const dy = touch.clientY - prevCamY;
          prevCamX = touch.clientX;
          prevCamY = touch.clientY;

          this.cameraAngleY -= dx * 0.0055;
          this.cameraPitch = THREE.MathUtils.clamp(
            this.cameraPitch + dy * 0.004,
            -0.1,
            0.85
          );
          break;
        }
      }
    }, { passive: true });

    const resetCamTouch = (e) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === cameraTouchId) {
          cameraTouchId = null;
          break;
        }
      }
      if (e.touches.length < 2) pinchStartDist = 0;
    };

    window.addEventListener('touchend', resetCamTouch, { passive: true });
    window.addEventListener('touchcancel', resetCamTouch, { passive: true });
  }

  updateJoystick(clientX, clientY, center, maxRadius, stickEl) {
    const dx = clientX - center.x;
    const dy = clientY - center.y;
    const dist = Math.hypot(dx, dy);
    const clampedDist = Math.min(dist, maxRadius);
    const angle = Math.atan2(dy, dx);

    const stickX = Math.cos(angle) * clampedDist;
    const stickY = Math.sin(angle) * clampedDist;

    if (stickEl) {
      stickEl.style.transform = `translate(calc(-50% + ${stickX}px), calc(-50% + ${stickY}px))`;
    }

    // Set normalized move vector
    this.input.moveVector = {
      x: stickX / maxRadius,
      z: stickY / maxRadius
    };
  }

  handleKey(code, isDown) {
    switch (code) {
      case 'KeyW':
      case 'ArrowUp':
        this.input.forward = isDown;
        break;
      case 'KeyS':
      case 'ArrowDown':
        this.input.backward = isDown;
        break;
      case 'KeyA':
      case 'ArrowLeft':
        this.input.left = isDown;
        break;
      case 'KeyD':
      case 'ArrowRight':
        this.input.right = isDown;
        break;
      case 'ShiftLeft':
      case 'ShiftRight':
        this.input.sprint = isDown;
        break;
      case 'Space':
        if (isDown) {
          this.triggerSwing();
        }
        break;
      case 'KeyE':
        if (isDown) {
          this.character.jump();
        }
        break;
    }
  }

  triggerSwing() {
    if (this.character.isSwinging || !this.character.canSwing) return;

    this.character.swingNet();

    // Reticle animation
    const crosshair = document.getElementById('crosshair');
    if (crosshair) {
      crosshair.classList.add('swinging');
      setTimeout(() => crosshair.classList.remove('swinging'), 350);
    }

    // Check Catch during active swing arc (e.g. at 120ms into the swing)
    setTimeout(() => {
      const netWorldPos = this.character.getNetCenterWorld();
      const caughtInsects = this.insectManager.checkNetCatch(
        netWorldPos,
        this.character.position,
        this.character.netCatchRadius
      );

      caughtInsects.forEach((insect) => {
        this.ui.onInsectCaught(insect);
      });
    }, 140);
  }

  updateCamera(delta) {
    // Smooth zoom lerp
    this.cameraDist = THREE.MathUtils.lerp(this.cameraDist, this.targetCameraDist, delta * 8);

    // Target focus: Character chest / head area
    const charPos = this.character.position;
    const focusTarget = new THREE.Vector3(charPos.x, charPos.y + 1.45, charPos.z);

    // Spherical coordinate offset for Third-Person Orbit
    const cosPitch = Math.cos(this.cameraPitch);
    const sinPitch = Math.sin(this.cameraPitch);
    const offsetX = Math.sin(this.cameraAngleY) * cosPitch * this.cameraDist;
    const offsetY = sinPitch * this.cameraDist;
    const offsetZ = Math.cos(this.cameraAngleY) * cosPitch * this.cameraDist;

    const desiredCamPos = new THREE.Vector3(
      focusTarget.x + offsetX,
      focusTarget.y + offsetY,
      focusTarget.z + offsetZ
    );

    // Terrain clearance prevention for camera
    const groundY = this.environment.getElevation(desiredCamPos.x, desiredCamPos.z);
    if (desiredCamPos.y < groundY + 0.6) {
      desiredCamPos.y = groundY + 0.6;
    }

    // Smooth camera lag/lerp
    this.camera.position.lerp(desiredCamPos, delta * 14);
    this.camera.lookAt(focusTarget);
  }

  animate() {
    requestAnimationFrame(() => this.animate());

    const delta = Math.min(this.clock.getDelta(), 0.1);
    const elapsedTime = this.clock.getElapsedTime();

    // 1. Update Character
    this.character.update(delta, this.input, this.cameraAngleY);
    this.ui.updateStamina(this.character.stamina, this.character.maxStamina);

    // 2. Update Flying Insects
    this.insectManager.update(delta, this.character.position, this.character.isSwinging);

    // 3. Update Environment
    this.environment.update(delta, elapsedTime);

    // 4. Update Camera
    this.updateCamera(delta);

    // 5. Update UI Radar
    this.ui.updateRadar(this.character.position, this.character.rotationY);

    // 6. Render Frame
    this.renderer.render(this.scene, this.camera);
  }
}

// Boot game when window is ready
window.addEventListener('DOMContentLoaded', () => {
  window.game = new Game();
});
