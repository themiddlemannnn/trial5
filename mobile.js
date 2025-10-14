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
 * Hides the browser UI to create a more immersive fullscreen-like experience.
 * This is a workaround for mobile devices where true fullscreen API doesn't work.
 */
function createImmersiveMode() {
    // Hide the address bar by scrolling
    window.scrollTo(0, 1);
    
    // Force the viewport to be the right size
    document.body.style.margin = '0';
    document.body.style.padding = '0';
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.width = '100%';
    document.body.style.height = '100%';
    document.documentElement.style.overflow = 'hidden';
    
    // Prevent pull-to-refresh and overscroll
    document.body.style.overscrollBehavior = 'none';
    
    // Set viewport height using CSS custom property
    const setViewportHeight = () => {
        const vh = window.innerHeight * 0.01;
        document.documentElement.style.setProperty('--vh', `${vh}px`);
    };
    
    setViewportHeight();
    window.addEventListener('resize', setViewportHeight);
    window.addEventListener('orientationchange', () => {
        setTimeout(setViewportHeight, 100);
    });
}

/**
 * Requests to enter fullscreen and lock the screen orientation to landscape.
 * Falls back to immersive mode if fullscreen doesn't work.
 */
async function enterMobileMode() {
    const elem = document.documentElement;
    let fullscreenSuccess = false;
    
    try {
        // Try fullscreen API (works on Android Chrome, but not iOS Safari)
        if (elem.requestFullscreen) {
            await elem.requestFullscreen();
            fullscreenSuccess = true;
        } else if (elem.webkitRequestFullscreen) {
            await elem.webkitRequestFullscreen();
            fullscreenSuccess = true;
        } else if (elem.mozRequestFullScreen) {
            await elem.mozRequestFullScreen();
            fullscreenSuccess = true;
        } else if (elem.msRequestFullscreen) {
            await elem.msRequestFullscreen();
            fullscreenSuccess = true;
        }
    } catch (err) {
        console.warn('Fullscreen API not available:', err.message);
        fullscreenSuccess = false;
    }
    
    // If fullscreen didn't work, use immersive mode workaround
    if (!fullscreenSuccess) {
        createImmersiveMode();
        
        const log = document.getElementById('systemLog');
        if (log) {
            log.textContent = "Tip: Add this page to your home screen for a better fullscreen experience!";
            setTimeout(() => {
                log.textContent = "";
            }, 5000);
        }
    }
    
    // Try to lock screen orientation (works better on Android)
    if (screen.orientation && screen.orientation.lock) {
        try {
            await screen.orientation.lock('landscape');
        } catch (orientErr) {
            try {
                await screen.orientation.lock('landscape-primary');
            } catch (e) {
                console.warn('Could not lock orientation');
                
                // Show rotation hint if orientation lock fails
                const log = document.getElementById('systemLog');
                if (log && window.innerWidth < window.innerHeight) {
                    log.textContent = "Please rotate your device to landscape for the best experience";
                    setTimeout(() => {
                        log.textContent = "";
                    }, 4000);
                }
            }
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

    // Apply immersive mode immediately
    createImmersiveMode();

    // Display the virtual joystick and buttons
    const mobileControls = document.getElementById('mobileControls');
    if (mobileControls) mobileControls.style.display = 'block';

    // Hide the desktop controls help text
    const desktopControls = document.getElementById('controls');
    if (desktopControls) desktopControls.style.display = 'none';

    // Create a start button
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
        cursor: 'pointer',
        fontWeight: 'bold',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)',
        touchAction: 'manipulation'
    });
    document.body.appendChild(startButton);

    // Prevent double-tap zoom on the button
    startButton.addEventListener('touchend', (e) => {
        e.preventDefault();
    });

    // When the user taps the button, start the mobile experience
    startButton.addEventListener('click', async (e) => {
        e.preventDefault();
        await enterMobileMode();
        startButton.remove();
    }, { once: true });
    
    // Listen for orientation changes and adjust UI
    window.addEventListener('orientationchange', () => {
        setTimeout(() => {
            createImmersiveMode();
        }, 100);
    });
}
