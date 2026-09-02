// 3D Human Character (Safari Insect Hunter) with Articulated Rig, Realistic Animations & Net Sweeping
class Character {
  constructor(scene, environment, audioSystem) {
    this.scene = scene;
    this.environment = environment;
    this.audio = audioSystem;

    // Movement & Physics state
    this.position = new THREE.Vector3(0, 0, 10);
    this.velocity = new THREE.Vector3();
    this.rotationY = 0;
    this.targetRotationY = 0;
    this.speed = 0;
    this.walkSpeed = 5.5;
    this.sprintSpeed = 10.0;
    this.isSprinting = false;
    this.stamina = 100;
    this.maxStamina = 100;

    // Jump state
    this.isGrounded = true;
    this.jumpVelocity = 0;
    this.gravity = 24.0;

    // Net swing state
    this.isSwinging = false;
    this.swingTime = 0;
    this.swingDuration = 0.48; // seconds
    this.canSwing = true;
    this.netCatchRadius = 2.4; // Detection sphere radius for catching insects

    // Animation timers
    this.animTime = 0;
    this.stepTimer = 0;

    // Build the 3D human mesh & articulated skeleton
    this.buildCharacterMesh();
  }

  buildCharacterMesh() {
    this.group = new THREE.Group();

    // PBR Materials for Hunter Outfit
    const skinMat = new THREE.MeshStandardMaterial({
      color: 0xe0a98b,
      roughness: 0.6,
      metalness: 0.05
    });

    const shirtMat = new THREE.MeshStandardMaterial({
      color: 0x8b7e56, // Safari Khaki
      roughness: 0.8,
      metalness: 0.1
    });

    const vestMat = new THREE.MeshStandardMaterial({
      color: 0x5a4a32, // Leather Brown Vest
      roughness: 0.7,
      metalness: 0.15
    });

    const pantsMat = new THREE.MeshStandardMaterial({
      color: 0x3d4b37, // Olive Cargo Pants
      roughness: 0.85,
      metalness: 0.05
    });

    const bootMat = new THREE.MeshStandardMaterial({
      color: 0x241911, // Dark Leather Boots
      roughness: 0.6,
      metalness: 0.2
    });

    const hatMat = new THREE.MeshStandardMaterial({
      color: 0xb89c72, // Safari Straw/Felt Hat
      roughness: 0.85,
      metalness: 0.05
    });

    const netWoodMat = new THREE.MeshStandardMaterial({
      color: 0x6e4a28,
      roughness: 0.7
    });

    const netMetalMat = new THREE.MeshStandardMaterial({
      color: 0xc0c5ca,
      metalness: 0.85,
      roughness: 0.25
    });

    const netMeshMat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      transmission: 0.75,
      opacity: 0.7,
      transparent: true,
      roughness: 0.3,
      side: THREE.DoubleSide
    });

    // --- Pelvis / Hips (Root) ---
    this.hips = new THREE.Group();
    this.hips.position.y = 0.95;
    this.group.add(this.hips);

    const pelvisGeom = new THREE.BoxGeometry(0.5, 0.28, 0.32);
    const pelvis = new THREE.Mesh(pelvisGeom, pantsMat);
    pelvis.castShadow = true;
    this.hips.add(pelvis);

    // --- Torso & Spine ---
    this.torso = new THREE.Group();
    this.torso.position.y = 0.2;
    this.hips.add(this.torso);

    const chestGeom = new THREE.BoxGeometry(0.56, 0.58, 0.36);
    const chest = new THREE.Mesh(chestGeom, shirtMat);
    chest.position.y = 0.3;
    chest.castShadow = true;
    this.torso.add(chest);

    // Safari Vest overlay
    const vestGeom = new THREE.BoxGeometry(0.59, 0.52, 0.39);
    const vest = new THREE.Mesh(vestGeom, vestMat);
    vest.position.y = 0.28;
    vest.castShadow = true;
    this.torso.add(vest);

    // Belt & Buckle
    const beltGeom = new THREE.BoxGeometry(0.52, 0.08, 0.35);
    const beltMat = new THREE.MeshStandardMaterial({ color: 0x1e150f, roughness: 0.5 });
    const belt = new THREE.Mesh(beltGeom, beltMat);
    belt.position.y = 0.03;
    this.torso.add(belt);

    // --- Head & Safari Hat ---
    this.headGroup = new THREE.Group();
    this.headGroup.position.y = 0.7;
    this.torso.add(this.headGroup);

    const headGeom = new THREE.SphereGeometry(0.2, 16, 16);
    headGeom.scale(1, 1.15, 1);
    const head = new THREE.Mesh(headGeom, skinMat);
    head.castShadow = true;
    this.headGroup.add(head);

    // Safari Explorer Hat (Brim + Crown)
    const hatCrownGeom = new THREE.CylinderGeometry(0.18, 0.22, 0.16, 16);
    const hatCrown = new THREE.Mesh(hatCrownGeom, hatMat);
    hatCrown.position.y = 0.17;
    hatCrown.castShadow = true;
    this.headGroup.add(hatCrown);

    const hatBrimGeom = new THREE.CylinderGeometry(0.38, 0.38, 0.03, 16);
    const hatBrim = new THREE.Mesh(hatBrimGeom, hatMat);
    hatBrim.position.y = 0.1;
    hatBrim.castShadow = true;
    this.headGroup.add(hatBrim);

    // --- Legs & Boots ---
    // Left Leg
    this.leftThigh = new THREE.Group();
    this.leftThigh.position.set(0.16, -0.1, 0);
    this.hips.add(this.leftThigh);

    const thighGeom = new THREE.CylinderGeometry(0.1, 0.08, 0.44, 8);
    const leftThighMesh = new THREE.Mesh(thighGeom, pantsMat);
    leftThighMesh.position.y = -0.22;
    leftThighMesh.castShadow = true;
    this.leftThigh.add(leftThighMesh);

    this.leftCalf = new THREE.Group();
    this.leftCalf.position.y = -0.44;
    this.leftThigh.add(this.leftCalf);

    const calfGeom = new THREE.CylinderGeometry(0.08, 0.07, 0.44, 8);
    const leftCalfMesh = new THREE.Mesh(calfGeom, pantsMat);
    leftCalfMesh.position.y = -0.22;
    leftCalfMesh.castShadow = true;
    this.leftCalf.add(leftCalfMesh);

    const bootGeom = new THREE.BoxGeometry(0.14, 0.14, 0.24);
    const leftBoot = new THREE.Mesh(bootGeom, bootMat);
    leftBoot.position.set(0, -0.42, 0.04);
    leftBoot.castShadow = true;
    this.leftCalf.add(leftBoot);

    // Right Leg
    this.rightThigh = new THREE.Group();
    this.rightThigh.position.set(-0.16, -0.1, 0);
    this.hips.add(this.rightThigh);

    const rightThighMesh = new THREE.Mesh(thighGeom, pantsMat);
    rightThighMesh.position.y = -0.22;
    rightThighMesh.castShadow = true;
    this.rightThigh.add(rightThighMesh);

    this.rightCalf = new THREE.Group();
    this.rightCalf.position.y = -0.44;
    this.rightThigh.add(this.rightCalf);

    const rightCalfMesh = new THREE.Mesh(calfGeom, pantsMat);
    rightCalfMesh.position.y = -0.22;
    rightCalfMesh.castShadow = true;
    this.rightCalf.add(rightCalfMesh);

    const rightBoot = new THREE.Mesh(bootGeom, bootMat);
    rightBoot.position.set(0, -0.42, 0.04);
    rightBoot.castShadow = true;
    this.rightCalf.add(rightBoot);

    // --- Arms & Hands ---
    // Left Arm (Free natural swing)
    this.leftArm = new THREE.Group();
    this.leftArm.position.set(0.35, 0.5, 0);
    this.torso.add(this.leftArm);

    const upperArmGeom = new THREE.CylinderGeometry(0.07, 0.06, 0.34, 8);
    const leftUpperArm = new THREE.Mesh(upperArmGeom, shirtMat);
    leftUpperArm.position.y = -0.17;
    leftUpperArm.castShadow = true;
    this.leftArm.add(leftUpperArm);

    this.leftForearm = new THREE.Group();
    this.leftForearm.position.y = -0.34;
    this.leftArm.add(this.leftForearm);

    const forearmGeom = new THREE.CylinderGeometry(0.06, 0.055, 0.32, 8);
    const leftForearmMesh = new THREE.Mesh(forearmGeom, skinMat);
    leftForearmMesh.position.y = -0.16;
    leftForearmMesh.castShadow = true;
    this.leftForearm.add(leftForearmMesh);

    // Right Arm (Holds the Insect Net)
    this.rightArm = new THREE.Group();
    this.rightArm.position.set(-0.35, 0.5, 0);
    this.torso.add(this.rightArm);

    const rightUpperArm = new THREE.Mesh(upperArmGeom, shirtMat);
    rightUpperArm.position.y = -0.17;
    rightUpperArm.castShadow = true;
    this.rightArm.add(rightUpperArm);

    this.rightForearm = new THREE.Group();
    this.rightForearm.position.y = -0.34;
    this.rightArm.add(this.rightForearm);

    const rightForearmMesh = new THREE.Mesh(forearmGeom, skinMat);
    rightForearmMesh.position.y = -0.16;
    rightForearmMesh.castShadow = true;
    this.rightForearm.add(rightForearmMesh);

    // --- High-Detail 3D Insect Catching Net ---
    this.netGroup = new THREE.Group();
    this.netGroup.position.set(0, -0.28, 0.1);
    this.netGroup.rotation.x = THREE.MathUtils.degToRad(30);
    this.rightForearm.add(this.netGroup);

    // Net handle (light carved wood pole)
    const poleGeom = new THREE.CylinderGeometry(0.025, 0.025, 1.7, 8);
    const pole = new THREE.Mesh(poleGeom, netWoodMat);
    pole.position.y = 0.5;
    pole.castShadow = true;
    this.netGroup.add(pole);

    // Metal hoop connector
    const collarGeom = new THREE.CylinderGeometry(0.038, 0.038, 0.08, 8);
    const collar = new THREE.Mesh(collarGeom, netMetalMat);
    collar.position.y = 1.35;
    this.netGroup.add(collar);

    // Net circular hoop
    const hoopGeom = new THREE.TorusGeometry(0.38, 0.02, 12, 24);
    const hoop = new THREE.Mesh(hoopGeom, netMetalMat);
    hoop.position.set(0, 1.72, 0);
    hoop.rotation.x = Math.PI / 2;
    hoop.castShadow = true;
    this.netGroup.add(hoop);

    // Translucent cloth mesh bag
    const bagGeom = new THREE.ConeGeometry(0.36, 0.9, 16, 4, true);
    bagGeom.rotateX(Math.PI);
    this.netBag = new THREE.Mesh(bagGeom, netMeshMat);
    this.netBag.position.set(0, 1.72, -0.45);
    this.netBag.rotation.x = Math.PI / 2;
    this.netGroup.add(this.netBag);

    // Add character to scene
    this.scene.add(this.group);
    this.group.position.copy(this.position);
  }

  // Trigger Swing Attack
  swingNet() {
    if (this.isSwinging || !this.canSwing) return;
    this.isSwinging = true;
    this.swingTime = 0;
    this.canSwing = false;

    // Play whoosh sound
    if (this.audio) this.audio.playSwingSound();

    // Reset swing trigger cooldown
    setTimeout(() => {
      this.canSwing = true;
    }, 550);
  }

  // Calculate the world position of the net ring for collision detection
  getNetCenterWorld() {
    const worldPos = new THREE.Vector3();
    if (this.netBag) {
      this.netBag.getWorldPosition(worldPos);
    } else {
      worldPos.copy(this.position).add(new THREE.Vector3(0, 1.5, 1.2));
    }
    return worldPos;
  }

  jump() {
    if (this.isGrounded) {
      this.jumpVelocity = 7.5;
      this.isGrounded = false;
    }
  }

  update(delta, input, cameraAngleY) {
    // 1. Movement Direction Calculation
    const moveDir = new THREE.Vector3();
    if (input.moveVector && (Math.abs(input.moveVector.x) > 0.05 || Math.abs(input.moveVector.z) > 0.05)) {
      moveDir.x = input.moveVector.x;
      moveDir.z = input.moveVector.z;
    } else {
      if (input.forward) moveDir.z -= 1;
      if (input.backward) moveDir.z += 1;
      if (input.left) moveDir.x -= 1;
      if (input.right) moveDir.x += 1;
    }

    const isMoving = moveDir.lengthSq() > 0;

    // Stamina & Sprint logic
    if (input.sprint && isMoving && this.stamina > 5) {
      this.isSprinting = true;
      this.stamina = Math.max(0, this.stamina - delta * 24);
    } else {
      this.isSprinting = false;
      this.stamina = Math.min(this.maxStamina, this.stamina + delta * 15);
    }

    const currentMaxSpeed = this.isSprinting ? this.sprintSpeed : this.walkSpeed;

    if (isMoving) {
      moveDir.normalize();
      // Rotate movement vector according to camera horizontal angle
      moveDir.applyAxisAngle(new THREE.Vector3(0, 1, 0), cameraAngleY);

      this.speed = THREE.MathUtils.lerp(this.speed, currentMaxSpeed, delta * 10);
      this.velocity.x = moveDir.x * this.speed;
      this.velocity.z = moveDir.z * this.speed;

      // Face movement direction smoothly
      this.targetRotationY = Math.atan2(moveDir.x, moveDir.z);
    } else {
      this.speed = THREE.MathUtils.lerp(this.speed, 0, delta * 12);
      this.velocity.x = 0;
      this.velocity.z = 0;
    }

    // Smooth character rotation
    let angleDiff = this.targetRotationY - this.rotationY;
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
    this.rotationY += angleDiff * Math.min(1, delta * 12);
    this.group.rotation.y = this.rotationY;

    // 2. Physics & Terrain Clamping
    this.position.x += this.velocity.x * delta;
    this.position.z += this.velocity.z * delta;

    // Apply Gravity and Jump
    if (!this.isGrounded) {
      this.position.y += this.jumpVelocity * delta;
      this.jumpVelocity -= this.gravity * delta;
    }

    const groundY = this.environment.getElevation(this.position.x, this.position.z);
    if (this.position.y <= groundY) {
      this.position.y = groundY;
      this.jumpVelocity = 0;
      this.isGrounded = true;
    }

    this.group.position.copy(this.position);

    // 3. Animation State Machine
    this.animTime += delta * (this.isSprinting ? 12 : (isMoving ? 8 : 2));

    // Footstep audio triggers
    if (isMoving && this.isGrounded) {
      this.stepTimer += delta * (this.isSprinting ? 2.2 : 1.4);
      if (this.stepTimer >= 1.0) {
        this.stepTimer = 0;
        if (this.audio) this.audio.playFootstep();
      }
    }

    // Net swing animation progression
    if (this.isSwinging) {
      this.swingTime += delta;
      const progress = this.swingTime / this.swingDuration;

      if (progress < 0.25) {
        // Phase 1: Rapid Backswing windup
        const t = progress / 0.25;
        this.rightArm.rotation.x = THREE.MathUtils.degToRad(-50 * t);
        this.rightArm.rotation.z = THREE.MathUtils.degToRad(-35 * t);
        this.rightForearm.rotation.x = THREE.MathUtils.degToRad(-60 * t);
        this.netGroup.rotation.x = THREE.MathUtils.degToRad(70 * t);
      } else if (progress < 0.65) {
        // Phase 2: Powerful Forward & Downward Sweep Strike!
        const t = (progress - 0.25) / 0.4;
        this.rightArm.rotation.x = THREE.MathUtils.degToRad(-50 + 130 * t);
        this.rightArm.rotation.z = THREE.MathUtils.degToRad(-35 + 50 * t);
        this.rightForearm.rotation.x = THREE.MathUtils.degToRad(-60 + 80 * t);
        this.netGroup.rotation.x = THREE.MathUtils.degToRad(70 - 110 * t);
      } else if (progress <= 1.0) {
        // Phase 3: Smooth return to ready pose
        const t = (progress - 0.65) / 0.35;
        this.rightArm.rotation.x = THREE.MathUtils.degToRad(80 * (1 - t));
        this.rightArm.rotation.z = THREE.MathUtils.degToRad(15 * (1 - t));
        this.rightForearm.rotation.x = THREE.MathUtils.degToRad(20 * (1 - t));
        this.netGroup.rotation.x = THREE.MathUtils.degToRad(-40 * (1 - t) + 30 * t);
      } else {
        this.isSwinging = false;
        this.swingTime = 0;
      }
    }

    // Body limb procedural oscillations (Walk / Idle / Sprint)
    if (!this.isSwinging) {
      if (isMoving) {
        const legAmp = this.isSprinting ? 0.75 : 0.55;
        this.leftThigh.rotation.x = Math.sin(this.animTime) * legAmp;
        this.rightThigh.rotation.x = -Math.sin(this.animTime) * legAmp;

        this.leftCalf.rotation.x = Math.max(0, -Math.sin(this.animTime) * legAmp * 0.9);
        this.rightCalf.rotation.x = Math.max(0, Math.sin(this.animTime) * legAmp * 0.9);

        // Counter arm swing
        this.leftArm.rotation.x = -Math.sin(this.animTime) * (legAmp * 0.7);
        this.rightArm.rotation.x = THREE.MathUtils.degToRad(25) + Math.sin(this.animTime) * 0.2;
        this.rightForearm.rotation.x = THREE.MathUtils.degToRad(35);
        this.netGroup.rotation.x = THREE.MathUtils.degToRad(35 + Math.sin(this.animTime) * 8);

        // Hip bounce & torso forward tilt
        this.hips.position.y = 0.95 + Math.abs(Math.sin(this.animTime * 2)) * 0.06;
        this.torso.rotation.x = this.isSprinting ? THREE.MathUtils.degToRad(14) : THREE.MathUtils.degToRad(5);
      } else {
        // Natural Idle Breathing
        const breathe = Math.sin(this.animTime * 2) * 0.03;
        this.torso.position.y = 0.2 + breathe;
        this.torso.rotation.x = THREE.MathUtils.degToRad(2) + breathe * 0.5;
        this.leftArm.rotation.x = breathe * 0.5;
        this.leftArm.rotation.z = THREE.MathUtils.degToRad(10);
        this.rightArm.rotation.x = THREE.MathUtils.degToRad(20) + breathe;
        this.rightArm.rotation.z = THREE.MathUtils.degToRad(-15);
        this.rightForearm.rotation.x = THREE.MathUtils.degToRad(40);
        this.netGroup.rotation.x = THREE.MathUtils.degToRad(30);

        this.leftThigh.rotation.x = 0;
        this.rightThigh.rotation.x = 0;
        this.leftCalf.rotation.x = 0;
        this.rightCalf.rotation.x = 0;
        this.hips.position.y = 0.95;
      }
    }
  }
}

window.Character = Character;
