/* CEDUR hero — procedural 3D winter night scene (Three.js).
   The camera trucks/pedestals toward the cursor while aiming at a fixed
   point, so foreground/midground/background objects shift at different
   rates — real parallax instead of a tilted flat image. */

(function () {
  "use strict";

  var container = document.getElementById("scene3d");
  var fallback = document.getElementById("sceneFallback");

  var renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  } catch (e) {
    fallback.classList.add("is-visible");
    return;
  }

  var DPR = Math.min(window.devicePixelRatio || 1, 2);
  renderer.setPixelRatio(DPR);
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.78;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);

  var scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x0a1426, 20, 78);

  /* ---------- sky ---------- */

  function makeSkyTexture() {
    var c = document.createElement("canvas");
    c.width = 4;
    c.height = 512;
    var g = c.getContext("2d");
    var grad = g.createLinearGradient(0, 0, 0, 512);
    grad.addColorStop(0.0, "#02060f");
    grad.addColorStop(0.55, "#081124");
    grad.addColorStop(0.8, "#101c3a");
    grad.addColorStop(1.0, "#182645");
    g.fillStyle = grad;
    g.fillRect(0, 0, 4, 512);
    var t = new THREE.CanvasTexture(c);
    t.encoding = THREE.sRGBEncoding;
    return t;
  }

  // huge inward-facing sphere so the gradient sits behind the fog
  var sky = new THREE.Mesh(
    new THREE.SphereGeometry(400, 24, 16),
    new THREE.MeshBasicMaterial({ map: makeSkyTexture(), side: THREE.BackSide, fog: false })
  );
  scene.add(sky);

  function makeSoftDotTexture(inner) {
    var c = document.createElement("canvas");
    c.width = c.height = 64;
    var g = c.getContext("2d");
    var grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, "rgba(255,255,255,1)");
    grad.addColorStop(inner, "rgba(255,255,255,0.8)");
    grad.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = grad;
    g.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(c);
  }

  var starTexture = makeSoftDotTexture(0.15);

  function makeStars(count, size, opacity) {
    var pos = new Float32Array(count * 3);
    for (var i = 0; i < count; i++) {
      // random directions on the upper hemisphere, pushed to the sky shell
      var theta = Math.random() * Math.PI * 2;
      var phi = Math.acos(Math.random() * 0.85 + 0.05); // keep off the horizon
      var r = 380;
      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.cos(phi);
      pos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }
    var geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    var mat = new THREE.PointsMaterial({
      size: size,
      map: starTexture,
      transparent: true,
      opacity: opacity,
      depthWrite: false,
      fog: false,
      sizeAttenuation: false
    });
    return new THREE.Points(geo, mat);
  }

  scene.add(makeStars(900, 1.6 * DPR, 0.75));
  scene.add(makeStars(160, 2.8 * DPR, 0.9));

  /* ---------- lights ---------- */

  scene.add(new THREE.HemisphereLight(0x40598f, 0x070b16, 0.42));

  var moon = new THREE.DirectionalLight(0x8ba2d4, 0.32);
  moon.position.set(-30, 40, 18);
  moon.castShadow = true;
  moon.shadow.mapSize.set(2048, 2048);
  moon.shadow.camera.left = -30;
  moon.shadow.camera.right = 30;
  moon.shadow.camera.top = 30;
  moon.shadow.camera.bottom = -30;
  moon.shadow.bias = -0.0004;
  scene.add(moon);

  /* ---------- snow ground ---------- */

  var groundGeo = new THREE.PlaneGeometry(240, 160, 96, 64);
  groundGeo.rotateX(-Math.PI / 2);
  var gp = groundGeo.attributes.position;
  for (var gi = 0; gi < gp.count; gi++) {
    var gx = gp.getX(gi);
    var gz = gp.getZ(gi);
    var h =
      Math.sin(gx * 0.16) * Math.cos(gz * 0.13) * 0.55 +
      Math.sin(gx * 0.05 + 2.1) * 1.1 +
      Math.cos(gz * 0.045) * 0.8;
    // gentle rise toward the back so trees sit on a slope like the photo
    h += Math.max(0, -gz - 8) * 0.1;
    gp.setY(gi, h);
  }
  groundGeo.computeVertexNormals();
  var ground = new THREE.Mesh(
    groundGeo,
    new THREE.MeshStandardMaterial({ color: 0x9fb2d8, roughness: 0.92, metalness: 0 })
  );
  ground.receiveShadow = true;
  scene.add(ground);

  /* ---------- procedural wood texture for the house ---------- */

  function makeWoodTexture() {
    var c = document.createElement("canvas");
    c.width = 256;
    c.height = 256;
    var g = c.getContext("2d");
    g.fillStyle = "#7a5c3d";
    g.fillRect(0, 0, 256, 256);
    for (var x = 0; x < 256; x += 16) {
      var shade = 0.85 + Math.random() * 0.3;
      g.fillStyle =
        "rgb(" + Math.round(122 * shade) + "," + Math.round(92 * shade) + "," + Math.round(61 * shade) + ")";
      g.fillRect(x, 0, 15, 256);
      g.fillStyle = "rgba(30,20,10,0.5)";
      g.fillRect(x + 15, 0, 1, 256);
    }
    var t = new THREE.CanvasTexture(c);
    t.encoding = THREE.sRGBEncoding;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    return t;
  }

  /* ---------- house ---------- */

  var house = new THREE.Group();

  function makePaneTexture() {
    var c = document.createElement("canvas");
    c.width = c.height = 64;
    var g = c.getContext("2d");
    var grad = g.createRadialGradient(32, 26, 4, 32, 30, 44);
    grad.addColorStop(0, "#ffe6b8");
    grad.addColorStop(0.55, "#ffb254");
    grad.addColorStop(1, "#d9741f");
    g.fillStyle = grad;
    g.fillRect(0, 0, 64, 64);
    var t = new THREE.CanvasTexture(c);
    t.encoding = THREE.sRGBEncoding;
    return t;
  }
  var paneTexture = makePaneTexture();

  var woodMat = new THREE.MeshStandardMaterial({ map: makeWoodTexture(), roughness: 0.85 });
  var darkMat = new THREE.MeshStandardMaterial({ color: 0x14161c, roughness: 0.7 });
  var frameMat = new THREE.MeshStandardMaterial({ color: 0x0c0e13, roughness: 0.6 });
  var glowMat = new THREE.MeshBasicMaterial({ map: paneTexture });
  var glowDimMat = new THREE.MeshBasicMaterial({ map: paneTexture, color: 0x6b5136 });
  var snowMat = new THREE.MeshStandardMaterial({ color: 0xdfe8f8, roughness: 0.95 });

  var W = 9, D = 5.6, H1 = 3.0, H2 = 2.7, ROOF_H = 2.4;

  var floor1 = new THREE.Mesh(new THREE.BoxGeometry(W, H1, D), darkMat);
  floor1.position.y = H1 / 2;
  floor1.castShadow = true;
  house.add(floor1);

  var floor2 = new THREE.Mesh(new THREE.BoxGeometry(W, H2, D), woodMat);
  floor2.position.y = H1 + H2 / 2;
  floor2.castShadow = true;
  house.add(floor2);

  // gable roof: triangular prism ridge running along X
  function makeRoof(w, d, h) {
    var hw = w / 2, hd = d / 2;
    var geo = new THREE.BufferGeometry();
    var v = new Float32Array([
      // front slope
      -hw, 0, hd,   hw, 0, hd,   hw, h, 0,
      -hw, 0, hd,   hw, h, 0,   -hw, h, 0,
      // back slope
      hw, 0, -hd,  -hw, 0, -hd,  -hw, h, 0,
      hw, 0, -hd,  -hw, h, 0,    hw, h, 0,
      // left gable
      -hw, 0, -hd,  -hw, 0, hd,  -hw, h, 0,
      // right gable
      hw, 0, hd,    hw, 0, -hd,  hw, h, 0
    ]);
    geo.setAttribute("position", new THREE.BufferAttribute(v, 3));
    geo.computeVertexNormals();
    return geo;
  }

  // the roof wears a full snow blanket, with a dark fascia underneath
  var roof = new THREE.Mesh(makeRoof(W + 1.2, D + 1.0, ROOF_H), snowMat);
  roof.position.y = H1 + H2 + 0.18;
  roof.castShadow = true;
  house.add(roof);

  var fascia = new THREE.Mesh(new THREE.BoxGeometry(W + 1.25, 0.3, D + 1.05), frameMat);
  fascia.position.y = H1 + H2 + 0.05;
  fascia.castShadow = true;
  house.add(fascia);

  // chimney + snow cap
  var chimney = new THREE.Mesh(new THREE.BoxGeometry(0.7, 2.2, 0.7), darkMat);
  chimney.position.set(-1.6, H1 + H2 + ROOF_H + 0.35, 0);
  chimney.castShadow = true;
  house.add(chimney);
  var chimneyCap = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.14, 0.8), snowMat);
  chimneyCap.position.set(-1.6, H1 + H2 + ROOF_H + 1.5, 0);
  house.add(chimneyCap);

  // windows: big glazing downstairs, a horizontal band upstairs (front face)
  function addWindow(w, h, x, y, lit) {
    var frame = new THREE.Mesh(new THREE.BoxGeometry(w + 0.14, h + 0.14, 0.06), frameMat);
    frame.position.set(x, y, D / 2 + 0.03);
    house.add(frame);
    var pane = new THREE.Mesh(new THREE.PlaneGeometry(w, h), lit ? glowMat : glowDimMat);
    pane.position.set(x, y, D / 2 + 0.075);
    house.add(pane);
    // vertical mullions so the glazing reads as architecture, not a slab
    var bars = Math.max(1, Math.round(w / 0.95) - 1);
    for (var b = 1; b <= bars; b++) {
      var bar = new THREE.Mesh(new THREE.BoxGeometry(0.07, h, 0.05), frameMat);
      bar.position.set(x - w / 2 + (w / (bars + 1)) * b, y, D / 2 + 0.09);
      house.add(bar);
    }
  }

  addWindow(2.5, 2.2, -2.9, 1.45, true);
  addWindow(2.5, 2.2, -0.1, 1.45, true);
  addWindow(2.5, 2.2, 2.75, 1.45, false);
  addWindow(1.9, 1.15, -2.6, H1 + 1.3, true);
  addWindow(1.9, 1.15, -0.45, H1 + 1.3, false);
  addWindow(1.9, 1.15, 1.7, H1 + 1.3, true);

  // side windows (left face, toward the camera path)
  function addSideWindow(w, h, z, y, lit) {
    var frame = new THREE.Mesh(new THREE.BoxGeometry(0.06, h + 0.14, w + 0.14), frameMat);
    frame.position.set(-W / 2 - 0.03, y, z);
    house.add(frame);
    var pane = new THREE.Mesh(new THREE.PlaneGeometry(w, h), lit ? glowMat : glowDimMat);
    pane.rotation.y = -Math.PI / 2;
    pane.position.set(-W / 2 - 0.075, y, z);
    house.add(pane);
  }

  addSideWindow(1.7, 2.0, 0.9, 1.35, true);
  addSideWindow(1.3, 1.05, -0.6, H1 + 1.3, true);

  house.position.set(9.5, 1.8, -13);
  house.rotation.y = -0.52;
  scene.add(house);

  // warm light spilling from the windows onto the snow
  var warmA = new THREE.PointLight(0xff9e4a, 1.6, 26, 1.6);
  warmA.position.set(6.6, 3.0, -8.2);
  scene.add(warmA);
  var warmB = new THREE.PointLight(0xffb264, 0.9, 20, 1.8);
  warmB.position.set(10.6, 6.0, -9.2);
  scene.add(warmB);

  // soft additive glow patches where window light lands on the snow
  function makeGlowTexture() {
    var c = document.createElement("canvas");
    c.width = c.height = 128;
    var g = c.getContext("2d");
    var grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    grad.addColorStop(0, "rgba(255,150,60,0.55)");
    grad.addColorStop(0.5, "rgba(255,140,55,0.22)");
    grad.addColorStop(1, "rgba(255,140,55,0)");
    g.fillStyle = grad;
    g.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(c);
  }
  var glowTexture = makeGlowTexture();
  [[6.2, 2.6, -7.6, 9], [9.8, 2.7, -6.4, 7]].forEach(function (p) {
    var pool = new THREE.Mesh(
      new THREE.PlaneGeometry(p[3], p[3] * 0.55),
      new THREE.MeshBasicMaterial({
        map: glowTexture,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      })
    );
    pool.rotation.x = -Math.PI / 2;
    pool.position.set(p[0], p[1], p[2]);
    scene.add(pool);
  });

  /* ---------- pine trees ---------- */

  var pineMat = new THREE.MeshStandardMaterial({ color: 0x0d1a26, roughness: 0.95 });
  var pineSnowMat = new THREE.MeshStandardMaterial({ color: 0x9fafd0, roughness: 0.95 });
  var trunkMat = new THREE.MeshStandardMaterial({ color: 0x201812, roughness: 1 });

  function makePine(height) {
    var tree = new THREE.Group();
    var trunk = new THREE.Mesh(new THREE.CylinderGeometry(height * 0.03, height * 0.045, height * 0.25, 6), trunkMat);
    trunk.position.y = height * 0.12;
    tree.add(trunk);
    var tiers = 4;
    for (var t = 0; t < tiers; t++) {
      var frac = t / tiers;
      var tierR = height * 0.30 * (1 - frac * 0.72);
      var tierH = height * 0.34;
      var y = height * (0.2 + frac * 0.62);
      var cone = new THREE.Mesh(new THREE.ConeGeometry(tierR, tierH, 8), pineMat);
      cone.position.y = y;
      cone.castShadow = true;
      tree.add(cone);
      var snowCone = new THREE.Mesh(new THREE.ConeGeometry(tierR * 0.55, tierH * 0.22, 8), pineSnowMat);
      snowCone.position.y = y + tierH * 0.34;
      tree.add(snowCone);
    }
    return tree;
  }

  var rng = (function () {
    var s = 42;
    return function () {
      s = (s * 16807) % 2147483647;
      return (s - 1) / 2147483646;
    };
  })();

  function scatterPines(spots) {
    spots.forEach(function (sp) {
      var tree = makePine(sp[2]);
      tree.position.set(sp[0], sp[3] !== undefined ? sp[3] : 0, sp[1]);
      tree.rotation.y = rng() * Math.PI * 2;
      scene.add(tree);
    });
  }

  // left foreground cluster (tall, close to the camera for strong parallax)
  scatterPines([
    [-13.5, 4.5, 15], [-10, 1, 13], [-16, -2, 17], [-8, -4, 11.5],
    [-12, -7, 14], [-8.6, 6.8, 7], [-18.5, 5, 13]
  ]);
  // background treeline behind the house
  var bx;
  for (bx = -34; bx <= 42; bx += 3.2) {
    var jitter = (rng() - 0.5) * 2.5;
    scatterPines([[bx + jitter, -26 - rng() * 10, 9 + rng() * 7, 1.5]]);
  }
  // a few mid-ground trees right of the house
  scatterPines([[20, -18, 12], [25, -14, 10], [17, -22, 13]]);
  // one near tree on the right edge
  scatterPines([[16.5, 6.5, 10]]);

  /* ---------- chimney smoke ---------- */

  var smokeTexture = makeSoftDotTexture(0.35);
  var SMOKE_N = 34;
  var smokeSprites = [];
  var chimneyWorld = new THREE.Vector3();
  chimney.getWorldPosition(chimneyWorld);
  chimneyWorld.y += 1.2;

  for (var si = 0; si < SMOKE_N; si++) {
    var sm = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: smokeTexture,
        color: 0x97a3ba,
        transparent: true,
        opacity: 0,
        depthWrite: false
      })
    );
    sm.userData.t = (si / SMOKE_N) * 9; // stagger along the plume
    scene.add(sm);
    smokeSprites.push(sm);
  }

  function updateSmoke(dt, time) {
    for (var i = 0; i < smokeSprites.length; i++) {
      var s = smokeSprites[i];
      s.userData.t += dt;
      var t = s.userData.t % 9; // life of one puff, seconds
      var k = t / 9;
      var rise = t * 1.05;
      s.position.set(
        chimneyWorld.x + Math.sin(t * 0.8 + i) * 0.35 + k * 2.2, // wind drift to the right
        chimneyWorld.y + rise,
        chimneyWorld.z + Math.cos(t * 0.6 + i * 1.7) * 0.3
      );
      var scale = 0.7 + k * 4.2;
      s.scale.set(scale, scale, 1);
      s.material.opacity = 0.24 * Math.sin(Math.PI * Math.min(k * 1.15, 1));
    }
  }

  /* ---------- falling snow ---------- */

  var SNOW_N = 1300;
  var SNOW_BOX = { x: 46, y: 24, z: 40 };
  var snowPos = new Float32Array(SNOW_N * 3);
  var snowVel = new Float32Array(SNOW_N * 2); // fall speed + sway phase
  for (var ni = 0; ni < SNOW_N; ni++) {
    snowPos[ni * 3] = (Math.random() - 0.5) * SNOW_BOX.x;
    snowPos[ni * 3 + 1] = Math.random() * SNOW_BOX.y;
    snowPos[ni * 3 + 2] = (Math.random() - 0.5) * SNOW_BOX.z + 2;
    snowVel[ni * 2] = 0.55 + Math.random() * 0.75;
    snowVel[ni * 2 + 1] = Math.random() * Math.PI * 2;
  }
  var snowGeo = new THREE.BufferGeometry();
  snowGeo.setAttribute("position", new THREE.BufferAttribute(snowPos, 3));
  var snow = new THREE.Points(
    snowGeo,
    new THREE.PointsMaterial({
      size: 0.14,
      map: makeSoftDotTexture(0.3),
      transparent: true,
      opacity: 0.85,
      depthWrite: false
    })
  );
  scene.add(snow);

  function updateSnow(dt, time) {
    for (var i = 0; i < SNOW_N; i++) {
      snowPos[i * 3 + 1] -= snowVel[i * 2] * dt;
      snowPos[i * 3] += Math.sin(time * 0.8 + snowVel[i * 2 + 1]) * dt * 0.35;
      if (snowPos[i * 3 + 1] < 0) snowPos[i * 3 + 1] += SNOW_BOX.y;
    }
    snowGeo.attributes.position.needsUpdate = true;
  }

  /* ---------- camera rig ---------- */

  var camera = new THREE.PerspectiveCamera(42, container.clientWidth / container.clientHeight, 0.1, 900);
  var camBase = new THREE.Vector3(-2.0, 3.3, 18.0);
  var lookAt = new THREE.Vector3(4.5, 4.4, -10);
  camera.position.copy(camBase);
  camera.lookAt(lookAt);

  var target = { x: 0, y: 0 };
  var current = { x: 0, y: 0 };
  var hero = document.getElementById("hero");

  hero.addEventListener("pointermove", function (e) {
    if (e.pointerType !== "mouse" && e.pointerType !== "pen") return;
    var rect = hero.getBoundingClientRect();
    target.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    target.y = ((e.clientY - rect.top) / rect.height) * 2 - 1;
  });
  hero.addEventListener("pointerleave", function () {
    target.x = 0;
    target.y = 0;
  });

  var copy = document.getElementById("heroCopy");
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- resize ---------- */

  function onResize() {
    var w = container.clientWidth;
    var h = container.clientHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
    if (reduceMotion) renderer.render(scene, camera);
  }
  window.addEventListener("resize", onResize);

  /* ---------- loop ---------- */

  var clock = new THREE.Clock();

  function frame() {
    var dt = Math.min(clock.getDelta(), 0.05);
    var time = clock.elapsedTime;

    current.x += (target.x - current.x) * 0.045;
    current.y += (target.y - current.y) * 0.045;

    // slow idle drift keeps the scene alive when the cursor is still
    var idleX = Math.sin(time * 0.22) * 0.35;
    var idleY = Math.cos(time * 0.17) * 0.18;

    camera.position.x = camBase.x + current.x * 2.6 + idleX;
    camera.position.y = camBase.y - current.y * 1.3 + idleY;
    camera.position.z = camBase.z - Math.abs(current.x) * 0.6;
    camera.lookAt(lookAt);

    // the copy block counter-drifts a touch, like a near plane
    if (copy) {
      copy.style.transform =
        "translate3d(" + (-current.x * 14) + "px," + (-current.y * 9) + "px,0)";
    }

    updateSnow(dt, time);
    updateSmoke(dt, time);

    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }

  if (reduceMotion) {
    updateSmoke(0.01, 4); // place a static plume
    renderer.render(scene, camera);
  } else {
    frame();
  }
})();
