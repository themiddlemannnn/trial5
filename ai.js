import { createNameLabel, createSpeechBubble } from './ui.js';

// --- CONSTANTS AND CONFIGURATION ---
const BALL_RADIUS = 1.2;
const HALL_WIDTH = 80;
const HALL_DEPTH = 80;
const BOUNDARY_X = HALL_WIDTH / 2 - BALL_RADIUS - 0.5;
const BOUNDARY_Z = HALL_DEPTH / 2 - BALL_RADIUS - 0.5;
const JUMP_STRENGTH = 0.5;
const GRAVITY = 0.02;
const DAMPING = 0.97; // INCREASED AI FRICTION (from 0.98)

const AI_NAMES = [
    'Alex', 'Jordan', 'Sam', 'Riley', 'Casey', 'Morgan', 'Taylor', 'Jamie', 'Avery', 'Cameron',
    'Blake', 'Skyler', 'Quinn', 'Reese', 'Dakota'
];
const AI_COLORS = [
    0x00ff88, 0xff8800, 0x8800ff, 0x00ffff, 0xffff00, 0xff00ff, 0x0088ff, 0x88ff00, 0xff0088, 0x00ff00,
    0xff6600, 0x6600ff, 0x00ffaa, 0xffaa00, 0xaa00ff
];
const AI_PHRASES = [
    "Hey!", "What's up?", "Nice place!", "Yo!", "Cool!", "Hello!", "Howdy!", "Sup?", "Hi there!", "Wow!",
    "Amazing!", "This is fun!", "Nice ball!", "Love this!", "Chat soon!", "Gotta bounce!", "Peace!", "See ya!"
];

/**
 * Creates and initializes all AI players in the scene.
 * @param {THREE.Scene} scene The main Three.js scene.
 * @returns {Array<Object>} An array of AI player objects.
 */
export function createAIPlayers(scene) {
    const aiPlayers = [];
    const geometry = new THREE.SphereGeometry(BALL_RADIUS, 32, 32);

    for (let i = 0; i < 15; i++) {
        // Initial position
        const angle = (i / 15) * Math.PI * 2;
        const radius = 15 + Math.random() * 15;
        const startPos = new THREE.Vector3(
            Math.cos(angle) * radius,
            BALL_RADIUS,
            Math.sin(angle) * radius
        );
        
        // Create ball mesh
        const material = new THREE.MeshStandardMaterial({ color: AI_COLORS[i], roughness: 0.4 });
        const ball = new THREE.Mesh(geometry, material);
        ball.position.copy(startPos);
        ball.castShadow = true;
        scene.add(ball);

        // Create AI object
        const ai = {
            ball,
            nameSprite: createNameLabel(AI_NAMES[i]),
            velocity: new THREE.Vector3(),
            targetPosition: startPos.clone(),
            moveTimer: Math.random() * 3,
            jumpTimer: Math.random() * 5 + 2,
            isJumping: false,
            jumpVelocity: 0,
            speechBubble: null,
            speechTimer: Math.random() * 10 + 5
        };
        
        scene.add(ai.nameSprite);
        aiPlayers.push(ai);
    }
    return aiPlayers;
}

/**
 * Updates the state and position of all AI players.
 * @param {number} deltaTime Time elapsed since the last frame.
 * @param {Array<Object>} aiPlayers Array of AI player objects.
 */
export function updateAIPlayers(deltaTime, aiPlayers) {
    aiPlayers.forEach(ai => {
        updateAIMovement(ai, deltaTime);
        updateAIJump(ai, deltaTime);
        updateAILabels(ai);
        maybeAISpeaks(ai, deltaTime);
    });
}

function updateAIMovement(ai, deltaTime) {
    ai.moveTimer -= deltaTime;
    if (ai.moveTimer <= 0) {
        // Pick a new random target position
        ai.targetPosition.set(
            (Math.random() - 0.5) * (HALL_WIDTH - 10),
            BALL_RADIUS,
            (Math.random() - 0.5) * (HALL_DEPTH - 10)
        );
        ai.moveTimer = Math.random() * 4 + 2;
    }

    const direction = new THREE.Vector3().subVectors(ai.targetPosition, ai.ball.position);
    direction.y = 0; // AI only moves on the XZ plane
    if (direction.length() > 0.5) {
        direction.normalize();
        const acceleration = 0.012; // REDUCED AI ACCELERATION to match player
        ai.velocity.x += direction.x * acceleration;
        ai.velocity.z += direction.z * acceleration;
    }

    // Apply velocity and damping
    ai.ball.position.x += ai.velocity.x;
    ai.ball.position.z += ai.velocity.z;
    ai.velocity.x *= DAMPING;
    ai.velocity.z *= DAMPING;
    
    // Apply rolling rotation based on velocity
    const speed = new THREE.Vector2(ai.velocity.x, ai.velocity.z).length();
    if (speed > 0.01) {
        const rotationAxis = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), ai.velocity).normalize();
        ai.ball.quaternion.premultiply(new THREE.Quaternion().setFromAxisAngle(rotationAxis, speed / BALL_RADIUS));
    }


    // Enforce boundaries and bounce
    if (Math.abs(ai.ball.position.x) > BOUNDARY_X) {
        ai.ball.position.x = Math.sign(ai.ball.position.x) * BOUNDARY_X;
        ai.velocity.x *= -0.5;
    }
    if (Math.abs(ai.ball.position.z) > BOUNDARY_Z) {
        ai.ball.position.z = Math.sign(ai.ball.position.z) * BOUNDARY_Z;
        ai.velocity.z *= -0.5;
    }
}

function updateAIJump(ai, deltaTime) {
    ai.jumpTimer -= deltaTime;
    if (ai.jumpTimer <= 0 && !ai.isJumping) {
        ai.isJumping = true;
        ai.jumpVelocity = JUMP_STRENGTH;
        ai.jumpTimer = Math.random() * 6 + 3;
    }

    if (ai.isJumping) {
        ai.ball.position.y += ai.jumpVelocity;
        ai.jumpVelocity -= GRAVITY;
        if (ai.ball.position.y <= BALL_RADIUS) {
            ai.ball.position.y = BALL_RADIUS;
            ai.isJumping = false;
            ai.jumpVelocity = 0;
        }
    }
}

function updateAILabels(ai) {
    ai.nameSprite.position.copy(ai.ball.position);
    ai.nameSprite.position.y += BALL_RADIUS + 0.7; // Closer to the player

    if (ai.speechBubble) {
        ai.speechBubble.position.copy(ai.ball.position);
        ai.speechBubble.position.y += BALL_RADIUS + 2.5;
    }
}

function maybeAISpeaks(ai, deltaTime) {
    ai.speechTimer -= deltaTime;
    if (ai.speechTimer <= 0 && !ai.speechBubble) {
        if (Math.random() < 0.3) {
            const phrase = AI_PHRASES[Math.floor(Math.random() * AI_PHRASES.length)];
            ai.speechBubble = createSpeechBubble(phrase);
            ai.ball.parent.add(ai.speechBubble); // Add to scene
            
            setTimeout(() => {
                if (ai.speechBubble) {
                    ai.speechBubble.parent.remove(ai.speechBubble);
                    ai.speechBubble = null;
                }
            }, 3000 + Math.random() * 2000);
        }
        ai.speechTimer = Math.random() * 12 + 8;
    }
}