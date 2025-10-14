/**
 * Creates a sprite-based name label for a player.
 * Name labels are now 1.5x larger.
 * @param {string} name The text to display.
 * @param {string} [color='#ffffff'] The color of the text.
 * @returns {THREE.Sprite} A Three.js sprite object.
 */
export function createNameLabel(name, color = '#ffffff') {
    const canvas = document.createElement('canvas');
    const fontSize = 24; // 1.5x original size (16px)
    const canvasWidth = 192; // 1.5x original size (128px)
    const canvasHeight = 48; // 1.5x original size (32px)

    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    const context = canvas.getContext('2d');

    // Draw semi-transparent background
    context.fillStyle = 'rgba(0, 0, 0, 0.6)';
    const bgHeight = 30; // 1.5x original size (20px)
    context.fillRect(0, (canvasHeight - bgHeight) / 2, canvasWidth, bgHeight);

    // Draw text
    context.fillStyle = color;
    context.font = `bold ${fontSize}px Arial`;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(name, canvasWidth / 2, canvasHeight / 2);

    const texture = new THREE.CanvasTexture(canvas);
    const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
    const sprite = new THREE.Sprite(spriteMaterial);
    
    // Scale the sprite in the scene
    sprite.scale.set(3, 1.5, 1.0); // 1.5x original scale (2, 0.5) - adjusted for better appearance

    return sprite;
}

/**
 * Creates a sprite-based speech bubble that dynamically resizes based on text content.
 * @param {string} text The message to display in the bubble.
 * @returns {THREE.Sprite} A Three.js sprite object.
 */
export function createSpeechBubble(text) {
    const font = 'bold 20px Arial';
    const padding = 15;
    const maxWidth = 300; // Max width for the text block itself
    const tailHeight = 15;
    const radius = 12;
    const lineHeight = 24;

    // Use a temporary canvas to measure text and wrap it
    const tempCtx = document.createElement('canvas').getContext('2d');
    tempCtx.font = font;

    const words = text.split(' ');
    let lines = [];
    let currentLine = words[0] || '';

    for (let i = 1; i < words.length; i++) {
        const word = words[i];
        const testLine = currentLine + ' ' + word;
        if (tempCtx.measureText(testLine).width < maxWidth) {
            currentLine = testLine;
        } else {
            lines.push(currentLine);
            currentLine = word;
        }
    }
    lines.push(currentLine);

    // Calculate final canvas dimensions based on the wrapped text
    const textHeight = lines.length * lineHeight;
    let textWidth = 0;
    lines.forEach(line => {
        textWidth = Math.max(textWidth, tempCtx.measureText(line).width);
    });

    const canvasWidth = textWidth + padding * 2;
    const canvasHeight = textHeight + padding * 2 + tailHeight;

    // Create the final canvas and draw the bubble
    const canvas = document.createElement('canvas');
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    const ctx = canvas.getContext('2d');

    // Draw bubble body (rounded rectangle)
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(radius, 0);
    ctx.lineTo(canvasWidth - radius, 0);
    ctx.quadraticCurveTo(canvasWidth, 0, canvasWidth, radius);
    ctx.lineTo(canvasWidth, canvasHeight - tailHeight - radius);
    ctx.quadraticCurveTo(canvasWidth, canvasHeight - tailHeight, canvasWidth - radius, canvasHeight - tailHeight);
    // Draw tail
    ctx.lineTo(canvasWidth / 2 + 10, canvasHeight - tailHeight);
    ctx.lineTo(canvasWidth / 2, canvasHeight);
    ctx.lineTo(canvasWidth / 2 - 10, canvasHeight - tailHeight);
    // Continue rest of the bubble
    ctx.lineTo(radius, canvasHeight - tailHeight);
    ctx.quadraticCurveTo(0, canvasHeight - tailHeight, 0, canvasHeight - tailHeight - radius);
    ctx.lineTo(0, radius);
    ctx.quadraticCurveTo(0, 0, radius, 0);
    ctx.closePath();
    ctx.fill();

    // Draw the text inside the bubble
    ctx.fillStyle = '#000000';
    ctx.font = font;
    ctx.textAlign = 'center';
    const startY = padding + (lineHeight / 2);
    lines.forEach((line, i) => {
        ctx.fillText(line, canvasWidth / 2, startY + i * lineHeight);
    });

    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(canvas) }));
    // Scale sprite based on its dynamic canvas size
    sprite.scale.set(canvasWidth / 40, canvasHeight / 40, 1.0);
    
    return sprite;
}