# Word Match - Practical Style Implementation Guide

## Design Philosophy
**Simple, Polished, Shippable** - Focus on clean visuals that work with existing rectangle-based architecture.

## Core Visual Setup

### Canvas Configuration
```javascript
const config = {
    type: Phaser.AUTO,
    backgroundColor: '#2c3e50',
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    render: {
        antialias: true,
        pixelArt: false
    }
}
```

### Color Palette (Simplified)
```javascript
const COLORS = {
    // Backgrounds
    bgDark: 0x2c3e50,      // Main background
    bgPanel: 0x34495e,     // Panel/grid background
    
    // Primary colors
    primary: 0x3498db,     // Blue
    success: 0x2ecc71,     // Green
    danger: 0xe74c3c,      // Red
    warning: 0xf39c12,     // Orange
    purple: 0x9b59b6,      // Purple
    
    // UI colors
    cyan: 0x00d9ff,        // Selection/trace
    textLight: 0xecf0f1,   // White text
    textMuted: 0xbdc3c7,   // Muted text
    border: 0x34495e,      // Default borders
    
    // Tile backgrounds (solid colors)
    tileNormal: 0xecf0f1,
    tileBomb: 0xe74c3c,
    tileIce: 0x3498db,
    tileStone: 0x7f8c8d,
    tileMultiplier: 0xf39c12,
    tileHidden: 0x9b59b6
};
```

## Tile Implementation (Rectangle-Based)

### Basic Tile Structure
```javascript
class Tile {
    constructor(scene, gridX, gridY, config) {
        this.scene = scene;
        this.gridX = gridX;
        this.gridY = gridY;
        this.type = config.type || TILE_TYPES.NORMAL;
        this.letter = config.letter;
        this.value = config.value;
        
        // Visual properties
        this.tileSize = 64;
        this.strokeWidth = 2;
        this.selectedStrokeWidth = 4;
        
        // Create visuals
        this.createSprite();
        this.createText();
        this.updateVisualState();
    }
    
    createSprite() {
        // Simple rectangle
        this.sprite = this.scene.add.rectangle(
            this.worldX, 
            this.worldY, 
            this.tileSize - 2, 
            this.tileSize - 2, 
            this.getTileColor()
        );
        
        // Default border
        this.sprite.setStrokeStyle(this.strokeWidth, COLORS.border);
        
        // Enable interaction
        this.sprite.setInteractive()
            .on('pointerover', () => this.onHover())
            .on('pointerout', () => this.onHoverEnd())
            .on('pointerdown', () => this.onClick());
    }
    
    createText() {
        // Letter or emoji
        const displayText = this.getDisplayText();
        this.textObject = this.scene.add.text(
            this.worldX, 
            this.worldY, 
            displayText, 
            {
                fontFamily: 'Rubik',
                fontSize: this.type === TILE_TYPES.NORMAL ? '24px' : '32px',
                fontStyle: 'bold',
                color: this.getTextColor()
            }
        );
        this.textObject.setOrigin(0.5);
        
        // Point value (bottom right)
        if (this.type === TILE_TYPES.NORMAL) {
            this.valueText = this.scene.add.text(
                this.worldX + 20, 
                this.worldY + 20, 
                this.value,
                {
                    fontFamily: 'Rubik',
                    fontSize: '10px',
                    color: 'rgba(0, 0, 0, 0.5)'
                }
            );
            this.valueText.setOrigin(0.5);
        }
    }
    
    getTileColor() {
        const colors = {
            [TILE_TYPES.NORMAL]: COLORS.tileNormal,
            [TILE_TYPES.BOMB]: COLORS.tileBomb,
            [TILE_TYPES.ICE]: COLORS.tileIce,
            [TILE_TYPES.STONE]: COLORS.tileStone,
            [TILE_TYPES.MULTIPLIER]: COLORS.tileMultiplier,
            [TILE_TYPES.HIDDEN]: COLORS.tileHidden
        };
        return colors[this.type];
    }
    
    getDisplayText() {
        const displays = {
            [TILE_TYPES.BOMB]: '💣',
            [TILE_TYPES.ICE]: '🧊',
            [TILE_TYPES.STONE]: '🪨',
            [TILE_TYPES.MULTIPLIER]: '×2',
            [TILE_TYPES.HIDDEN]: '?'
        };
        return displays[this.type] || this.letter;
    }
}
```

## Visual States & Animations

### Hover Effect
```javascript
onHover() {
    if (this.isLocked()) return;
    
    this.scene.tweens.add({
        targets: this.sprite,
        scaleX: 1.05,
        scaleY: 1.05,
        duration: 100,
        ease: 'Back.easeOut'
    });
}

onHoverEnd() {
    if (this.isSelected) return; // Keep scale if selected
    
    this.scene.tweens.add({
        targets: this.sprite,
        scaleX: 1,
        scaleY: 1,
        duration: 100
    });
}
```

### Selection State
```javascript
setSelected(selected) {
    this.isSelected = selected;
    
    if (selected) {
        // Cyan border
        this.sprite.setStrokeStyle(this.selectedStrokeWidth, COLORS.cyan);
        
        // Scale up with bounce
        this.scene.tweens.add({
            targets: [this.sprite, this.textObject],
            scaleX: 1.15,
            scaleY: 1.15,
            duration: 200,
            ease: 'Back.easeOut'
        });
    } else {
        // Reset border
        this.sprite.setStrokeStyle(this.strokeWidth, COLORS.border);
        
        // Scale back
        this.scene.tweens.add({
            targets: [this.sprite, this.textObject],
            scaleX: 1,
            scaleY: 1,
            duration: 100
        });
    }
}
```

### Destabilization States
```javascript
updateDestabilizationVisual() {
    // Progressive color tinting
    const tints = [null, 0xffcccc, 0xff9999, 0xff6666];
    const alphas = [1, 0.9, 0.8, 0.7];
    
    if (this.surgeCount > 0) {
        this.sprite.setTint(tints[this.surgeCount]);
        this.sprite.setAlpha(alphas[this.surgeCount]);
        
        // Add surge indicators
        this.updateSurgeIndicators();
        
        // Stage-specific animations
        if (this.surgeCount === 2) {
            this.addWobble();
        } else if (this.surgeCount === 3) {
            this.addCriticalShake();
        }
    }
}

addWobble() {
    this.wobbleTween = this.scene.tweens.add({
        targets: [this.sprite, this.textObject],
        angle: { from: -3, to: 3 },
        duration: 300,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
    });
}

addCriticalShake() {
    // Stop wobble if exists
    if (this.wobbleTween) this.wobbleTween.stop();
    
    this.shakeTween = this.scene.tweens.add({
        targets: [this.sprite, this.textObject],
        x: this.worldX + Phaser.Math.Between(-2, 2),
        y: this.worldY + Phaser.Math.Between(-2, 2),
        duration: 50,
        repeat: -1
    });
}

updateSurgeIndicators() {
    // Remove old indicators
    if (this.surgeIndicators) {
        this.surgeIndicators.forEach(dot => dot.destroy());
    }
    
    // Create simple dots
    this.surgeIndicators = [];
    for (let i = 0; i < this.surgeCount; i++) {
        const dot = this.scene.add.circle(
            this.worldX - 20 + (i * 8),
            this.worldY - 25,
            3,
            0xff6b6b
        );
        this.surgeIndicators.push(dot);
    }
}
```

## Effects & Animations

### Word Trace Line
```javascript
class WordTracer {
    constructor(scene) {
        this.scene = scene;
        this.graphics = scene.add.graphics();
        this.tracedTiles = [];
    }
    
    startTrace(tile) {
        this.clear();
        this.tracedTiles = [tile];
        tile.setSelected(true);
    }
    
    addTile(tile) {
        if (this.tracedTiles.includes(tile)) return false;
        
        this.tracedTiles.push(tile);
        tile.setSelected(true);
        this.drawLine();
        return true;
    }
    
    drawLine() {
        this.graphics.clear();
        
        if (this.tracedTiles.length < 2) return;
        
        // Simple cyan line
        this.graphics.lineStyle(3, COLORS.cyan, 0.8);
        
        // Draw path
        this.graphics.beginPath();
        this.graphics.moveTo(
            this.tracedTiles[0].worldX, 
            this.tracedTiles[0].worldY
        );
        
        for (let i = 1; i < this.tracedTiles.length; i++) {
            this.graphics.lineTo(
                this.tracedTiles[i].worldX,
                this.tracedTiles[i].worldY
            );
        }
        
        this.graphics.strokePath();
    }
    
    clear() {
        this.graphics.clear();
        this.tracedTiles.forEach(tile => tile.setSelected(false));
        this.tracedTiles = [];
    }
}
```

### Explosion Effect
```javascript
explodeTile(tile) {
    const x = tile.worldX;
    const y = tile.worldY;
    
    // Hide original tile
    this.scene.tweens.add({
        targets: [tile.sprite, tile.textObject],
        scale: 0,
        alpha: 0,
        duration: 300,
        ease: 'Back.easeIn'
    });
    
    // Create simple fragments
    for (let i = 0; i < 5; i++) {
        const fragment = this.scene.add.rectangle(x, y, 10, 10, COLORS.cyan);
        const angle = (i / 5) * Math.PI * 2;
        const distance = 100;
        
        this.scene.tweens.add({
            targets: fragment,
            x: x + Math.cos(angle) * distance,
            y: y + Math.sin(angle) * distance,
            scale: 0,
            alpha: 0,
            duration: 500,
            ease: 'Power2',
            onComplete: () => fragment.destroy()
        });
    }
    
    // Score popup
    this.createScorePopup(x, y, tile.value * 10);
}

createScorePopup(x, y, points) {
    const popup = this.scene.add.text(x, y, `+${points}`, {
        fontFamily: 'Rubik',
        fontSize: '24px',
        fontStyle: 'bold',
        color: '#2ecc71'
    });
    popup.setOrigin(0.5);
    
    this.scene.tweens.add({
        targets: popup,
        y: y - 50,
        alpha: 0,
        duration: 1000,
        ease: 'Power2',
        onComplete: () => popup.destroy()
    });
}
```

### Surge Ring Effect
```javascript
createSurgeRing(x, y) {
    const ring = this.scene.add.circle(x, y, 30);
    ring.setStrokeStyle(3, COLORS.cyan);
    ring.setAlpha(0.8);
    
    this.scene.tweens.add({
        targets: ring,
        scale: 3,
        alpha: 0,
        duration: 600,
        ease: 'Power2',
        onComplete: () => ring.destroy()
    });
}
```

### Cascade Animation
```javascript
cascadeEffect(tiles) {
    tiles.forEach((tile, index) => {
        this.scene.time.delayedCall(index * 50, () => {
            // Wobble
            this.scene.tweens.add({
                targets: [tile.sprite, tile.textObject],
                angle: { from: -5, to: 5 },
                duration: 150,
                yoyo: true,
                repeat: 2,
                ease: 'Sine.easeInOut'
            });
            
            // Apply surge damage
            tile.takeSurgeHit();
        });
    });
    
    // Subtle screen shake
    this.scene.cameras.main.shake(200, 0.003);
}
```

## UI Components

### HUD Panel
```javascript
createHUDPanel(x, y, width, height) {
    const panel = this.scene.add.container(x, y);
    
    // Background
    const bg = this.scene.add.rectangle(0, 0, width, height, COLORS.bgPanel, 0.9);
    bg.setStrokeStyle(2, COLORS.border);
    bg.setOrigin(0);
    
    panel.add(bg);
    return panel;
}
```

### Score Display
```javascript
createScoreDisplay() {
    const panel = this.createHUDPanel(20, 20, 200, 80);
    
    // Label
    const label = this.scene.add.text(100, 20, 'SCORE', {
        fontFamily: 'Rubik',
        fontSize: '12px',
        color: '#bdc3c7',
        align: 'center'
    });
    label.setOrigin(0.5);
    
    // Value
    this.scoreText = this.scene.add.text(100, 45, '0', {
        fontFamily: 'Rubik',
        fontSize: '24px',
        fontStyle: 'bold',
        color: '#ffffff'
    });
    this.scoreText.setOrigin(0.5);
    
    panel.add([label, this.scoreText]);
}
```

## Overlay Implementation

### Victory Overlay
```javascript
class VictoryOverlay extends Phaser.GameObjects.Container {
    constructor(scene) {
        super(scene, scene.scale.width / 2, scene.scale.height / 2);
        
        // Dark background
        this.darkBg = scene.add.rectangle(0, 0, scene.scale.width, scene.scale.height, 0x000000, 0.8);
        this.darkBg.setOrigin(0.5);
        
        // Panel
        this.panel = scene.add.rectangle(0, 0, 400, 500, COLORS.bgDark);
        this.panel.setStrokeStyle(3, COLORS.success);
        
        // Title
        this.title = scene.add.text(0, -180, 'LEVEL COMPLETE!', {
            fontFamily: 'Rubik',
            fontSize: '32px',
            fontStyle: 'bold',
            color: '#2ecc71'
        });
        this.title.setOrigin(0.5);
        
        // Stars
        this.createStars();
        
        // Score summary
        this.createScoreSummary();
        
        // Button
        this.nextButton = this.createButton(0, 150, 'NEXT LEVEL', COLORS.success);
        
        // Add all
        this.add([this.darkBg, this.panel, this.title, this.stars, this.summary, this.nextButton]);
        
        // Initially hidden
        this.setAlpha(0);
        this.setScale(0.8);
        
        scene.add.existing(this);
    }
    
    show() {
        // Blur game
        this.scene.cameras.main.postFX.addBlur(5);
        
        // Animate in
        this.scene.tweens.add({
            targets: this,
            alpha: 1,
            scale: 1,
            duration: 500,
            ease: 'Back.easeOut'
        });
        
        // Animate stars
        this.animateStars();
        
        // Simple confetti
        this.createConfetti();
    }
    
    createConfetti() {
        const colors = [0xe74c3c, 0x3498db, 0x2ecc71, 0xf39c12, 0x9b59b6];
        
        for (let i = 0; i < 20; i++) {
            const confetti = this.scene.add.rectangle(
                Phaser.Math.Between(0, this.scene.scale.width),
                -50,
                10,
                10,
                colors[Phaser.Math.Between(0, colors.length - 1)]
            );
            
            this.scene.tweens.add({
                targets: confetti,
                y: this.scene.scale.height + 50,
                angle: 720,
                duration: Phaser.Math.Between(2000, 4000),
                delay: i * 100,
                onComplete: () => confetti.destroy()
            });
        }
    }
}
```

### Defeat Overlay
```javascript
class DefeatOverlay extends Phaser.GameObjects.Container {
    constructor(scene) {
        super(scene, scene.scale.width / 2, scene.scale.height / 2);
        
        // Similar structure with red theme
        this.panel = scene.add.rectangle(0, 0, 400, 450, COLORS.bgDark);
        this.panel.setStrokeStyle(3, COLORS.danger);
        
        this.title = scene.add.text(0, -150, 'OUT OF MOVES!', {
            fontFamily: 'Rubik',
            fontSize: '32px',
            fontStyle: 'bold',
            color: '#e74c3c'
        });
        this.title.setOrigin(0.5);
        
        // Sad emoji with pulse
        this.emoji = scene.add.text(0, -70, '😢', {
            fontSize: '64px'
        });
        this.emoji.setOrigin(0.5);
        
        this.scene.tweens.add({
            targets: this.emoji,
            scale: { from: 1, to: 1.1 },
            duration: 2000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
        
        // Lives and buttons
        this.createLivesDisplay();
        this.tryButton = this.createButton(-70, 120, 'TRY AGAIN', COLORS.danger);
        this.menuButton = this.createButton(70, 120, 'MENU', COLORS.primary);
        
        // Add all elements...
    }
}
```

## Performance Guidelines

### Mobile Optimization
```javascript
// Detect mobile and adjust
const isMobile = this.game.device.os.iOS || this.game.device.os.android;

if (isMobile) {
    // Reduce particles
    this.maxParticles = 100; // instead of 200
    
    // Simpler animations
    this.animationDuration = 200; // instead of 300
    
    // Disable non-essential effects
    this.useScreenShake = false;
}
```

### Object Pooling
```javascript
// Reuse tiles instead of creating new ones
class TilePool {
    constructor(scene, size = 100) {
        this.pool = [];
        for (let i = 0; i < size; i++) {
            const tile = new Tile(scene, 0, 0, { type: TILE_TYPES.NORMAL });
            tile.setVisible(false);
            this.pool.push(tile);
        }
    }
    
    getTile(config) {
        const tile = this.pool.find(t => !t.visible) || new Tile(this.scene, 0, 0, config);
        tile.reset(config);
        tile.setVisible(true);
        return tile;
    }
}
```

## Implementation Checklist

### Priority 1: Core Visuals ✅
- [ ] Rectangle-based tiles with solid colors
- [ ] Cyan selection border (4px)
- [ ] Hover scale effect (1.05x)
- [ ] Basic text display

### Priority 2: Feedback Systems ✅
- [ ] Surge rings (expanding circles)
- [ ] Explosion fragments (5 rectangles)
- [ ] Score popups
- [ ] Destabilization tints

### Priority 3: Polish ✅
- [ ] Victory/defeat overlays
- [ ] Simple confetti
- [ ] Screen shake (cascade)
- [ ] Word trace line

## Final Notes

This guide prioritizes:
1. **Simplicity** - Uses Phaser rectangles and basic shapes
2. **Performance** - No complex effects or shaders
3. **Maintainability** - Clean, understandable code
4. **Ship-ability** - Everything can be implemented quickly

All visual effects use:
- Phaser's built-in tween system
- Basic shapes (rectangle, circle, text)
- Simple color tints and alpha
- Standard easing functions

No need for:
- Complex gradients
- PostFX pipeline
- Particle systems (except simple ones)
- Custom shaders
- Texture atlases

**Result**: A polished, professional game that ships on time!