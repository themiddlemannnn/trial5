/**
 * Sets up all user touch input handlers for mobile devices.
 * @param {HTMLElement} domElement The canvas element to attach listeners to.
 * @param {THREE.Camera} camera The main scene camera for raycasting.
 * @param {Array<THREE.Object3D>} tapTargets An array of objects to check for taps.
 * @param {Function} onTapTargetCallback The function to call when a target is tapped.
 * @returns {Object} A controls state object for mobile gameplay.
 */
export function setupMobileControls(domElement, camera, tapTargets, onTapTargetCallback) {
    const controls = {
        keys: {},
        isDragging: false,
        mouseDelta: { x: 0, y: 0 },
        scrollDelta: 0,
        joystickActive: false,
        joystickDirection: { x: 0, y: 0 },
        mobileJump: false,
        mobileSprint: false,
        isTouchRotating: false,
        touchDelta: { x: 0, y: 0 },
    };

    // --- DOM Element References ---
    const joystickArea = document.getElementById('joystickArea');
    const joystickStick = document.getElementById('joystickStick');
    const jumpButton = document.getElementById('jumpButton');
    const sprintButton = document.getElementById('sprintButton');
    const raycaster = new THREE.Raycaster();

    // --- State Variables ---
    let joystickTouchId = null;
    let cameraTouchId = null;
    let cameraTouchStart = { x: 0, y: 0 };

    // --- Joystick Logic ---
    function updateJoystick(touch) {
        const rect = joystickArea.getBoundingClientRect();
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const maxDistance = rect.width / 2 - 30;
        let deltaX = touch.clientX - rect.left - centerX;
        let deltaY = touch.clientY - rect.top - centerY;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        if (distance > maxDistance) {
            deltaX = (deltaX / distance) * maxDistance;
            deltaY = (deltaY / distance) * maxDistance;
        }
        joystickStick.style.transform = `translate(-50%, -50%) translate(${deltaX}px, ${deltaY}px)`;
        controls.joystickDirection.x = deltaX / maxDistance;
        controls.joystickDirection.y = deltaY / maxDistance;
    }

    // --- Joystick Touch ---
    joystickArea.addEventListener('touchstart', (e) => {
        e.preventDefault();
        if (joystickTouchId === null) {
            const touch = e.changedTouches[0];
            joystickTouchId = touch.identifier;
            controls.joystickActive = true;
            updateJoystick(touch);
        }
    }, { passive: false });

    // --- Camera and Billboard Tap Logic (Unified Handler) ---
    domElement.addEventListener('touchstart', (e) => {
        // Ignore taps that aren't directly on the canvas (e.g., on UI buttons)
        if (e.target !== domElement) return;
        
        const touch = e.changedTouches[0];

        // 1. Check for Billboard Tap first
        const mouse = new THREE.Vector2(
            (touch.clientX / window.innerWidth) * 2 - 1,
            -(touch.clientY / window.innerHeight) * 2 + 1
        );
        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(tapTargets, true);

        if (intersects.length > 0) {
            onTapTargetCallback(); // Trigger the focus mode
            return; // Stop processing to prevent camera rotation
        }

        // 2. If no billboard was tapped, proceed with camera rotation
        e.preventDefault();
        // Assign a second touch for camera if not already assigned
        for (const t of e.changedTouches) {
            if (joystickTouchId === null || t.identifier !== joystickTouchId) {
                if (cameraTouchId === null) {
                    cameraTouchId = t.identifier;
                    cameraTouchStart = { x: t.clientX, y: t.clientY };
                    controls.isTouchRotating = true;
                    break;
                }
            }
        }
    }, { passive: false });

    // --- General Touch Move ---
    document.addEventListener('touchmove', (e) => {
        e.preventDefault();
        for (const touch of e.changedTouches) {
            if (touch.identifier === joystickTouchId) {
                updateJoystick(touch);
            } else if (touch.identifier === cameraTouchId) {
                controls.touchDelta.x = touch.clientX - cameraTouchStart.x;
                controls.touchDelta.y = touch.clientY - cameraTouchStart.y;
                cameraTouchStart = { x: touch.clientX, y: touch.clientY };
            }
        }
    }, { passive: false });

    // --- General Touch End ---
    document.addEventListener('touchend', (e) => {
        for (const touch of e.changedTouches) {
            if (touch.identifier === joystickTouchId) {
                joystickStick.style.transform = 'translate(-50%, -50%)';
                controls.joystickDirection = { x: 0, y: 0 };
                controls.joystickActive = false;
                joystickTouchId = null;
            } else if (touch.identifier === cameraTouchId) {
                controls.isTouchRotating = false;
                cameraTouchId = null;
            }
        }
    });

    // --- Button Listeners ---
    jumpButton.addEventListener('touchstart', (e) => { e.preventDefault(); controls.mobileJump = true; });
    jumpButton.addEventListener('touchend', () => { controls.mobileJump = false; });
    sprintButton.addEventListener('touchstart', (e) => { e.preventDefault(); controls.mobileSprint = true; });
    sprintButton.addEventListener('touchend', () => { controls.mobileSprint = false; });

    return controls;
}
