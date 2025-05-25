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
        
        // Game state
        this.gameState = 'playing'; // 'playing', 'animating', 'paused'
        this.currentLevel = 1;
        
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
        
        // Create debug info (top-left)
        this.debugText = this.add.text(10, 10, '', {
            fontSize: '14px',
            fontFamily: 'Arial, sans-serif',
            color: '#2c3e50',
            backgroundColor: 'rgba(255, 255, 255, 0.8)',
            padding: { x: 8, y: 4 }
        });
        
        // Create game info (top-right)
        this.gameInfoText = this.add.text(this.scale.width - 10, 10, '', {
            fontSize: '16px',
            fontFamily: 'Arial, sans-serif',
            color: '#2c3e50',
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            padding: { x: 10, y: 6 }
        }).setOrigin(1, 0);
        
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
        
        // Validate word using WordValidator
        const isValid = this.wordValidator && this.wordValidator.isValid(word);
        
        console.log(`Word submitted: "${word}" (${isValid ? 'valid' : 'invalid'})`);
        
        if (isValid && tiles.length > 0) {
            // Trigger ripple effects for valid word (includes explosion + cascades)
            this.effectsQueue.triggerWordRipple(tiles);
            
            this.statusText.setText(`Great word: "${word.toUpperCase()}"!`);
            this.statusText.setColor('#27ae60');
            
        } else {
            this.statusText.setText(tiles.length === 0 ? 'Select some tiles first!' : `"${word.toUpperCase()}" is not a valid word`);
            this.statusText.setColor('#e74c3c');
            
            // Clear invalid selection
            this.grid.clearSelection();
        }
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
            case 'paused':
                this.inputSystem.setEnabled(false);
                console.log('DEBUG: Input disabled - state changed to paused');
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
        // Update debug info
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
        
        // Update game info
        const levelConfig = this.registry.get('levelConfig');
        this.gameInfoText.setText([
            `Level: ${this.currentLevel}`,
            `Target: ${levelConfig?.targetScore || 0}`,
            `Moves: ${levelConfig?.maxMoves || 0}`
        ].join('\n'));
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