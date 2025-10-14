const BALL_RADIUS = 1.2;
const COLLISION_DIAMETER = BALL_RADIUS * 2;
const MIN_SEPARATION = 0.01; // A small buffer to prevent sticking

/**
 * Handles collision detection and response for all balls in the scene.
 * @param {Player} player The main player object.
 * @param {Array<Object>} aiPlayers An array of AI player objects.
 */
export function handleCollisions(player, aiPlayers) {
    const allBalls = [player, ...aiPlayers];

    for (let i = 0; i < allBalls.length; i++) {
        for (let j = i + 1; j < allBalls.length; j++) {
            const ballA = allBalls[i];
            const ballB = allBalls[j];

            const posA = ballA.ball.position;
            const posB = ballB.ball.position;

            const dx = posB.x - posA.x;
            const dz = posB.z - posA.z;
            const distanceSqXZ = dx * dx + dz * dz;

            // --- Vertical Collision (Standing on Head) ---
            // This is a special check to see if the player is landing on another ball.
            let playerBall;
            if (ballA.isJumping !== undefined) { // ballA is the player
                playerBall = ballA;
            } else if (ballB.isJumping !== undefined) { // ballB is the player
                playerBall = ballB;
            }
            
            // Only proceed if the player exists, is jumping, and is currently falling.
            if (playerBall && playerBall.isJumping && playerBall.jumpVelocity <= 0) {
                const otherBall = (playerBall === ballA) ? ballB : ballA;
                const playerPos = playerBall.ball.position;
                const otherPos = otherBall.ball.position;

                // Check if the player is positioned above the other ball.
                if (playerPos.y > otherPos.y && distanceSqXZ < COLLISION_DIAMETER * COLLISION_DIAMETER) {
                    const verticalDist = playerPos.y - otherPos.y;
                    // If they are vertically overlapping, resolve the collision.
                    if (verticalDist < COLLISION_DIAMETER && verticalDist > 0) {
                        playerPos.y = otherPos.y + COLLISION_DIAMETER - MIN_SEPARATION;
                        playerBall.isJumping = false; // Player is now "grounded" on the other ball
                        playerBall.jumpVelocity = 0;
                        // Skip the horizontal collision for this frame to prevent weird physics.
                        continue; 
                    }
                }
            }


            // --- Horizontal Collision (XZ Plane) ---
            if (distanceSqXZ < COLLISION_DIAMETER * COLLISION_DIAMETER) {
                const distanceXZ = Math.sqrt(distanceSqXZ);
                const overlap = (COLLISION_DIAMETER - distanceXZ) || MIN_SEPARATION;
                
                // 1. Static Resolution: Push balls apart so they don't overlap.
                const pushX = (dx / (distanceXZ || 1)) * overlap * 0.5;
                const pushZ = (dz / (distanceXZ || 1)) * overlap * 0.5;
                
                posA.x -= pushX;
                posA.z -= pushZ;
                posB.x += pushX;
                posB.z += pushZ;

                // 2. Dynamic Resolution: Make them bounce by reflecting their velocities.
                const normal = new THREE.Vector2(dx, dz).normalize();
                const vA = new THREE.Vector2(ballA.velocity.x, ballA.velocity.z);
                const vB = new THREE.Vector2(ballB.velocity.x, ballB.velocity.z);
                
                const vRelative = new THREE.Vector2().subVectors(vA, vB);
                const speed = vRelative.dot(normal);

                if (speed < 0) { // Only bounce if they are moving towards each other
                    const impulse = speed; // Simplified impulse for objects of equal mass
                    const impulseVec = normal.multiplyScalar(impulse);

                    ballA.velocity.x -= impulseVec.x;
                    ballA.velocity.z -= impulseVec.y;
                    ballB.velocity.x += impulseVec.x;
                    ballB.velocity.z += impulseVec.y;
                }
            }
        }
    }
}