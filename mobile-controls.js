/**
 * Sets up all user touch input handlers for mobile devices.
 * @param {HTMLElement} domElement The canvas element to attach listeners to.
 * @returns {Object} A controls state object for mobile gameplay.
 */
export function setupMobileControls(domElement) {
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

    // --- Camera Touch Rotation (Multitouch-aware) ---
    domElement.addEventListener('touchstart', (e) => {
        if (e.target !== domElement) return;
        e.preventDefault();

        // Assign a second touch for camera if not already assigned
        for (const touch of e.changedTouches) {
            if (joystickTouchId === null || touch.identifier !== joystickTouchId) {
                if (cameraTouchId === null) {
                    cameraTouchId = touch.identifier;
                    cameraTouchStart = { x: touch.clientX, y: touch.clientY };
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