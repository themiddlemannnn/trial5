import { setupScene } from './sceneSetup.js';
import { Player } from './player.js';
import { createAIPlayers, updateAIPlayers } from './ai.js';
// CONDITIONAL: Import the correct controls based on device
// Note: For a real application, you might use dynamic import() for cleaner separation
import { setupControls } from './controls.js';
import { setupMobileControls } from './mobile-controls.js';
import { handleCollisions } from './collisions.js';
// NEW: Import the function to set up the mobile experience
import { setupMobileExperience } from './mobile.js';

// --- INITIALIZATION ---

// Scene and Renderer
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a1a1a);
scene.fog = new THREE.Fog(0x1a1a1a, 60, 100);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

// --- DOM & UI INTERACTIONS ---
// Mobile detection
const isMobile = (() => {
    const hasTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
    const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
    return (hasTouch && mobileRegex.test(navigator.userAgent)) || (hasTouch && window.innerWidth <= 768);
})();


// Camera
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 200);
let cameraMode = 'auto'; // 'auto' or 'manual'
let targetCameraAngle = { theta: Math.PI, phi: Math.PI / 2.8 };
let currentCameraAngle = { ...targetCameraAngle };
// MODIFIED: Set a closer default zoom for mobile devices
let cameraDistance = isMobile ? 18 : 25;
const raycaster = new THREE.Raycaster();

// --- SCENE SETUP ---
const { collidableObjects } = setupScene(scene);

// --- PLAYER AND AI SETUP ---
const player = new Player(scene, new THREE.Vector3(0, 1.2, 25));
const aiPlayers = createAIPlayers(scene);


// --- CONTROLS ---
// Load mobile or desktop controls based on detection
const controls = isMobile ? setupMobileControls(renderer.domElement) : setupControls(renderer.domElement);

// NEW: Call the function to set up the mobile experience
setupMobileExperience();

if (isMobile) {
    document.getElementById('mobileControls').style.display = 'block';
    document.getElementById('controls').style.display = 'none'; // Hide desktop instructions
}

// Settings panel
document.getElementById('settingsIcon').addEventListener('click', () => {
    const panel = document.getElementById('settingsPanel');
    panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
});

document.getElementById('cameraToggle').addEventListener('click', () => {
    cameraMode = cameraMode === 'auto' ? 'manual' : 'auto';
    document.getElementById('modeText').textContent = cameraMode === 'auto' ? 'Auto Follow' : 'Manual Control';
});

// NEW: Event listeners for zoom buttons
document.getElementById('zoomNearBtn').addEventListener('click', () => {
    cameraDistance = 12; // Set camera to a close-up view
});

document.getElementById('zoomFarBtn').addEventListener('click', () => {
    cameraDistance = 35; // Set camera to a wider view
});


// Chat input
document.getElementById('chatInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        const input = e.target;
        const msg = input.value.trim();
        if (msg) {
            player.showMessage(msg);
            input.value = '';
        }
        input.blur(); // Hide keyboard on mobile after sending
    }
});

// System Log Messages (unchanged)
const systemLog = document.getElementById('systemLog');
const aiNames = ['Alex', 'Jordan', 'Sam', 'Riley', 'Casey', 'Morgan', 'Taylor', 'Jamie', 'Avery', 'Cameron', 'Blake', 'Skyler', 'Quinn', 'Reese', 'Dakota'];
setTimeout(() => {
    systemLog.textContent = "You joined the space!";
    setTimeout(() => {
        aiNames.forEach((name, i) => {
            setTimeout(() => {
                systemLog.textContent = `${name} joined the space!`;
            }, i * 800);
        });
    }, 1000);
}, 500);

// --- MAIN LOOP ---
let lastTime = performance.now();

function animate() {
    requestAnimationFrame(animate);
    const currentTime = performance.now();
    const deltaTime = Math.min((currentTime - lastTime) / 1000, 0.1);
    lastTime = currentTime;

    // Update game objects based on input and AI
    player.update(deltaTime, controls, camera);
    updateAIPlayers(deltaTime, aiPlayers);
    
    // Handle all ball-to-ball physics after they have moved
    handleCollisions(player, aiPlayers);

    // Update camera
    updateCamera();

    // Update UI
    document.getElementById('position').textContent =
        `${player.ball.position.x.toFixed(1)}, ${player.ball.position.y.toFixed(1)}, ${player.ball.position.z.toFixed(1)}`;

    // Render the scene
    renderer.render(scene, camera);
}

function updateCamera() {
    // Handle mouse drag rotation (desktop)
    if (controls.isDragging) {
        targetCameraAngle.theta -= controls.mouseDelta.x * 0.008;
        targetCameraAngle.phi -= controls.mouseDelta.y * 0.008;
        controls.mouseDelta = { x: 0, y: 0 }; // Reset delta
    }
     // Handle touch rotation (mobile)
    if (controls.isTouchRotating) {
        targetCameraAngle.theta -= controls.touchDelta.x * 0.01;
        targetCameraAngle.phi -= controls.touchDelta.y * 0.01;
        controls.touchDelta = { x: 0, y: 0 }; // Reset delta
    }
    
    // Auto-rotate camera when strafing in 'auto' mode
    if (cameraMode === 'auto' && !(controls.isDragging || controls.isTouchRotating)) {
        const rotationSpeed = 0.02;
        if (controls.keys['a'] || controls.keys['arrowleft']) targetCameraAngle.theta += rotationSpeed;
        if (controls.keys['d'] || controls.keys['arrowright']) targetCameraAngle.theta -= rotationSpeed;
    }

    // Clamp camera pitch
    targetCameraAngle.phi = Math.max(0.2, Math.min(Math.PI / 2 - 0.1, targetCameraAngle.phi));

    // Handle zoom
    cameraDistance += controls.scrollDelta * 0.03;
    cameraDistance = Math.max(8, Math.min(50, cameraDistance));
    controls.scrollDelta = 0; // Reset scroll delta

    // Smoothly interpolate camera angles
    const lerpFactor = 0.08;
    currentCameraAngle.theta += (targetCameraAngle.theta - currentCameraAngle.theta) * lerpFactor;
    currentCameraAngle.phi += (targetCameraAngle.phi - currentCameraAngle.phi) * lerpFactor;
    
    // Calculate ideal camera position
    const playerHead = new THREE.Vector3(
        player.ball.position.x,
        player.ball.position.y + 2,
        player.ball.position.z
    );

    const idealCamOffset = new THREE.Vector3().setFromSphericalCoords(
        cameraDistance,
        currentCameraAngle.phi,
        currentCameraAngle.theta
    );

    const idealCamPos = playerHead.clone().add(idealCamOffset);

    // Check for collisions between camera and objects
    const camDirection = new THREE.Vector3().subVectors(idealCamPos, playerHead).normalize();
    raycaster.set(playerHead, camDirection);
    raycaster.far = cameraDistance;
    const intersections = raycaster.intersectObjects(collidableObjects);

    if (intersections.length > 0) {
        camera.position.copy(intersections[0].point);
        camera.position.add(intersections[0].face.normal.multiplyScalar(0.5)); // Move slightly away from surface
    } else {
        camera.position.copy(idealCamPos);
    }
    camera.lookAt(playerHead);
}


// --- EVENT LISTENERS ---
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Start the animation loop
animate();
