import { createNameLabel, createSpeechBubble } from './ui.js';

const BALL_RADIUS = 1.2;
const HALL_WIDTH = 80;
const HALL_DEPTH = 80;

export class Player {
    constructor(scene, startPos) {
        this.scene = scene;

        // Physics properties
        this.isJumping = false;
        this.jumpVelocity = 0;
        this.gravity = 0.02;
        this.jumpStrength = 0.5;
        this.groundLevel = BALL_RADIUS;
        this.velocity = new THREE.Vector3(); // For XZ movement and physics interaction
        this.damping = 0.96; // INCREASED FRICTION (from 0.97)

        // Create player ball mesh
        const geometry = new THREE.SphereGeometry(BALL_RADIUS, 32, 32);
        const material = new THREE.MeshStandardMaterial({ color: 0xff3366, roughness: 0.3, metalness: 0.4 });
        this.ball = new THREE.Mesh(geometry, material);
        this.ball.position.copy(startPos);
        this.ball.castShadow = true;
        this.scene.add(this.ball);

        // Create UI elements
        this.nameSprite = createNameLabel('You');
        this.scene.add(this.nameSprite);
        this.speechBubble = null;

        this.boundaryX = HALL_WIDTH / 2 - BALL_RADIUS - 0.5;
        this.boundaryZ = HALL_DEPTH / 2 - BALL_RADIUS - 0.5;
    }

    showMessage(text) {
        if (this.speechBubble) {
            this.scene.remove(this.speechBubble);
        }
        this.speechBubble = createSpeechBubble(text);
        this.scene.add(this.speechBubble);

        setTimeout(() => {
            if (this.speechBubble) {
                this.scene.remove(this.speechBubble);
                this.speechBubble = null;
            }
        }, 4000);
    }

    update(deltaTime, controls, camera) {
        this.handleMovement(controls, camera);
        this.handleJump(controls);

        // Apply XZ velocity from movement and physics
        this.ball.position.x += this.velocity.x;
        this.ball.position.z += this.velocity.z;

        // Apply damping (friction) to XZ velocity
        this.velocity.x *= this.damping;
        this.velocity.z *= this.damping;
        
        this.updateLabels();
    }

    handleJump(controls) {
        // FIX Part 1: If player is not in a jump cycle but is above the ground,
        // it means they were on an object that moved. Re-engage gravity.
        if (!this.isJumping && this.ball.position.y > this.groundLevel) {
            this.isJumping = true;
        }

        const jumpPressed = controls.keys[' '] || controls.keys['spacebar'] || controls.keys['v'] || controls.mobileJump;
        if (jumpPressed && !this.isJumping) {
            this.isJumping = true;
            this.jumpVelocity = this.jumpStrength;
        }

        if (this.isJumping) {
            this.ball.position.y += this.jumpVelocity;
            this.jumpVelocity -= this.gravity;
            if (this.ball.position.y <= this.groundLevel) {
                this.ball.position.y = this.groundLevel;
                this.isJumping = false;
                this.jumpVelocity = 0;
            }
        }
    }

    handleMovement(controls, camera) {
        const sprintActive = controls.keys['shift'] || controls.mobileSprint;
        // REDUCED ACCELERATION for slower movement
        const acceleration = sprintActive ? 0.024 : 0.012;
        const moveDirection = new THREE.Vector3();

        // Calculate camera-relative forward and right vectors
        const cameraForward = new THREE.Vector3();
        camera.getWorldDirection(cameraForward);
        cameraForward.y = 0;
        cameraForward.normalize();
        const cameraRight = new THREE.Vector3().crossVectors(camera.up, cameraForward).negate();

        // Keyboard movement
        if (controls.keys['w'] || controls.keys['arrowup']) moveDirection.add(cameraForward);
        if (controls.keys['s'] || controls.keys['arrowdown']) moveDirection.sub(cameraForward);
        if (controls.keys['a'] || controls.keys['arrowleft']) moveDirection.sub(cameraRight);
        if (controls.keys['d'] || controls.keys['arrowright']) moveDirection.add(cameraRight);

        // Joystick movement
        if (controls.joystickActive) {
            const joyForward = cameraForward.clone().multiplyScalar(-controls.joystickDirection.y);
            const joyRight = cameraRight.clone().multiplyScalar(controls.joystickDirection.x);
            moveDirection.add(joyForward).add(joyRight);
        }

        if (moveDirection.lengthSq() > 0) {
            moveDirection.normalize().multiplyScalar(acceleration);
            // Add acceleration to our velocity vector
            this.velocity.x += moveDirection.x;
            this.velocity.z += moveDirection.z;
        }
        
        // Apply rolling rotation based on velocity, not direct input
        const speed = new THREE.Vector2(this.velocity.x, this.velocity.z).length();
        if (speed > 0.01) {
             const rotationAxis = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), this.velocity).normalize();
             this.ball.quaternion.premultiply(new THREE.Quaternion().setFromAxisAngle(rotationAxis, speed / BALL_RADIUS));
        }

        // Enforce boundaries and bounce off walls
        if (Math.abs(this.ball.position.x) > this.boundaryX) {
            this.ball.position.x = Math.sign(this.ball.position.x) * this.boundaryX;
            this.velocity.x *= -0.5; 
        }
        if (Math.abs(this.ball.position.z) > this.boundaryZ) {
            this.ball.position.z = Math.sign(this.ball.position.z) * this.boundaryZ;
            this.velocity.z *= -0.5; 
        }
    }

    updateLabels() {
        // Update name label position
        this.nameSprite.position.copy(this.ball.position);
        this.nameSprite.position.y += BALL_RADIUS + 0.7; // Closer to the player

        // Update speech bubble position
        if (this.speechBubble) {
            this.speechBubble.position.copy(this.ball.position);
            this.speechBubble.position.y += BALL_RADIUS + 2.5; // Positioned above the name
        }
    }
}