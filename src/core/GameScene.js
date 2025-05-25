/**
 * GameScene.js - Main game scene coordinating all systems
 * Integrates Grid, EffectsQueue, and InputSystem for complete gameplay
 */

class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
        
        // System references
        this.grid = null;
        this.effectsQueue = null;
        this.inputSystem = null;
        this.wordValidator = null;
        this.scoreSystem = null;
        
        // Game state
        this.gameState = 'playing'; // 'playing', 'animating', 'paused'
        this.currentLevel = 1;
        this.movesRemaining = 0;
        this.maxMoves = 0;
        
        // Performance tracking
        this.frameCount = 0;
        this.lastFPSUpdate = 0;
        this.currentFPS = 60;
    }
    
    /**
     * Initialize the scene
     */
    init(data) {
        console.log('GameScene initialized with data:', data);
        this.currentLevel = data.level || 1;
    }
    
    /**
     * Preload assets (no async operations here)
     */
    preload() {
        console.log('GameScene preloading...');
        // No assets to preload for now - using Phaser's built-in shapes
        console.log('GameScene assets preloaded');
    }
    
    /**
     * Create the game scene
     */
    async create() {
        console.log('Creating GameScene...');
        
        try {
            // Load configuration first
            await this.loadConfiguration();
            
            // Initialize word validator first (needed by other systems)
            await this.initializeWordValidator();
            
            // Initialize systems
            this.initializeSystems();
            
            // Set up event listeners
            this.setupEventListeners();
            
            // Create UI elements
            this.createUI();
            
            // Start the game
            this.startGame();
            
            console.log('GameScene created successfully');
            
        } catch (error) {
            console.error('Error creating GameScene:', error);
            this.showError(`Failed to initialize game: ${error.message}`);
        }
    }
    
    /**
     * Load game configuration
     */
    async loadConfiguration() {
        try {
            // Load level configuration using static methods like the working test pages
            const levelConfig = await LevelLoader.load(this.currentLevel);
            const settings = await LevelLoader.loadSettings();
            
            // Store in registry for other systems
            this.registry.set('levelConfig', levelConfig);
            this.registry.set('settings', settings);
            
            console.log(`Level ${this.currentLevel} configuration loaded`);
            
        } catch (error) {
            console.error('Failed to load configuration:', error);
            throw error;
        }
    }
    
    /**
     * Initialize all game systems
     */
    /**
     * Initialize word validator system
     */
    async initializeWordValidator() {
        try {
            console.log('Initializing WordValidator...');
            this.wordValidator = new WordValidator();
            
            const loadSuccess = await this.wordValidator.load();
            if (!loadSuccess) {
                throw new Error('Failed to load dictionary');
            }
            
            this.registry.set('wordValidator', this.wordValidator);
            
            const stats = this.wordValidator.getStats();
            console.log(`WordValidator initialized: ${stats.wordCount} words loaded in ${stats.loadTime?.toFixed(2)}ms`);
            
        } catch (error) {
            console.error('Failed to initialize WordValidator:', error);
            throw error;
        }
    }
    
    /**
     * Initialize all game systems
     */
    initializeSystems() {
        const levelConfig = this.registry.get('levelConfig');
        
        // Initialize EffectsQueue first (other systems depend on it)
        this.effectsQueue = new EffectsQueue(this);
        this.registry.set('effectsQueue', this.effectsQueue);
        
        // Initialize ScoreSystem
        this.scoreSystem = new ScoreSystem(this);
        this.registry.set('scoreSystem', this.scoreSystem);
        
        // Initialize move tracking
        this.maxMoves = levelConfig.moves || 20;
        this.movesRemaining = this.maxMoves;
        
        // Initialize Grid
        this.grid = new Grid(this, levelConfig);
        this.registry.set('grid', this.grid);
        
        // Initialize InputSystem
        this.inputSystem = new InputSystem(this, this.grid);
        this.registry.set('inputSystem', this.inputSystem);
        
        // CRITICAL FIX: Pointer capture and event handling
        this.setupPointerCapture();
        
        console.log('All systems initialized');
    }
    
    /**
     * Setup pointer capture to fix bottom row input issues
     */
    setupPointerCapture() {
        const canvas = this.game.canvas;
        
        // Prevent default behaviors that interfere with dragging
        canvas.addEventListener('touchstart', (e) => e.preventDefault(), { passive: false });
        canvas.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
        canvas.addEventListener('mousedown', (e) => e.preventDefault());
        canvas.addEventListener('selectstart', (e) => e.preventDefault());
        canvas.addEventListener('dragstart', (e) => e.preventDefault());
        
        // Force pointer capture on drag for reliable event handling
        this.input.on('pointerdown', (pointer) => {
            if (pointer.event && pointer.event.pointerId !== undefined) {
                canvas.setPointerCapture(pointer.event.pointerId);
                console.log('DEBUG: Captured pointer', pointer.event.pointerId);
            }
        });
        
        this.input.on('pointerup', (pointer) => {
            if (pointer.event && pointer.event.pointerId !== undefined) {
                try {
                    canvas.releasePointerCapture(pointer.event.pointerId);
                    console.log('DEBUG: Released pointer', pointer.event.pointerId);
                } catch (e) {
                    // Ignore if already released
                }
            }
        });
        
        // Debug pointer move events
        let moveCount = 0;
        this.input.on('pointermove', (pointer) => {
            moveCount++;
            if (moveCount % 10 === 0) { // Log every 10th move to avoid spam
                console.log(`DEBUG: Phaser move #${moveCount} Y:${pointer.y.toFixed(1)}`);
            }
        });
    }
    
    /**
     * Set up event listeners between systems
     */
    setupEventListeners() {
        // EffectsQueue events
        this.effectsQueue.events.on('effect-start', (effect) => {
            this.setGameState('animating');
        });
        
        this.effectsQueue.events.on('queue-empty', () => {
            this.setGameState('playing');
        });
        
        this.effectsQueue.events.on('effect-error', (effect, error) => {
            console.error('Effect error:', effect, error);
            this.setGameState('playing'); // Resume game even on error
        });
        
        // Cascade completion event
        this.effectsQueue.events.on('cascade-complete', () => {
            console.log('Cascade sequence completed');
            this.setGameState('playing');
            this.updateDebugInfo();
        });
        
        // InputSystem events (emitted through scene.events)
        this.events.on('wordSubmitted', (wordData) => {
            this.handleWordSubmission(wordData);
        });
        
        this.events.on('tileAdded', (tile, word) => {
            this.handleSelectionChange(this.inputSystem.selectedTiles);
        });
        
        this.events.on('traceEnded', () => {
            this.handleSelectionChange([]);
        });
        
        // ScoreSystem events
        this.events.on('scoreUpdated', (scoreData) => {
            this.updateHUD();
        });
        
        this.events.on('wordScored', (scoreData) => {
            console.log(`Word "${scoreData.word}" scored ${scoreData.totalScore} points`);
            this.updateHUD();
        });
        
        // Advanced scoring events
        this.events.on('cascadeStarted', (cascadeData) => {
            console.log('Cascade sequence started');
            this.statusText.setText('Cascade starting...');
            this.statusText.setColor('#3498db');
        });
        
        this.events.on('chainReaction', (chainData) => {
            console.log(`Chain reaction ${chainData.chainCount}: ${chainData.tilesExploded} tiles exploded`);
            
            // Create chain reaction popup at screen center
            const centerX = this.scale.width / 2;
            const centerY = this.scale.height / 2;
            
            this.scoreSystem.createChainBonusPopup(
                chainData.chainCount,
                0, // Bonus calculated at end
                centerX,
                centerY - 50
            );
        });
        
        this.events.on('cascadeCompleted', (cascadeData) => {
            console.log(`Cascade completed: ${cascadeData.chainCount} chains, ${cascadeData.finalBonus} bonus points`);
            
            if (cascadeData.finalBonus > 0) {
                // Create final cascade bonus popup
                const centerX = this.scale.width / 2;
                const centerY = this.scale.height / 2;
                
                this.scoreSystem.createScorePopup(
                    cascadeData.finalBonus,
                    centerX,
                    centerY,
                    {
                        color: '#e74c3c',
                        fontSize: 32,
                        duration: 2000,
                        isBonus: true
                    }
                );
                
                this.statusText.setText(`Amazing cascade! +${cascadeData.finalBonus} bonus points!`);
                this.statusText.setColor('#e74c3c');
            } else {
                this.statusText.setText('Ready for next word!');
                this.statusText.setColor('#2c3e50');
            }
        });
        
        // Screen resize handling - disabled to prevent spam
        // TODO: Fix resize loop issue in future iteration
        // this.scale.on('resize', (gameSize) => {
        //     this.handleResize(gameSize);
        // });
        
        console.log('Event listeners set up');
    }
    
    /**
     * Create UI elements
     */
    createUI() {
        const settings = this.registry.get('settings');
        const uiConfig = settings.ui || {};
        
        // Create HUD container (top area)
        this.createHUD();
        
        // Create debug info (top-left)
        this.debugText = this.add.text(10, 10, '', {
            fontSize: '12px',
            fontFamily: 'Arial, sans-serif',
            color: '#2c3e50',
            backgroundColor: 'rgba(255, 255, 255, 0.8)',
            padding: { x: 6, y: 3 }
        });
        
        // Create status text (bottom-center)
        this.statusText = this.add.text(this.scale.width / 2, this.scale.height - 30, 'Ready to play!', {
            fontSize: '18px',
            fontFamily: 'Arial, sans-serif',
            color: '#27ae60',
            fontStyle: 'bold'
        }).setOrigin(0.5, 0.5);
        
        this.updateUI();
        console.log('UI created');
    }
    
    /**
     * Create the main HUD (Heads-Up Display)
     */
    createHUD() {
        const hudY = 15;
        const hudHeight = 80;
        
        // HUD Background
        this.hudBackground = this.add.rectangle(
            this.scale.width / 2,
            hudY + hudHeight / 2,
            this.scale.width - 20,
            hudHeight,
            0x2c3e50,
            0.9
        ).setStrokeStyle(2, 0x34495e);
        
        // Score Section (left)
        this.scoreLabel = this.add.text(30, hudY + 15, 'SCORE', {
            fontSize: '14px',
            fontFamily: 'Arial, sans-serif',
            color: '#ecf0f1',
            fontStyle: 'bold'
        });
        
        this.scoreText = this.add.text(30, hudY + 35, '0', {
            fontSize: '24px',
            fontFamily: 'Arial, sans-serif',
            color: '#f39c12',
            fontStyle: 'bold'
        });
        
        this.targetText = this.add.text(30, hudY + 60, 'Target: 0', {
            fontSize: '12px',
            fontFamily: 'Arial, sans-serif',
            color: '#bdc3c7'
        });
        
        // Progress Bar
        const progressBarWidth = 200;
        const progressBarX = 150;
        const progressBarY = hudY + 45;
        
        this.progressBarBg = this.add.rectangle(
            progressBarX + progressBarWidth / 2,
            progressBarY,
            progressBarWidth,
            8,
            0x34495e
        );
        
        this.progressBar = this.add.rectangle(
            progressBarX,
            progressBarY,
            0,
            8,
            0x27ae60
        ).setOrigin(0, 0.5);
        
        // Moves Section (center-right)
        this.movesLabel = this.add.text(this.scale.width / 2 + 50, hudY + 15, 'MOVES', {
            fontSize: '14px',
            fontFamily: 'Arial, sans-serif',
            color: '#ecf0f1',
            fontStyle: 'bold'
        });
        
        this.movesText = this.add.text(this.scale.width / 2 + 50, hudY + 35, '0', {
            fontSize: '24px',
            fontFamily: 'Arial, sans-serif',
            color: '#3498db',
            fontStyle: 'bold'
        });
        
        this.movesSubText = this.add.text(this.scale.width / 2 + 50, hudY + 60, 'remaining', {
            fontSize: '12px',
            fontFamily: 'Arial, sans-serif',
            color: '#bdc3c7'
        });
        
        // Level Section (right)
        this.levelText = this.add.text(this.scale.width - 40, hudY + 35, 'LEVEL 1', {
            fontSize: '16px',
            fontFamily: 'Arial, sans-serif',
            color: '#ecf0f1',
            fontStyle: 'bold'
        }).setOrigin(1, 0.5);
    }
    
    /**
     * Show error message to user
     * @param {string} message - Error message to display
     */
    showError(message) {
        // Create error overlay if it doesn't exist
        if (!this.errorOverlay) {
            this.errorOverlay = this.add.rectangle(
                this.scale.width / 2,
                this.scale.height / 2,
                this.scale.width,
                this.scale.height,
                0x000000,
                0.8
            );
            this.errorOverlay.setDepth(1000);
            
            this.errorText = this.add.text(
                this.scale.width / 2,
                this.scale.height / 2,
                '',
                {
                    fontSize: '24px',
                    fontFamily: 'Arial, sans-serif',
                    color: '#ffffff',
                    align: 'center',
                    wordWrap: { width: this.scale.width - 40 }
                }
            ).setOrigin(0.5, 0.5).setDepth(1001);
        }
        
        this.errorText.setText(message);
        this.errorOverlay.setVisible(true);
        this.errorText.setVisible(true);
    }
    
    /**
     * Start the game
     */
    startGame() {
        this.setGameState('playing');
        this.statusText.setText('Select tiles to form words!');
        
        // Start performance monitoring
        this.startPerformanceMonitoring();
        
        console.log('Game started');
    }
    
    /**
     * Handle word submission from input system
     * @param {Object} wordData - Word submission data
     */
    handleWordSubmission(wordData) {
        const { word, tiles } = wordData;
        
        // Don't process if game is paused or animating
        if (this.gameState !== 'playing') {
            return;
        }
        
        // Validate word using WordValidator
        const isValid = this.wordValidator && this.wordValidator.isValid(word);
        
        console.log(`Word submitted: "${word}" (${isValid ? 'valid' : 'invalid'})`);
        
        if (isValid && tiles.length > 0) {
            // Use a move
            this.movesRemaining--;
            
            // Score the word using cascade scoring
            const points = this.scoreSystem.scoreCascadeWord(tiles);
            
            // Create score popup animation at the center of the word
            const centerTile = tiles[Math.floor(tiles.length / 2)];
            if (centerTile) {
                this.scoreSystem.createScorePopup(
                    points,
                    centerTile.worldX,
                    centerTile.worldY,
                    {
                        color: '#27ae60',
                        fontSize: 28,
                        isBonus: tiles.some(t => t.type === TILE_TYPES.MULTIPLIER)
                    }
                );
            }
            
            // Trigger ripple effects for valid word (includes explosion + cascades)
            this.effectsQueue.triggerWordRipple(tiles);
            
            this.statusText.setText(`Great word: "${word.toUpperCase()}" (+${points} points)!`);
            this.statusText.setColor('#27ae60');
            
            // Check for game over conditions
            this.checkGameOver();
            
        } else {
            this.statusText.setText(tiles.length === 0 ? 'Select some tiles first!' : `"${word.toUpperCase()}" is not a valid word`);
            this.statusText.setColor('#e74c3c');
            
            // Clear invalid selection
            this.grid.clearSelection();
        }
    }
    
    /**
     * Check for game over conditions
     */
    checkGameOver() {
        const hasWon = this.scoreSystem.hasReachedTarget();
        const hasLost = this.movesRemaining <= 0 && !hasWon;
        
        if (hasWon) {
            this.handleVictory();
        } else if (hasLost) {
            this.handleDefeat();
        }
        
        // Update HUD regardless
        this.updateHUD();
    }
    
    /**
     * Handle victory condition
     */
    handleVictory() {
        this.setGameState('animating'); // Prevent further input
        this.statusText.setText('🎉 LEVEL COMPLETE! 🎉');
        this.statusText.setColor('#27ae60');
        
        // Show victory overlay
        if (!this.victoryOverlay) {
            this.victoryOverlay = this.add.rectangle(
                this.scale.width / 2,
                this.scale.height / 2,
                this.scale.width,
                this.scale.height,
                0x27ae60,
                0.8
            ).setDepth(600);
            
            this.victoryText = this.add.text(
                this.scale.width / 2,
                this.scale.height / 2,
                `🎉 LEVEL ${this.currentLevel} COMPLETE! 🎉\n\nScore: ${this.scoreSystem.getCurrentScore()}\nMoves Used: ${this.maxMoves - this.movesRemaining}`,
                {
                    fontSize: '28px',
                    fontFamily: 'Arial, sans-serif',
                    color: '#ffffff',
                    align: 'center',
                    fontStyle: 'bold'
                }
            ).setOrigin(0.5, 0.5).setDepth(601);
        }
        
        this.victoryOverlay.setVisible(true);
        this.victoryText.setVisible(true);
    }
    
    /**
     * Handle defeat condition
     */
    handleDefeat() {
        this.setGameState('animating'); // Prevent further input
        this.statusText.setText('💀 GAME OVER 💀');
        this.statusText.setColor('#e74c3c');
        
        // Show defeat overlay
        if (!this.defeatOverlay) {
            this.defeatOverlay = this.add.rectangle(
                this.scale.width / 2,
                this.scale.height / 2,
                this.scale.width,
                this.scale.height,
                0xe74c3c,
                0.8
            ).setDepth(600);
            
            this.defeatText = this.add.text(
                this.scale.width / 2,
                this.scale.height / 2,
                `💀 GAME OVER 💀\n\nScore: ${this.scoreSystem.getCurrentScore()}\nTarget: ${this.scoreSystem.getTargetScore()}\n\nTry Again!`,
                {
                    fontSize: '28px',
                    fontFamily: 'Arial, sans-serif',
                    color: '#ffffff',
                    align: 'center',
                    fontStyle: 'bold'
                }
            ).setOrigin(0.5, 0.5).setDepth(601);
        }
        
        this.defeatOverlay.setVisible(true);
        this.defeatText.setVisible(true);
    }
    
    /**
     * Handle post-explosion effects (gravity, refill, cascades)
     * @param {Array} explodedTiles - Tiles that were exploded
     */
    handlePostExplosion(explodedTiles) {
        // Tiles are already removed by EffectsQueue animation
        
        // Apply gravity
        const movements = this.grid.applyGravity();
        if (movements.length > 0) {
            this.effectsQueue.addEffect({
                type: 'gravity',
                targets: movements,
                params: {
                    duration: 300
                },
                callback: () => {
                    // Refresh InputSystem grid reference after gravity
                    this.inputSystem.grid = this.grid;
                    this.handlePostGravity();
                }
            });
        } else {
            this.handlePostGravity();
        }
    }
    
    /**
     * Handle post-gravity effects (refill grid)
     */
    handlePostGravity() {
        // Refill empty spaces
        const newTiles = this.grid.refillGrid();
        if (newTiles.length > 0) {
            this.effectsQueue.addEffect({
                type: 'spawn',
                targets: newTiles,
                params: {
                    duration: 200,
                    staggerDelay: 30
                },
                callback: () => {
                    console.log('Grid refilled, ready for next move');
                }
            });
        }
    }
    
    /**
     * Handle selection change from input system
     * @param {Array} tiles - Currently selected tiles
     */
    handleSelectionChange(tiles) {
        if (tiles.length > 0) {
            const word = tiles.map(tile => tile.letter).join('');
            this.statusText.setText(`Current word: "${word.toUpperCase()}"`);
            this.statusText.setColor('#3498db');
        } else {
            this.statusText.setText('Select tiles to form words!');
            this.statusText.setColor('#7f8c8d');
        }
    }
    
    /**
     * Set game state and handle state transitions
     * @param {string} newState - New game state
     */
    setGameState(newState) {
        if (this.gameState === newState) return;
        
        const oldState = this.gameState;
        this.gameState = newState;
        
        // Store in registry for debugging
        this.registry.set('gameState', { state: newState, isAnimating: newState === 'animating' });
        
        // Handle state transitions
        switch (newState) {
            case 'playing':
                this.inputSystem.setEnabled(true);
                console.log('DEBUG: Input enabled - state changed to playing');
                break;
            case 'animating':
                this.inputSystem.setEnabled(false);
                this.grid.clearSelection();
                console.log('DEBUG: Input disabled - state changed to animating');
                break;
        }
        
        console.log(`DEBUG: Game state changed: ${oldState} -> ${newState}`);
    }
    
    /**
     * Handle screen resize
     * @param {Object} gameSize - New game size
     */
    handleResize(gameSize) {
        // Update grid layout
        if (this.grid) {
            this.grid.updateLayout();
        }
        
        // Update UI positions
        if (this.gameInfoText) {
            this.gameInfoText.setPosition(gameSize.width - 10, 10);
        }
        if (this.statusText) {
            this.statusText.setPosition(gameSize.width / 2, gameSize.height - 30);
        }
        
        console.log('Screen resized:', gameSize);
    }
    
    /**
     * Start performance monitoring
     */
    startPerformanceMonitoring() {
        this.time.addEvent({
            delay: 1000,
            callback: this.updatePerformanceMetrics,
            callbackScope: this,
            loop: true
        });
    }
    
    /**
     * Update performance metrics
     */
    updatePerformanceMetrics() {
        const now = this.time.now;
        const deltaTime = now - this.lastFPSUpdate;
        
        if (deltaTime >= 1000) {
            this.currentFPS = Math.round((this.frameCount * 1000) / deltaTime);
            this.frameCount = 0;
            this.lastFPSUpdate = now;
        }
        
        this.updateUI();
    }
    
    /**
     * Update UI elements
     */
    updateUI() {
        this.updateDebugInfo();
        this.updateHUD();
    }
    
    /**
     * Update debug information
     */
    updateDebugInfo() {
        const effectsStatus = this.effectsQueue ? this.effectsQueue.getStatus() : {};
        const gridStats = this.grid ? this.grid.getStats() : {};
        const validatorStats = this.wordValidator ? this.wordValidator.getStats() : {};
        
        this.debugText.setText([
            `FPS: ${this.currentFPS}`,
            `State: ${this.gameState}`,
            `Queue: ${effectsStatus.queueLength || 0}`,
            `Processing: ${effectsStatus.isProcessing ? 'Yes' : 'No'}`,
            `Tiles: ${gridStats.totalTiles || 0}`,
            `Dict: ${validatorStats.loaded ? validatorStats.wordCount + ' words' : 'Loading...'}`
        ].join('\n'));
    }
    
    /**
     * Update HUD elements
     */
    updateHUD() {
        if (!this.scoreSystem) return;
        
        const currentScore = this.scoreSystem.getCurrentScore();
        const targetScore = this.scoreSystem.getTargetScore();
        const progress = this.scoreSystem.getProgress();
        
        // Update score display
        this.scoreText.setText(currentScore.toString());
        this.targetText.setText(`Target: ${targetScore}`);
        
        // Update progress bar
        const progressBarWidth = 200;
        const progressWidth = (progress / 100) * progressBarWidth;
        this.progressBar.setSize(progressWidth, 8);
        
        // Change progress bar color based on progress
        if (progress >= 100) {
            this.progressBar.setFillStyle(0x27ae60); // Green when complete
        } else if (progress >= 75) {
            this.progressBar.setFillStyle(0xf39c12); // Orange when close
        } else {
            this.progressBar.setFillStyle(0x3498db); // Blue for normal progress
        }
        
        // Update moves display
        this.movesText.setText(this.movesRemaining.toString());
        
        // Change moves color based on remaining moves
        if (this.movesRemaining <= 3) {
            this.movesText.setColor('#e74c3c'); // Red when low
        } else if (this.movesRemaining <= 6) {
            this.movesText.setColor('#f39c12'); // Orange when medium
        } else {
            this.movesText.setColor('#3498db'); // Blue when plenty
        }
        
        // Update level display
        this.levelText.setText(`LEVEL ${this.currentLevel}`);
    }
    
    /**
     * Show error message
     * @param {string} message - Error message to display
     */
    showError(message) {
        if (this.statusText) {
            this.statusText.setText(`Error: ${message}`);
            this.statusText.setColor('#e74c3c');
        }
        console.error('GameScene Error:', message);
    }
    
    /**
     * Scene update loop
     * @param {number} time - Current time
     * @param {number} delta - Delta time since last frame
     */
    update(time, delta) {
        this.frameCount++;
        
        // InputSystem doesn't need update - it's event-driven
        // Other systems can be updated here if needed
    }
    
    /**
     * Clean up scene resources
     */
    destroy() {
        // Destroy systems
        if (this.effectsQueue) {
            this.effectsQueue.destroy();
        }
        if (this.grid) {
            this.grid.destroy();
        }
        if (this.inputSystem) {
            this.inputSystem.destroy();
        }
        if (this.scoreSystem) {
            this.scoreSystem.destroy();
        }
        
        console.log('GameScene destroyed');
        super.destroy();
    }
}

// Make available globally for script tag imports
if (typeof window !== 'undefined') {
    window.GameScene = GameScene;
}

// Export for CommonJS if needed
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GameScene;
}