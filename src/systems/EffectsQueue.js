/**
 * EffectsQueue.js - Animation queue system for managing visual effects
 * Prevents timing conflicts and ensures smooth sequential animation processing
 */

class EffectsQueue {
    /**
     * Create a new effects queue
     * @param {Phaser.Scene} scene - The Phaser scene
     */
    constructor(scene) {
        this.scene = scene;
        this.queue = [];
        this.isProcessing = false;
        this.currentEffect = null;
        
        // Performance tracking
        this.effectsProcessed = 0;
        this.averageProcessTime = 0;
        
        // Event emitter for state management
        this.events = new Phaser.Events.EventEmitter();
        
        // Settings
        const settings = scene.registry.get('settings') || {};
        this.animationSpeed = settings.effects?.animationSpeed || 1.0;
        this.particleCount = settings.effects?.particleCount || 20;
        this.explosionDuration = settings.effects?.explosionDuration || 500;
        
        
    }
    
    /**
     * Add an effect to the queue
     * @param {Object} effect - Effect configuration
     * @param {string} effect.type - Type of effect ('explosion', 'cascade', 'gravity', 'spawn')
     * @param {Array} effect.targets - Array of tiles or positions to affect
     * @param {Object} effect.params - Additional parameters for the effect
     * @param {Function} effect.callback - Optional callback when effect completes
     */
    addEffect(effect) {
        if (!effect || !effect.type || !effect.targets) {
            console.error('Invalid effect added to queue:', effect);
            return;
        }
        
        // Add unique ID and timestamp
        effect.id = `effect_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        effect.timestamp = Date.now();
        
        this.queue.push(effect);
        
        // Start processing if not already running
        if (!this.isProcessing) {
            this.processNext();
        }
        
        
    }
    
    /**
     * Trigger ripple effects from word submission
     * @param {Array} wordTiles - Tiles that formed the word
     */
    triggerWordRipple(wordTiles) {
        if (!wordTiles || wordTiles.length === 0) return;
        
        // Start cascade sequence in scoring system
        const scoreSystem = this.scene.registry.get('scoreSystem');
        if (scoreSystem) {
            scoreSystem.startCascadeSequence();
        }
        
        // Start with explosion of word tiles
        this.addEffect({
            type: 'explosion',
            targets: wordTiles,
            params: { wordExplosion: true },
            callback: () => {
                // After word explosion, trigger ripple effects
                this.addEffect({
                    type: 'ripple',
                    targets: wordTiles,
                    params: { initialRipple: true }
                });
            }
        });
    }
    
    /**
     * Process the next effect in the queue
     */
    async processNext() {
        if (this.queue.length === 0) {
            this.isProcessing = false;
            console.log('DEBUG: EffectsQueue emitting queue-empty - no more effects');
            
            // End cascade sequence when queue is empty
            const scoreSystem = this.scene.registry.get('scoreSystem');
            if (scoreSystem) {
                scoreSystem.endCascadeSequence();
            }
            
            this.events.emit('queue-empty');
            return;
        }
        
        this.isProcessing = true;
        this.currentEffect = this.queue.shift();
        
        const startTime = Date.now();
        
        try {
            // Emit event for state management (disable input)
            console.log('DEBUG: EffectsQueue emitting effect-start for', this.currentEffect.type);
            this.events.emit('effect-start', this.currentEffect);
            
            // Process the effect based on type
            await this.processEffect(this.currentEffect);
            
            // Update performance metrics
            const processTime = Date.now() - startTime;
            this.updatePerformanceMetrics(processTime);
            
            // Emit completion event
            this.events.emit('effect-complete', this.currentEffect);
            
            // Execute callback if provided
            if (this.currentEffect.callback) {
                this.currentEffect.callback();
            }
            
        } catch (error) {
            console.error('Error processing effect:', error);
            this.events.emit('effect-error', this.currentEffect, error);
        }
        
        this.currentEffect = null;
        
        // Process next effect after a small delay to prevent frame drops
        this.scene.time.delayedCall(16, () => this.processNext()); // ~60 FPS
    }
    
    /**
     * Process a specific effect based on its type
     * @param {Object} effect - The effect to process
     */
    async processEffect(effect) {
        switch (effect.type) {
            case 'explosion':
                await this.processExplosion(effect);
                break;
            case 'ripple':
                await this.processRipple(effect);
                break;
            case 'cascade':
                await this.processCascade(effect);
                break;
            case 'gravity':
                await this.processGravity(effect);
                break;
            case 'spawn':
                await this.processSpawn(effect);
                break;
            default:
                console.warn(`Unknown effect type: ${effect.type}`);
        }
    }
    
    /**
     * Process explosion effect with particle systems
     * @param {Object} effect - Explosion effect configuration
     */
    async processExplosion(effect) {
        const { targets, params = {} } = effect;
        const duration = params.duration || this.explosionDuration;
        const particleCount = params.particleCount || this.particleCount;
        
        // Create explosion promises for all targets
        const explosionPromises = targets.map(tile => {
            return new Promise((resolve) => {
                // Set tile to exploding state
                if (tile && tile.setState) {
                    tile.setState(TILE_STATES.EXPLODING);
                }
                
                // Create particle explosion
                this.createExplosionParticles(tile, particleCount);
                
                // Animate tile destruction
                this.animateTileDestruction(tile, duration, resolve);
            });
        });
        
        // Wait for all explosions to complete
        await Promise.all(explosionPromises);
    }
    
    /**
     * Create particle explosion effect
     * @param {Tile} tile - The tile to explode
     * @param {number} particleCount - Number of particles to create
     */
    createExplosionParticles(tile, particleCount) {
        if (!tile || !tile.worldX || !tile.worldY) return;
        
        const particles = [];
        const colors = [0xff6b6b, 0xff4757, 0xffa502, 0xffb142];
        
        for (let i = 0; i < particleCount; i++) {
            const particle = this.scene.add.circle(
                tile.worldX,
                tile.worldY,
                Phaser.Math.Between(2, 6),
                colors[Math.floor(Math.random() * colors.length)]
            );
            
            // Random velocity
            const angle = (Math.PI * 2 * i) / particleCount + Phaser.Math.FloatBetween(-0.5, 0.5);
            const speed = Phaser.Math.Between(50, 150);
            const velocityX = Math.cos(angle) * speed;
            const velocityY = Math.sin(angle) * speed;
            
            // Animate particle
            this.scene.tweens.add({
                targets: particle,
                x: tile.worldX + velocityX,
                y: tile.worldY + velocityY,
                alpha: 0,
                scale: 0,
                duration: 400,
                ease: 'Power2',
                onComplete: () => particle.destroy()
            });
            
            particles.push(particle);
        }
        
        return particles;
    }
    
    /**
     * Animate tile destruction
     * @param {Tile} tile - The tile to animate
     * @param {number} duration - Animation duration
     * @param {Function} resolve - Promise resolve function
     */
    animateTileDestruction(tile, duration, resolve) {
        if (!tile || !tile.sprite) {
            console.log('DEBUG: No tile or sprite to animate');
            resolve();
            return;
        }
        
        
        // Scale and fade out animation
        this.scene.tweens.add({
            targets: [tile.sprite, tile.textObject].filter(obj => obj),
            scale: 0,
            alpha: 0,
            duration: duration * 0.6,
            ease: 'Back.easeIn',
            onComplete: () => {
                // Actually remove the tile from the grid
                const grid = this.scene.registry.get('grid');
                if (grid) {
                    grid.removeTileAt(tile.gridX, tile.gridY);
                }
                resolve();
            }
        });
    }
    
    /**
     * Process cascade effect (chain reactions)
     * @param {Object} effect - Cascade effect configuration
     */
    async processCascade(effect) {
        const { targets, params = {} } = effect;
        const delay = params.delay || 100;
        
        // Process cascade in waves
        for (let i = 0; i < targets.length; i++) {
            const wave = targets[i];
            if (Array.isArray(wave)) {
                // Process wave simultaneously
                await this.processExplosion({
                    type: 'explosion',
                    targets: wave,
                    params: params
                });
                
                // Delay before next wave
                if (i < targets.length - 1) {
                    await this.delay(delay);
                }
            }
        }
    }
    
    /**
     * Process ripple effect with surge accumulation and chain reactions
     * @param {Object} effect - Ripple effect configuration
     */
    async processRipple(effect) {
        const { targets, params = {} } = effect;
        const grid = this.scene.registry.get('grid');
        const levelConfig = this.scene.registry.get('levelConfig');
        
        if (!grid || !levelConfig) {
            console.error('Grid or level config not found for ripple effect');
            return;
        }
        
        // Get ripple configuration
        const rippleConfig = levelConfig.ripple || {};
        const spreadChance = rippleConfig.spread || 0.5;
        const ripplePower = rippleConfig.power || 1;
        const threshold = rippleConfig.threshold || 3;
        
        console.log(`Processing ripple effect: ${targets.length} initial targets, spread: ${spreadChance}`);
        
        // Track affected tiles to prevent infinite loops
        const processedTiles = new Set();
        const tilesToExplode = [];
        
        // Process initial ripple wave
        for (const tile of targets) {
            if (!tile || processedTiles.has(`${tile.gridX},${tile.gridY}`)) continue;
            
            processedTiles.add(`${tile.gridX},${tile.gridY}`);
            
            // Apply surge to the tile - this handles destabilization logic internally
            for (let i = 0; i < ripplePower; i++) {
                tile.applySurge();
            }
            
            // Check if tile is now exploding (was destabilized and got another surge)
            if (tile.state === TILE_STATES.EXPLODING) {
                tilesToExplode.push(tile);
            }
            
            // Create visual ripple effect
            this.createRippleVisual(tile);
            
            // Get neighbors for potential spread
            const neighbors = grid.getNeighbors(tile.gridX, tile.gridY);
            
            // Apply ripple spread to neighbors
            for (const neighbor of neighbors) {
                if (processedTiles.has(`${neighbor.gridX},${neighbor.gridY}`)) continue;
                
                // Check spread probability
                if (Math.random() < spreadChance) {
                    processedTiles.add(`${neighbor.gridX},${neighbor.gridY}`);
                    
                    // Apply surge to neighbor - this handles destabilization logic internally
                    neighbor.applySurge();
                    
                    // Check if neighbor is now exploding
                    if (neighbor.state === TILE_STATES.EXPLODING) {
                        tilesToExplode.push(neighbor);
                    }
                    
                    // Create visual ripple effect for neighbor
                    this.createRippleVisual(neighbor, 100); // Slight delay for wave effect
                }
            }
        }
        
        // Wait for ripple visuals to complete
        await this.delay(300);
        
        // Trigger explosions for tiles that are now exploding
        if (tilesToExplode.length > 0) {
            // Trigger explosions for exploding tiles
            this.addEffect({
                type: 'explosion',
                targets: tilesToExplode,
                params: { chainReaction: true },
                callback: () => {
                    // After explosions, check for more chain reactions
                    this.checkForChainReactions(tilesToExplode);
                }
            });
        } else {
            // No explosions, trigger gravity immediately
            this.triggerGravitySequence();
        }
    }
    
    /**
     * Create visual ripple effect
     * @param {Tile} tile - The tile to create ripple effect for
     * @param {number} delay - Delay before showing effect
     */
    createRippleVisual(tile, delay = 0) {
        if (!tile || !tile.worldX || !tile.worldY) return;
        
        const createRipple = () => {
            // Create expanding circle for ripple effect
            const ripple = this.scene.add.circle(
                tile.worldX,
                tile.worldY,
                5,
                0x3498db,
                0.6
            );
            
            // Animate ripple expansion
            this.scene.tweens.add({
                targets: ripple,
                radius: 40,
                alpha: 0,
                duration: 400,
                ease: 'Power2',
                onComplete: () => ripple.destroy()
            });
        };
        
        if (delay > 0) {
            this.scene.time.delayedCall(delay, createRipple);
        } else {
            createRipple();
        }
    }
    
    /**
     * Check for additional chain reactions after explosions
     * @param {Array} explodedTiles - Tiles that just exploded
     */
    checkForChainReactions(explodedTiles) {
        const grid = this.scene.registry.get('grid');
        if (!grid) return;
        
        // Collect all neighbors of exploded tiles and apply surge effects
        const affectedNeighbors = new Set();
        
        explodedTiles.forEach(tile => {
            const neighbors = grid.getNeighbors(tile.gridX, tile.gridY);
            neighbors.forEach(neighbor => {
                if (neighbor.state !== TILE_STATES.EXPLODING && neighbor.state !== TILE_STATES.FALLING) {
                    affectedNeighbors.add(neighbor);
                }
            });
        });
        
        // Apply surge to all affected neighbors (this creates proper chain reactions!)
        const tilesToExplode = [];
        Array.from(affectedNeighbors).forEach(neighbor => {
            neighbor.applySurge();
            
            // Check if neighbor is now exploding due to the surge
            if (neighbor.state === TILE_STATES.EXPLODING) {
                tilesToExplode.push(neighbor);
            }
        });
        
        if (tilesToExplode.length > 0) {
            // Record additional chain reaction in scoring system
            const scoreSystem = this.scene.registry.get('scoreSystem');
            if (scoreSystem) {
                scoreSystem.recordChainReaction(tilesToExplode);
            }
            
            // Continue chain reaction with newly exploding tiles
            this.addEffect({
                type: 'explosion',
                targets: tilesToExplode,
                params: { chainReaction: true },
                callback: () => {
                    // Recursively check for more chain reactions
                    this.checkForChainReactions(tilesToExplode);
                }
            });
        } else {
            // No more explosions, apply gravity
            this.triggerGravitySequence();
        }
    }
    
    /**
     * Trigger the complete gravity sequence (drop tiles, refill grid)
     */
    triggerGravitySequence() {
        const grid = this.scene.registry.get('grid');
        if (!grid) return;
        
        console.log('Triggering gravity sequence');
        
        // Apply gravity to drop existing tiles
        const movements = grid.applyGravity();
        
        if (movements.length > 0) {
            // Animate falling tiles
            this.addEffect({
                type: 'gravity',
                targets: movements,
                params: { duration: 300 },
                callback: () => {
                    // After gravity, refill empty spaces
                    this.refillEmptySpaces();
                }
            });
        } else {
            // No tiles to drop, go straight to refill
            this.refillEmptySpaces();
        }
    }
    
    /**
     * Refill empty spaces in the grid
     */
    refillEmptySpaces() {
        const grid = this.scene.registry.get('grid');
        if (!grid) return;
        
        console.log('Refilling empty spaces');
        
        // Create new tiles for empty spaces
        const newTiles = grid.refillGrid();
        
        if (newTiles.length > 0) {
            // Animate new tiles spawning
            this.addEffect({
                type: 'spawn',
                targets: newTiles,
                params: {
                    duration: 200,
                    staggerDelay: 50
                },
                callback: () => {
                    console.log('Cascade sequence complete');
                    // Emit event that cascade is complete
                    this.events.emit('cascade-complete');
                }
            });
        } else {
            console.log('Cascade sequence complete - no refill needed');
            this.events.emit('cascade-complete');
        }
    }
    
    /**
     * Process gravity effect (tiles falling)
     * @param {Object} effect - Gravity effect configuration
     */
    async processGravity(effect) {
        const { targets, params = {} } = effect;
        const duration = params.duration || 300;
        
        if (!Array.isArray(targets) || targets.length === 0) {
            return;
        }
        
        // Create falling animations for all tiles
        const fallingPromises = targets.map(movement => {
            return new Promise((resolve) => {
                const { tile, fromY, toY } = movement;
                if (!tile || !tile.sprite) {
                    resolve();
                    return;
                }
                
                // Set falling state
                tile.setState(TILE_STATES.FALLING);
                
                // Calculate world positions
                const grid = this.scene.registry.get('grid');
                if (!grid) {
                    resolve();
                    return;
                }
                
                const fromPos = grid.gridToWorldPosition(tile.gridX, fromY);
                const toPos = grid.gridToWorldPosition(tile.gridX, toY);
                
                // Animate tile falling
                this.scene.tweens.add({
                    targets: [tile.sprite, tile.textObject].filter(obj => obj),
                    y: toPos.y,
                    duration: duration,
                    ease: 'Bounce.easeOut',
                    onComplete: () => {
                        tile.setState(TILE_STATES.NORMAL);
                        tile.setWorldPosition(toPos.x, toPos.y);
                        resolve();
                    }
                });
            });
        });
        
        await Promise.all(fallingPromises);
    }
    
    /**
     * Process spawn effect (new tiles appearing)
     * @param {Object} effect - Spawn effect configuration
     */
    async processSpawn(effect) {
        const { targets, params = {} } = effect;
        const duration = params.duration || 200;
        const delay = params.staggerDelay || 50;
        
        // Stagger spawn animations
        for (let i = 0; i < targets.length; i++) {
            const tile = targets[i];
            if (tile && tile.sprite) {
                // Start invisible and small
                tile.sprite.setScale(0);
                tile.sprite.setAlpha(0);
                if (tile.textObject) {
                    tile.textObject.setScale(0);
                    tile.textObject.setAlpha(0);
                }
                
                // Animate appearance
                this.scene.tweens.add({
                    targets: [tile.sprite, tile.textObject].filter(obj => obj),
                    scale: 1,
                    alpha: 1,
                    duration: duration,
                    ease: 'Back.easeOut'
                });
                
                // Delay before next tile
                if (delay > 0 && i < targets.length - 1) {
                    await this.delay(delay);
                }
            }
        }
    }
    
    /**
     * Create a delay promise
     * @param {number} ms - Milliseconds to delay
     * @returns {Promise} Promise that resolves after delay
     */
    delay(ms) {
        return new Promise(resolve => {
            this.scene.time.delayedCall(ms, resolve);
        });
    }
    
    /**
     * Update performance metrics
     * @param {number} processTime - Time taken to process effect
     */
    updatePerformanceMetrics(processTime) {
        this.effectsProcessed++;
        this.averageProcessTime = (this.averageProcessTime * (this.effectsProcessed - 1) + processTime) / this.effectsProcessed;
        
        // Log performance warnings
        if (processTime > 100) {
            console.warn(`Slow effect processing: ${processTime}ms`);
        }
    }
    
    /**
     * Clear all queued effects
     */
    clearQueue() {
        this.queue = [];
        if (this.currentEffect) {
            console.log('Clearing queue while effect is processing');
        }
    }
    
    /**
     * Check if queue is empty and not processing
     * @returns {boolean} True if idle
     */
    isIdle() {
        return !this.isProcessing && this.queue.length === 0;
    }
    
    /**
     * Get queue status for debugging
     * @returns {Object} Queue status information
     */
    getStatus() {
        return {
            queueLength: this.queue.length,
            isProcessing: this.isProcessing,
            currentEffect: this.currentEffect?.type || null,
            effectsProcessed: this.effectsProcessed,
            averageProcessTime: Math.round(this.averageProcessTime)
        };
    }
    
    /**
     * Destroy the effects queue and clean up resources
     */
    destroy() {
        this.clearQueue();
        this.events.destroy();
        console.log('EffectsQueue destroyed');
    }
}

// Make available globally for script tag imports
if (typeof window !== 'undefined') {
    window.EffectsQueue = EffectsQueue;
}

// Export for CommonJS if needed
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EffectsQueue;
}