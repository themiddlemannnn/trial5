import { setupScene } from './sceneSetup.js';
import { Player } from './player.js';
import { createAIPlayers, updateAIPlayers } from './ai.js';
import { setupControls } from './controls.js';
import { setupMobileControls } from './mobile-controls.js';
import { handleCollisions } from './collisions.js';
import { setupMobileExperience } from './mobile.js';

// --- INITIALIZATION ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a1a1a);
scene.fog = new THREE.Fog(0x1a1a1a, 60, 100);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 200);
const audioListener = new THREE.AudioListener();
camera.add(audioListener);

// Mobile detection
const isMobile = (() => {
    const hasTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
    const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
    return (hasTouch && mobileRegex.test(navigator.userAgent)) || (hasTouch && window.innerWidth <= 768);
})();

// Camera setup
let cameraMode = 'auto';
let targetCameraAngle = { theta: Math.PI, phi: Math.PI / 2.8 };
let currentCameraAngle = { ...targetCameraAngle };
let cameraDistance = isMobile ? 8 : 25;
const raycaster = new THREE.Raycaster();

// Billboard focus mode state
let isBillboardFocused = false;
let focusCameraPosition = new THREE.Vector3();
let focusCameraTarget = new THREE.Vector3();
let originalCameraDistance = cameraDistance;

// --- SCENE SETUP ---
const { collidableObjects, videoElement, billboardAudio, billboardFrame } = setupScene(scene, audioListener);

// --- PLAYER AND AI SETUP ---
const player = new Player(scene, new THREE.Vector3(0, 1.2, 25));
const aiPlayers = createAIPlayers(scene);

// --- CONTROLS ---
const controls = isMobile ? setupMobileControls(renderer.domElement) : setupControls(renderer.domElement);

if (isMobile) {
    setupMobileExperience(videoElement, billboardAudio);
} else {
    document.getElementById('mobileControls').style.display = 'none';
    document.getElementById('exitFocusButton').style.display = 'none';
    const startMedia = () => {
        if (videoElement.paused) videoElement.play().catch(e => console.error("Video play failed:", e));
        if (billboardAudio && !billboardAudio.isPlaying) billboardAudio.play();
        window.removeEventListener('click', startMedia);
    };
    window.addEventListener('click', startMedia);
}

// --- NEW: Can player see the billboard? ---
function canSeeBillboard() {
    const playerPos = player.ball.position.clone();
    const billboardPos = billboardFrame.position.clone();
    const toBillboard = new THREE.Vector3().subVectors(billboardPos, playerPos);
    toBillboard.y = 0;
    if (toBillboard.lengthSq() === 0) return false;
    if (toBillboard.length() > 40) return false;
    const cameraForward = new THREE.Vector3();
    camera.getWorldDirection(cameraForward);
    cameraForward.y = 0;
    cameraForward.normalize();
    const angle = cameraForward.angleTo(toBillboard.normalize());
    if (angle > Math.PI / 2) return false;
    raycaster.set(playerPos, toBillboard.clone().normalize());
    raycaster.far = toBillboard.length();
    const intersects = raycaster.intersectObjects(collidableObjects);
    for (const hit of intersects) {
        if (hit.object !== billboardFrame && hit.object !== billboardFrame.children[0]) {
            return false;
        }
    }
    return true;
}

// --- NEW: Focus Button Listener ---
document.getElementById('focusBillboardButton').addEventListener('click', () => {
    if (!isBillboardFocused && canSeeBillboard()) {
        enterBillboardFocusMode();
    }
});

// --- BILLBOARD FOCUS MODE ---
function enterBillboardFocusMode() {
    isBillboardFocused = true;
    originalCameraDistance = cameraDistance;
    // Hide all UI
    document.getElementById('ui').style.display = 'none';
    document.getElementById('chatContainer').style.display = 'none';
    document.getElementById('systemLog').style.display = 'none';
    document.getElementById('settingsIcon').style.display = 'none';
    document.getElementById('mobileControls').style.display = isMobile ? 'none' : 'none';
    // Show exit button
    document.getElementById('exitFocusButton').style.display = 'block';
    // Audio
    if (billboardAudio) {
        billboardAudio.setVolume(1.0);
    }
    // Camera target
    const billboardPosition = billboardFrame.position.clone();
    focusCameraTarget.copy(billboardPosition);
    focusCameraPosition.copy(billboardPosition).add(new THREE.Vector3(0, 3, 12));
}

function exitBillboardFocusMode() {
    isBillboardFocused = false;
    cameraDistance = originalCameraDistance;
    // Show all UI
    document.getElementById('ui').style.display = 'block';
    document.getElementById('chatContainer').style.display = 'flex';
    document.getElementById('systemLog').style.display = 'block';
    document.getElementById('settingsIcon').style.display = 'flex';
    document.getElementById('mobileControls').style.display = isMobile ? 'block' : 'none';
    // Hide exit button
    document.getElementById('exitFocusButton').style.display = 'none';
    // Reset audio
    if (billboardAudio) {
        billboardAudio.setVolume(0.5);
    }
    // Close settings if open
    document.getElementById('settingsPanel').style.display = 'none';
}

document.getElementById('exitFocusButton').addEventListener('click', exitBillboardFocusMode);

// --- UI EVENT LISTENERS ---
document.getElementById('settingsIcon').addEventListener('click', () => {
    document.getElementById('settingsPanel').style.display = 'block';
});

document.getElementById('closeSettingsButton').addEventListener('click', () => {
    document.getElementById('settingsPanel').style.display = 'none';
});

document.getElementById('howToPlayButton').addEventListener('click', () => {
    const content = document.getElementById('howToPlayContent');
    content.style.display = content.style.display === 'none' ? 'block' : 'none';
});

document.getElementById('cameraToggle').addEventListener('click', () => {
    cameraMode = cameraMode === 'auto' ? 'manual' : 'auto';
    document.getElementById('modeText').textContent = cameraMode === 'auto' ? 'Auto Follow' : 'Manual Control';
});

document.getElementById('zoomInButton').addEventListener('click', () => {
    cameraDistance = Math.max(8, cameraDistance - 3);
});

document.getElementById('zoomOutButton').addEventListener('click', () => {
    cameraDistance = Math.min(50, cameraDistance + 3);
});

document.getElementById('muteButton').addEventListener('click', () => {
    const button = document.getElementById('muteButton');
    if (billboardAudio.isPlaying) {
        billboardAudio.pause();
        button.textContent = 'Unmute Audio';
    } else {
        billboardAudio.play();
        button.textContent = 'Mute Audio';
    }
});

document.getElementById('fullscreenButton').addEventListener('click', toggleFullScreen);

function toggleFullScreen() {
    if (!document.fullscreenElement && !document.webkitFullscreenElement) {
        const elem = document.documentElement;
        if (elem.requestFullscreen) {
            elem.requestFullscreen().catch(err => console.error(`Error: ${err.message}`));
        } else if (elem.webkitRequestFullscreen) {
            elem.webkitRequestFullscreen();
        }
    } else {
        if (document.exitFullscreen) document.exitFullscreen();
        else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
    }
}

// Chat
document.getElementById('chatInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        const input = e.target;
        const msg = input.value.trim();
        if (msg) {
            player.showMessage(msg);
            input.value = '';
            input.blur();
        }
    }
});

document.getElementById('sendButton').addEventListener('click', () => {
    const input = document.getElementById('chatInput');
    const msg = input.value.trim();
    if (msg) {
        player.showMessage(msg);
        input.value = '';
        input.blur();
    }
});

// System Log
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

    // ✅ FIX: Always update AI players, even in focus mode
    updateAIPlayers(deltaTime, aiPlayers);

    if (!isBillboardFocused) {
        player.update(deltaTime, controls, camera);
        handleCollisions(player, aiPlayers);
        updateCamera();
    } else {
        updateFocusCamera();
    }

    renderer.render(scene, camera);
}

function updateCamera() {
    if (controls.isDragging) {
        targetCameraAngle.theta -= controls.mouseDelta.x * 0.008;
        targetCameraAngle.phi -= controls.mouseDelta.y * 0.008;
        controls.mouseDelta = { x: 0, y: 0 };
    }
    if (controls.isTouchRotating) {
        targetCameraAngle.theta -= controls.touchDelta.x * 0.01;
        targetCameraAngle.phi -= controls.touchDelta.y * 0.01;
        controls.touchDelta = { x: 0, y: 0 };
    }
    if (cameraMode === 'auto' && !(controls.isDragging || controls.isTouchRotating)) {
        const rotationSpeed = 0.02;
        if (controls.keys['a'] || controls.keys['arrowleft']) targetCameraAngle.theta += rotationSpeed;
        if (controls.keys['d'] || controls.keys['arrowright']) targetCameraAngle.theta -= rotationSpeed;
    }
    targetCameraAngle.phi = Math.max(0.2, Math.min(Math.PI / 2 - 0.1, targetCameraAngle.phi));
    cameraDistance += controls.scrollDelta * 0.03;
    cameraDistance = Math.max(8, Math.min(50, cameraDistance));
    controls.scrollDelta = 0;
    const lerpFactor = 0.08;
    currentCameraAngle.theta += (targetCameraAngle.theta - currentCameraAngle.theta) * lerpFactor;
    currentCameraAngle.phi += (targetCameraAngle.phi - currentCameraAngle.phi) * lerpFactor;
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
    const camDirection = new THREE.Vector3().subVectors(idealCamPos, playerHead).normalize();
    raycaster.set(playerHead, camDirection);
    raycaster.far = cameraDistance;
    const intersections = raycaster.intersectObjects(collidableObjects);
    if (intersections.length > 0) {
        camera.position.copy(intersections[0].point);
        camera.position.add(intersections[0].face.normal.multiplyScalar(0.5));
    } else {
        camera.position.copy(idealCamPos);
    }
    camera.lookAt(playerHead);
}

function updateFocusCamera() {
    camera.position.lerp(focusCameraPosition, 0.1);
    camera.lookAt(focusCameraTarget);
}

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

animate();
