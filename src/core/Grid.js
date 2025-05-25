/**
 * Grid.js - Core grid management system
 * Handles tile creation, positioning, neighbor detection, and grid operations
 */

// Tile.js will be loaded via script tag, so classes are available globally

class Grid {
    /**
     * Create a new grid
     * @param {Phaser.Scene} scene - The Phaser scene
     * @param {Object} config - Grid configuration from level data
     */
    constructor(scene, config) {
        this.scene = scene;
        this.config = config;
        
        // Validate config
        if (!config || !config.gridSize) {
            throw new Error('Grid config must include gridSize');
        }
        
        // Grid dimensions
        this.width = config.gridSize.width;
        this.height = config.gridSize.height;
        
        // Visual settings
        const settings = scene.registry.get('settings') || {};
        this.tileSize = settings.display?.tileSize || 64;
        this.gridPadding = settings.display?.gridPadding || 10;
        
        // Grid data structure - 2D array of tiles
        this.tiles = [];
        this.initializeGrid();
        
        // Tile distribution for random generation
        this.tileDistribution = this.buildTileDistribution(config.tileDistribution);
        
        // Grid positioning
        this.calculateGridPosition();
        
        // Create initial tiles
        this.populateGrid();
    }
    
    /**
     * Initialize empty grid structure
     */
    initializeGrid() {
        this.tiles = [];
        for (let y = 0; y < this.height; y++) {
            this.tiles[y] = [];
            for (let x = 0; x < this.width; x++) {
                this.tiles[y][x] = null;
            }
        }
    }
    
    /**
     * Build weighted tile distribution array from config
     * @param {string} distributionName - Name of distribution in levels.json
     * @returns {Array} Array of {letter, value} objects for random selection
     */
    buildTileDistribution(distributionName) {
        const levelConfig = this.scene.registry.get('levelConfig');
        let distribution = levelConfig?.tileDistributionData;
        
        // If no distribution data in registry, check if it's in the config directly
        if (!distribution && this.config.tileDistributionData) {
            distribution = this.config.tileDistributionData;
        }
        
        if (!distribution) {
            console.error(`Tile distribution '${distributionName}' not found`);
            return [{ letter: 'A', value: 1 }]; // Fallback
        }
        
        const weightedArray = [];
        
        // Build weighted array based on letter counts
        Object.entries(distribution).forEach(([letter, data]) => {
            for (let i = 0; i < data.count; i++) {
                weightedArray.push({
                    letter: letter,
                    value: data.value
                });
            }
        });
        
        return weightedArray;
    }
    
    /**
     * Calculate grid position to center it on screen
     */
    calculateGridPosition() {
        const gameWidth = this.scene.scale.width;
        const gameHeight = this.scene.scale.height;
        
        const totalGridWidth = this.width * this.tileSize + (this.width - 1) * this.gridPadding;
        const totalGridHeight = this.height * this.tileSize + (this.height - 1) * this.gridPadding;
        
        this.gridStartX = (gameWidth - totalGridWidth) / 2;
        this.gridStartY = (gameHeight - totalGridHeight) / 2;
    }
    
    /**
     * Populate grid with initial tiles
     */
    populateGrid() {
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                this.createTileAt(x, y);
            }
        }
    }
    
    /**
     * Create a new tile at specified grid position
     * @param {number} gridX - Grid X coordinate
     * @param {number} gridY - Grid Y coordinate
     * @param {Object} tileData - Optional tile data {letter, value, type}
     * @returns {Tile} The created tile
     */
    createTileAt(gridX, gridY, tileData = null) {
        // Generate random tile data if not provided
        if (!tileData) {
            tileData = this.generateRandomTile();
        }
        
        // Create tile instance
        const tile = new Tile(
            this.scene,
            gridX,
            gridY,
            tileData.letter,
            tileData.value,
            tileData.type || TILE_TYPES.NORMAL
        );
        
        // Set world position
        const worldPos = this.gridToWorldPosition(gridX, gridY);
        tile.setWorldPosition(worldPos.x, worldPos.y);
        
        // Store in grid
        this.tiles[gridY][gridX] = tile;
        
        return tile;
    }
    
    /**
     * Generate random tile data based on distribution and special tile chances
     * @returns {Object} {letter, value, type}
     */
    generateRandomTile() {
        // Check for special tile generation
        const specialType = this.rollForSpecialTile();
        
        if (specialType !== TILE_TYPES.NORMAL) {
            // Special tiles still need letters for hidden tiles
            const baseTile = this.getRandomBaseTile();
            return {
                letter: baseTile.letter,
                value: baseTile.value,
                type: specialType
            };
        }
        
        // Generate normal tile
        const baseTile = this.getRandomBaseTile();
        return {
            letter: baseTile.letter,
            value: baseTile.value,
            type: TILE_TYPES.NORMAL
        };
    }
    
    /**
     * Get random base tile from distribution
     * @returns {Object} {letter, value}
     */
    getRandomBaseTile() {
        const randomIndex = Math.floor(Math.random() * this.tileDistribution.length);
        return this.tileDistribution[randomIndex];
    }
    
    /**
     * Roll for special tile type based on probabilities
     * @returns {string} Tile type from TILE_TYPES
     */
    rollForSpecialTile() {
        const specialTiles = this.config.specialTiles;
        const roll = Math.random();
        
        let cumulativeProbability = 0;
        
        // Check each special tile type
        for (const [type, probability] of Object.entries(specialTiles)) {
            cumulativeProbability += probability;
            if (roll < cumulativeProbability) {
                return type.toLowerCase();
            }
        }
        
        return TILE_TYPES.NORMAL;
    }
    
    /**
     * Convert grid coordinates to world position
     * @param {number} gridX - Grid X coordinate
     * @param {number} gridY - Grid Y coordinate
     * @returns {Object} {x, y} world coordinates
     */
    gridToWorldPosition(gridX, gridY) {
        return {
            x: this.gridStartX + gridX * (this.tileSize + this.gridPadding) + this.tileSize / 2,
            y: this.gridStartY + gridY * (this.tileSize + this.gridPadding) + this.tileSize / 2
        };
    }
    
    /**
     * Convert world position to grid coordinates
     * @param {number} worldX - World X coordinate
     * @param {number} worldY - World Y coordinate
     * @returns {Object} {x, y} grid coordinates or null if outside grid
     */
    worldToGridPosition(worldX, worldY) {
        const relativeX = worldX - this.gridStartX;
        const relativeY = worldY - this.gridStartY;
        
        const gridX = Math.floor(relativeX / (this.tileSize + this.gridPadding));
        const gridY = Math.floor(relativeY / (this.tileSize + this.gridPadding));
        
        // Debug logging for coordinate conversion issues
        if (worldY > this.scene.scale.height * 0.7) { // Only log for bottom area
            console.log(`DEBUG worldToGrid: world(${worldX.toFixed(1)}, ${worldY.toFixed(1)}) -> relative(${relativeX.toFixed(1)}, ${relativeY.toFixed(1)}) -> grid(${gridX}, ${gridY}) valid: ${this.isValidPosition(gridX, gridY)}`);
            console.log(`DEBUG grid bounds: width=${this.width}, height=${this.height}, gridStart(${this.gridStartX.toFixed(1)}, ${this.gridStartY.toFixed(1)}), tileSize=${this.tileSize}, padding=${this.gridPadding}`);
        }
        
        if (this.isValidPosition(gridX, gridY)) {
            return { x: gridX, y: gridY };
        }
        
        return null;
    }
    
    /**
     * Check if grid position is valid
     * @param {number} gridX - Grid X coordinate
     * @param {number} gridY - Grid Y coordinate
     * @returns {boolean} True if position is valid
     */
    isValidPosition(gridX, gridY) {
        return gridX >= 0 && gridX < this.width && gridY >= 0 && gridY < this.height;
    }
    
    /**
     * Get tile at grid position
     * @param {number} gridX - Grid X coordinate
     * @param {number} gridY - Grid Y coordinate
     * @returns {Tile|null} Tile at position or null
     */
    getTileAt(gridX, gridY) {
        if (!this.isValidPosition(gridX, gridY)) {
            return null;
        }
        return this.tiles[gridY][gridX];
    }
    
    /**
     * Get all 8-directional neighbors of a tile
     * @param {number} gridX - Grid X coordinate
     * @param {number} gridY - Grid Y coordinate
     * @param {number} radius - Search radius (default 1)
     * @returns {Array} Array of neighboring tiles
     */
    getNeighbors(gridX, gridY, radius = 1) {
        const neighbors = [];
        
        for (let dy = -radius; dy <= radius; dy++) {
            for (let dx = -radius; dx <= radius; dx++) {
                // Skip center tile
                if (dx === 0 && dy === 0) continue;
                
                const neighborX = gridX + dx;
                const neighborY = gridY + dy;
                
                const tile = this.getTileAt(neighborX, neighborY);
                if (tile) {
                    neighbors.push(tile);
                }
            }
        }
        
        return neighbors;
    }
    
    /**
     * Get adjacent neighbors (4-directional) for word tracing
     * @param {number} gridX - Grid X coordinate
     * @param {number} gridY - Grid Y coordinate
     * @returns {Array} Array of adjacent tiles
     */
    getAdjacentNeighbors(gridX, gridY) {
        const directions = [
            [-1, -1], [0, -1], [1, -1], // Top row
            [-1,  0],          [1,  0], // Middle row (excluding center)
            [-1,  1], [0,  1], [1,  1]  // Bottom row
        ];
        
        const neighbors = [];
        
        directions.forEach(([dx, dy]) => {
            const tile = this.getTileAt(gridX + dx, gridY + dy);
            if (tile) {
                neighbors.push(tile);
            }
        });
        
        return neighbors;
    }
    
    /**
     * Check if two tiles are adjacent (8-directional)
     * @param {Tile} tile1 - First tile
     * @param {Tile} tile2 - Second tile
     * @returns {boolean} True if tiles are adjacent
     */
    areAdjacent(tile1, tile2) {
        const dx = Math.abs(tile1.gridX - tile2.gridX);
        const dy = Math.abs(tile1.gridY - tile2.gridY);
        
        return dx <= 1 && dy <= 1 && (dx !== 0 || dy !== 0);
    }
    
    /**
     * Remove tile from grid
     * @param {number} gridX - Grid X coordinate
     * @param {number} gridY - Grid Y coordinate
     */
    removeTileAt(gridX, gridY) {
        const tile = this.getTileAt(gridX, gridY);
        if (tile) {
            tile.destroy();
            this.tiles[gridY][gridX] = null;
        }
    }
    
    /**
     * Apply gravity - drop tiles down to fill empty spaces
     * @returns {Array} Array of tile movements for animation
     */
    applyGravity() {
        const movements = [];
        
        // Process each column from bottom to top
        for (let x = 0; x < this.width; x++) {
            let writeIndex = this.height - 1;
            
            // Scan from bottom to top
            for (let y = this.height - 1; y >= 0; y--) {
                const tile = this.tiles[y][x];
                
                if (tile && tile.state !== TILE_STATES.EXPLODING) {
                    if (y !== writeIndex) {
                        // Move tile down
                        this.tiles[writeIndex][x] = tile;
                        this.tiles[y][x] = null;
                        
                        // Update tile position
                        tile.setGridPosition(x, writeIndex);
                        
                        // Update visual position immediately
                        const worldPos = this.gridToWorldPosition(x, writeIndex);
                        tile.setWorldPosition(worldPos.x, worldPos.y);
                        
                        // Record movement for animation
                        movements.push({
                            tile: tile,
                            fromY: y,
                            toY: writeIndex
                        });
                    }
                    writeIndex--;
                }
            }
        }
        
        return movements;
    }
    
    /**
     * Fill empty spaces at top of grid with new tiles
     * @returns {Array} Array of new tiles created
     */
    refillGrid() {
        const newTiles = [];
        
        for (let x = 0; x < this.width; x++) {
            for (let y = 0; y < this.height; y++) {
                if (!this.tiles[y][x]) {
                    const tile = this.createTileAt(x, y);
                    newTiles.push(tile);
                }
            }
        }
        
        return newTiles;
    }
    
    /**
     * Get all tiles in the grid
     * @returns {Array} Flat array of all tiles
     */
    getAllTiles() {
        const allTiles = [];
        
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const tile = this.tiles[y][x];
                if (tile) {
                    allTiles.push(tile);
                }
            }
        }
        
        return allTiles;
    }
    
    /**
     * Get tiles by state
     * @param {string} state - Tile state to filter by
     * @returns {Array} Array of tiles with specified state
     */
    getTilesByState(state) {
        return this.getAllTiles().filter(tile => tile.state === state);
    }
    
    /**
     * Clear selection on all tiles
     */
    clearSelection() {
        this.getAllTiles().forEach(tile => {
            tile.setSelected(false);
            tile.setHighlighted(false);
        });
    }
    
    /**
     * Update grid layout when screen size changes
     */
    updateLayout() {
        this.calculateGridPosition();
        
        // Update all tile positions
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const tile = this.tiles[y][x];
                if (tile) {
                    const worldPos = this.gridToWorldPosition(x, y);
                    tile.setWorldPosition(worldPos.x, worldPos.y);
                }
            }
        }
    }
    
    /**
     * Get grid statistics for debugging
     * @returns {Object} Grid statistics
     */
    getStats() {
        const allTiles = this.getAllTiles();
        const stats = {
            totalTiles: allTiles.length,
            emptySpaces: (this.width * this.height) - allTiles.length,
            tilesByState: {},
            tilesByType: {}
        };
        
        // Count by state
        Object.values(TILE_STATES).forEach(state => {
            stats.tilesByState[state] = allTiles.filter(tile => tile.state === state).length;
        });
        
        // Count by type
        Object.values(TILE_TYPES).forEach(type => {
            stats.tilesByType[type] = allTiles.filter(tile => tile.type === type).length;
        });
        
        return stats;
    }
    
    /**
     * Handle special tile interactions during ripple effects
     * @param {Tile} tile - The tile to check for special interactions
     * @returns {Array} Additional tiles to affect
     */
    handleSpecialTileInteraction(tile) {
        const affectedTiles = [];
        
        switch (tile.type) {
            case TILE_TYPES.BOMB:
                // Bomb tiles explode and affect all neighbors
                const neighbors = this.getNeighbors(tile.gridX, tile.gridY);
                affectedTiles.push(...neighbors);
                console.log(`Bomb tile exploded, affecting ${neighbors.length} neighbors`);
                break;
                
            case TILE_TYPES.ICE:
            case TILE_TYPES.STONE:
                // Ice and stone tiles take damage but don't spread
                const destroyed = tile.takeDamage();
                if (destroyed) {
                    console.log(`${tile.type} tile destroyed after taking damage`);
                }
                break;
                
            case TILE_TYPES.HIDDEN:
                // Hidden tiles may reveal when affected by surges
                if (tile.surgeCount >= 3 && !tile.isRevealed) {
                    tile.reveal();
                    console.log('Hidden tile revealed by surge effects');
                }
                break;
        }
        
        return affectedTiles;
    }
    
    /**
     * Get tiles that are currently destabilized
     * @returns {Array} Array of destabilized tiles
     */
    getDestabilizedTiles() {
        return this.getTilesByState(TILE_STATES.DESTABILIZED);
    }
    
    /**
     * Reset surge counts on all tiles (for new level or after major cascade)
     */
    resetSurgeCounts() {
        this.getAllTiles().forEach(tile => {
            tile.surgeCount = 0;
            
            // Stop any ongoing tweens
            if (tile.sprite && this.scene.tweens) {
                this.scene.tweens.killTweensOf(tile.sprite);
            }
            
            // Reset state to normal
            tile.setState(TILE_STATES.NORMAL);
            
            // Force visual update
            tile.updateVisualState();
        });
    }
    
    /**
     * Get cascade potential - how many tiles are close to destabilizing
     * @returns {Object} Cascade analysis
     */
    getCascadePotential() {
        const allTiles = this.getAllTiles();
        const levelConfig = this.scene.registry.get('levelConfig');
        const threshold = levelConfig?.ripple?.threshold || 3;
        
        const analysis = {
            total: allTiles.length,
            normal: 0,
            surged: 0,
            nearDestabilization: 0,
            destabilized: 0,
            averageSurgeCount: 0
        };
        
        let totalSurges = 0;
        
        allTiles.forEach(tile => {
            totalSurges += tile.surgeCount;
            
            switch (tile.state) {
                case TILE_STATES.NORMAL:
                    if (tile.surgeCount === 0) {
                        analysis.normal++;
                    } else if (tile.surgeCount >= threshold - 1) {
                        analysis.nearDestabilization++;
                    } else {
                        analysis.surged++;
                    }
                    break;
                case TILE_STATES.DESTABILIZED:
                    analysis.destabilized++;
                    break;
            }
        });
        
        analysis.averageSurgeCount = allTiles.length > 0 ? totalSurges / allTiles.length : 0;
        
        return analysis;
    }
    
    /**
     * Destroy grid and clean up resources
     */
    destroy() {
        // Destroy all tiles
        this.getAllTiles().forEach(tile => tile.destroy());
        
        // Clear grid
        this.tiles = [];
    }
}

// Make available globally for script tag imports
if (typeof window !== 'undefined') {
    window.Grid = Grid;
}

// Export for CommonJS if needed
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Grid };
}