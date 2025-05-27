/**
 * EffectsQueue.js - Advanced animation queue system for managing visual effects
 * Prevents timing conflicts and ensures smooth sequential animation processing
 * EFFECTS-03: Advanced cascade & chain reactions with performance optimization
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
        
        // EFFECTS-03: Advanced cascade tracking and loop prevention
        this.cascadeDepth = 0;
        this.maxCascadeDepth = 10; // Prevent infinite loops
        this.cascadeHistory = new Set(); // Track processed tile positions
        this.cascadeStartTime = 0; // 0 means no active cascade
        this.maxCascadeDuration = 30000; // 30 second timeout
        this.chainReactionCount = 0;
        this.simultaneousExplosionLimit = 8; // Performance optimization
        
        // Visual clarity enhancements
        this.visualEffectIntensity = 1.0;
        this.adaptivePerformance = true;
        this.frameDropThreshold = 45; // FPS threshold for performance adaptation
        
        // Advanced timing control
        this.cascadeWaveDelay = 150; // Delay between cascade waves
        this.chainReactionDelay = 100; // Delay between chain reactions
        this.visualFeedbackDelay = 50; // Delay for visual feedback
        
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
     * Trigger ripple effects from word submission with advanced cascade tracking
     * @param {Array} wordTiles - Tiles that formed the word
     */
    triggerWordRipple(wordTiles) {
        if (!wordTiles || wordTiles.length === 0) return;
        
        // EFFECTS-03: Initialize advanced cascade tracking
        this.resetCascadeTracking();
        this.cascadeStartTime = Date.now();
        this.chainReactionCount = 0;
        
        // Start cascade sequence in scoring system
        const scoreSystem = this.scene.registry.get('scoreSystem');
        if (scoreSystem) {
            scoreSystem.startCascadeSequence();
            
            // Score the word immediately before any tiles are destroyed
            const points = scoreSystem.scoreCascadeWord(wordTiles);
            
            // Create score popup animation at the center of the word
            const centerTile = wordTiles[Math.floor(wordTiles.length / 2)];
            if (centerTile) {
                scoreSystem.createScorePopup(
                    points,
                    centerTile.worldX,
                    centerTile.worldY,
                    {
                        color: '#27ae60',
                        fontSize: 28,
                        isBonus: wordTiles.some(t => t.type === 'MULTIPLIER')
                    }
                );
            }
        }
        
        // Track initial word tiles to prevent re-processing
        wordTiles.forEach(tile => {
            this.cascadeHistory.add(`${tile.gridX},${tile.gridY}`);
        });
        
        console.log(`EFFECTS-03: Starting cascade sequence with ${wordTiles.length} word tiles`);
        
        // Start with explosion of word tiles
        this.addEffect({
            type: 'explosion',
            targets: wordTiles,
            params: {
                wordExplosion: true,
                cascadeDepth: 0,
                isInitialExplosion: true
            },
            callback: () => {
                // After word explosion, trigger ripple effects on neighbors
                const grid = this.scene.registry.get('grid');
                const neighborTiles = new Set();
                
                // Get all neighbors of exploded word tiles
                wordTiles.forEach(tile => {
                    const neighbors = grid.getNeighbors(tile.gridX, tile.gridY);
                    neighbors.forEach(neighbor => {
                        // Only add neighbors that aren't part of the original word
                        if (!wordTiles.includes(neighbor)) {
                            neighborTiles.add(neighbor);
                        }
                    });
                });
                
                // Trigger ripple on neighbor tiles (not the word tiles themselves)
                if (neighborTiles.size > 0) {
                    this.addEffect({
                        type: 'ripple',
                        targets: Array.from(neighborTiles),
                        params: {
                            initialRipple: true,
                            cascadeDepth: 0
                        }
                    });
                }
            }
        });
    }
    
    /**
     * Reset cascade tracking for new sequence
     */
    resetCascadeTracking() {
        this.cascadeDepth = 0;
        this.cascadeHistory.clear();
        this.chainReactionCount = 0;
        this.visualEffectIntensity = 1.0;
        this.cascadeStartTime = 0; // Reset timestamp to prevent stale time limit checks
    }
    
    /**
     * Check if cascade should continue based on safety limits
     * @returns {boolean} True if cascade can continue
     */
    canContinueCascade() {
        // If no cascade is active, always allow (cascadeStartTime = 0 means no active cascade)
        if (this.cascadeStartTime === 0) {
            return true;
        }
        
        const currentTime = Date.now();
        const cascadeDuration = currentTime - this.cascadeStartTime;
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        
        // Log cascade status for debugging
        console.log(`🔄 CASCADE STATUS: depth=${this.cascadeDepth}, duration=${cascadeDuration}ms, isMobile=${isMobile}`);
        
        // Check depth limit - be more lenient on mobile
        const mobileDepthLimit = 15; // Higher limit for mobile
        const effectiveDepthLimit = isMobile ? mobileDepthLimit : this.maxCascadeDepth;
        
        if (this.cascadeDepth >= effectiveDepthLimit) {
            console.warn(`EFFECTS-03: Cascade depth limit reached (${effectiveDepthLimit})`);
            return false;
        }
        
        // Check time limit - be more lenient on mobile
        const mobileTimeLimit = 60000; // 60 seconds for mobile
        const effectiveTimeLimit = isMobile ? mobileTimeLimit : this.maxCascadeDuration;
        
        if (cascadeDuration >= effectiveTimeLimit) {
            console.warn(`EFFECTS-03: Cascade time limit reached (${effectiveTimeLimit}ms)`);
            return false;
        }
        
        // Check performance - disable on mobile to ensure cascades work
        if (!isMobile && this.adaptivePerformance && this.scene.game.loop.actualFps < this.frameDropThreshold) {
            console.warn(`EFFECTS-03: Performance degradation detected, reducing effects`);
            this.visualEffectIntensity *= 0.8;
            if (this.visualEffectIntensity < 0.3) {
                return false;
            }
        }
        
        return true;
    }
    
    /**
     * Process the next effect in the queue
     */
    async processNext() {
        if (this.queue.length === 0) {
            this.isProcessing = false;
            
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
        const grid = this.scene.registry.get('grid');
        
        // Handle special tile effects (like bomb expansion) BEFORE explosion
        const additionalTargets = [];
        if (grid) {
            targets.forEach(tile => {
                if (tile && tile.type === TILE_TYPES.BOMB) {
                    const affectedTiles = grid.handleSpecialTileInteraction(tile);
                    // Add bomb neighbors to explosion targets
                    affectedTiles.forEach(neighbor => {
                        if (!targets.includes(neighbor) && !additionalTargets.includes(neighbor)) {
                            additionalTargets.push(neighbor);
                        }
                    });
                }
            });
        }
        
        // Combine original targets with bomb-affected neighbors
        const allTargets = [...targets, ...additionalTargets];
        
        // Create explosion promises for all targets
        const explosionPromises = allTargets.map(tile => {
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
            resolve();
            return;
        }
        
        
        // Scale and fade out animation
        this.scene.tweens.add({
            targets: tile.container || [tile.sprite, tile.textObject].filter(obj => obj),
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
     * Process ripple effect with advanced surge accumulation and chain reactions
     * EFFECTS-03: Enhanced with loop prevention and performance optimization
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
        
        // EFFECTS-03: Check cascade safety limits
        if (!this.canContinueCascade()) {
            console.warn('EFFECTS-03: Cascade terminated due to safety limits');
            this.triggerGravitySequence();
            return;
        }
        
        // Increment cascade depth
        this.cascadeDepth++;
        const currentDepth = params.cascadeDepth || this.cascadeDepth;
        
        // Get ripple configuration with adaptive scaling
        const rippleConfig = levelConfig.ripple || {};
        let spreadChance = rippleConfig.spread || 0.5;
        let ripplePower = rippleConfig.power || 1;
        const threshold = rippleConfig.threshold || 3;
        
        // EFFECTS-03: Adaptive performance scaling
        if (this.visualEffectIntensity < 1.0) {
            spreadChance *= this.visualEffectIntensity;
            ripplePower = Math.max(1, Math.floor(ripplePower * this.visualEffectIntensity));
        }
        
        console.log(`EFFECTS-03: Processing ripple (depth ${currentDepth}): ${targets.length} targets, spread: ${spreadChance.toFixed(2)}`);
        
        // Track affected tiles with cascade history integration
        const processedTiles = new Set();
        const tilesToExplode = [];
        const newlyAffectedTiles = [];
        
        // Process initial ripple wave
        for (const tile of targets) {
            if (!tile || processedTiles.has(`${tile.gridX},${tile.gridY}`)) continue;
            
            const tileKey = `${tile.gridX},${tile.gridY}`;
            
            // Skip if already processed in this cascade sequence
            if (this.cascadeHistory.has(tileKey)) continue;
            
            processedTiles.add(tileKey);
            this.cascadeHistory.add(tileKey);
            
            // Apply surge to the tile with cascade tracking
            for (let i = 0; i < ripplePower; i++) {
                tile.applySurge();
            }
            
            // Check if tile is now exploding
            if (tile.state === TILE_STATES.EXPLODING) {
                tilesToExplode.push(tile);
            }
            
            // Create visual ripple effect with intensity scaling
            this.createAdvancedRippleVisual(tile, currentDepth);
            
            // Get neighbors for potential spread
            const neighbors = grid.getNeighbors(tile.gridX, tile.gridY);
            
            // Apply ripple spread to neighbors with distance-based falloff
            for (const neighbor of neighbors) {
                const neighborKey = `${neighbor.gridX},${neighbor.gridY}`;
                
                if (processedTiles.has(neighborKey) || this.cascadeHistory.has(neighborKey)) continue;
                
                // Distance-based spread chance (closer tiles more likely to be affected)
                const distance = Math.abs(neighbor.gridX - tile.gridX) + Math.abs(neighbor.gridY - tile.gridY);
                const adjustedSpreadChance = spreadChance * Math.pow(0.8, distance - 1);
                
                // Check spread probability
                if (Math.random() < adjustedSpreadChance) {
                    processedTiles.add(neighborKey);
                    this.cascadeHistory.add(neighborKey);
                    newlyAffectedTiles.push(neighbor);
                    
                    // Apply surge to neighbor
                    neighbor.applySurge();
                    
                    // Check if neighbor is now exploding
                    if (neighbor.state === TILE_STATES.EXPLODING) {
                        tilesToExplode.push(neighbor);
                    }
                    
                    // Create visual ripple effect for neighbor with staggered timing
                    const delay = this.visualFeedbackDelay + (distance * 25);
                    this.createAdvancedRippleVisual(neighbor, currentDepth, delay);
                }
            }
        }
        
        // Wait for ripple visuals to complete with adaptive timing
        const rippleDelay = Math.max(200, 400 * this.visualEffectIntensity);
        await this.delay(rippleDelay);
        
        // EFFECTS-03: Performance optimization - limit simultaneous explosions
        if (tilesToExplode.length > this.simultaneousExplosionLimit) {
            console.log(`EFFECTS-03: Batching ${tilesToExplode.length} explosions for performance`);
            
            // Process explosions in batches
            const batches = [];
            for (let i = 0; i < tilesToExplode.length; i += this.simultaneousExplosionLimit) {
                batches.push(tilesToExplode.slice(i, i + this.simultaneousExplosionLimit));
            }
            
            // Process batches with delays
            for (let i = 0; i < batches.length; i++) {
                const batch = batches[i];
                const isLastBatch = i === batches.length - 1;
                
                this.addEffect({
                    type: 'explosion',
                    targets: batch,
                    params: {
                        chainReaction: true,
                        cascadeDepth: currentDepth,
                        batchIndex: i,
                        totalBatches: batches.length
                    },
                    callback: () => {
                        if (isLastBatch) {
                            // After all batches, check for more chain reactions
                            this.checkForAdvancedChainReactions(tilesToExplode, currentDepth);
                        }
                    }
                });
                
                // Add delay between batches
                if (!isLastBatch) {
                    await this.delay(this.cascadeWaveDelay);
                }
            }
        } else if (tilesToExplode.length > 0) {
            // Normal processing for smaller explosion counts
            this.addEffect({
                type: 'explosion',
                targets: tilesToExplode,
                params: {
                    chainReaction: true,
                    cascadeDepth: currentDepth
                },
                callback: () => {
                    this.checkForAdvancedChainReactions(tilesToExplode, currentDepth);
                }
            });
        } else {
            // No explosions, trigger gravity immediately
            console.log(`EFFECTS-03: No explosions at depth ${currentDepth}, triggering gravity`);
            this.triggerGravitySequence();
        }
    }
    
    /**
     * Create advanced visual ripple effect with depth-based scaling
     * EFFECTS-03: Enhanced visual clarity during complex effects
     * @param {Tile} tile - The tile to create ripple effect for
     * @param {number} depth - Cascade depth for visual scaling
     * @param {number} delay - Delay before showing effect
     */
    createAdvancedRippleVisual(tile, depth = 0, delay = 0) {
        if (!tile || !tile.worldX || !tile.worldY) return;
        
        const createRipple = () => {
            // Scale effect based on cascade depth and performance
            const baseRadius = 5;
            const maxRadius = Math.max(25, 40 * this.visualEffectIntensity);
            const alpha = Math.max(0.3, 0.6 * this.visualEffectIntensity);
            
            // Color coding based on cascade depth
            const colors = [0x3498db, 0xe74c3c, 0xf39c12, 0x9b59b6, 0x2ecc71];
            const color = colors[Math.min(depth, colors.length - 1)];
            
            // Create expanding circle for ripple effect
            const ripple = this.scene.add.circle(
                tile.worldX,
                tile.worldY,
                baseRadius,
                color,
                alpha
            );
            
            // Animate ripple expansion with depth-based duration
            const duration = Math.max(200, 400 * this.visualEffectIntensity);
            this.scene.tweens.add({
                targets: ripple,
                radius: maxRadius,
                alpha: 0,
                duration: duration,
                ease: 'Power2',
                onComplete: () => ripple.destroy()
            });
            
            // Add secondary ring for higher depths
            if (depth > 1 && this.visualEffectIntensity > 0.7) {
                const secondaryRipple = this.scene.add.circle(
                    tile.worldX,
                    tile.worldY,
                    baseRadius * 0.5,
                    0xffffff,
                    alpha * 0.5
                );
                
                this.scene.tweens.add({
                    targets: secondaryRipple,
                    radius: maxRadius * 0.7,
                    alpha: 0,
                    duration: duration * 0.8,
                    ease: 'Power2',
                    delay: 50,
                    onComplete: () => secondaryRipple.destroy()
                });
            }
        };
        
        if (delay > 0) {
            this.scene.time.delayedCall(delay, createRipple);
        } else {
            createRipple();
        }
    }
    
    /**
     * Legacy method for backward compatibility
     * @param {Tile} tile - The tile to create ripple effect for
     * @param {number} delay - Delay before showing effect
     */
    createRippleVisual(tile, delay = 0) {
        this.createAdvancedRippleVisual(tile, 0, delay);
    }
    
    /**
     * Check for advanced chain reactions after explosions
     * EFFECTS-03: Enhanced with depth tracking and performance optimization
     * @param {Array} explodedTiles - Tiles that just exploded
     * @param {number} currentDepth - Current cascade depth
     */
    checkForAdvancedChainReactions(explodedTiles, currentDepth = 0) {
        const grid = this.scene.registry.get('grid');
        if (!grid) return;
        
        // EFFECTS-03: Check cascade safety limits
        if (!this.canContinueCascade()) {
            console.warn(`EFFECTS-03: Chain reaction terminated at depth ${currentDepth} due to safety limits`);
            this.triggerGravitySequence();
            return;
        }
        
        // Increment chain reaction counter
        this.chainReactionCount++;
        
        console.log(`EFFECTS-03: Checking chain reactions (depth ${currentDepth}, chain ${this.chainReactionCount})`);
        
        // Collect all neighbors of exploded tiles with distance tracking
        const affectedNeighbors = new Map(); // tile -> distance from explosion
        
        explodedTiles.forEach(tile => {
            const neighbors = grid.getNeighbors(tile.gridX, tile.gridY);
            neighbors.forEach(neighbor => {
                const neighborKey = `${neighbor.gridX},${neighbor.gridY}`;
                
                // Skip if already processed or in invalid state
                if (this.cascadeHistory.has(neighborKey) ||
                    neighbor.state === TILE_STATES.EXPLODING ||
                    neighbor.state === TILE_STATES.FALLING) {
                    return;
                }
                
                // Calculate distance from explosion center
                const distance = Math.abs(neighbor.gridX - tile.gridX) + Math.abs(neighbor.gridY - tile.gridY);
                
                // Only add if not already tracked or if closer
                if (!affectedNeighbors.has(neighbor) || affectedNeighbors.get(neighbor) > distance) {
                    affectedNeighbors.set(neighbor, distance);
                }
            });
        });
        
        // Apply surge to affected neighbors with distance-based intensity
        const tilesToExplode = [];
        const newlyAffectedTiles = [];
        
        Array.from(affectedNeighbors.entries()).forEach(([neighbor, distance]) => {
            const neighborKey = `${neighbor.gridX},${neighbor.gridY}`;
            
            // Mark as processed
            this.cascadeHistory.add(neighborKey);
            newlyAffectedTiles.push(neighbor);
            
            // Apply surge with distance-based intensity
            const surgeIntensity = Math.max(1, Math.floor(2 / distance));
            for (let i = 0; i < surgeIntensity; i++) {
                neighbor.applySurge();
            }
            
            // Check if neighbor is now exploding due to the surge
            if (neighbor.state === TILE_STATES.EXPLODING) {
                tilesToExplode.push(neighbor);
            }
            
            // Create visual feedback for affected tiles
            this.createChainReactionVisual(neighbor, currentDepth, distance);
        });
        
        if (tilesToExplode.length > 0) {
            // Record additional chain reaction in scoring system
            const scoreSystem = this.scene.registry.get('scoreSystem');
            if (scoreSystem) {
                scoreSystem.recordChainReaction(tilesToExplode);
            }
            
            console.log(`EFFECTS-03: Chain reaction triggered ${tilesToExplode.length} explosions at depth ${currentDepth}`);
            
            // Add delay before next chain reaction for visual clarity
            const chainDelay = Math.max(50, this.chainReactionDelay * this.visualEffectIntensity);
            
            this.scene.time.delayedCall(chainDelay, () => {
                // Continue chain reaction with newly exploding tiles
                this.addEffect({
                    type: 'explosion',
                    targets: tilesToExplode,
                    params: {
                        chainReaction: true,
                        cascadeDepth: currentDepth + 1,
                        chainIndex: this.chainReactionCount
                    },
                    callback: () => {
                        // Recursively check for more chain reactions
                        this.checkForAdvancedChainReactions(tilesToExplode, currentDepth + 1);
                    }
                });
            });
        } else {
            // No more explosions, apply gravity
            console.log(`EFFECTS-03: Chain reaction complete at depth ${currentDepth}, triggering gravity`);
            this.triggerGravitySequence();
        }
    }
    
    /**
     * Legacy method for backward compatibility
     * @param {Array} explodedTiles - Tiles that just exploded
     */
    checkForChainReactions(explodedTiles) {
        this.checkForAdvancedChainReactions(explodedTiles, this.cascadeDepth);
    }
    
    /**
     * Create visual feedback for chain reaction effects
     * @param {Tile} tile - The affected tile
     * @param {number} depth - Cascade depth
     * @param {number} distance - Distance from explosion center
     */
    createChainReactionVisual(tile, depth, distance) {
        if (!tile || !tile.worldX || !tile.worldY || this.visualEffectIntensity < 0.5) return;
        
        // Create pulsing effect for chain reaction
        const pulse = this.scene.add.circle(
            tile.worldX,
            tile.worldY,
            8,
            0xff6b6b,
            0.7 * this.visualEffectIntensity
        );
        
        // Animate pulse with distance-based timing
        const delay = distance * 30;
        const duration = Math.max(150, 300 * this.visualEffectIntensity);
        
        this.scene.tweens.add({
            targets: pulse,
            scale: 2,
            alpha: 0,
            duration: duration,
            delay: delay,
            ease: 'Power2',
            onComplete: () => pulse.destroy()
        });
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
                    // EFFECTS-03: Reset cascade tracking when sequence completes
                    this.cascadeStartTime = 0;
                    this.cascadeDepth = 0;
                    this.cascadeHistory.clear();
                    this.chainReactionCount = 0;
                    // Emit event that cascade is complete
                    this.events.emit('cascade-complete');
                }
            });
        } else {
            console.log('Cascade sequence complete - no refill needed');
            // EFFECTS-03: Reset cascade tracking when sequence completes
            this.cascadeStartTime = 0;
            this.cascadeDepth = 0;
            this.cascadeHistory.clear();
            this.chainReactionCount = 0;
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
                    targets: tile.container || [tile.sprite, tile.textObject].filter(obj => obj),
                    y: toPos.y,
                    duration: duration,
                    ease: 'Bounce.easeOut',
                    onComplete: () => {
                        tile.setState(TILE_STATES.NORMAL);
                        // Position is already set by the tween animation
                        // Update tile's internal position tracking
                        tile.worldX = toPos.x;
                        tile.worldY = toPos.y;
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
                // Start invisible and small - use container for unified control
                if (tile.container) {
                    tile.container.setScale(0);
                    tile.container.setAlpha(0);
                } else {
                    // Fallback for tiles without containers
                    tile.sprite.setScale(0);
                    tile.sprite.setAlpha(0);
                    if (tile.textObject) {
                        tile.textObject.setScale(0);
                        tile.textObject.setAlpha(0);
                    }
                }
                
                // Animate appearance
                this.scene.tweens.add({
                    targets: tile.container || [tile.sprite, tile.textObject].filter(obj => obj),
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
     * Get queue status for debugging with advanced cascade information
     * EFFECTS-03: Enhanced status reporting
     * @returns {Object} Queue status information
     */
    getStatus() {
        const currentTime = Date.now();
        const cascadeDuration = this.cascadeStartTime > 0 ? currentTime - this.cascadeStartTime : 0;
        
        return {
            queueLength: this.queue.length,
            isProcessing: this.isProcessing,
            currentEffect: this.currentEffect?.type || null,
            effectsProcessed: this.effectsProcessed,
            averageProcessTime: Math.round(this.averageProcessTime),
            
            // EFFECTS-03: Advanced cascade tracking
            cascadeDepth: this.cascadeDepth,
            maxCascadeDepth: this.maxCascadeDepth,
            cascadeHistory: this.cascadeHistory.size,
            chainReactionCount: this.chainReactionCount,
            cascadeDuration: cascadeDuration,
            visualEffectIntensity: Math.round(this.visualEffectIntensity * 100) / 100,
            
            // Performance metrics
            currentFPS: Math.round(this.scene.game.loop.actualFps),
            frameDropThreshold: this.frameDropThreshold,
            adaptivePerformance: this.adaptivePerformance,
            
            // Safety limits
            canContinueCascade: this.canContinueCascade(),
            simultaneousExplosionLimit: this.simultaneousExplosionLimit
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