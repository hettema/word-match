/**
 * InputSystem.js - Core input handling for word tracing
 * Handles touch/mouse input with 8-directional word selection and visual feedback
 */

class InputSystem {
    /**
     * Create input system
     * @param {Phaser.Scene} scene - The Phaser scene
     * @param {Grid} grid - The game grid
     */
    constructor(scene, grid) {
        this.scene = scene;
        this.grid = grid;
        
        // Tracing state
        this.selectedTiles = [];
        this.isTracing = false;
        this.currentWord = '';
        
        // Visual feedback
        this.tracingLine = null;
        this.linePoints = [];
        
        // Input settings
        const settings = scene.registry.get('settings') || {};
        this.inputSettings = settings.input || {};
        
        // Enhanced touch handling for smooth diagonal selection
        this.touchTolerance = this.inputSettings.touchTolerance || 64;
        
        // Pointer smoothing for better control
        this.lastPointerPosition = { x: 0, y: 0 };
        this.smoothPointer = { x: 0, y: 0 };
        this.smoothingFactor = 0.3; // Higher = more responsive
        
        // Diagonal assistance
        this.diagonalBoost = 1.4; // Makes diagonals easier to hit
        this.stickyThreshold = 0.6; // How "sticky" current tile is
        
        // Hit zone expansion for better diagonal selection
        const tileSize = this.scene.registry.get('settings')?.display?.tileSize || 64;
        this.expandedHitZone = (tileSize / 2) + this.touchTolerance; // Match getTileAt hit detection
        
        // Input state management
        this.enabled = true;
        
        this.setupInput();
        this.createTracingLine();
    }
    
    /**
     * Enable or disable input system
     * @param {boolean} enabled - Whether input should be enabled
     */
    setEnabled(enabled) {
        this.enabled = enabled;
        if (!enabled) {
            // Clear any active tracing when disabled
            this.endTrace();
        }
    }
    
    /**
     * Setup input event listeners
     */
    setupInput() {
        // Pointer events for both mouse and touch
        this.scene.input.on('pointerdown', this.startTrace, this);
        this.scene.input.on('pointermove', this.updateTrace, this);
        this.scene.input.on('pointerup', this.endTrace, this);
        
        // Prevent context menu on right click
        this.scene.input.on('pointerdown', (pointer) => {
            if (pointer.rightButtonDown()) {
                pointer.event.preventDefault();
            }
        });
    }
    
    /**
     * Create visual tracing line
     */
    createTracingLine() {
        this.tracingLine = this.scene.add.graphics();
        this.tracingLine.setDepth(100); // Above tiles
    }
    
    /**
     * Start word tracing
     * @param {Phaser.Input.Pointer} pointer - Pointer event
     */
    startTrace(pointer) {
        // Don't start tracing if input is disabled or game is animating
        if (!this.enabled) {
            return;
        }
        
        const gameState = this.scene.registry.get('gameState');
        if (gameState && gameState.isAnimating) {
            return;
        }
        
        // Also check scene game state as fallback
        if (this.scene.gameState === 'animating') {
            return;
        }
        
        const tile = this.getTileAt(pointer.x, pointer.y);
        
        
        if (tile && tile.canBeSelected()) {
            this.isTracing = true;
            this.selectedTiles = [tile];
            this.currentWord = tile.letter;
            this.linePoints = [{ x: tile.worldX, y: tile.worldY }];
            
            
            
            // Initialize smoothed pointer to current position
            this.smoothPointer.x = pointer.x;
            this.smoothPointer.y = pointer.y;
            this.lastPointerPosition.x = pointer.x;
            this.lastPointerPosition.y = pointer.y;
            
            // Visual feedback
            tile.setSelected(true);
            this.updateTracingLine();
            
            // Emit trace start event
            this.scene.events.emit('traceStarted', tile);
        }
    }
    
    /**
     * Update word tracing with smooth pointer handling
     * @param {Phaser.Input.Pointer} pointer - Pointer event
     */
    updateTrace(pointer) {
        if (!this.isTracing) return;
        
        // Smooth pointer movement to reduce jitter
        this.smoothPointer.x += (pointer.x - this.smoothPointer.x) * this.smoothingFactor;
        this.smoothPointer.y += (pointer.y - this.smoothPointer.y) * this.smoothingFactor;
        
        // Get best tile candidate using improved selection
        const tile = this.getBestTileCandidate(this.smoothPointer.x, this.smoothPointer.y);
        
        // Clear previous hover highlights
        this.clearHoverHighlights();
        
        if (tile) {
            
            
            if (this.canAddTile(tile)) {
                // Add tile to selection
                this.selectedTiles.push(tile);
                this.currentWord += tile.letter;
                this.linePoints.push({ x: tile.worldX, y: tile.worldY });
                
                tile.setSelected(true);
                this.updateTracingLine();
                
                
                
                // Emit tile added event
                this.scene.events.emit('tileAdded', tile, this.currentWord);
                
            } else if (this.canRemoveTile(tile)) {
                // Remove tiles back to this one (backtracking)
                
                this.backtrackToTile(tile);
                
            } else if (tile.canBeSelected() && !this.selectedTiles.includes(tile)) {
                // Show hover highlight for valid adjacent tiles
                if (this.isAdjacentToLast(tile)) {
                    tile.setHighlighted(true);
                    
                }
            }
        }
        
        // Update line to follow smoothed pointer
        this.updateTracingLineToPointer(this.smoothPointer.x, this.smoothPointer.y);
        
        // Store last position for movement detection
        this.lastPointerPosition.x = pointer.x;
        this.lastPointerPosition.y = pointer.y;
    }
    
    /**
     * End word tracing and submit word
     * @param {Phaser.Input.Pointer} pointer - Pointer event
     */
    endTrace(pointer) {
        if (!this.isTracing) return;
        
        this.isTracing = false;
        
        // Clear visual feedback
        this.clearSelection();
        this.clearTracingLine();
        
        // Submit word if valid length
        if (this.selectedTiles.length >= this.inputSettings.minWordLength || 2) {
            this.scene.events.emit('wordSubmitted', {
                tiles: [...this.selectedTiles],
                word: this.currentWord,
                positions: this.selectedTiles.map(tile => ({ x: tile.gridX, y: tile.gridY }))
            });
        }
        
        // Reset state
        this.selectedTiles = [];
        this.currentWord = '';
        this.linePoints = [];
        
        // Emit trace end event
        this.scene.events.emit('traceEnded');
    }
    
    /**
     * Get tile at world coordinates
     * @param {number} worldX - World X coordinate
     * @param {number} worldY - World Y coordinate
     * @returns {Tile|null} Tile at position or null
     */
    getTileAt(worldX, worldY) {
        // Use a more generous hit detection approach
        const tileSize = this.scene.registry.get('settings')?.display?.tileSize || 64;
        const tolerance = this.touchTolerance;
        
        // Check multiple grid positions around the click point
        const candidates = [];
        
        // Primary position
        const gridPos = this.grid.worldToGridPosition(worldX, worldY);
        if (gridPos) {
            const tile = this.grid.getTileAt(gridPos.x, gridPos.y);
            if (tile) {
                const dx = Math.abs(worldX - tile.worldX);
                const dy = Math.abs(worldY - tile.worldY);
                const distance = Math.sqrt(dx * dx + dy * dy);
                candidates.push({ tile, distance });
            }
        }
        
        // Check adjacent positions if primary failed or for better accuracy
        const offsets = [
            [-tolerance, -tolerance], [0, -tolerance], [tolerance, -tolerance],
            [-tolerance, 0],                          [tolerance, 0],
            [-tolerance, tolerance],  [0, tolerance],  [tolerance, tolerance]
        ];
        
        for (const [offsetX, offsetY] of offsets) {
            const testPos = this.grid.worldToGridPosition(worldX + offsetX, worldY + offsetY);
            if (testPos && (testPos.x !== gridPos?.x || testPos.y !== gridPos?.y)) {
                const tile = this.grid.getTileAt(testPos.x, testPos.y);
                if (tile) {
                    const dx = Math.abs(worldX - tile.worldX);
                    const dy = Math.abs(worldY - tile.worldY);
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    const maxDistance = (tileSize / 2) + tolerance;
                    
                    if (distance <= maxDistance) {
                        candidates.push({ tile, distance });
                    }
                }
            }
        }
        
        // Return the closest valid candidate
        if (candidates.length > 0) {
            candidates.sort((a, b) => a.distance - b.distance);
            const bestTile = candidates[0].tile;
            
            
            return bestTile;
        }
        
        // Debug: Check if there are tiles that can't be selected
        const debugPos = this.grid.worldToGridPosition(worldX, worldY);
        if (debugPos) {
            const debugTile = this.grid.getTileAt(debugPos.x, debugPos.y);
            
        }
        
        
        return null;
    }
    
    
    /**
     * Get the best tile candidate using improved selection logic
     * @param {number} x - Smoothed pointer X coordinate
     * @param {number} y - Smoothed pointer Y coordinate
     * @returns {Tile|null} Best tile candidate
     */
    getBestTileCandidate(x, y) {
        const candidates = [];
        const allTiles = this.grid.getAllTiles();
        
        // Find all tiles within expanded hit zone
        for (const tile of allTiles) {
            const dx = x - tile.worldX;
            const dy = y - tile.worldY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance <= this.expandedHitZone) {
                let score = 1 - (distance / this.expandedHitZone); // Closer = higher score
                
                // Boost score for diagonal tiles if we're moving diagonally
                if (this.selectedTiles.length > 0) {
                    const lastTile = this.selectedTiles[this.selectedTiles.length - 1];
                    
                    if (this.grid.areAdjacent(lastTile, tile)) {
                        // Check if this is a diagonal move
                        const tileDx = Math.abs(tile.gridX - lastTile.gridX);
                        const tileDy = Math.abs(tile.gridY - lastTile.gridY);
                        const isDiagonal = tileDx === 1 && tileDy === 1;
                        
                        // Check if pointer is moving diagonally
                        const pointerDx = Math.abs(x - this.lastPointerPosition.x);
                        const pointerDy = Math.abs(y - this.lastPointerPosition.y);
                        const isMovingDiagonally = pointerDx > 5 && pointerDy > 5;
                        
                        if (isDiagonal && isMovingDiagonally) {
                            score *= this.diagonalBoost;
                        }
                    }
                }
                
                candidates.push({ tile, score, distance });
            }
        }
        
        if (candidates.length === 0) return null;
        
        // Sort by score (highest first)
        candidates.sort((a, b) => b.score - a.score);
        
        // Implement sticky selection - prefer current tile unless score is significantly better
        const currentTile = this.selectedTiles.length > 0 ? this.selectedTiles[this.selectedTiles.length - 1] : null;
        if (currentTile) {
            const currentCandidate = candidates.find(c => c.tile === currentTile);
            if (currentCandidate && currentCandidate.score > candidates[0].score * this.stickyThreshold) {
                return currentTile;
            }
        }
        
        // Return the highest scoring tile
        return candidates[0].tile;
    }
    
    /**
     * Check if tile can be added to current selection
     * @param {Tile} tile - Tile to check
     * @returns {boolean} True if tile can be added
     */
    canAddTile(tile) {
        if (!tile || !tile.canBeSelected()) return false;
        if (this.selectedTiles.includes(tile)) return false;
        
        // First tile can always be added
        if (this.selectedTiles.length === 0) return true;
        
        // Check if adjacent to last selected tile (8-directional)
        return this.isAdjacentToLast(tile);
    }
    
    /**
     * Check if tile can be removed (backtracking)
     * @param {Tile} tile - Tile to check
     * @returns {boolean} True if tile can be removed
     */
    canRemoveTile(tile) {
        if (!tile || this.selectedTiles.length <= 1) return false;
        
        // Can only backtrack to previously selected tiles
        const tileIndex = this.selectedTiles.indexOf(tile);
        return tileIndex >= 0 && tileIndex < this.selectedTiles.length - 1;
    }
    
    /**
     * Check if tile is adjacent to last selected tile
     * @param {Tile} tile - Tile to check
     * @returns {boolean} True if adjacent
     */
    isAdjacentToLast(tile) {
        if (this.selectedTiles.length === 0) return true;
        
        const lastTile = this.selectedTiles[this.selectedTiles.length - 1];
        const isAdjacent = this.grid.areAdjacent(lastTile, tile);
        
        // Debug: Show neighbors of the last selected tile
        
        
        return isAdjacent;
    }
    
    /**
     * Backtrack selection to specified tile
     * @param {Tile} tile - Tile to backtrack to
     */
    backtrackToTile(tile) {
        const tileIndex = this.selectedTiles.indexOf(tile);
        if (tileIndex < 0) return;
        
        // Remove tiles after the target tile
        const tilesToRemove = this.selectedTiles.splice(tileIndex + 1);
        tilesToRemove.forEach(t => t.setSelected(false));
        
        // Update word and line points
        this.currentWord = this.selectedTiles.map(t => t.letter).join('');
        this.linePoints = this.selectedTiles.map(t => ({ x: t.worldX, y: t.worldY }));
        
        this.updateTracingLine();
        
        // Emit backtrack event
        this.scene.events.emit('traceBacktracked', tile, this.currentWord);
    }
    
    /**
     * Clear all tile selections
     */
    clearSelection() {
        this.selectedTiles.forEach(tile => {
            tile.setSelected(false);
        });
        this.clearHoverHighlights();
    }
    
    /**
     * Clear hover highlights on all tiles
     */
    clearHoverHighlights() {
        this.grid.getAllTiles().forEach(tile => {
            tile.setHighlighted(false);
        });
    }
    
    /**
     * Update visual tracing line
     */
    updateTracingLine() {
        this.tracingLine.clear();
        
        if (this.linePoints.length < 2) return;
        
        const settings = this.scene.registry.get('settings');
        const lineColor = parseInt(settings?.input?.tracingLineColor?.replace('#', '0x') || '0x3498db');
        const lineWidth = settings?.input?.tracingLineWidth || 4;
        
        this.tracingLine.lineStyle(lineWidth, lineColor, 0.8);
        
        // Draw line through all selected tiles
        this.tracingLine.beginPath();
        this.tracingLine.moveTo(this.linePoints[0].x, this.linePoints[0].y);
        
        for (let i = 1; i < this.linePoints.length; i++) {
            this.tracingLine.lineTo(this.linePoints[i].x, this.linePoints[i].y);
        }
        
        this.tracingLine.strokePath();
    }
    
    /**
     * Update tracing line to follow pointer
     * @param {number} pointerX - Pointer X coordinate
     * @param {number} pointerY - Pointer Y coordinate
     */
    updateTracingLineToPointer(pointerX, pointerY) {
        if (this.linePoints.length === 0) return;
        
        this.tracingLine.clear();
        
        const settings = this.scene.registry.get('settings');
        const lineColor = parseInt(settings?.input?.tracingLineColor?.replace('#', '0x') || '0x3498db');
        const lineWidth = settings?.input?.tracingLineWidth || 4;
        
        this.tracingLine.lineStyle(lineWidth, lineColor, 0.6);
        
        // Draw line through selected tiles
        if (this.linePoints.length >= 2) {
            this.tracingLine.beginPath();
            this.tracingLine.moveTo(this.linePoints[0].x, this.linePoints[0].y);
            
            for (let i = 1; i < this.linePoints.length; i++) {
                this.tracingLine.lineTo(this.linePoints[i].x, this.linePoints[i].y);
            }
            
            this.tracingLine.strokePath();
        }
        
        // Draw line from last tile to pointer
        if (this.linePoints.length > 0) {
            const lastPoint = this.linePoints[this.linePoints.length - 1];
            this.tracingLine.lineStyle(lineWidth, lineColor, 0.4);
            this.tracingLine.beginPath();
            this.tracingLine.moveTo(lastPoint.x, lastPoint.y);
            this.tracingLine.lineTo(pointerX, pointerY);
            this.tracingLine.strokePath();
        }
    }
    
    /**
     * Clear tracing line
     */
    clearTracingLine() {
        this.tracingLine.clear();
    }
    
    /**
     * Get current word being traced
     * @returns {string} Current word
     */
    getCurrentWord() {
        return this.currentWord;
    }
    
    /**
     * Get currently selected tiles
     * @returns {Array} Array of selected tiles
     */
    getSelectedTiles() {
        return [...this.selectedTiles];
    }
    
    /**
     * Check if currently tracing
     * @returns {boolean} True if tracing
     */
    isCurrentlyTracing() {
        return this.isTracing;
    }
    
    /**
     * Reset input system state
     */
    reset() {
        // Stop active tracing
        this.isTracing = false;
        
        // Clear visual states
        this.clearSelection();
        this.clearTracingLine();
        this.clearHoverHighlights();
        
        // Reset data structures
        this.selectedTiles = [];
        this.currentWord = '';
        this.linePoints = [];
        
        // Reset pointer tracking
        this.lastPointerPosition = { x: 0, y: 0 };
        this.smoothPointer = { x: 0, y: 0 };
        
        // Force all tiles to reset their visual state
        if (this.grid) {
            const allTiles = this.grid.getAllTiles();
            allTiles.forEach(tile => {
                tile.setSelected(false);
                tile.setHighlighted(false);
            });
        }
        
        // Re-register input events to ensure they're properly bound
        this.reRegisterInputEvents();
        
        console.log('🔄 Input system fully reset');
    }
    
    /**
     * Re-register input events to ensure they're properly bound after focus changes
     * This is critical for fixing input issues after tab/app switching
     */
    reRegisterInputEvents() {
        if (!this.scene || !this.scene.input) {
            return;
        }
        
        // First remove existing event listeners to avoid duplicates
        this.scene.input.off('pointerdown', this.startTrace, this);
        this.scene.input.off('pointermove', this.updateTrace, this);
        this.scene.input.off('pointerup', this.endTrace, this);
        
        // Re-add the event listeners
        this.scene.input.on('pointerdown', this.startTrace, this);
        this.scene.input.on('pointermove', this.updateTrace, this);
        this.scene.input.on('pointerup', this.endTrace, this);
        
        // Make sure input is enabled
        this.setEnabled(true);
        
        // Ensure Phaser's input system is enabled
        if (this.scene.input) {
            this.scene.input.enabled = true;
            
            if (this.scene.input.manager) {
                this.scene.input.manager.enabled = true;
                
                // Reset all pointers
                this.scene.input.manager.pointers.forEach(pointer => {
                    pointer.reset();
                });
                
                // Make sure all input types are enabled
                if (this.scene.input.mouse) this.scene.input.mouse.enabled = true;
                if (this.scene.input.touch) this.scene.input.touch.enabled = true;
                if (this.scene.input.keyboard) this.scene.input.keyboard.enabled = true;
            }
        }
    }
    
    /**
     * Destroy input system and clean up
     */
    destroy() {
        // Remove event listeners
        this.scene.input.off('pointerdown', this.startTrace, this);
        this.scene.input.off('pointermove', this.updateTrace, this);
        this.scene.input.off('pointerup', this.endTrace, this);
        
        // Clean up graphics
        if (this.tracingLine) {
            this.tracingLine.destroy();
            this.tracingLine = null;
        }
        
        // Reset state
        this.reset();
    }
}

// Make available globally for script tag imports
if (typeof window !== 'undefined') {
    window.InputSystem = InputSystem;
}

// Export for CommonJS if needed
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { InputSystem };
}