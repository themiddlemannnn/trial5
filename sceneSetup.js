/**
 * Sets up the static scene elements like floor, walls, lighting, and billboard.
 * @param {THREE.Scene} scene The main Three.js scene object.
 * @returns {{collidableObjects: THREE.Mesh[]}} An object containing arrays of scene objects.
 */
export function setupScene(scene) {
    const collidableObjects = [];
    const hallWidth = 80;
    const hallHeight = 30;
    const hallDepth = 80;

    // --- LIGHTING ---
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.7);
    directionalLight.position.set(30, 40, 30);
    directionalLight.castShadow = true;
    directionalLight.shadow.camera.left = -50;
    directionalLight.shadow.camera.right = 50;
    directionalLight.shadow.camera.top = 50;
    directionalLight.shadow.camera.bottom = -50;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    scene.add(directionalLight);

    // --- ENVIRONMENT ---
    // Floor
    const floor = new THREE.Mesh(
        new THREE.BoxGeometry(hallWidth, 1, hallDepth),
        new THREE.MeshStandardMaterial({ color: 0x2d5a3d, roughness: 0.8 })
    );
    floor.position.y = -0.5;
    floor.receiveShadow = true;
    scene.add(floor);

    // Ceiling
    const ceiling = new THREE.Mesh(
        new THREE.BoxGeometry(hallWidth, 1, hallDepth),
        new THREE.MeshStandardMaterial({ color: 0x3a3a3a, roughness: 0.7 })
    );
    ceiling.position.y = hallHeight + 0.5;
    scene.add(ceiling);

    // Walls
    const wallMaterial = new THREE.MeshStandardMaterial({ color: 0x8b7355, roughness: 0.8 });
    const walls = [
        new THREE.Mesh(new THREE.BoxGeometry(hallWidth + 1, hallHeight, 1), wallMaterial), // Back
        new THREE.Mesh(new THREE.BoxGeometry(hallWidth + 1, hallHeight, 1), wallMaterial), // Front
        new THREE.Mesh(new THREE.BoxGeometry(1, hallHeight, hallDepth), wallMaterial), // Left
        new THREE.Mesh(new THREE.BoxGeometry(1, hallHeight, hallDepth), wallMaterial)  // Right
    ];
    walls[0].position.set(0, hallHeight / 2, -hallDepth / 2);
    walls[1].position.set(0, hallHeight / 2, hallDepth / 2);
    walls[2].position.set(-hallWidth / 2, hallHeight / 2, 0);
    walls[3].position.set(hallWidth / 2, hallHeight / 2, 0);
    
    walls.forEach(wall => {
        wall.receiveShadow = true;
        scene.add(wall);
        collidableObjects.push(wall);
    });

    // --- CENTRAL BILLBOARD ---
    const billboardWidth = 20;
    const billboardHeight = 12;
    const billboardThickness = 0.5;
    const frameMaterial = new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.6, roughness: 0.4 });
    const billboardFrame = new THREE.Mesh(
        new THREE.BoxGeometry(billboardWidth + 1, billboardHeight + 1, billboardThickness + 0.2),
        frameMaterial
    );
    billboardFrame.position.set(0, hallHeight / 2, 0);
    billboardFrame.castShadow = true;
    scene.add(billboardFrame);
    collidableObjects.push(billboardFrame);

    // Billboard screen with dynamic text
    const canvasBB = document.createElement('canvas');
    canvasBB.width = 1024;
    canvasBB.height = 512;
    const ctxBB = canvasBB.getContext('2d');
    const gradient = ctxBB.createLinearGradient(0, 0, canvasBB.width, canvasBB.height);
    gradient.addColorStop(0, '#0066cc');
    gradient.addColorStop(1, '#00aaff');
    ctxBB.fillStyle = gradient;
    ctxBB.fillRect(0, 0, canvasBB.width, canvasBB.height);
    ctxBB.fillStyle = '#ffffff';
    ctxBB.font = 'bold 70px Arial';
    ctxBB.textAlign = 'center';
    ctxBB.textBaseline = 'middle';
    ctxBB.fillText('CENTRAL BILLBOARD', canvasBB.width / 2, canvasBB.height / 2 - 60);
    ctxBB.font = '45px Arial';
    ctxBB.fillText('Upload your content here!', canvasBB.width / 2, canvasBB.height / 2 + 40);
    const texture = new THREE.CanvasTexture(canvasBB);
    const display = new THREE.Mesh(
        new THREE.PlaneGeometry(billboardWidth - 1, billboardHeight - 1),
        new THREE.MeshBasicMaterial({ map: texture })
    );
    display.position.set(0, hallHeight / 2, billboardThickness);
    scene.add(display);

    // Billboard Poles
    const poleGeometry = new THREE.CylinderGeometry(0.4, 0.4, hallHeight, 16);
    const poleMaterial = new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.8, roughness: 0.2 });
    const leftPole = new THREE.Mesh(poleGeometry, poleMaterial);
    leftPole.position.set(-billboardWidth / 2 - 1.5, hallHeight / 2, 0);
    leftPole.castShadow = true;
    scene.add(leftPole);
    collidableObjects.push(leftPole);
    const rightPole = new THREE.Mesh(poleGeometry, poleMaterial);
    rightPole.position.set(billboardWidth / 2 + 1.5, hallHeight / 2, 0);
    rightPole.castShadow = true;
    scene.add(rightPole);
    collidableObjects.push(rightPole);

    return { collidableObjects };
}