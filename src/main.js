import {
  Engine, Scene, Vector3, Color3, Color4, HemisphericLight, DirectionalLight,
  MeshBuilder, StandardMaterial, TransformNode, ArcRotateCamera, ShadowGenerator,
  ParticleSystem, DynamicTexture
} from '@babylonjs/core';

const canvas = document.getElementById('renderCanvas');
const engine = new Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true });
const scene = new Scene(engine);
scene.clearColor = new Color4(0.55, 0.82, 0.93, 1);
scene.fogMode = Scene.FOGMODE_EXP2;
scene.fogDensity = 0.006;
scene.fogColor = new Color3(0.55, 0.82, 0.93);

const isDemo = new URLSearchParams(location.search).get('demo') === '1';
const fishTotal = 8;
let fishCollected = 0;
let hearts = 3;
let timeLeft = 180;
let ended = false;
let invincible = 0;
let elapsed = 0;
let messageTimer = 0;
const keys = new Set();

const ui = {
  fish: document.getElementById('fishCount'),
  timer: document.getElementById('timer'),
  hearts: document.getElementById('hearts'),
  message: document.getElementById('message'),
  objective: document.getElementById('objectiveText'),
  progress: document.querySelector('#progress > div'),
  end: document.getElementById('endScreen'),
  endTitle: document.getElementById('endTitle'),
  endText: document.getElementById('endText')
};

const mat = (name, hex, emissive = 0) => {
  const m = new StandardMaterial(name, scene);
  const c = Color3.FromHexString(hex);
  m.diffuseColor = c;
  m.specularColor = new Color3(0.08, 0.08, 0.08);
  if (emissive) m.emissiveColor = c.scale(emissive);
  return m;
};

const materials = {
  grass: mat('grass', '#76ad4f'), path: mat('path', '#cfa56b'), water: mat('water', '#5bb7c8'),
  wood: mat('wood', '#70412f'), wall: mat('wall', '#ead3a5'), roof: mat('roof', '#9d493a'),
  leaf: mat('leaf', '#3f8f4f'), trunk: mat('trunk', '#76502e'),
  blue: mat('blue', '#2c8ab3'), skin: mat('skin', '#f3c7a7'), hair: mat('hair', '#1b1717'),
  red: mat('red', '#c83b4d'), gold: mat('gold', '#ffd45d', .25), fish: mat('fish', '#ffbd3f', .45),
  monster: mat('monster', '#4d2868', .08), eye: mat('eye', '#ff4659', .8), gate: mat('gate', '#b6292f'),
  rice: mat('rice', '#e2c84f'), dark: mat('dark', '#213742')
};
materials.water.alpha = .72;
materials.water.specularColor = new Color3(.7, .9, 1);

const hemi = new HemisphericLight('hemi', new Vector3(0, 1, 0), scene);
hemi.intensity = 0.78;
const sun = new DirectionalLight('sun', new Vector3(-.45, -1, .32), scene);
sun.position = new Vector3(25, 45, -35);
sun.intensity = 1.25;
const shadows = new ShadowGenerator(2048, sun);
shadows.useBlurExponentialShadowMap = true;
shadows.blurKernel = 24;

const ground = MeshBuilder.CreateGround('ground', { width: 70, height: 100 }, scene);
ground.material = materials.grass;
ground.receiveShadows = true;
const path = MeshBuilder.CreateGround('main path', { width: 8, height: 92 }, scene);
path.position.y = .015;
path.material = materials.path;

for (const side of [-1, 1]) {
  for (let i = 0; i < 4; i++) {
    const water = MeshBuilder.CreateGround(`water-${side}-${i}`, { width: 18, height: 9 }, scene);
    water.position = new Vector3(side * 16, .02, -30 + i * 20);
    water.material = materials.water;
    for (let r = 0; r < 6; r++) {
      const row = MeshBuilder.CreateBox('rice-row', { width: 16, height: .14, depth: .28 }, scene);
      row.position = new Vector3(side * 16, .13, water.position.z - 3.5 + r * 1.35);
      row.material = materials.rice;
      row.receiveShadows = true;
    }
  }
}

function addHouse(x, z, scale = 1, rot = 0) {
  const root = new TransformNode('house', scene);
  root.position = new Vector3(x, 0, z);
  root.rotation.y = rot;
  const body = MeshBuilder.CreateBox('house body', { width: 7 * scale, height: 3.8 * scale, depth: 5.6 * scale }, scene);
  body.parent = root; body.position.y = 1.9 * scale; body.material = materials.wall; body.receiveShadows = true; shadows.addShadowCaster(body);
  const roof = MeshBuilder.CreateCylinder('roof', { diameter: 8.8 * scale, height: 6.4 * scale, tessellation: 3 }, scene);
  roof.parent = root; roof.rotation.z = Math.PI / 2; roof.rotation.y = Math.PI / 2; roof.position.y = 4.25 * scale; roof.material = materials.roof; shadows.addShadowCaster(roof);
  const door = MeshBuilder.CreateBox('door', { width: 1.35 * scale, height: 2.4 * scale, depth: .14 * scale }, scene);
  door.parent = root; door.position = new Vector3(0, 1.2 * scale, -2.86 * scale); door.material = materials.wood;
  const porch = MeshBuilder.CreateBox('porch', { width: 7.4 * scale, height: .22 * scale, depth: 1.2 * scale }, scene);
  porch.parent = root; porch.position = new Vector3(0, .18 * scale, -3.25 * scale); porch.material = materials.wood;
  return root;
}

addHouse(-10, -31, .82, .04); addHouse(11, -21, .9, -.08); addHouse(-11, -7, .82, .07);
addHouse(11, 6, .9, -.06); addHouse(-11, 20, .86, .05); addHouse(11, 31, .96, -.03);

function addTree(x, z, s = 1) {
  const trunk = MeshBuilder.CreateCylinder('trunk', { diameter: .65 * s, height: 3.7 * s, tessellation: 10 }, scene);
  trunk.position = new Vector3(x, 1.85 * s, z); trunk.material = materials.trunk; shadows.addShadowCaster(trunk);
  for (let i = 0; i < 3; i++) {
    const crown = MeshBuilder.CreateSphere('crown', { diameter: (2.8 - i * .25) * s, segments: 8 }, scene);
    crown.position = new Vector3(x + (i - 1) * .55 * s, 4.0 * s + (i % 2) * .45 * s, z + ((i % 2) * 2 - 1) * .35 * s);
    crown.material = materials.leaf; shadows.addShadowCaster(crown);
  }
}
for (const [x, z, s] of [[-27, -39, 1.1], [25, -36, 1], [27, -12, 1.15], [-26, 3, 1], [-27, 29, 1.15], [25, 19, 1], [-22, 42, 1.2], [21, 43, 1.1], [-6, -42, .9], [7, -9, .75]]) addTree(x, z, s);

for (const side of [-1, 1]) {
  for (let z = -44; z <= 44; z += 4) {
    const post = MeshBuilder.CreateCylinder('fence post', { diameter: .24, height: 1.5, tessellation: 8 }, scene);
    post.position = new Vector3(side * 5.3, .75, z); post.material = materials.wood;
  }
}

function makeTextMaterial(text, fg, bg) {
  const tex = new DynamicTexture('textTexture', { width: 512, height: 180 }, scene, false);
  const ctx = tex.getContext(); ctx.fillStyle = bg; ctx.fillRect(0, 0, 512, 180); ctx.fillStyle = fg; ctx.font = 'bold 92px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, 256, 95); tex.update();
  const m = new StandardMaterial('textMat', scene); m.diffuseTexture = tex; m.emissiveTexture = tex; m.specularColor = Color3.Black(); return m;
}

const gateRoot = new TransformNode('finish gate', scene); gateRoot.position = new Vector3(0, 0, 42);
for (const x of [-3.7, 3.7]) {
  const p = MeshBuilder.CreateCylinder('gate pillar', { diameter: .75, height: 6, tessellation: 10 }, scene);
  p.parent = gateRoot; p.position = new Vector3(x, 3, 0); p.material = materials.gate; shadows.addShadowCaster(p);
}
const beam = MeshBuilder.CreateBox('gate beam', { width: 9, height: .8, depth: .8 }, scene); beam.parent = gateRoot; beam.position.y = 5.5; beam.material = materials.gate; shadows.addShadowCaster(beam);
const banner = MeshBuilder.CreatePlane('banner', { width: 5.2, height: 1.8 }, scene); banner.parent = gateRoot; banner.position = new Vector3(0, 4.25, -.43); banner.rotation.y = Math.PI; banner.material = makeTextMaterial('ĐÍCH', '#fff1bd', '#9d202b');

const tam = new TransformNode('Co Tam', scene); tam.position = new Vector3(0, 0, -43);
const body = MeshBuilder.CreateCylinder('dress', { diameterTop: 1.15, diameterBottom: 2.2, height: 3.1, tessellation: 16 }, scene);
body.parent = tam; body.position.y = 1.65; body.material = materials.blue; shadows.addShadowCaster(body);
const sash = MeshBuilder.CreateTorus('sash', { diameter: 1.28, thickness: .16, tessellation: 24 }, scene); sash.parent = tam; sash.position.y = 2.7; sash.rotation.x = Math.PI / 2; sash.material = materials.red;
const head = MeshBuilder.CreateSphere('head', { diameter: 1.35, segments: 16 }, scene); head.parent = tam; head.position.y = 3.65; head.material = materials.skin; shadows.addShadowCaster(head);
const hairBack = MeshBuilder.CreateSphere('hair', { diameter: 1.43, segments: 12 }, scene); hairBack.parent = tam; hairBack.position = new Vector3(0, .12, .12); hairBack.scaling = new Vector3(1, 1, .78); hairBack.material = materials.hair;
const face = MeshBuilder.CreateSphere('face', { diameter: 1.29, segments: 16 }, scene); face.parent = head; face.position.z = -.12; face.material = materials.skin;
for (const x of [-.23, .23]) { const eye = MeshBuilder.CreateSphere('eye', { diameter: .11, segments: 8 }, scene); eye.parent = head; eye.position = new Vector3(x, .08, -.64); eye.material = materials.dark; }
const smile = MeshBuilder.CreateTorus('smile', { diameter: .3, thickness: .035, arc: .5, tessellation: 16 }, scene); smile.parent = head; smile.position = new Vector3(0, -.18, -.66); smile.rotation = new Vector3(Math.PI / 2, 0, 0); smile.material = materials.red;
const hat = MeshBuilder.CreateCylinder('non la', { diameterTop: 0, diameterBottom: 2.25, height: .58, tessellation: 24 }, scene); hat.parent = tam; hat.position.y = 4.58; hat.material = materials.gold; hat.rotation.z = .08; shadows.addShadowCaster(hat);
const leftArm = MeshBuilder.CreateCylinder('left arm', { diameter: .28, height: 2, tessellation: 10 }, scene); leftArm.parent = tam; leftArm.position = new Vector3(-.85, 2.35, 0); leftArm.rotation.z = -.2; leftArm.material = materials.skin;
const rightArm = leftArm.clone('right arm'); rightArm.parent = tam; rightArm.position.x = .85; rightArm.rotation.z = .2;
const leftFoot = MeshBuilder.CreateBox('left foot', { width: .5, height: .25, depth: .85 }, scene); leftFoot.parent = tam; leftFoot.position = new Vector3(-.45, .18, -.05); leftFoot.material = materials.dark;
const rightFoot = leftFoot.clone('right foot'); rightFoot.parent = tam; rightFoot.position.x = .45;

const camera = new ArcRotateCamera('camera', Math.PI / 2, 1.05, 16, tam.position.add(new Vector3(0, 2.4, 0)), scene);
camera.lowerRadiusLimit = 10; camera.upperRadiusLimit = 20; camera.lowerBetaLimit = .68; camera.upperBetaLimit = 1.28; camera.attachControl(canvas, true); camera.wheelPrecision = 45; camera.panningSensibility = 0;

const fishPositions = [[-2.8, -34], [3.1, -27], [-3.2, -17], [2.8, -5], [-3.1, 7], [3.2, 18], [-2.9, 29], [2.5, 37]];
const fishes = fishPositions.map(([x, z], i) => {
  const root = new TransformNode(`fish-${i}`, scene); root.position = new Vector3(x, 1.05, z);
  const b = MeshBuilder.CreateSphere('fish body', { diameter: 1.05, segments: 10 }, scene); b.parent = root; b.scaling = new Vector3(1.45, .72, .6); b.material = materials.fish;
  const tail = MeshBuilder.CreateCylinder('tail', { diameter: .8, height: .18, tessellation: 3 }, scene); tail.parent = root; tail.rotation.z = Math.PI / 2; tail.position.x = -.9; tail.material = materials.red;
  const eye = MeshBuilder.CreateSphere('fish eye', { diameter: .13, segments: 8 }, scene); eye.parent = root; eye.position = new Vector3(.55, .16, -.34); eye.material = materials.dark;
  const ring = MeshBuilder.CreateTorus('glow ring', { diameter: 1.8, thickness: .06, tessellation: 32 }, scene); ring.parent = root; ring.rotation.x = Math.PI / 2; ring.material = materials.gold;
  shadows.addShadowCaster(b); return { root, baseY: root.position.y, collected: false };
});

function createMonster(x, z, range = 5, speed = 1.4) {
  const root = new TransformNode('monster', scene); root.position = new Vector3(x, 0, z);
  const b = MeshBuilder.CreateSphere('monster body', { diameter: 2.6, segments: 12 }, scene); b.parent = root; b.position.y = 1.4; b.scaling.y = 1.1; b.material = materials.monster; shadows.addShadowCaster(b);
  for (const ex of [-.42, .42]) { const e = MeshBuilder.CreateSphere('monster eye', { diameter: .32, segments: 8 }, scene); e.parent = root; e.position = new Vector3(ex, 1.72, -1.16); e.material = materials.eye; }
  for (let i = 0; i < 4; i++) { const leg = MeshBuilder.CreateCylinder('leg', { diameter: .35, height: 1.4, tessellation: 8 }, scene); leg.parent = root; leg.position = new Vector3((i % 2 ? 1 : -1) * .7, .55, (i < 2 ? -1 : 1) * .45); leg.rotation.z = i % 2 ? -.35 : .35; leg.material = materials.monster; }
  return { root, origin: new Vector3(x, 0, z), range, speed, phase: Math.random() * Math.PI * 2 };
}
const monsters = [createMonster(10, -13, 7, 1.15), createMonster(-10, 1, 7, 1.45), createMonster(10, 24, 6.5, 1.25), createMonster(-10, 34, 6, 1.35)];

const obstacles = [
  { x: -10, z: -31, w: 7 * .82 + 1, d: 5.6 * .82 + 1 }, { x: 11, z: -21, w: 7 * .9 + 1, d: 5.6 * .9 + 1 }, { x: -11, z: -7, w: 7 * .82 + 1, d: 5.6 * .82 + 1 },
  { x: 11, z: 6, w: 7 * .9 + 1, d: 5.6 * .9 + 1 }, { x: -11, z: 20, w: 7 * .86 + 1, d: 5.6 * .86 + 1 }, { x: 11, z: 31, w: 7 * .96 + 1, d: 5.6 * .96 + 1 }
];
const isBlocked = p => Math.abs(p.x) > 31 || p.z < -46 || p.z > 45 || obstacles.some(o => Math.abs(p.x - o.x) < o.w / 2 && Math.abs(p.z - o.z) < o.d / 2);

function showMessage(text) { ui.message.textContent = text; ui.message.classList.add('show'); messageTimer = 2.2; }
function updateUi() {
  ui.fish.textContent = `${fishCollected}/${fishTotal}`;
  const m = Math.floor(timeLeft / 60), s = Math.max(0, Math.ceil(timeLeft % 60)); ui.timer.textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  ui.hearts.textContent = '♥'.repeat(hearts) + '♡'.repeat(3 - hearts);
  ui.progress.style.width = `${fishCollected / fishTotal * 100}%`;
  ui.objective.textContent = fishCollected < fishTotal ? `Tìm thêm ${fishTotal - fishCollected} con cá đang phát sáng trong làng.` : 'Đã đủ cá! Chạy qua cổng làng màu đỏ.';
}
function finish(win, reason = '') {
  if (ended) return; ended = true; ui.end.classList.add('show');
  ui.endTitle.textContent = win ? 'VỀ ĐÍCH THÀNH CÔNG!' : 'CHƯA KỊP VỀ LÀNG';
  ui.endText.innerHTML = win ? `Cô Tấm đã nhặt đủ <b>${fishCollected} con cá</b>, vượt qua quái vật và về đích khi còn <b>${Math.ceil(timeLeft)} giây</b>.` : `${reason}<br>Nhấn “Chơi lại” để thử thêm lần nữa.`;
  window.demoComplete = true;
}

window.addEventListener('keydown', e => { keys.add(e.key.toLowerCase()); if (e.key.toLowerCase() === 'r') location.reload(); });
window.addEventListener('keyup', e => keys.delete(e.key.toLowerCase()));
let demoIndex = 0;
const demoWaypoints = fishPositions.map(([x, z]) => new Vector3(x, 0, z)).concat([new Vector3(0, 0, 43)]);
function getMoveDirection() {
  if (isDemo) {
    const target = demoWaypoints[Math.min(demoIndex, demoWaypoints.length - 1)];
    const d = target.subtract(tam.position); d.y = 0;
    if (d.length() < 1.9 && demoIndex < demoWaypoints.length - 1) demoIndex++;
    return d.length() > .01 ? d.normalize() : Vector3.Zero();
  }
  let x = 0, z = 0; if (keys.has('w') || keys.has('arrowup')) z += 1; if (keys.has('s') || keys.has('arrowdown')) z -= 1; if (keys.has('a') || keys.has('arrowleft')) x -= 1; if (keys.has('d') || keys.has('arrowright')) x += 1;
  const d = new Vector3(x, 0, z); return d.lengthSquared() > 0 ? d.normalize() : d;
}

function animateCharacter(moving) {
  const pace = elapsed * (moving ? 11 : 3);
  body.position.y = 1.65 + (moving ? Math.abs(Math.sin(pace)) * .08 : Math.sin(pace) * .025);
  head.rotation.z = Math.sin(pace * .5) * .025;
  leftArm.rotation.x = moving ? Math.sin(pace) * .75 : Math.sin(pace * .5) * .08;
  rightArm.rotation.x = moving ? -Math.sin(pace) * .75 : -Math.sin(pace * .5) * .08;
  leftFoot.position.z = moving ? Math.sin(pace) * .26 : 0;
  rightFoot.position.z = moving ? -Math.sin(pace) * .26 : 0;
}

scene.onBeforeRenderObservable.add(() => {
  const dt = Math.min(engine.getDeltaTime() / 1000, .05); elapsed += dt;
  if (!ended) {
    timeLeft -= dt; if (timeLeft <= 0) { timeLeft = 0; finish(false, 'Thời gian 3 phút đã hết.'); }
    const dir = getMoveDirection(); const moving = dir.lengthSquared() > 0; const speed = isDemo ? 24 : (keys.has('shift') ? 9.2 : 6.2);
    if (moving) { const next = tam.position.add(dir.scale(speed * dt)); if (!isBlocked(next)) { tam.position.copyFrom(next); tam.rotation.y = Math.atan2(-dir.x, -dir.z); } }
    animateCharacter(moving);
    camera.target = Vector3.Lerp(camera.target, tam.position.add(new Vector3(0, 2.5, 0)), 1 - Math.pow(.001, dt));
    fishes.forEach((f, i) => {
      if (f.collected) return; f.root.rotation.y += dt * 2.6; f.root.position.y = f.baseY + Math.sin(elapsed * 3 + i) * .18;
      if (Vector3.DistanceSquared(tam.position, f.root.position) < 6.25) { f.collected = true; f.root.setEnabled(false); fishCollected++; showMessage(`Nhặt được cá! ${fishCollected}/${fishTotal}`); updateUi(); }
    });
    monsters.forEach((m, i) => {
      const offset = Math.sin(elapsed * m.speed + m.phase) * m.range; m.root.position.x = m.origin.x + offset;
      m.root.rotation.y = Math.sin(elapsed * m.speed + m.phase) > 0 ? Math.PI / 2 : -Math.PI / 2;
      m.root.position.y = Math.abs(Math.sin(elapsed * 5 + i)) * .16;
      if (!isDemo && invincible <= 0 && Vector3.DistanceSquared(tam.position, m.root.position) < 4) {
        hearts--; invincible = 1.4; showMessage('Bị quái vật đụng trúng!'); const away = tam.position.subtract(m.root.position).normalize(); tam.position.addInPlace(away.scale(3)); updateUi(); if (hearts <= 0) finish(false, 'Cô Tấm đã mất hết sinh lực vì quái vật.');
      }
    });
    invincible = Math.max(0, invincible - dt); tam.setEnabled(!(invincible > 0 && Math.floor(invincible * 10) % 2 === 0));
    if (tam.position.z > 40.5) { if (fishCollected === fishTotal) finish(true); else { tam.position.z = 39.8; showMessage(`Còn thiếu ${fishTotal - fishCollected} con cá!`); } }
    updateUi();
  }
  fishes.forEach((f, i) => { if (!f.collected) { const ring = f.root.getChildren()[3]; if (ring) ring.scaling.setAll(1 + Math.sin(elapsed * 4 + i) * .08); } });
  if (messageTimer > 0) { messageTimer -= dt; if (messageTimer <= 0) ui.message.classList.remove('show'); }
});

updateUi();
engine.runRenderLoop(() => scene.render());
window.addEventListener('resize', () => engine.resize());
scene.executeWhenReady(() => { window.gameReady = true; });
