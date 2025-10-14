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

// Camera setup – closer by default on mobile
let cameraMode = 'auto';
let targetCameraAngle = { theta: Math.PI, phi: Math.PI / 2.8 };
let currentCameraAngle = { ...targetCameraAngle };
let cameraDistance = isMobile ? 8 : 25; // More zoomed-in on mobile

const raycaster = new THREE.Raycaster();

// Billboard focus mode state
let isBillboardFocused = false;
let focusCameraPosition = new THREE.Vector3();
let focusCameraTarget = new THREE.Vector3();
let originalCameraDistance = cameraDistance;

// --- SCENE SETUP ---
const { collidableObjects, videoElement, billboardAudio, billboardFrame, billboardDisplay } = setupScene(scene, audioListener);

// --- PLAYER AND AI SETUP ---
const player = new Player(scene, new THREE.Vector3(0, 1.2, 25));
const aiPlayers = createAIPlayers(scene);

// --- CONTROLS ---
const controls = isMobile ? setupMobileControls(renderer.domElement) : setupControls(renderer.domElement);

if (isMobile) {
    setupMobileExperience(videoElement, billboardAudio);
    // Initialize mobile-specific features
    setupBillboardTapDetection(); // Add billboard tap detection for mobile
} else {
    document.getElementById('mobileControls').style.display = 'none';
    document.getElementById('exitFocusButton').style.display = 'none'; // Hide exit button on desktop
    // For desktop, start media on the first click
    const startMedia = () => {
        if (videoElement.paused) {
            videoElement.play().catch(e => console.error("Video play failed:", e));
        }
        if (billboardAudio && !billboardAudio.isPlaying) {
            billboardAudio.play();
        }
        window.removeEventListener('click', startMedia);
    };
    window.addEventListener('click', startMedia);
}


// --- BILLBOARD FOCUS MODE (MOBILE ONLY) ---
function setupBillboardTapDetection() {
    renderer.domElement.addEventListener('touchstart', (e) => {
        if (isBillboardFocused) return; // Already in focus mode
        
        const touch = e.touches[0];
        const mouse = new THREE.Vector2(
            (touch.clientX / window.innerWidth) * 2 - 1,
            -(touch.clientY / window.innerHeight) * 2 + 1
        );
        
        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects([billboardFrame, billboardDisplay], true);
        
        if (intersects.length > 0) {
            enterBillboardFocusMode();
        }
    });
}

function enterBillboardFocusMode() {
    isBillboardFocused = true;
    originalCameraDistance = cameraDistance;
    // Hide all UI elements
    document.getElementById('ui').style.display = 'none';
    document.getElementById('chatContainer').style.display = 'none';
    document.getElementById('mobileControls').style.display = 'none';
    document.getElementById('systemLog').style.display = 'none';
    document.getElementById('settingsIcon').style.display = 'none';
    document.getElementById('settingsPanel').style.display = 'none';
    
    // Show exit button
    document.getElementById('exitFocusButton').style.display = 'block';
    // Increase audio volume
    if (billboardAudio) {
        billboardAudio.setVolume(1.0);
    }
    
    // Calculate focus camera position (zoomed in on billboard)
    const billboardPosition = billboardFrame.position.clone();
    focusCameraTarget.copy(billboardPosition);
    focusCameraPosition.set(billboardPosition.x, billboardPosition.y, billboardPosition.z + 15);
}

function exitBillboardFocusMode() {
    isBillboardFocused = false;
    cameraDistance = originalCameraDistance;
    // Show all UI elements
    document.getElementById('ui').style.display = 'block';
    document.getElementById('chatContainer').style.display = 'flex';
    document.getElementById('mobileControls').style.display = 'block';
    document.getElementById('systemLog').style.display = 'block';
    document.getElementById('settingsIcon').style.display = 'flex';
    
    // Hide exit button
    document.getElementById('exitFocusButton').style.display = 'none';
    // Reset audio volume
    if (billboardAudio) {
        billboardAudio.setVolume(0.5);
    }
}

// Exit button listener
document.getElementById('exitFocusButton').addEventListener('click', exitBillboardFocusMode);


// --- UI EVENT LISTENERS ---

// Settings panel toggle
document.getElementById('settingsIcon').addEventListener('click', () => {
    const panel = document.getElementById('settingsPanel');
    panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
});
// Camera mode toggle
document.getElementById('cameraToggle').addEventListener('click', () => {
    cameraMode = cameraMode === 'auto' ? 'manual' : 'auto';
    document.getElementById('modeText').textContent = cameraMode === 'auto' ? 'Auto Follow' : 'Manual Control';
});
// Zoom buttons
document.getElementById('zoomInButton').addEventListener('click', () => {
    cameraDistance = Math.max(8, cameraDistance - 3);
});
document.getElementById('zoomOutButton').addEventListener('click', () => {
    cameraDistance = Math.min(50, cameraDistance + 3);
});
// Mute button
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
// Fullscreen toggle
document.getElementById('fullscreenButton').addEventListener('click', toggleFullScreen);

function toggleFullScreen() {
    if (!document.fullscreenElement && !document.webkitFullscreenElement) {
        const elem = document.documentElement;
        if (elem.requestFullscreen) {
            elem.requestFullscreen().catch(err => {
                console.error(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
            });
        } else if (elem.webkitRequestFullscreen) { /* Safari */
            elem.webkitRequestFullscreen();
        }
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.webkitExitFullscreen) { /* Safari */
            document.webkitExitFullscreen();
        }
    }
}


// Chat input: Enter key
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

// Chat Send button
document.getElementById('sendButton').addEventListener('click', () => {
    const input = document.getElementById('chatInput');
    const msg = input.value.trim();
    if (msg) {
        player.showMessage(msg);
        input.value = '';
        input.blur();
    }
});
// --- SYSTEM LOG ---
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
    if (!isBillboardFocused) {
        player.update(deltaTime, controls, camera);
        updateAIPlayers(deltaTime, aiPlayers);
        handleCollisions(player, aiPlayers);
        updateCamera();
        document.getElementById('position').textContent =
            `${player.ball.position.x.toFixed(1)}, ${player.ball.position.y.toFixed(1)}, ${player.ball.position.z.toFixed(1)}`;
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
    // Smoothly interpolate camera to focus position
    camera.position.lerp(focusCameraPosition, 0.1);
    camera.lookAt(focusCameraTarget);
}

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

animate();
