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
      jump: false
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

    if (btnStart) {
      btnStart.addEventListener('click', () => {
        if (instructionsModal) instructionsModal.style.display = 'none';
        this.audio.init();
        canvas.requestPointerLock();
      });
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
