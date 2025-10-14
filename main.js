import { setupScene } from './sceneSetup.js'; [cite_start]/* [cite: 100] */
import { Player } from './player.js'; [cite_start]/* [cite: 100] */
import { createAIPlayers, updateAIPlayers } from './ai.js'; [cite_start]/* [cite: 100] */
import { setupControls } from './controls.js'; [cite_start]/* [cite: 101] */
import { setupMobileControls } from './mobile-controls.js'; [cite_start]/* [cite: 101] */
import { handleCollisions } from './collisions.js'; [cite_start]/* [cite: 101] */
import { setupMobileExperience } from './mobile.js'; [cite_start]/* [cite: 102] */


// --- INITIALIZATION ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a1a1a);
scene.fog = new THREE.Fog(0x1a1a1a, 60, 100); [cite_start]/* [cite: 103] */

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap; [cite_start]/* [cite: 104] */
document.body.appendChild(renderer.domElement);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 200);
const audioListener = new THREE.AudioListener();
camera.add(audioListener);

// Mobile detection
const isMobile = (() => {
    [cite_start]const hasTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0); /* [cite: 105] */
    const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i; [cite_start]/* [cite: 105] */
    return (hasTouch && mobileRegex.test(navigator.userAgent)) || (hasTouch && window.innerWidth <= 768); [cite_start]/* [cite: 105] */
})();

// Camera setup – closer by default on mobile
let cameraMode = 'auto'; [cite_start]/* [cite: 106] */
let targetCameraAngle = { theta: Math.PI, phi: Math.PI / 2.8 }; [cite_start]/* [cite: 107] */
let currentCameraAngle = { ...targetCameraAngle }; [cite_start]/* [cite: 107] */
let cameraDistance = isMobile ? 8 : 25; [cite_start]/* [cite: 108] */

const raycaster = new THREE.Raycaster();

// Billboard focus mode state
let isBillboardFocused = false; [cite_start]/* [cite: 109] */
let focusCameraPosition = new THREE.Vector3(); [cite_start]/* [cite: 109] */
let focusCameraTarget = new THREE.Vector3(); [cite_start]/* [cite: 109] */
let originalCameraDistance = cameraDistance; [cite_start]/* [cite: 110] */

// --- SCENE SETUP ---
const { collidableObjects, videoElement, billboardAudio, billboardFrame } = setupScene(scene, audioListener); [cite_start]/* [cite: 110] */

// --- PLAYER AND AI SETUP ---
const player = new Player(scene, new THREE.Vector3(0, 1.2, 25)); [cite_start]/* [cite: 111] */
const aiPlayers = createAIPlayers(scene); [cite_start]/* [cite: 111] */

// --- CONTROLS ---
const controls = isMobile ? setupMobileControls(renderer.domElement) : setupControls(renderer.domElement); [cite_start]/* [cite: 112] */

if (isMobile) {
    setupMobileExperience(videoElement, billboardAudio);
    setupBillboardFocusButton(); // Add billboard focus button listener for mobile
} else {
    document.getElementById('mobileControls').style.display = 'none';
    document.getElementById('exitFocusButton').style.display = 'none'; [cite_start]/* [cite: 114] */
    document.getElementById('focusBillboardButton').style.display = 'none'; // Hide focus button on desktop
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
function isBillboardVisible() {
    // 1. Check if the billboard is generally in front of the camera
    const cameraDirection = new THREE.Vector3();
    camera.getWorldDirection(cameraDirection);
    const billboardDirection = new THREE.Vector3().subVectors(billboardFrame.position, camera.position).normalize();
    const dotProduct = cameraDirection.dot(billboardDirection);

    if (dotProduct < 0.3) { // Use a threshold > 0 to ensure it's in the forward view
        return false;
    }

    // 2. Check if the view to the billboard is blocked by a wall or other object
    raycaster.set(camera.position, billboardDirection);
    const allObjects = [billboardFrame, ...collidableObjects];
    const intersects = raycaster.intersectObjects(allObjects);

    // If the first thing we hit is the billboard frame, it's visible.
    if (intersects.length > 0 && intersects[0].object === billboardFrame) {
        return true;
    }

    return false;
}

function setupBillboardFocusButton() {
    document.getElementById('focusBillboardButton').addEventListener('click', () => {
        if (isBillboardFocused) return; // Already in focus mode

        if (isBillboardVisible()) {
            enterBillboardFocusMode();
        } else {
            const log = document.getElementById('systemLog');
            log.textContent = "Billboard not in view.";
            setTimeout(() => {
                // Check if the message is still the one we set before clearing it
                if (log.textContent === "Billboard not in view.") {
                    log.textContent = "";
                }
            }, 2500);
        }
    });
}


function enterBillboardFocusMode() {
    isBillboardFocused = true;
    originalCameraDistance = cameraDistance;
    // Hide all UI elements
    document.getElementById('ui').style.display = 'none'; [cite_start]/* [cite: 120] */
    document.getElementById('chatContainer').style.display = 'none'; [cite_start]/* [cite: 120] */
    document.getElementById('mobileControls').style.display = 'none'; [cite_start]/* [cite: 120] */
    document.getElementById('systemLog').style.display = 'none'; [cite_start]/* [cite: 120] */
    document.getElementById('settingsIcon').style.display = 'none'; [cite_start]/* [cite: 121] */
    document.getElementById('settingsPanel').style.display = 'none'; [cite_start]/* [cite: 121] */
    
    // Show exit button
    document.getElementById('exitFocusButton').style.display = 'block'; [cite_start]/* [cite: 121] */
    // Increase audio volume
    if (billboardAudio) {
        billboardAudio.setVolume(1.0); [cite_start]/* [cite: 122] */
    }
    
    // Calculate focus camera position (zoomed in on billboard)
    const billboardPosition = billboardFrame.position.clone(); [cite_start]/* [cite: 123] */
    focusCameraTarget.copy(billboardPosition); [cite_start]/* [cite: 124] */
    focusCameraPosition.set(billboardPosition.x, billboardPosition.y, billboardPosition.z + 15); [cite_start]/* [cite: 124] */
}

function exitBillboardFocusMode() {
    isBillboardFocused = false;
    cameraDistance = originalCameraDistance;
    // Show all UI elements
    document.getElementById('ui').style.display = 'block'; [cite_start]/* [cite: 125] */
    document.getElementById('chatContainer').style.display = 'flex'; [cite_start]/* [cite: 125] */
    document.getElementById('mobileControls').style.display = 'block'; [cite_start]/* [cite: 125] */
    document.getElementById('systemLog').style.display = 'block'; [cite_start]/* [cite: 125] */
    document.getElementById('settingsIcon').style.display = 'flex'; [cite_start]/* [cite: 126] */
    
    // Hide exit button
    document.getElementById('exitFocusButton').style.display = 'none'; [cite_start]/* [cite: 126] */
    // Reset audio volume
    if (billboardAudio) {
        billboardAudio.setVolume(0.5); [cite_start]/* [cite: 127] */
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
    [cite_start]cameraMode = cameraMode === 'auto' ? 'manual' : 'auto'; /* [cite: 129] */
    document.getElementById('modeText').textContent = cameraMode === 'auto' ? 'Auto Follow' : 'Manual Control'; [cite_start]/* [cite: 129] */
});
// Zoom buttons
document.getElementById('zoomInButton').addEventListener('click', () => {
    [cite_start]cameraDistance = Math.max(8, cameraDistance - 3); /* [cite: 130] */
});
document.getElementById('zoomOutButton').addEventListener('click', () => {
    [cite_start]cameraDistance = Math.min(50, cameraDistance + 3); /* [cite: 131] */
});
// Mute button
document.getElementById('muteButton').addEventListener('click', () => {
    [cite_start]const button = document.getElementById('muteButton'); /* [cite: 132] */
    if (billboardAudio.isPlaying) {
        billboardAudio.pause(); [cite_start]/* [cite: 132] */
        button.textContent = 'Unmute Audio'; [cite_start]/* [cite: 132] */
    } else {
        billboardAudio.play(); [cite_start]/* [cite: 132] */
        button.textContent = 'Mute Audio'; [cite_start]/* [cite: 132] */
    }
});
// Fullscreen toggle
document.getElementById('fullscreenButton').addEventListener('click', toggleFullScreen); [cite_start]/* [cite: 133] */

function toggleFullScreen() {
    if (!document.fullscreenElement && !document.webkitFullscreenElement) {
        const elem = document.documentElement;
        if (elem.requestFullscreen) {
            elem.requestFullscreen().catch(err => {
                console.error(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
            });
        [cite_start]} else if (elem.webkitRequestFullscreen) { /* Safari */ /* [cite: 135] */
            elem.webkitRequestFullscreen();
        }
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        [cite_start]} else if (document.webkitExitFullscreen) { /* Safari */ /* [cite: 137] */
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
    [cite_start]const input = document.getElementById('chatInput'); /* [cite: 139] */
    const msg = input.value.trim(); [cite_start]/* [cite: 139] */
    if (msg) {
        player.showMessage(msg); [cite_start]/* [cite: 139] */
        input.value = ''; [cite_start]/* [cite: 139] */
        input.blur(); [cite_start]/* [cite: 139] */
    }
});
// --- SYSTEM LOG ---
const systemLog = document.getElementById('systemLog'); [cite_start]/* [cite: 140] */
const aiNames = ['Alex', 'Jordan', 'Sam', 'Riley', 'Casey', 'Morgan', 'Taylor', 'Jamie', 'Avery', 'Cameron', 'Blake', 'Skyler', 'Quinn', 'Reese', 'Dakota']; [cite_start]/* [cite: 140] */
setTimeout(() => {
    [cite_start]systemLog.textContent = "You joined the space!"; /* [cite: 141] */
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
    const deltaTime = Math.min((currentTime - lastTime) / 1000, 0.1); [cite_start]/* [cite: 143] */
    lastTime = currentTime;
    [cite_start]if (!isBillboardFocused) { /* [cite: 144] */
        player.update(deltaTime, controls, camera); [cite_start]/* [cite: 144] */
        updateAIPlayers(deltaTime, aiPlayers); [cite_start]/* [cite: 144] */
        handleCollisions(player, aiPlayers); [cite_start]/* [cite: 144] */
        updateCamera(); [cite_start]/* [cite: 144] */
        // Position update removed as requested
    } else {
        updateFocusCamera(); [cite_start]/* [cite: 146] */
    }

    renderer.render(scene, camera);
}

function updateCamera() {
    if (controls.isDragging) {
        targetCameraAngle.theta -= controls.mouseDelta.x * 0.008; [cite_start]/* [cite: 147] */
        targetCameraAngle.phi -= controls.mouseDelta.y * 0.008; [cite_start]/* [cite: 148] */
        controls.mouseDelta = { x: 0, y: 0 }; [cite_start]/* [cite: 148] */
    }
    if (controls.isTouchRotating) {
        targetCameraAngle.theta -= controls.touchDelta.x * 0.01; [cite_start]/* [cite: 149] */
        targetCameraAngle.phi -= controls.touchDelta.y * 0.01; [cite_start]/* [cite: 150] */
        controls.touchDelta = { x: 0, y: 0 }; [cite_start]/* [cite: 150] */
    }

    if (cameraMode === 'auto' && !(controls.isDragging || controls.isTouchRotating)) {
        const rotationSpeed = 0.02;
        if (controls.keys['a'] || controls.keys['arrowleft']) targetCameraAngle.theta += rotationSpeed; [cite_start]/* [cite: 152] */
        if (controls.keys['d'] || controls.keys['arrowright']) targetCameraAngle.theta -= rotationSpeed; [cite_start]/* [cite: 152] */
    }

    targetCameraAngle.phi = Math.max(0.2, Math.min(Math.PI / 2 - 0.1, targetCameraAngle.phi)); [cite_start]/* [cite: 153] */

    cameraDistance += controls.scrollDelta * 0.03;
    cameraDistance = Math.max(8, Math.min(50, cameraDistance)); [cite_start]/* [cite: 154] */
    controls.scrollDelta = 0; [cite_start]/* [cite: 154] */

    const lerpFactor = 0.08;
    currentCameraAngle.theta += (targetCameraAngle.theta - currentCameraAngle.theta) * lerpFactor; [cite_start]/* [cite: 155] */
    currentCameraAngle.phi += (targetCameraAngle.phi - currentCameraAngle.phi) * lerpFactor; [cite_start]/* [cite: 155] */

    const playerHead = new THREE.Vector3(
        player.ball.position.x,
        player.ball.position.y + 2,
        player.ball.position.z
    );
    const idealCamOffset = new THREE.Vector3().setFromSphericalCoords(
        cameraDistance,
        currentCameraAngle.phi,
        currentCameraAngle.theta
    ); [cite_start]/* [cite: 156] */
    const idealCamPos = playerHead.clone().add(idealCamOffset); [cite_start]/* [cite: 157] */

    const camDirection = new THREE.Vector3().subVectors(idealCamPos, playerHead).normalize(); [cite_start]/* [cite: 157] */
    raycaster.set(playerHead, camDirection); [cite_start]/* [cite: 157] */
    raycaster.far = cameraDistance; [cite_start]/* [cite: 157] */
    const intersections = raycaster.intersectObjects(collidableObjects); [cite_start]/* [cite: 157] */
    if (intersections.length > 0) {
        camera.position.copy(intersections[0].point); [cite_start]/* [cite: 158] */
        camera.position.add(intersections[0].face.normal.multiplyScalar(0.5)); [cite_start]/* [cite: 158] */
    } else {
        camera.position.copy(idealCamPos); [cite_start]/* [cite: 159] */
    }

    camera.lookAt(playerHead);
}

function updateFocusCamera() {
    // Smoothly interpolate camera to focus position
    camera.position.lerp(focusCameraPosition, 0.1); [cite_start]/* [cite: 160] */
    camera.lookAt(focusCameraTarget); [cite_start]/* [cite: 160] */
}

window.addEventListener('resize', () => {
    [cite_start]camera.aspect = window.innerWidth / window.innerHeight; /* [cite: 161] */
    camera.updateProjectionMatrix(); [cite_start]/* [cite: 161] */
    renderer.setSize(window.innerWidth, window.innerHeight); [cite_start]/* [cite: 161] */
});
animate(); [cite_start]/* [cite: 162] */
