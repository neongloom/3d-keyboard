import * as THREE from './build/three.module.js';

import Stats from './jsm/stats.module.js';

import { OrbitControls } from './jsm/OrbitControls.js';
import { GLTFLoader } from './jsm/GLTFLoader.js';
import { DRACOLoader } from './jsm/DRACOLoader.js';

let stats, controls;
let renderer, scene, camera;
let clock = new THREE.Clock();

let mouse = new THREE.Vector2(),
  INTERSECTED;
let raycaster;
let model;
let pressed = false;

let mixers = [];
let keys = [];
let samples = [
  new Audio('samples/194795.mp3'),
  new Audio('samples/194796.mp3'),
  new Audio('samples/194797.mp3'),
  new Audio('samples/194798.mp3'),
  new Audio('samples/194799.mp3')
];

init();
animate();

function init() {
  const container = document.querySelector('#container');
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.physicallyCorrectLights = true;
  renderer.renderReverseSided = true;

  renderer.outputEncoding = THREE.sRGBEncoding;
  container.appendChild(renderer.domElement);

  stats = new Stats();
  container.appendChild(stats.dom);

  // camera
  camera = new THREE.PerspectiveCamera(
    45,
    window.innerWidth / window.innerHeight,
    0.01,
    90
  );
  camera.position.set(0, 0.3, 0.0);
  camera.lookAt(new THREE.Vector3(0, 0, 0));

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xffffff);
  // scene.fog = new THREE.Fog(0xffffff, 15, 52);
  // scene.fog = new THREE.FogExp2(0xffffff, 0.03);

  let light = new THREE.HemisphereLight(0xffffff, 0x101010, 0.2); // sky color, ground color, intensity
  light.position.set(0, 8, 0);
  scene.add(light);

  light = new THREE.DirectionalLight(0xbabfba);
  light.intensity = 3;
  light.position.set(-3, 6, 2);
  light.target.position.set(0, 0, 0);
  light.castShadow = true;

  light.shadow.bias = -0.0001;
  light.shadow.mapSize.width = 4096;
  light.shadow.mapSize.height = 4096;
  light.shadow.camera.near = 0.001;
  light.shadow.camera.far = 10;
  light.shadow.radius = 4;
  light.decay = 2;

  light.shadow.camera.left = -0.2;
  light.shadow.camera.right = 0.2;
  light.shadow.camera.top = 0.2;
  light.shadow.camera.bottom = -0.2;

  scene.add(light);

  light = new THREE.DirectionalLight(0xbabfba);
  light.intensity = 1;
  light.position.set(5, 6, -6);
  light.target.position.set(0, 0, 0);
  light.castShadow = true;

  light.shadow.bias = -0.0001;
  light.shadow.mapSize.width = 2048;
  light.shadow.mapSize.height = 2048;
  light.shadow.camera.near = 0.001;
  light.shadow.camera.far = 10;
  light.shadow.radius = 4;
  light.decay = 2;

  light.shadow.camera.left = -0.2;
  light.shadow.camera.right = 0.2;
  light.shadow.camera.top = 0.2;
  light.shadow.camera.bottom = -0.2;

  scene.add(light);
  // scene.add(light.target);

  let floorTex = [
    // new THREE.TextureLoader().load(
    //   'mat/white_norway_spruce_quarter_cut_Base_Color.jpg'
    // ),
    // new THREE.TextureLoader().load(
    //   'mat/white_norway_spruce_quarter_cut_Normal.jpg'
    // ),
    // new THREE.TextureLoader().load(
    //   'mat/white_norway_spruce_quarter_cut_Roughness.jpg'
    // ),

    new THREE.TextureLoader().load('mat/black_koto_quarter_cut_Base_Color.jpg'),
    new THREE.TextureLoader().load('mat/black_koto_quarter_cut_Normal.jpg'),
    new THREE.TextureLoader().load('mat/black_koto_quarter_cut_Roughness.jpg'),

    new THREE.TextureLoader().load('mat/black_ash_quarter_cut_Base_Color.jpg'),
    new THREE.TextureLoader().load('mat/black_ash_quarter_cut_Normal.jpg'),
    new THREE.TextureLoader().load('mat/black_ash_quarter_cut_Roughness.jpg')
  ];

  floorTex.forEach(i => {
    i.wrapS = THREE.RepeatWrapping;
    i.wrapT = THREE.RepeatWrapping;
    i.repeat.set(10, 10);
  });

  let deskMat = new THREE.MeshStandardMaterial({
    map: floorTex[0],
    normalMap: floorTex[1],
    roughnessMap: floorTex[2],
    color: 0x505050
  });

  let plainMat = new THREE.MeshStandardMaterial({
    color: 0x404040
  });

  // ground
  let ground = new THREE.Mesh(new THREE.PlaneBufferGeometry(3, 3), deskMat);
  ground.rotation.x = -Math.PI / 2;
  // ground.position.y -= 0.01;
  scene.add(ground);
  ground.receiveShadow = true;

  let gltfLoader = new GLTFLoader();

  let positionKF = new THREE.VectorKeyframeTrack(
    '.position',
    [0, 0.02],
    [0, 0, 0, 0, -0.004, 0]
  );
  let releasePositionKF = new THREE.VectorKeyframeTrack(
    '.position',
    [0, 0.01],
    [0, 0, 0, 0, 0.004, 0]
  );

  let colorKF = new THREE.ColorKeyframeTrack(
    '.material.color',
    [0, 1, 2],
    [1, 0, 0, 0, 1, 0, 0, 0, 1],
    THREE.InterpolateDiscrete
  );

  // create an animation sequence with the tracks
  //
  let clip = new THREE.AnimationClip('Action', 0.02, [positionKF]);
  let clip2 = new THREE.AnimationClip('Action2', 0.01, [releasePositionKF]);

  gltfLoader.load('keeb.glb', gltf => {
    model = gltf.scene;
    scene.add(model);

    model.scale.set(1, 1, 1);
    model.traverse(obj => {
      if (obj.castShadow !== undefined) {
        obj.castShadow = true;
        obj.receiveShadow = true;
      }

      if (obj.isMesh) {
        let newMix = new THREE.AnimationMixer(obj);

        let keypress = newMix.clipAction(clip);
        keypress.setLoop(THREE.LoopOnce);
        keypress.clampWhenFinished = true;

        let keyrelease = newMix.clipAction(clip2);
        keyrelease.setLoop(THREE.LoopOnce);
        keyrelease.clampWhenFinished = true;

        keys.push({
          name: obj.name,
          actionRelease: keyrelease,
          actionPress: keypress,
          pressed: false
        });
        //   roughnessMipmapper.generateMipmaps(obj.material);

        newMix.addEventListener('finished', e => {
          if (e.action._clip.name === 'Action2') {
            keyrelease.reset();
            keyrelease.stop();
            keypress.reset();
            keypress.stop();
          }
        });
        mixers.push(newMix);
      }
    });

    // roughnessMipmapper.dispose();
  });

  renderer.shadowMap.enabled = true;
  // renderer.shadowMap.type = THREE.VSMShadowMap;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  // renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.shadowMapSoft = true;

  // for accurate colors
  renderer.gammaFactor = 2.2;
  renderer.gammaOutput = true;

  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;

  // controls = new OrbitControls(camera, renderer.domElement);
  // controls.target.set(0, 0, 0);
  // controls.update();

  raycaster = new THREE.Raycaster();

  window.addEventListener('resize', onWindowResize, false);
  window.addEventListener('keydown', keyDown, false);
  window.addEventListener('keyup', keyUp, false);
  window.addEventListener('mousemove', onDocumentMouseMove, false);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function keyDown(e) {
  let keycode = e.keyCode;
  const loc = e.location;
  const keyLoc = `${keycode}${loc}`;

  let clip;
  if (loc === 0) {
    clip = keys.find(clipObj => clipObj.name == keycode);
  } else {
    clip = keys.find(clipObj => clipObj.name == keyLoc);
    console.log(clip.name);
  }
  clip.actionPress.play();

  if (clip.pressed == false) {
    clip.pressed = true;
    let sampleNum = Math.floor(Math.random() * 5);
    samples[sampleNum].play();
  }
}

function keyUp(e) {
  const keycode = e.keyCode;
  const loc = e.location;
  const keyLoc = `${keycode}${loc}`;

  let clip;
  if (loc == 0) {
    clip = keys.find(clipObj => clipObj.name == keycode);
  } else {
    clip = keys.find(clipObj => clipObj.name == keyLoc);
  }
  clip.actionRelease.play();
  clip.pressed = false;
}

function animate() {
  requestAnimationFrame(animate);

  let delta = clock.getDelta();

  // controls.update(delta);
  if (mixers)
    mixers.forEach(i => {
      i.update(delta);
    });
  stats.update();

  renderer.render(scene, camera);
}

function onDocumentMouseMove(event) {
  event.preventDefault();

  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
}

function getIntersects(x, y) {
  x = (x / window.innerWidth) * 2 - 1;
  y = -(y / window.innerHeight) * 2 + 1;

  mouseVector.set(x, y, 0.5);
  raycaster.setFromCamera(mouseVector, camera);

  return raycaster.intersectObject(group, true);
}
