// Realistic Natural Environment (Terrain, Trees, Foliage, Pond, Particles & Lighting)
class Environment {
  constructor(scene) {
    this.scene = scene;
    this.trees = [];
    this.flowers = [];
    this.particles = null;
    this.water = null;
    this.dirLight = null;
    this.hemiLight = null;
    this.timeOfDay = 'day';
    this.pondRadius = 14;
    this.pondCenter = new THREE.Vector3(15, -0.4, -10);

    this.initLighting();
    this.buildTerrain();
    this.buildPond();
    this.buildVegetation();
    this.buildAtmosphereParticles();
  }

  initLighting() {
    // Dynamic Hemisphere Light
    this.hemiLight = new THREE.HemisphereLight(0xebf5fb, 0x3d5a24, 0.75);
    this.hemiLight.position.set(0, 50, 0);
    this.scene.add(this.hemiLight);

    // Sunlight with realistic PCF Soft Shadows
    this.dirLight = new THREE.DirectionalLight(0xfffaed, 1.4);
    this.dirLight.position.set(40, 65, 30);
    this.dirLight.castShadow = true;
    this.dirLight.shadow.mapSize.width = 2048;
    this.dirLight.shadow.mapSize.height = 2048;
    this.dirLight.shadow.camera.near = 1;
    this.dirLight.shadow.camera.far = 180;
    const d = 55;
    this.dirLight.shadow.camera.left = -d;
    this.dirLight.shadow.camera.right = d;
    this.dirLight.shadow.camera.top = d;
    this.dirLight.shadow.camera.bottom = -d;
    this.dirLight.shadow.bias = -0.0005;
    this.dirLight.shadow.radius = 2.5;
    this.scene.add(this.dirLight);

    // Subtle atmospheric Fog
    this.scene.fog = new THREE.FogExp2(0xcfe2f3, 0.009);
  }

  buildTerrain() {
    const size = 160;
    const segments = 90;
    const geometry = new THREE.PlaneGeometry(size, size, segments, segments);
    geometry.rotateX(-Math.PI / 2);

    const pos = geometry.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);

      // Procedural soft hills
      let y = Math.sin(x * 0.05) * Math.cos(z * 0.05) * 1.8 +
              Math.sin(x * 0.12 + 1) * Math.cos(z * 0.09) * 0.7;

      // Flatten or depress the pond area
      const distToPond = Math.hypot(x - this.pondCenter.x, z - this.pondCenter.z);
      if (distToPond < this.pondRadius + 6) {
        const factor = Math.min(1, distToPond / (this.pondRadius + 6));
        y = y * factor - (1 - factor) * 1.5;
      }

      // Edge elevations to keep player in play zone
      const distFromCenter = Math.hypot(x, z);
      if (distFromCenter > 55) {
        y += Math.pow((distFromCenter - 55) * 0.18, 2);
      }

      pos.setY(i, y);
    }
    geometry.computeVertexNormals();

    // Canvas procedural grass texture for realistic detail
    const grassCanvas = document.createElement('canvas');
    grassCanvas.width = 512;
    grassCanvas.height = 512;
    const ctx = grassCanvas.getContext('2d');
    ctx.fillStyle = '#2d5a27';
    ctx.fillRect(0, 0, 512, 512);
    // Noise speckles
    for (let i = 0; i < 40000; i++) {
      const g = 60 + Math.floor(Math.random() * 80);
      const r = 20 + Math.floor(Math.random() * 40);
      ctx.fillStyle = `rgb(${r},${g},25)`;
      ctx.fillRect(Math.random() * 512, Math.random() * 512, 2, 2);
    }
    const grassTex = new THREE.CanvasTexture(grassCanvas);
    grassTex.wrapS = THREE.RepeatWrapping;
    grassTex.wrapT = THREE.RepeatWrapping;
    grassTex.repeat.set(16, 16);

    const material = new THREE.MeshStandardMaterial({
      map: grassTex,
      roughness: 0.85,
      metalness: 0.05,
      flatShading: false
    });

    const terrain = new THREE.Mesh(geometry, material);
    terrain.receiveShadow = true;
    this.scene.add(terrain);
    this.terrainMesh = terrain;
  }

  // Get terrain height at any X, Z for character and insect clearance
  getElevation(x, z) {
    let y = Math.sin(x * 0.05) * Math.cos(z * 0.05) * 1.8 +
            Math.sin(x * 0.12 + 1) * Math.cos(z * 0.09) * 0.7;

    const distToPond = Math.hypot(x - this.pondCenter.x, z - this.pondCenter.z);
    if (distToPond < this.pondRadius + 6) {
      const factor = Math.min(1, distToPond / (this.pondRadius + 6));
      y = y * factor - (1 - factor) * 1.5;
    }

    const distFromCenter = Math.hypot(x, z);
    if (distFromCenter > 55) {
      y += Math.pow((distFromCenter - 55) * 0.18, 2);
    }
    return y;
  }

  buildPond() {
    // Shimmering reflective water surface
    const waterGeom = new THREE.CircleGeometry(this.pondRadius, 48);
    waterGeom.rotateX(-Math.PI / 2);
    const waterMat = new THREE.MeshPhysicalMaterial({
      color: 0x1a6b7c,
      roughness: 0.1,
      metalness: 0.2,
      transmission: 0.6,
      ior: 1.333,
      transparent: true,
      opacity: 0.88,
      reflectivity: 0.85
    });

    this.water = new THREE.Mesh(waterGeom, waterMat);
    this.water.position.copy(this.pondCenter);
    this.water.position.y = -0.3;
    this.water.receiveShadow = true;
    this.scene.add(this.water);

    // Pond border rocks
    for (let i = 0; i < 30; i++) {
      const angle = (i / 30) * Math.PI * 2 + (Math.random() - 0.5) * 0.15;
      const r = this.pondRadius + (Math.random() * 1.5 - 0.5);
      const rx = this.pondCenter.x + Math.cos(angle) * r;
      const rz = this.pondCenter.z + Math.sin(angle) * r;
      const ry = this.getElevation(rx, rz);
      this.createRock(rx, ry, rz, 0.6 + Math.random() * 0.9);
    }
  }

  createRock(x, y, z, scale = 1) {
    const rockGeom = new THREE.DodecahedronGeometry(scale, 1);
    // Displace vertices slightly for natural jagged look
    const pos = rockGeom.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const px = pos.getX(i);
      const py = pos.getY(i);
      const pz = pos.getZ(i);
      const factor = 1 + (Math.random() - 0.5) * 0.3;
      pos.setXYZ(i, px * factor, py * (0.6 + Math.random() * 0.4), pz * factor);
    }
    rockGeom.computeVertexNormals();

    const rockMat = new THREE.MeshStandardMaterial({
      color: 0x7c7f84,
      roughness: 0.9,
      metalness: 0.1,
      flatShading: true
    });

    const rock = new THREE.Mesh(rockGeom, rockMat);
    rock.position.set(x, y + scale * 0.3, z);
    rock.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
    rock.castShadow = true;
    rock.receiveShadow = true;
    this.scene.add(rock);
  }

  buildVegetation() {
    // Trees (trunk + layered leafy spherical canopies)
    const treeCount = 45;
    for (let i = 0; i < treeCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 12 + Math.random() * 45;
      const x = Math.cos(angle) * dist;
      const z = Math.sin(angle) * dist;

      // Avoid placing inside pond
      if (Math.hypot(x - this.pondCenter.x, z - this.pondCenter.z) < this.pondRadius + 3) {
        continue;
      }
      const y = this.getElevation(x, z);
      this.createTree(x, y, z);
    }

    // Wildflower patches
    const flowerColors = [0xff4081, 0xffeb3b, 0x9c27b0, 0x00e676, 0xff9100];
    for (let i = 0; i < 90; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 4 + Math.random() * 48;
      const x = Math.cos(angle) * dist;
      const z = Math.sin(angle) * dist;
      if (Math.hypot(x - this.pondCenter.x, z - this.pondCenter.z) < this.pondRadius + 1) {
        continue;
      }
      const y = this.getElevation(x, z);
      const color = flowerColors[Math.floor(Math.random() * flowerColors.length)];
      this.createFlower(x, y, z, color);
    }

    // Additional scattered field boulders
    for (let i = 0; i < 20; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 8 + Math.random() * 46;
      const x = Math.cos(angle) * dist;
      const z = Math.sin(angle) * dist;
      const y = this.getElevation(x, z);
      this.createRock(x, y, z, 0.8 + Math.random() * 1.4);
    }
  }

  createTree(x, y, z) {
    const treeGroup = new THREE.Group();
    const treeHeight = 6 + Math.random() * 3.5;

    // Trunk
    const trunkGeom = new THREE.CylinderGeometry(0.3, 0.65, treeHeight, 8);
    const trunkMat = new THREE.MeshStandardMaterial({
      color: 0x4a2e18,
      roughness: 0.9,
      metalness: 0.05
    });
    const trunk = new THREE.Mesh(trunkGeom, trunkMat);
    trunk.position.y = treeHeight / 2;
    trunk.castShadow = true;
    trunk.receiveShadow = true;
    treeGroup.add(trunk);

    // Multi-layer foliage crowns
    const foliageMat = new THREE.MeshStandardMaterial({
      color: 0x226b28,
      roughness: 0.75,
      metalness: 0.05,
      flatShading: true
    });

    const crownTiers = 3;
    for (let i = 0; i < crownTiers; i++) {
      const radius = (2.2 - i * 0.45) * (0.9 + Math.random() * 0.25);
      const crownGeom = new THREE.IcosahedronGeometry(radius, 2);
      const crown = new THREE.Mesh(crownGeom, foliageMat);
      crown.position.y = treeHeight * 0.65 + i * 1.5;
      crown.castShadow = true;
      crown.receiveShadow = true;
      treeGroup.add(crown);
    }

    treeGroup.position.set(x, y, z);
    treeGroup.rotation.y = Math.random() * Math.PI * 2;
    this.scene.add(treeGroup);
    this.trees.push(treeGroup);
  }

  createFlower(x, y, z, color) {
    const flowerGroup = new THREE.Group();

    // Stem
    const stemGeom = new THREE.CylinderGeometry(0.04, 0.04, 0.7, 5);
    const stemMat = new THREE.MeshStandardMaterial({ color: 0x388e3c });
    const stem = new THREE.Mesh(stemGeom, stemMat);
    stem.position.y = 0.35;
    flowerGroup.add(stem);

    // Blossom petals
    const petalGeom = new THREE.ConeGeometry(0.22, 0.15, 6);
    petalGeom.rotateX(Math.PI);
    const petalMat = new THREE.MeshStandardMaterial({
      color: color,
      roughness: 0.6,
      emissive: color,
      emissiveIntensity: 0.1
    });
    const petal = new THREE.Mesh(petalGeom, petalMat);
    petal.position.y = 0.7;
    flowerGroup.add(petal);

    // Flower center
    const centerGeom = new THREE.SphereGeometry(0.09, 6, 6);
    const centerMat = new THREE.MeshStandardMaterial({ color: 0xffd54f });
    const center = new THREE.Mesh(centerGeom, centerMat);
    center.position.y = 0.72;
    flowerGroup.add(center);

    flowerGroup.position.set(x, y, z);
    flowerGroup.rotation.y = Math.random() * Math.PI * 2;
    flowerGroup.rotation.z = (Math.random() - 0.5) * 0.2;
    this.scene.add(flowerGroup);
    this.flowers.push(flowerGroup);
  }

  buildAtmosphereParticles() {
    // Floating sunlight pollen and glowing dust motes
    const count = 350;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const scales = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 100;
      positions[i * 3 + 1] = 0.5 + Math.random() * 12;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 100;
      scales[i] = Math.random();
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('scale', new THREE.BufferAttribute(scales, 1));

    const material = new THREE.PointsMaterial({
      color: 0xfff6cf,
      size: 0.35,
      transparent: true,
      opacity: 0.55,
      blending: THREE.AdditiveBlending
    });

    this.particles = new THREE.Points(geometry, material);
    this.scene.add(this.particles);
  }

  setTimeOfDay(preset) {
    this.timeOfDay = preset;
    if (preset === 'day') {
      this.dirLight.color.setHex(0xfffaed);
      this.dirLight.intensity = 1.4;
      this.dirLight.position.set(40, 65, 30);
      this.hemiLight.color.setHex(0xebf5fb);
      this.hemiLight.groundColor.setHex(0x3d5a24);
      this.hemiLight.intensity = 0.75;
      this.scene.background = new THREE.Color(0xa7d8f0);
      this.scene.fog.color.setHex(0xcfe2f3);
      if (this.particles) this.particles.material.color.setHex(0xfff6cf);
    } else if (preset === 'sunset') {
      this.dirLight.color.setHex(0xff8c42);
      this.dirLight.intensity = 1.6;
      this.dirLight.position.set(60, 25, 40);
      this.hemiLight.color.setHex(0xffaa5e);
      this.hemiLight.groundColor.setHex(0x4a2a1b);
      this.hemiLight.intensity = 0.65;
      this.scene.background = new THREE.Color(0xec6f55);
      this.scene.fog.color.setHex(0xde7b64);
      if (this.particles) this.particles.material.color.setHex(0xffd180);
    } else if (preset === 'night') {
      this.dirLight.color.setHex(0x5c88c7);
      this.dirLight.intensity = 0.45;
      this.dirLight.position.set(-30, 50, -20);
      this.hemiLight.color.setHex(0x192841);
      this.hemiLight.groundColor.setHex(0x0c130d);
      this.hemiLight.intensity = 0.35;
      this.scene.background = new THREE.Color(0x09101f);
      this.scene.fog.color.setHex(0x0d182b);
      if (this.particles) this.particles.material.color.setHex(0x69f0ae);
    }
  }

  update(delta, time) {
    // Subtle water ripple animation
    if (this.water) {
      this.water.position.y = -0.3 + Math.sin(time * 1.5) * 0.03;
    }

    // Floating particles drift
    if (this.particles) {
      const pos = this.particles.geometry.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        let y = pos.getY(i) + Math.sin(time * 0.8 + i) * 0.008;
        let x = pos.getX(i) + Math.cos(time * 0.5 + i) * 0.006;
        if (y > 14) y = 1;
        pos.setY(i, y);
        pos.setX(i, x);
      }
      this.particles.geometry.attributes.position.needsUpdate = true;
    }
  }
}

window.Environment = Environment;
