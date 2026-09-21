import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';
import { SUBTRACTION, Brush, Evaluator } from 'three-bvh-csg';

// --- LÓGICA DE LA PANTALLA DE INICIO Y AUDIO ---
const audio = new Audio('musica.mp3');
audio.loop = true; // Para que la música se repita
const startScreen = document.getElementById('startScreen');
let animationStarted = false;

function startExperience() {
    if (animationStarted) return;
    animationStarted = true;
    
    // 1. Reproducir música
    audio.play().catch(e => console.log("Audio esperando interacción", e));
    
    // 2. Desvanecer la pantalla de inicio
    startScreen.classList.add('hidden');
    
    // 3. Eliminarla del todo para que no interfiera
    setTimeout(() => {
        startScreen.style.display = 'none';
    }, 500);
}

// Escuchar toques o clics en la pantalla de inicio
startScreen.addEventListener('click', startExperience);
startScreen.addEventListener('touchstart', startExperience, { passive: false });


// --- CONFIGURACIÓN DE LA ESCENA 3D ---
const canvas = document.getElementById('canvas');
const scene = new THREE.Scene();

// OPTIMIZACIÓN MÓVIL: Limita la densidad de píxeles para que no se trabe
const pixelRatio = Math.min(window.devicePixelRatio, 2);
const renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
renderer.setPixelRatio(pixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);

// Cámara
const camera = new THREE.PerspectiveCamera(35, window.innerWidth / window.innerHeight, 0.1, 150);
camera.position.set(0, 0, 50 * Math.sqrt(2));
camera.lookAt(0, 0, 0);

// Luces
scene.add(new THREE.AmbientLight(0xffffff, 0.3));
const dirLight = new THREE.DirectionalLight(0xffffff, 1);
dirLight.position.set(0, 100, 0);
scene.add(dirLight);
scene.fog = new THREE.FogExp2(0xf5b1aa, 0.005);

// Cargar entorno HDRI
const loader = new THREE.TextureLoader();
loader.setCrossOrigin('');
loader.load('https://happy358.github.io/Images/HDR/kloofendal_48d_partly_cloudy_puresky_2k.jpg', (texture) => {
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.mapping = THREE.EquirectangularReflectionMapping;
    scene.environment = texture;
});

// Crear la forma geométrica del corazón
let capsule = new THREE.CapsuleGeometry(3, 6, 5, 20);
capsule.rotateZ(-Math.PI / 3.78);
capsule.translate(0, -1, 0);
capsule.scale(1, 1, 0.85);
capsule.scale(0.24, 0.24, 0.24);

capsule.computeBoundingBox();
const w = capsule.boundingBox.max.x - capsule.boundingBox.min.x;
const h = capsule.boundingBox.max.y - capsule.boundingBox.min.y;

let box = new THREE.BoxGeometry(w * 2, h * 2, w * 2);
box.translate(-w, 0, 0);

const evaluator = new Evaluator();
evaluator.useGroups = false;
const brush1 = new Brush(capsule, new THREE.MeshBasicMaterial());
const brush2 = new Brush(box, new THREE.MeshBasicMaterial());

const halfHeart = evaluator.evaluate(brush1, brush2, SUBTRACTION).geometry;
const halfHeart2 = halfHeart.clone();
halfHeart2.rotateY(Math.PI);

let heartGeom = BufferGeometryUtils.mergeGeometries([halfHeart, halfHeart2]);
heartGeom = BufferGeometryUtils.mergeVertices(heartGeom);
heartGeom.computeVertexNormals();

// Material de los corazones
const material = new THREE.MeshStandardMaterial({ metalness: 1, roughness: 0 });

// OPTIMIZACIÓN MÓVIL: Reducir cantidad de elementos si es un celular
const isMobile = window.innerWidth < 768;
const HEART_COUNT = isMobile ? 250 : 700; // En móvil genera 250, en PC 700
const PARTICLE_COUNT = isMobile ? 80 : 220;
const SPREAD = 50;

// Crear Instancias de Corazones
const heartsMesh = new THREE.InstancedMesh(heartGeom, material, HEART_COUNT);
const dummy = new THREE.Object3D();
const color = new THREE.Color();

for (let i = 0; i < HEART_COUNT; i++) {
    dummy.position.set(
        (Math.random() * 2 - 1) * SPREAD,
        (Math.random() * 2 - 1) * SPREAD,
        (Math.random() * 2 - 1) * SPREAD
    );
    dummy.rotation.set(0, Math.random() * Math.PI * 2, Math.random() * Math.PI * 2);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    heartsMesh.setMatrixAt(i, dummy.matrix);
    
    // Colores aleatorios en tonos rosados/rojos
    color.setHSL(THREE.MathUtils.randFloat(0.97, 1.0), 1.0, THREE.MathUtils.randFloat(0.45, 0.7));
    heartsMesh.setColorAt(i, color);
}
scene.add(heartsMesh);

// Crear Instancias de Partículas (Esferas chiquitas flotantes)
const particleGeom = new THREE.SphereGeometry(0.3, 10, 10);
const particleMat = material.clone();
particleMat.color.set('deeppink');
particleMat.roughness = 0.3;

const particlesMesh = new THREE.InstancedMesh(particleGeom, particleMat, PARTICLE_COUNT);
for (let i = 0; i < PARTICLE_COUNT; i++) {
    dummy.position.set(
        (Math.random() * 2 - 1) * SPREAD,
        (Math.random() * 2 - 1) * SPREAD,
        (Math.random() * 2 - 1) * SPREAD
    );
    dummy.rotation.set(0, Math.random() * Math.PI * 2, Math.random() * Math.PI * 2);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    particlesMesh.setMatrixAt(i, dummy.matrix);
}
scene.add(particlesMesh);

// Controles y Rotación Automática
const controls = new OrbitControls(camera, renderer.domElement);
controls.autoRotate = true;
controls.autoRotateSpeed = 1.5;
controls.enableDamping = true;
controls.enablePan = false;
controls.enableZoom = false; // Desactivado para que no interfiera al hacer scroll
controls.target.set(0, 0, 0);

// Evento para adaptar tamaño si se gira el celular
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Bucle de Animación
function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}
animate();
