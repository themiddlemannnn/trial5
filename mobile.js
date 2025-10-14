/**
 * Detects if the current device is a mobile phone or tablet.
 * @returns {boolean} True if the device has touch capabilities and a mobile user agent.
 */
function isMobileDevice() {
    const hasTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
    const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
    return (hasTouch && mobileRegex.test(navigator.userAgent)) || (hasTouch && window.innerWidth <= 768);
}

/**
 * Requests to enter fullscreen and lock the screen orientation to landscape.
 * This improves immersion and ensures controls are laid out correctly.
 */
async function enterMobileMode() {
    const elem = document.documentElement;
    try {
        // Request fullscreen
        if (elem.requestFullscreen) {
            await elem.requestFullscreen();
        } else if (elem.webkitRequestFullscreen) { /* Safari */
            await elem.webkitRequestFullscreen();
        }

        // Lock screen to landscape. This is the modern, preferred API.
        if (screen.orientation && screen.orientation.lock) {
            await screen.orientation.lock('landscape');
        }
    } catch (err) {
        console.warn(`Could not lock orientation or enter fullscreen: ${err.message}`);
        // Display a fallback message if locking fails
        const log = document.getElementById('systemLog');
        if (log) {
            log.textContent = "For the best experience, please rotate your device to landscape.";
        }
    }
}

/**
 * Initializes all mobile-specific UI and event listeners.
 * It only runs on devices identified as mobile.
 */
export function setupMobileExperience() {
    if (!isMobileDevice()) {
        return; // Exit if not on a mobile device
    }

    // Display the virtual joystick and buttons
    const mobileControls = document.getElementById('mobileControls');
    if (mobileControls) mobileControls.style.display = 'block';

    // Hide the desktop controls help text
    const desktopControls = document.getElementById('controls');
    if (desktopControls) desktopControls.style.display = 'none';

    // Create a start button. A user action (like a tap) is required by modern browsers
    // to enable sensitive features like fullscreen mode and for audio to play automatically.
    // This is a security measure to prevent websites from being too intrusive.
    const startButton = document.createElement('button');
    startButton.textContent = 'Tap to Start';
    Object.assign(startButton.style, {
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: '10000',
        padding: '20px 40px',
        fontSize: '24px',
        color: 'white',
        background: 'rgba(0, 120, 255, 0.9)',
        border: '2px solid white',
        borderRadius: '10px',
        cursor: 'pointer'
    });
    document.body.appendChild(startButton);

    // When the user taps the button, start the mobile experience
    startButton.addEventListener('click', () => {
        enterMobileMode();
        startButton.remove();
    }, { once: true });
}
