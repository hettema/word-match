/**
 * Tile.js - Individual tile representation with state management
 * Core component for the grid system with letter, value, and state tracking
 */

// Tile states for game mechanics
const TILE_STATES = {
    NORMAL: 'normal',
    DESTABILIZED: 'destabilized', 
    EXPLODING: 'exploding',
    FALLING: 'falling'
};

// Special tile types
const TILE_TYPES = {
    NORMAL: 'normal',
    BOMB: 'bomb',
    ICE: 'ice',
    STONE: 'stone',
    MULTIPLIER: 'multiplier',
    HIDDEN: 'hidden'
};

class Tile {
    /**
     * Create a new tile
     * @param {Phaser.Scene} scene - The Phaser scene
     * @param {number} gridX - Grid X coordinate
     * @param {number} gridY - Grid Y coordinate
     * @param {string} letter - The letter on this tile
     * @param {number} value - Scrabble value of the letter
     * @param {string} type - Type of tile (normal, bomb, ice, etc.)
     */
    constructor(scene, gridX, gridY, letter, value, type = TILE_TYPES.NORMAL) {
        this.scene = scene;
        this.gridX = gridX;
        this.gridY = gridY;
        this.letter = letter;
        this.value = value;
        this.type = type;
        this.state = TILE_STATES.NORMAL;
        
        // Special tile properties
        this.health = this.getInitialHealth();
        this.surgeCount = 0;
        this.isRevealed = type !== TILE_TYPES.HIDDEN;
        
        // Visual properties
        this.sprite = null;
        this.textObject = null;
        this.isSelected = false;
        this.isHighlighted = false;
        
        // Position tracking
        this.worldX = 0;
        this.worldY = 0;
        
        this.createVisuals();
    }
    
    /**
     * Get initial health based on tile type
     * @returns {number} Initial health value
     */
    getInitialHealth() {
        switch (this.type) {
            case TILE_TYPES.ICE:
            case TILE_TYPES.HIDDEN:
                return 2;
            case TILE_TYPES.STONE:
                return 4;
            default:
                return 1;
        }
    }
    
    /**
     * Create visual representation of the tile using a container for unified positioning
     */
    createVisuals() {
        const tileSize = this.scene.registry.get('settings')?.display?.tileSize || 64;
        
        // Visual properties from style guide
        this.tileSize = tileSize;
        this.strokeWidth = 2;
        this.selectedStrokeWidth = 4;
        
        // Create a container to hold all tile elements
        this.container = this.scene.add.container(this.worldX, this.worldY);
        
        // Create rounded background using graphics for proper rounded corners
        this.sprite = this.scene.add.graphics();
        this.drawRoundedTile();
        this.container.add(this.sprite);
        
        // Enable interaction for hover effects on the container
        this.container.setSize(tileSize, tileSize);
        this.container.setInteractive()
            .on('pointerover', () => this.onHover())
            .on('pointerout', () => this.onHoverEnd());
        
        // Create text content
        this.createText();
        
        // Initialize visual state
        this.updateVisualState();
        
        // Create HP indicators for blocker tiles
        if (this.type === TILE_TYPES.ICE || this.type === TILE_TYPES.STONE || this.type === TILE_TYPES.HIDDEN) {
            this.createHPIndicators();
        }
    }
    
    /**
     * Draw rounded tile background
     * @param {boolean} selected - Whether tile is selected
     */
    drawRoundedTile(selected = false) {
        const tileSize = this.tileSize;
        const radius = 8; // Rounded corner radius
        const color = this.getTileColor();
        
        // Choose border color and width based on selection state
        let borderColor, strokeWidth;
        if (selected) {
            borderColor = window.COLORS?.cyan || 0x00d9ff;
            strokeWidth = this.selectedStrokeWidth;
        } else {
            borderColor = window.COLORS?.border || 0x34495e;
            strokeWidth = this.strokeWidth;
        }
        
        this.sprite.clear();
        
        // Draw rounded rectangle background
        this.sprite.fillStyle(color);
        this.sprite.fillRoundedRect(-tileSize/2, -tileSize/2, tileSize, tileSize, radius);
        
        // Draw rounded border
        this.sprite.lineStyle(strokeWidth, borderColor);
        this.sprite.strokeRoundedRect(-tileSize/2, -tileSize/2, tileSize, tileSize, radius);
    }
    
    /**
     * Redraw tile with a specific color (for dynamic color changes)
     * @param {number} color - The color to use for the tile background
     */
    redrawTileWithColor(color) {
        const tileSize = this.tileSize;
        const radius = 8; // Rounded corner radius
        
        // Choose border color and width based on selection/highlight state
        let borderColor, strokeWidth;
        if (this.isSelected) {
            const settings = this.scene.registry.get('settings');
            borderColor = parseInt(settings?.input?.selectionHighlightColor?.replace('#', '0x') || '0xe74c3c');
            strokeWidth = 4;
        } else if (this.isHighlighted) {
            const settings = this.scene.registry.get('settings');
            borderColor = parseInt(settings?.input?.hoverHighlightColor?.replace('#', '0x') || '0xf39c12');
            strokeWidth = 3;
        } else {
            borderColor = window.COLORS?.border || 0x34495e;
            strokeWidth = this.strokeWidth;
        }
        
        this.sprite.clear();
        
        // Draw rounded rectangle background with specified color
        this.sprite.fillStyle(color);
        this.sprite.fillRoundedRect(-tileSize/2, -tileSize/2, tileSize, tileSize, radius);
        
        // Draw rounded border
        this.sprite.lineStyle(strokeWidth, borderColor);
        this.sprite.strokeRoundedRect(-tileSize/2, -tileSize/2, tileSize, tileSize, radius);
    }
    
    /**
     * Create text content for the tile
     */
    createText() {
        const tileSize = this.tileSize;
        
        if (this.isRevealed) {
            // For special tiles, show letter in center and emoji in lower left
            if (this.type !== TILE_TYPES.NORMAL) {
                // Main letter in center (relative to container)
                this.textObject = this.scene.add.text(
                    0, // Relative to container center
                    -tileSize * 0.1, // Slightly higher to make room for emoji
                    this.letter,
                    {
                        fontFamily: 'Rubik, Arial, sans-serif',
                        fontSize: `${Math.floor(tileSize * 0.375)}px`,
                        fontStyle: 'bold',
                        color: this.getTextColor(),
                        align: 'center'
                    }
                );
                this.textObject.setOrigin(0.5, 0.5);
                this.container.add(this.textObject);
                
                // For blocker tiles, position emoji in top-right corner
                if (this.type === TILE_TYPES.ICE || this.type === TILE_TYPES.STONE || this.type === TILE_TYPES.HIDDEN) {
                    this.emojiText = this.scene.add.text(
                        tileSize * 0.3, // Top-right corner (relative to container center)
                        -tileSize * 0.25,
                        this.getEmojiForType(),
                        {
                            fontSize: `${Math.floor(tileSize * 0.25)}px`
                        }
                    );
                    this.emojiText.setOrigin(0.5, 0.5);
                    this.container.add(this.emojiText);
                    
                    // Add HP dots in bottom-left corner for blocker tiles
                    this.createHPIndicators();
                } else {
                    // Non-blocker special tiles keep emoji in lower left
                    this.emojiText = this.scene.add.text(
                        -tileSize * 0.3, // Relative to container center
                        tileSize * 0.25,
                        this.getEmojiForType(),
                        {
                            fontSize: `${Math.floor(tileSize * 0.25)}px`
                        }
                    );
                    this.emojiText.setOrigin(0.5, 0.5);
                    this.container.add(this.emojiText);
                }
                
                // Special indicator for multiplier
                if (this.type === TILE_TYPES.MULTIPLIER) {
                    this.multiplierText = this.scene.add.text(
                        tileSize * 0.25, // Relative to container center
                        -tileSize * 0.25,
                        '×2',
                        {
                            fontFamily: 'Rubik, Arial, sans-serif',
                            fontSize: `${Math.floor(tileSize * 0.2)}px`,
                            fontStyle: 'bold',
                            color: this.getTextColor()
                        }
                    );
                    this.multiplierText.setOrigin(0.5, 0.5);
                    this.container.add(this.multiplierText);
                }
            } else {
                // Normal tiles - just the letter (relative to container)
                this.textObject = this.scene.add.text(
                    0, // Relative to container center
                    0,
                    this.letter,
                    {
                        fontFamily: 'Rubik, Arial, sans-serif',
                        fontSize: `${Math.floor(tileSize * 0.375)}px`,
                        fontStyle: 'bold',
                        color: this.getTextColor(),
                        align: 'center'
                    }
                );
                this.textObject.setOrigin(0.5, 0.5);
                this.container.add(this.textObject);
            }
            
            // Always show point value in bottom right corner for all revealed tiles
            if (this.value) {
                this.valueText = this.scene.add.text(
                    tileSize * 0.28, // Relative to container center
                    tileSize * 0.28,
                    this.value.toString(),
                    {
                        fontFamily: 'Rubik, Arial, sans-serif',
                        fontSize: `${Math.floor(tileSize * 0.18)}px`,
                        fontStyle: 'bold',
                        color: 'rgba(0, 0, 0, 0.6)'
                    }
                );
                this.valueText.setOrigin(0.5, 0.5);
                this.container.add(this.valueText);
            }
        } else if (this.type === TILE_TYPES.HIDDEN) {
            // Show ? for hidden tiles (relative to container)
            this.textObject = this.scene.add.text(
                0, // Relative to container center
                0,
                '?',
                {
                    fontFamily: 'Rubik, Arial, sans-serif',
                    fontSize: `${Math.floor(tileSize * 0.5)}px`,
                    fontStyle: 'bold',
                    color: this.getTextColor()
                }
            );
            this.textObject.setOrigin(0.5, 0.5);
            this.container.add(this.textObject);
        }
    }
    
    /**
     * Get emoji for special tile types
     */
    getEmojiForType() {
        const emojis = {
            [TILE_TYPES.BOMB]: '💣',
            [TILE_TYPES.ICE]: '🧊',
            [TILE_TYPES.STONE]: '🪨',
            [TILE_TYPES.MULTIPLIER]: '⭐'
        };
        return emojis[this.type] || '';
    }
    
    /**
     * Get display text for tile based on type (from style guide)
     */
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
    
    /**
     * Get text color based on tile type
     */
    getTextColor() {
        if (!this.isRevealed) return '#ecf0f1';
        
        // Use dark text for light backgrounds, light text for dark backgrounds
        switch (this.type) {
            case TILE_TYPES.BOMB:
            case TILE_TYPES.ICE:
            case TILE_TYPES.STONE:
                return '#ecf0f1'; // Light text for dark tiles
            case TILE_TYPES.MULTIPLIER:
                return '#2c3e50'; // Dark text for orange tile
            default:
                return '#2c3e50'; // Dark text for light normal tiles
        }
    }
    
    /**
     * Get tile background color based on type and state (from style guide)
     * @returns {number} Hex color value
     */
    getTileColor() {
        if (!this.isRevealed) return window.COLORS?.tileHidden || 0x9b59b6; // Purple for hidden
        
        // Use colors from style guide
        const colors = {
            [TILE_TYPES.NORMAL]: window.COLORS?.tileNormal || 0xecf0f1,
            [TILE_TYPES.BOMB]: window.COLORS?.tileBomb || 0xe74c3c,
            [TILE_TYPES.ICE]: window.COLORS?.tileIce || 0x3498db,
            [TILE_TYPES.STONE]: window.COLORS?.tileStone || 0x7f8c8d,
            [TILE_TYPES.MULTIPLIER]: window.COLORS?.tileMultiplier || 0xf39c12,
            [TILE_TYPES.HIDDEN]: window.COLORS?.tileHidden || 0x9b59b6
        };
        return colors[this.type] || colors[TILE_TYPES.NORMAL];
    }
    
    /**
     * Handle hover effect (from style guide)
     */
    onHover() {
        if (this.isLocked() || !this.canBeSelected()) return;
        
        // Use animation constants from style guide
        const hoverAnim = window.ANIMATIONS?.hover || { scale: 1.05, duration: 100, ease: 'Back.easeOut' };
        
        this.scene.tweens.add({
            targets: this.container,
            scaleX: hoverAnim.scale,
            scaleY: hoverAnim.scale,
            duration: hoverAnim.duration,
            ease: hoverAnim.ease
        });
    }
    
    /**
     * Handle hover end effect (from style guide)
     */
    onHoverEnd() {
        if (this.isSelected) return; // Keep scale if selected
        
        this.scene.tweens.add({
            targets: this.container,
            scaleX: 1,
            scaleY: 1,
            duration: 100
        });
    }
    
    /**
     * Check if tile is locked (cannot be interacted with)
     */
    isLocked() {
        return this.state === TILE_STATES.EXPLODING ||
               this.state === TILE_STATES.FALLING ||
               this.scene.gameState === 'animating';
    }
    
    /**
     * Update tile position in world coordinates
     * @param {number} x - World X coordinate
     * @param {number} y - World Y coordinate
     */
    setWorldPosition(x, y) {
        this.worldX = x;
        this.worldY = y;

        // Move the entire container - all elements move together
        if (this.container) {
            this.container.setPosition(x, y);
        }
    }
    
    /**
     * Update grid position
     * @param {number} gridX - New grid X coordinate
     * @param {number} gridY - New grid Y coordinate
     */
    setGridPosition(gridX, gridY) {
        this.gridX = gridX;
        this.gridY = gridY;
    }
    
    /**
     * Change tile state
     * @param {string} newState - New state from TILE_STATES
     */
    setState(newState) {
        if (Object.values(TILE_STATES).includes(newState)) {
            this.state = newState;
            this.updateVisualState();
        }
    }
    
    /**
     * Update visual appearance based on current state
     */
    updateVisualState() {
        if (!this.sprite) return;
        
        // Reset any previous effects and stop existing animations
        this.stopSurgeAnimations();
        if (this.container) {
            this.container.setScale(1);
            this.container.setAlpha(1);
        } else {
            this.sprite.setScale(1);
            this.sprite.setAlpha(1);
        }
        
        // Get base color and apply surge progression
        let baseColor = this.getTileColor();
        
        // Apply surge progression visual feedback for all states except exploding
        if (this.surgeCount > 0 && this.state !== TILE_STATES.EXPLODING) {
            const levelConfig = this.scene.registry.get('levelConfig');
            const threshold = levelConfig?.ripple?.threshold || 3;
            
            // Progressive color changes (from demo and style guide)
            if (this.surgeCount === 1) {
                // Stage 1: Light red tint - matches demo's destabilized-1
                baseColor = this.blendColors(baseColor, 0xffcccc, 0.8);
            } else if (this.surgeCount === 2) {
                // Stage 2: Medium red tint - matches demo's destabilized-2
                baseColor = this.blendColors(baseColor, 0xff9999, 0.9);
            } else if (this.surgeCount >= threshold - 1) {
                // Stage 3: Dark red tint - matches demo's destabilized-3
                baseColor = this.blendColors(baseColor, 0xff6666, 0.95);
            }
            
            // Update surge dot indicators
            this.updateSurgeIndicators();
            
            // Apply stage-specific animations (from demo and style guide)
            if (this.surgeCount === 2) {
                this.addWobbleAnimation();
            } else if (this.surgeCount >= 3) {
                this.addCriticalShakeAnimation();
            }
        } else {
            // Remove surge indicators if no surges
            this.removeSurgeIndicators();
        }
        
        // Store the calculated color for redrawing
        this.currentColor = baseColor;
        
        // Apply state-specific visual effects and colors
        switch (this.state) {
            case TILE_STATES.DESTABILIZED:
                // Use the progressive surge color (already calculated above)
                this.redrawTileWithColor(this.currentColor);
                break;
            case TILE_STATES.EXPLODING:
                this.redrawTileWithColor(0xff4757); // Red color
                if (this.container) {
                    this.container.setScale(1.1);
                } else {
                    this.sprite.setScale(1.1);
                }
                break;
            case TILE_STATES.FALLING:
                this.redrawTileWithColor(this.currentColor);
                if (this.container) {
                    this.container.setAlpha(0.8);
                } else {
                    this.sprite.setAlpha(0.8);
                }
                break;
            default:
                // For all other states, use the calculated color
                this.redrawTileWithColor(this.currentColor);
                break;
        }
        
        // Selection and highlight states are handled by redrawing the tile
        // The redrawTileWithColor method already handles selection state properly
    }
    
    /**
     * Blend two colors together
     * @param {number} color1 - First color (hex)
     * @param {number} color2 - Second color (hex)
     * @param {number} ratio - Blend ratio (0-1)
     * @returns {number} Blended color
     */
    blendColors(color1, color2, ratio) {
        const r1 = (color1 >> 16) & 0xff;
        const g1 = (color1 >> 8) & 0xff;
        const b1 = color1 & 0xff;
        
        const r2 = (color2 >> 16) & 0xff;
        const g2 = (color2 >> 8) & 0xff;
        const b2 = color2 & 0xff;
        
        const r = Math.round(r1 + (r2 - r1) * ratio);
        const g = Math.round(g1 + (g2 - g1) * ratio);
        const b = Math.round(b1 + (b2 - b1) * ratio);
        
        return (r << 16) | (g << 8) | b;
    }
    
    /**
     * Set selection state (enhanced with style guide animations)
     * @param {boolean} selected - Whether tile is selected
     */
    setSelected(selected) {
        this.isSelected = selected;
        
        if (selected) {
            // Redraw with selection highlighting
            this.redrawTileWithColor(this.getTileColor());
            
            // Scale up with bounce animation from style guide
            const selectionAnim = window.ANIMATIONS?.selection || { scale: 1.15, duration: 200, ease: 'Back.easeOut' };
            this.scene.tweens.add({
                targets: this.container,
                scaleX: selectionAnim.scale,
                scaleY: selectionAnim.scale,
                duration: selectionAnim.duration,
                ease: selectionAnim.ease
            });
        } else {
            // Redraw with normal appearance
            this.redrawTileWithColor(this.getTileColor());
            
            // Scale back
            this.scene.tweens.add({
                targets: this.container,
                scaleX: 1,
                scaleY: 1,
                duration: 100
            });
        }
        
        this.updateVisualState();
    }
    
    /**
     * Set highlight state (for hover effects)
     * @param {boolean} highlighted - Whether tile is highlighted
     */
    setHighlighted(highlighted) {
        this.isHighlighted = highlighted;
        this.updateVisualState();
    }
    
    /**
     * Apply surge effect (for ripple mechanics)
     */
    applySurge() {
        // Blocker tiles (ICE/STONE/HIDDEN) take damage directly without surge effects
        if (this.type === TILE_TYPES.ICE || this.type === TILE_TYPES.STONE || this.type === TILE_TYPES.HIDDEN) {
            // Blocker tiles take damage when surged, no surge count or visual effects
            this.takeDamage();
            return;
        }
        
        // Normal tiles get surge effects
        this.surgeCount++;
        
        // Update visual state to show surge progression
        this.updateVisualState();
        
        // Check if tile should destabilize or explode
        const settings = this.scene.registry.get('levelConfig');
        const threshold = settings?.ripple?.threshold || 3;
        
        if (this.state === TILE_STATES.DESTABILIZED) {
            // Destabilized tiles explode on any surge
            this.setState(TILE_STATES.EXPLODING);
        } else if (this.surgeCount >= threshold && this.state === TILE_STATES.NORMAL) {
            // Normal tiles destabilize when reaching threshold
            this.setState(TILE_STATES.DESTABILIZED);
        }
    }
    
    /**
     * Reveal hidden tile
     */
    reveal() {
        if (this.type === TILE_TYPES.HIDDEN && !this.isRevealed) {
            this.isRevealed = true;
            
            // Update the text to show the letter instead of ?
            if (this.textObject) {
                this.textObject.setText(this.letter);
            } else {
                // Create letter text if it doesn't exist
                const tileSize = this.scene.registry.get('settings')?.display?.tileSize || 64;
                this.textObject = this.scene.add.text(
                    this.worldX,
                    this.worldY,
                    this.letter,
                    {
                        fontSize: `${Math.floor(tileSize * 0.4)}px`,
                        fontFamily: 'Arial, sans-serif',
                        color: '#2c3e50',
                        fontStyle: 'bold'
                    }
                );
                this.textObject.setOrigin(0.5, 0.5);
            }
            
            // Update tile color by redrawing
            this.redrawTileWithColor(this.getTileColor());
        }
    }
    
    /**
     * Take damage (for ice/stone tiles)
     * @returns {boolean} True if tile is destroyed
     */
    takeDamage() {
        if (this.type === TILE_TYPES.ICE || this.type === TILE_TYPES.STONE || this.type === TILE_TYPES.HIDDEN) {
            this.health--;
            
            // Update HP indicators to show reduced health
            this.updateHPIndicators();
            
            if (this.health <= 0) {
                // Convert blocker tile to normal tile instead of exploding
                this.convertToNormalTile();
                return true;
            }
        } else {
            this.setState(TILE_STATES.EXPLODING);
            return true;
        }
        return false;
    }
    
    /**
     * Convert blocker tile to normal tile when HP reaches 0
     */
    convertToNormalTile() {
        // Remove blocker-specific visuals
        this.removeHPIndicators();
        if (this.emojiText) {
            this.emojiText.destroy();
            this.emojiText = null;
        }
        
        // Clean up existing text elements before conversion
        if (this.textObject) {
            this.textObject.destroy();
            this.textObject = null;
        }
        if (this.valueText) {
            this.valueText.destroy();
            this.valueText = null;
        }
        if (this.multiplierText) {
            this.multiplierText.destroy();
            this.multiplierText = null;
        }
        
        // Convert to normal tile
        const oldType = this.type;
        this.type = TILE_TYPES.NORMAL;
        this.health = 1; // Normal tiles have 1 HP
        
        // Recreate text content as normal tile
        this.createText();
        
        // Update visual state
        this.updateVisualState();
        
        console.log(`${oldType} tile converted to normal tile at (${this.gridX}, ${this.gridY})`);
    }
    
    /**
     * Check if tile can be selected for word tracing
     * @returns {boolean} True if tile can be selected
     */
    canBeSelected() {
        // Ice and stone tiles are blockers and cannot be selected
        if (this.type === TILE_TYPES.ICE || this.type === TILE_TYPES.STONE) {
            return false;
        }
        
        return this.isRevealed &&
               this.state !== TILE_STATES.EXPLODING &&
               this.state !== TILE_STATES.FALLING;
    }
    
    /**
     * Get tile data for serialization
     * @returns {Object} Tile data object
     */
    getData() {
        return {
            gridX: this.gridX,
            gridY: this.gridY,
            letter: this.letter,
            value: this.value,
            type: this.type,
            state: this.state,
            health: this.health,
            surgeCount: this.surgeCount,
            isRevealed: this.isRevealed
        };
    }
    
    /**
     * Stop all surge-related animations
     */
    stopSurgeAnimations() {
        if (this.wobbleTween) {
            this.wobbleTween.stop();
            this.wobbleTween = null;
        }
        if (this.shakeTween) {
            this.shakeTween.stop();
            this.shakeTween = null;
        }
    }
    
    /**
     * Update surge dot indicators (from demo and style guide)
     */
    updateSurgeIndicators() {
        // Remove existing indicators
        this.removeSurgeIndicators();
        
        if (this.surgeCount <= 0) return;
        
        // Create surge dots array
        this.surgeIndicators = [];
        
        for (let i = 0; i < Math.min(this.surgeCount, 3); i++) {
            const dot = this.scene.add.circle(
                -(this.tileSize / 2) + 8 + (i * 8), // Top-left corner relative to container center
                -(this.tileSize / 2) + 8,
                3, // 6px diameter (3px radius)
                0xff6b6b // Red color from demo
            );
            this.surgeIndicators.push(dot);
            this.container.add(dot); // Add to container so it moves with the tile
        }
    }
    
    /**
     * Remove surge dot indicators
     */
    removeSurgeIndicators() {
        if (this.surgeIndicators) {
            this.surgeIndicators.forEach(dot => {
                if (dot && dot.destroy) {
                    dot.destroy();
                }
            });
            this.surgeIndicators = [];
        }
    }
    
    /**
     * Create HP dot indicators for blocker tiles (bottom-left corner)
     */
    createHPIndicators() {
        if (!this.container) return;
        
        const tileSize = this.tileSize;
        const maxHP = this.getInitialHealth();
        
        // Remove existing HP indicators
        this.removeHPIndicators();
        
        // Create HP dots array
        this.hpIndicators = [];
        
        for (let i = 0; i < this.health; i++) {
            const dot = this.scene.add.circle(
                -tileSize * 0.35 + (i * 6), // Bottom-left corner, spaced horizontally
                tileSize * 0.3,
                2,
                0x555555 // Dark grey color
            );
            this.hpIndicators.push(dot);
            this.container.add(dot); // Add to container so it moves with the tile
        }
    }
    
    /**
     * Remove HP dot indicators
     */
    removeHPIndicators() {
        if (this.hpIndicators) {
            this.hpIndicators.forEach(dot => {
                if (dot && dot.destroy) {
                    dot.destroy();
                }
            });
            this.hpIndicators = [];
        }
    }
    
    /**
     * Update HP indicators when health changes
     */
    updateHPIndicators() {
        if (this.type === TILE_TYPES.ICE || this.type === TILE_TYPES.STONE || this.type === TILE_TYPES.HIDDEN) {
            this.createHPIndicators();
        }
    }
    
    /**
     * Add wobble animation for surge level 2 (from demo)
     */
    addWobbleAnimation() {
        this.stopSurgeAnimations(); // Stop any existing animations
        
        // Animate the entire container - all elements move together
        this.wobbleTween = this.scene.tweens.add({
            targets: this.container,
            angle: { from: -3, to: 3 },
            duration: 300,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
    }
    
    /**
     * Add critical shake animation for surge level 3 (from demo)
     */
    addCriticalShakeAnimation() {
        this.stopSurgeAnimations(); // Stop any existing animations
        
        const baseX = this.worldX;
        const baseY = this.worldY;
        
        // Much more subtle shake - just like the demo
        this.shakeTween = this.scene.tweens.add({
            targets: this.container,
            x: baseX + Phaser.Math.Between(-1, 1), // Reduced from ±2 to ±1
            y: baseY + Phaser.Math.Between(-1, 1),
            duration: 100, // Increased from 50ms to 100ms for smoother movement
            repeat: -1,
            yoyo: true, // Return to center between shakes
            ease: 'Power1'
        });
    }

    /**
     * Destroy tile and clean up resources
     */
    destroy() {
        // Stop animations and remove indicators
        this.stopSurgeAnimations();
        this.removeSurgeIndicators();
        this.removeHPIndicators();
        
        // Destroy the container - this will destroy all child elements automatically
        if (this.container) {
            this.container.destroy();
            this.container = null;
        }
        
        // Clear references to child elements
        this.sprite = null;
        this.textObject = null;
        this.valueText = null;
        this.emojiText = null;
        this.multiplierText = null;
    }
}

// Make available globally for script tag imports
if (typeof window !== 'undefined') {
    window.Tile = Tile;
    window.TILE_STATES = TILE_STATES;
    window.TILE_TYPES = TILE_TYPES;
}

// Export for CommonJS if needed
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Tile, TILE_STATES, TILE_TYPES };
}