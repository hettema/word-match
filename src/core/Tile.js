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
                return 2;
            case TILE_TYPES.STONE:
                return 4;
            default:
                return 1;
        }
    }
    
    /**
     * Create visual representation of the tile
     */
    createVisuals() {
        const tileSize = this.scene.registry.get('settings')?.display?.tileSize || 64;
        
        // Create background sprite (placeholder colored rectangle)
        this.sprite = this.scene.add.rectangle(
            0,
            0,
            tileSize - 2,
            tileSize - 2,
            this.getTileColor()
        );
        this.sprite.setStrokeStyle(2, 0x34495e);
        
        // Create letter text
        if (this.isRevealed) {
            this.textObject = this.scene.add.text(
                0,
                0,
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
        
        // Add special tile indicators
        this.updateVisualState();
    }
    
    /**
     * Get tile background color based on type and state
     * @returns {number} Hex color value
     */
    getTileColor() {
        if (!this.isRevealed) return 0x7f8c8d; // Hidden tile color
        
        switch (this.type) {
            case TILE_TYPES.BOMB:
                return 0xe74c3c; // Red
            case TILE_TYPES.ICE:
                return 0x3498db; // Blue
            case TILE_TYPES.STONE:
                return 0x95a5a6; // Gray
            case TILE_TYPES.MULTIPLIER:
                return 0xf39c12; // Orange
            default:
                return 0xecf0f1; // Light gray
        }
    }
    
    /**
     * Update tile position in world coordinates
     * @param {number} x - World X coordinate
     * @param {number} y - World Y coordinate
     */
    setWorldPosition(x, y) {
        this.worldX = x;
        this.worldY = y;
        
        if (this.sprite) {
            this.sprite.setPosition(x, y);
        }
        if (this.textObject) {
            this.textObject.setPosition(x, y);
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
        
        // Reset any previous effects
        this.sprite.setScale(1);
        this.sprite.setAlpha(1); // Reset alpha
        
        // Reset fill color to original
        this.sprite.setFillStyle(this.getTileColor());
        
        // Apply state-specific visual effects
        switch (this.state) {
            case TILE_STATES.DESTABILIZED:
                this.sprite.setFillStyle(0xff6b6b); // Light red color
                break;
            case TILE_STATES.EXPLODING:
                this.sprite.setFillStyle(0xff4757); // Red color
                this.sprite.setScale(1.1);
                break;
            case TILE_STATES.FALLING:
                this.sprite.setAlpha(0.8);
                break;
        }
        
        // Selection highlight
        if (this.isSelected) {
            const settings = this.scene.registry.get('settings');
            const highlightColor = parseInt(settings?.input?.selectionHighlightColor?.replace('#', '0x') || '0xe74c3c');
            this.sprite.setStrokeStyle(4, highlightColor);
        } else if (this.isHighlighted) {
            const settings = this.scene.registry.get('settings');
            const hoverColor = parseInt(settings?.input?.hoverHighlightColor?.replace('#', '0x') || '0xf39c12');
            this.sprite.setStrokeStyle(3, hoverColor);
        } else {
            this.sprite.setStrokeStyle(2, 0x34495e);
        }
    }
    
    /**
     * Set selection state
     * @param {boolean} selected - Whether tile is selected
     */
    setSelected(selected) {
        this.isSelected = selected;
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
        this.surgeCount++;
        
        // Hidden tiles reveal after 3 surges
        if (this.type === TILE_TYPES.HIDDEN && this.surgeCount >= 3) {
            this.reveal();
        }
        
        // Check if tile should destabilize
        const settings = this.scene.registry.get('levelConfig');
        const threshold = settings?.ripple?.threshold || 3;
        
        if (this.surgeCount >= threshold && this.state === TILE_STATES.NORMAL) {
            this.setState(TILE_STATES.DESTABILIZED);
        }
    }
    
    /**
     * Reveal hidden tile
     */
    reveal() {
        if (this.type === TILE_TYPES.HIDDEN && !this.isRevealed) {
            this.isRevealed = true;
            
            // Create letter text if it doesn't exist
            if (!this.textObject) {
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
            
            // Update tile color
            this.sprite.setFillStyle(this.getTileColor());
        }
    }
    
    /**
     * Take damage (for ice/stone tiles)
     * @returns {boolean} True if tile is destroyed
     */
    takeDamage() {
        if (this.type === TILE_TYPES.ICE || this.type === TILE_TYPES.STONE) {
            this.health--;
            if (this.health <= 0) {
                this.setState(TILE_STATES.EXPLODING);
                return true;
            }
        } else {
            this.setState(TILE_STATES.EXPLODING);
            return true;
        }
        return false;
    }
    
    /**
     * Check if tile can be selected for word tracing
     * @returns {boolean} True if tile can be selected
     */
    canBeSelected() {
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
     * Destroy tile and clean up resources
     */
    destroy() {
        if (this.sprite) {
            this.sprite.destroy();
            this.sprite = null;
        }
        if (this.textObject) {
            this.textObject.destroy();
            this.textObject = null;
        }
    }
}

// Export constants and class
export { Tile, TILE_STATES, TILE_TYPES };