/**
 * Sets up all user input handlers (keyboard, mouse) for desktop.
 * @param {HTMLElement} domElement The canvas element to attach listeners to.
 * @returns {Object} A controls state object.
 */
export function setupControls(domElement) {
    const controls = {
        keys: {},
        isDragging: false,
        mouseDelta: { x: 0, y: 0 },
        scrollDelta: 0,
    };

    let previousMousePosition = { x: 0, y: 0 };

    // --- Keyboard ---
    document.addEventListener('keydown', (e) => {
        // Prevent keyboard input when typing in chat
        if (document.activeElement.id !== 'chatInput') {
             controls.keys[e.key.toLowerCase()] = true;
        }
    });
    document.addEventListener('keyup', (e) => {
        controls.keys[e.key.toLowerCase()] = false;
    });

    // --- Mouse ---
    domElement.addEventListener('mousedown', (e) => {
        if (e.button === 0) { // Left mouse button
            controls.isDragging = true;
            previousMousePosition = { x: e.clientX, y: e.clientY };
            domElement.style.cursor = 'grabbing';
        }
    });

    document.addEventListener('mousemove', (e) => {
        if (controls.isDragging) {
            controls.mouseDelta.x = e.clientX - previousMousePosition.x;
            controls.mouseDelta.y = e.clientY - previousMousePosition.y;
            previousMousePosition = { x: e.clientX, y: e.clientY };
        }
    });

    document.addEventListener('mouseup', (e) => {
        if (e.button === 0) {
            controls.isDragging = false;
            domElement.style.cursor = 'default';
        }
    });
    
    // Prevent context menu on right-click over the canvas
    domElement.addEventListener('contextmenu', (e) => e.preventDefault());

    // Mouse wheel for zooming
    domElement.addEventListener('wheel', (e) => {
        e.preventDefault();
        controls.scrollDelta = e.deltaY;
    }, { passive: false });

    return controls;
}