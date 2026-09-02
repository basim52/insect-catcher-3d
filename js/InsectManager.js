// Flying Insects System: 5 Realistic Species, Flapping Physics, AI Wandering & Net Capture Mechanics
class InsectManager {
  constructor(scene, environment, audioSystem) {
    this.scene = scene;
    this.environment = environment;
    this.audio = audioSystem;
    this.insects = [];
    this.maxInsects = 28;
    this.particles = [];

    // Species Registry with attributes and lore (Arabic & English)
    this.speciesDefs = {
      butterfly: {
        nameAr: "فراشة الملك",
        nameEn: "Monarch Butterfly",
        color: 0xff6d00,
        wingColor: 0xff9100,
        speed: 3.2,
        wingFreq: 18,
        points: 100,
        rarity: "common",
        desc: "فراشة رشيقة ذات أجنحة برتقالية زاهية، تحب التحليق بهدوء حول أزهار المرج."
      },
      dragonfly: {
        nameAr: "اليعسوب اللازوردي",
        nameEn: "Azure Dragonfly",
        color: 0x00e5ff,
        wingColor: 0x80d8ff,
        speed: 6.8,
        wingFreq: 50,
        points: 250,
        rarity: "rare",
        desc: "صياد جوي فائق السرعة، يتميز بأجنحة مزدوجة شفافة ومناورات خاطفة ومفاجئة."
      },
      hornet: {
        nameAr: "الدبور الذهبي",
        nameEn: "Golden Hornet",
        color: 0xffb300,
        wingColor: 0xffecb3,
        speed: 5.5,
        wingFreq: 42,
        points: 350,
        rarity: "rare",
        desc: "حشرة رشيقة حذرة للغاية، تطير بمسارات متعرجة وتهرب فور استشعار الخطر."
      },
      beetle: {
        nameAr: "الخنفساء الزمردية",
        nameEn: "Emerald Beetle",
        color: 0x00e676,
        wingColor: 0x69f0ae,
        speed: 2.8,
        wingFreq: 26,
        points: 150,
        rarity: "common",
        desc: "خنفساء ذات غلاف براق يشبه الزمرد، تطير بطنين مسموع بارتفاع منخفض."
      },
      firefly: {
        nameAr: "اليراعة المشعة",
        nameEn: "Radiant Firefly",
        color: 0x76ff03,
        wingColor: 0xccff90,
        speed: 2.2,
        wingFreq: 22,
        points: 500,
        rarity: "epic",
        desc: "حشرة ليلية نادرة تشع ضوءاً فسفورياً ساحراً يضيء عتمة الغابة."
      }
    };

    this.spawnInitialPopulation();
  }

  spawnInitialPopulation() {
    const keys = Object.keys(this.speciesDefs);
    for (let i = 0; i < this.maxInsects; i++) {
      // Pick random species with rarity weight
      const rand = Math.random();
      let type = "butterfly";
      if (rand < 0.35) type = "butterfly";
      else if (rand < 0.6) type = "beetle";
      else if (rand < 0.8) type = "dragonfly";
      else if (rand < 0.93) type = "hornet";
      else type = "firefly";

      this.spawnInsect(type);
    }
  }

  spawnInsect(type, startPos = null) {
    const def = this.speciesDefs[type];
    const group = new THREE.Group();

    // Body materials
    const bodyMat = new THREE.MeshStandardMaterial({
      color: def.color,
      roughness: 0.4,
      metalness: type === "beetle" ? 0.7 : 0.2
    });

    const wingMat = new THREE.MeshPhysicalMaterial({
      color: def.wingColor,
      transmission: 0.8,
      opacity: 0.75,
      transparent: true,
      roughness: 0.15,
      side: THREE.DoubleSide
    });

    // Insect Anatomy Meshes
    // 1. Torso / Abdomen
    const bodyGeom = new THREE.CapsuleGeometry(0.08, 0.28, 6, 8);
    bodyGeom.rotateX(Math.PI / 2);
    const body = new THREE.Mesh(bodyGeom, bodyMat);
    body.castShadow = true;
    group.add(body);

    // 2. Head & Antennae
    const headGeom = new THREE.SphereGeometry(0.07, 8, 8);
    const head = new THREE.Mesh(headGeom, bodyMat);
    head.position.z = 0.2;
    group.add(head);

    // 3. Wings with pivots
    const leftWingPivot = new THREE.Group();
    leftWingPivot.position.set(0.05, 0.06, 0.05);
    group.add(leftWingPivot);

    const rightWingPivot = new THREE.Group();
    rightWingPivot.position.set(-0.05, 0.06, 0.05);
    group.add(rightWingPivot);

    if (type === "butterfly") {
      // Wide butterfly wings
      const wingGeom = new THREE.PlaneGeometry(0.45, 0.35);
      wingGeom.translate(0.22, 0, 0);
      const leftWing = new THREE.Mesh(wingGeom, wingMat);
      leftWing.rotation.x = Math.PI / 2;
      leftWingPivot.add(leftWing);

      const rightWing = new THREE.Mesh(wingGeom, wingMat);
      rightWing.rotation.x = Math.PI / 2;
      rightWing.rotation.y = Math.PI;
      rightWingPivot.add(rightWing);
    } else if (type === "dragonfly") {
      // Long dual wings
      const wingGeom = new THREE.PlaneGeometry(0.55, 0.12);
      wingGeom.translate(0.27, 0, 0);

      const l1 = new THREE.Mesh(wingGeom, wingMat);
      l1.rotation.x = Math.PI / 2;
      leftWingPivot.add(l1);

      const l2 = new THREE.Mesh(wingGeom, wingMat);
      l2.rotation.x = Math.PI / 2;
      l2.position.z = -0.1;
      leftWingPivot.add(l2);

      const r1 = new THREE.Mesh(wingGeom, wingMat);
      r1.rotation.x = Math.PI / 2;
      r1.rotation.y = Math.PI;
      rightWingPivot.add(r1);

      const r2 = new THREE.Mesh(wingGeom, wingMat);
      r2.rotation.x = Math.PI / 2;
      r2.rotation.y = Math.PI;
      r2.position.z = -0.1;
      rightWingPivot.add(r2);
    } else {
      // Standard oval insect wings
      const wingGeom = new THREE.PlaneGeometry(0.3, 0.16);
      wingGeom.translate(0.15, 0, 0);

      const leftWing = new THREE.Mesh(wingGeom, wingMat);
      leftWing.rotation.x = Math.PI / 2;
      leftWingPivot.add(leftWing);

      const rightWing = new THREE.Mesh(wingGeom, wingMat);
      rightWing.rotation.x = Math.PI / 2;
      rightWing.rotation.y = Math.PI;
      rightWingPivot.add(rightWing);
    }

    // Firefly Glowing Light Emitter
    let pointLight = null;
    if (type === "firefly") {
      pointLight = new THREE.PointLight(0x76ff03, 1.8, 7);
      pointLight.position.set(0, 0, -0.15);
      group.add(pointLight);

      // Glowing bulb sphere
      const glowMat = new THREE.MeshBasicMaterial({ color: 0x76ff03 });
      const glowSphere = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), glowMat);
      glowSphere.position.set(0, 0, -0.15);
      group.add(glowSphere);
    }

    // Determine Spawn Position
    const pos = new THREE.Vector3();
    if (startPos) {
      pos.copy(startPos);
    } else {
      const angle = Math.random() * Math.PI * 2;
      const radius = 6 + Math.random() * 42;
      pos.x = Math.cos(angle) * radius;
      pos.z = Math.sin(angle) * radius;
      const groundY = this.environment.getElevation(pos.x, pos.z);
      pos.y = groundY + 1.2 + Math.random() * 3.5;
    }

    group.position.copy(pos);
    this.scene.add(group);

    const insectObj = {
      type,
      def,
      group,
      leftWingPivot,
      rightWingPivot,
      pointLight,
      position: pos,
      velocity: new THREE.Vector3(
        (Math.random() - 0.5) * def.speed,
        0,
        (Math.random() - 0.5) * def.speed
      ),
      targetPos: new THREE.Vector3(),
      wingAngle: 0,
      state: "wander", // wander, evade, caught
      changeTargetTimer: 0,
      caughtTimer: 0
    };

    this.pickNewWanderTarget(insectObj);
    this.insects.push(insectObj);
    return insectObj;
  }

  pickNewWanderTarget(insect) {
    const angle = Math.random() * Math.PI * 2;
    const r = 5 + Math.random() * 20;
    const targetX = THREE.MathUtils.clamp(insect.position.x + Math.cos(angle) * r, -55, 55);
    const targetZ = THREE.MathUtils.clamp(insect.position.z + Math.sin(angle) * r, -55, 55);
    const groundY = this.environment.getElevation(targetX, targetZ);
    const targetY = groundY + 1.0 + Math.random() * (insect.type === "dragonfly" ? 4.5 : 2.5);

    insect.targetPos.set(targetX, targetY, targetZ);
    insect.changeTargetTimer = 2.0 + Math.random() * 3.5;
  }

  // Check if character's net catches any nearby insect during the swing
  checkNetCatch(netCenterWorld, characterPosition, catchRadius) {
    const caughtList = [];

    for (let i = this.insects.length - 1; i >= 0; i--) {
      const insect = this.insects[i];
      if (insect.state === "caught") continue;

      const dist = insect.group.position.distanceTo(netCenterWorld);
      if (dist < catchRadius + 0.3) {
        // Insect successfully caught!
        insect.state = "caught";
        caughtList.push(insect);
        this.createCaptureSparks(insect.group.position, insect.def.color);
      }
    }
    return caughtList;
  }

  createCaptureSparks(position, color) {
    // Particle burst upon catching
    for (let i = 0; i < 16; i++) {
      const pGeom = new THREE.SphereGeometry(0.07, 4, 4);
      const pMat = new THREE.MeshBasicMaterial({ color: color });
      const spark = new THREE.Mesh(pGeom, pMat);
      spark.position.copy(position);

      const angle = Math.random() * Math.PI * 2;
      const speed = 2.5 + Math.random() * 3.5;
      const sparkVel = new THREE.Vector3(
        Math.cos(angle) * speed,
        1.5 + Math.random() * 3.0,
        Math.sin(angle) * speed
      );

      this.scene.add(spark);
      this.particles.push({ mesh: spark, velocity: sparkVel, life: 0.5 });
    }
  }

  update(delta, playerPos, isPlayerSwinging) {
    const time = performance.now() * 0.001;

    // Update Spark Particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= delta;
      p.mesh.position.addScaledVector(p.velocity, delta);
      p.velocity.y -= 9.8 * delta;
      p.mesh.scale.multiplyScalar(0.92);

      if (p.life <= 0) {
        this.scene.remove(p.mesh);
        this.particles.splice(i, 1);
      }
    }

    // Update Each Flying Insect
    for (let i = this.insects.length - 1; i >= 0; i--) {
      const insect = this.insects[i];

      // If Caught Animation
      if (insect.state === "caught") {
        insect.caughtTimer += delta;
        // Shrink towards player net
        insect.group.scale.multiplyScalar(Math.max(0, 1 - delta * 5));
        insect.group.position.lerp(playerPos, delta * 8);

        if (insect.caughtTimer > 0.45) {
          this.scene.remove(insect.group);
          this.insects.splice(i, 1);
          // Respawn after short delay
          setTimeout(() => {
            const types = Object.keys(this.speciesDefs);
            const randType = types[Math.floor(Math.random() * types.length)];
            this.spawnInsect(randType);
          }, 4000);
        }
        continue;
      }

      // 1. Flapping wing physics
      insect.wingAngle += delta * insect.def.wingFreq * 2 * Math.PI;
      const wingFlap = Math.sin(insect.wingAngle) * 0.75;
      insect.leftWingPivot.rotation.z = wingFlap;
      insect.rightWingPivot.rotation.z = -wingFlap;

      // Pulse firefly light
      if (insect.pointLight) {
        insect.pointLight.intensity = 1.0 + Math.sin(time * 6 + i) * 0.9;
      }

      // 2. Proximity & Evasion AI
      const distToPlayer = insect.group.position.distanceTo(playerPos);

      // Play spatial buzzing sound when near player
      if (i % 4 === 0) {
        this.audio.playInsectBuzz(distToPlayer);
      }

      if (distToPlayer < 3.8 || (distToPlayer < 6.0 && isPlayerSwinging)) {
        // Flee away from player!
        insect.state = "evade";
        const fleeDir = new THREE.Vector3().subVectors(insect.group.position, playerPos).normalize();
        fleeDir.y = Math.max(0.4, fleeDir.y); // Flee upwards
        insect.velocity.lerp(fleeDir.multiplyScalar(insect.def.speed * 1.8), delta * 5);
      } else {
        insect.state = "wander";
        insect.changeTargetTimer -= delta;
        if (insect.changeTargetTimer <= 0) {
          this.pickNewWanderTarget(insect);
        }

        // Steer towards target
        const desiredDir = new THREE.Vector3().subVectors(insect.targetPos, insect.group.position);
        if (desiredDir.lengthSq() < 1.0) {
          this.pickNewWanderTarget(insect);
        }
        desiredDir.normalize();

        // Add soft sine-wave bobbing
        desiredDir.y += Math.sin(time * 3 + i) * 0.2;

        insect.velocity.lerp(desiredDir.multiplyScalar(insect.def.speed), delta * 2.5);
      }

      // 3. Move & Clamp within play boundaries
      insect.group.position.addScaledVector(insect.velocity, delta);

      // Terrain clearance check
      const groundY = this.environment.getElevation(insect.group.position.x, insect.group.position.z);
      if (insect.group.position.y < groundY + 0.8) {
        insect.group.position.y = groundY + 0.8;
        insect.velocity.y = Math.abs(insect.velocity.y) + 1.0;
      }

      // Face direction of flight smoothly
      if (insect.velocity.lengthSq() > 0.1) {
        const lookTarget = new THREE.Vector3().addVectors(insect.group.position, insect.velocity);
        insect.group.lookAt(lookTarget);
      }
    }
  }
}

window.InsectManager = InsectManager;
