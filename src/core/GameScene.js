/**
 * GameScene.js - Main game scene coordinating all systems
 * Integrates Grid, EffectsQueue, InputSystem, and GameState for complete gameplay
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
        this.gameStateManager = null;
        
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
        
        // DIAGNOSTIC: Check canvas and container positioning
        console.log('🔍 CANVAS & CONTAINER DIAGNOSTIC:');
        const canvas = this.game.canvas;
        const container = canvas.parentElement;
        console.log(`  🖼️ Canvas Size: ${canvas.width}x${canvas.height}`);
        console.log(`  📐 Canvas Style: ${canvas.style.width}x${canvas.style.height}`);
        console.log(`  📦 Container ID: ${container?.id || 'unknown'}`);
        if (container) {
            const containerStyle = window.getComputedStyle(container);
            console.log(`  📦 Container Padding: ${containerStyle.padding}`);
            console.log(`  📦 Container Size: ${container.offsetWidth}x${container.offsetHeight}`);
            console.log(`  📍 Canvas Position in Container: ${canvas.offsetLeft}, ${canvas.offsetTop}`);
        }
        console.log(`  🎮 Phaser Scale: ${this.scale.width}x${this.scale.height}`);
        
        try {
            // Load configuration first
            await this.loadConfiguration();
            
            // Initialize word validator first (needed by other systems)
            await this.initializeWordValidator();
            
            // Initialize GameState manager
            this.initializeGameState();
            
            // Create game board background BEFORE tiles (for proper layering)
            this.createGameBoard();
            
            // Initialize systems
            this.initializeSystems();
            
            // Set up event listeners
            this.setupEventListeners();
            
            // Set up visibility change handlers to fix input issues when switching tabs
            this.setupVisibilityHandlers();
            
            // Add debug button for fixing input issues
            this.createDebugButton();
            
            // Create UI elements - commented out, using HTML UI layer instead
            // this.createUI();
            
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
     * Initialize GameState manager
     */
    initializeGameState() {
        this.gameStateManager = new GameState(this);
        this.registry.set('gameStateManager', this.gameStateManager);
        
        const levelConfig = this.registry.get('levelConfig');
        this.gameStateManager.initializeLevel(this.currentLevel, levelConfig);
        
        console.log('GameState manager initialized');
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
        
        // Initialize move tracking from GameState
        this.maxMoves = this.gameStateManager.maxMoves;
        this.movesRemaining = this.gameStateManager.movesRemaining;
        
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
        
        // CRITICAL FIX: Add a direct click handler to the canvas to force input reset
        // This ensures that when the user clicks on the game after a focus change,
        // the input system will be completely reset
        canvas.addEventListener('click', (e) => {
            console.log('🔍 CANVAS CLICK: Direct canvas click detected - forcing input reset');
            
            // Only force reset if we're not already tracing
            if (this.inputSystem && !this.inputSystem.isCurrentlyTracing()) {
                // Try the most drastic approach - completely recreate the input system
                this.recreateInputSystem();
                console.log('🔍 Input system completely recreated on canvas click');
            }
        });
        
        // Force pointer capture on drag for reliable event handling
        this.input.on('pointerdown', (pointer) => {
            if (pointer.event && pointer.event.pointerId !== undefined) {
                canvas.setPointerCapture(pointer.event.pointerId);
            }
        });
        
        this.input.on('pointerup', (pointer) => {
            if (pointer.event && pointer.event.pointerId !== undefined) {
                try {
                    canvas.releasePointerCapture(pointer.event.pointerId);
                } catch (e) {
                    // Ignore if already released
                }
            }
        });
        
        // Debug pointer move events
        // Add event listener for pointer movement
        this.input.on('pointermove', (pointer) => {
            // No debug logging needed
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
            // this.updateDebugInfo(); // Commented out - using HTML UI layer instead
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
        // Clean up any existing listeners first
        this.events.off('scoreUpdated');
        this.events.off('wordScored');
        this.events.off('levelVictory');
        this.events.off('levelDefeat');
        this.events.off('levelTransitionStart');
        this.events.off('allLevelsCompleted');
        this.events.off('cascadeStarted');
        this.events.off('chainReaction');
        this.events.off('cascadeCompleted');
        
        this.events.on('scoreUpdated', (scoreData) => {
            console.log('🎯 scoreUpdated event:', scoreData);
            
            // Sync GameState with ScoreSystem's total score
            this.gameStateManager.currentScore = scoreData.currentScore;
            
            console.log(`🎯 Victory check: ${this.gameStateManager.currentScore} >= ${this.gameStateManager.targetScore} = ${this.gameStateManager.currentScore >= this.gameStateManager.targetScore}`);
            console.log(`🎯 Game status: ${this.gameStateManager.gameStatus}`);
            
            // Check victory condition manually since we're setting score directly
            if (this.gameStateManager.currentScore >= this.gameStateManager.targetScore) {
                console.log('🎯 Calling handleVictory()');
                this.gameStateManager.handleVictory();
            }
            
            this.updateHUD();
        });

        this.events.on('wordScored', (scoreData) => {
            console.log(`Word "${scoreData.word}" scored ${scoreData.totalScore} points`);
            // This event is handled by scoreUpdated, so we don't need to duplicate the logic
            this.updateHUD();
        });
        
        // GameState events
        this.events.on('levelVictory', (victoryData) => {
            this.handleVictoryWithTransition(victoryData);
        });
        
        this.events.on('levelDefeat', (defeatData) => {
            this.handleDefeatWithRestart(defeatData);
        });
        
        this.events.on('levelTransitionStart', (transitionData) => {
            console.log(`Transitioning from level ${transitionData.fromLevel} to ${transitionData.toLevel}`);
        });
        
        this.events.on('allLevelsCompleted', (completionData) => {
            this.handleAllLevelsCompleted(completionData);
        });
        
        // Advanced scoring events
        this.events.on('cascadeStarted', (cascadeData) => {
            console.log('Cascade sequence started');
            if (this.statusText) {
                this.statusText.setText('Cascade starting...');
                this.statusText.setColor('#3498db');
            }
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
                
                if (this.statusText) {
                    this.statusText.setText(`Amazing cascade! +${cascadeData.finalBonus} bonus points!`);
                    this.statusText.setColor('#e74c3c');
                }
            } else {
                if (this.statusText) {
                    this.statusText.setText('Ready for next word!');
                    this.statusText.setColor('#2c3e50');
                }
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
        
        // Create HUD container (top area) - commented out, using HTML UI layer instead
        // this.createHUD();
        
        // Create debug info (bottom-left) - commented out, using HTML UI layer instead
        /*
        this.debugText = this.add.text(10, this.scale.height - 120, '', {
            fontSize: '11px',
            fontFamily: 'Rubik, Arial, sans-serif',
            color: '#ecf0f1',
            backgroundColor: 'rgba(44, 62, 80, 0.8)',
            padding: { x: 8, y: 4 }
        });
        */
        
        // Create status text (bottom-center) - commented out, using HTML UI layer instead
        /*
        this.statusText = this.add.text(this.scale.width / 2, this.scale.height - 30, 'Ready to play!', {
            fontSize: '18px',
            fontFamily: 'Arial, sans-serif',
            color: '#27ae60',
            fontStyle: 'bold'
        }).setOrigin(0.5, 0.5);
        */
        
        this.updateUI();
        console.log('UI created');
    }
    
    /**
     * Create game board background with a square, rounded corners just like the demo
     */
    createGameBoard() {
        console.log('🎮 BOARD BACKGROUND: Creating perfect square board with rounded corners');
        
        // Get canvas size
        const canvasWidth = this.scale.width;
        const canvasHeight = this.scale.height;
        
        // Check if we're on a mobile device
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        
        // Create a perfect square board that fits within the canvas
        // Use smaller margin on mobile devices
        const margin = isMobile ? 5 : 20; // Reduced margin for mobile
        
        // Use the smaller dimension to ensure a perfect square
        const size = Math.min(canvasWidth, canvasHeight) - (margin * 2);
        const cornerRadius = 15; // Corner radius for rounded rectangle
        
        // For mobile devices, position the board closer to the top
        const startX = (canvasWidth - size) / 2;
        let startY;
        
        if (isMobile) {
            // Position board closer to top on mobile
            startY = margin + 60; // Add space for the UI elements at top
            console.log('📱 MOBILE BOARD POSITIONING: Positioning board closer to top');
        } else {
            // Center the board vertically on desktop
            startY = (canvasHeight - size) / 2;
        }
        
        // Store board dimensions for other systems to reference
        this.boardDimensions = {
            x: startX,
            y: startY,
            size: size,
            margin: margin,
            cornerRadius: cornerRadius
        };
        
        // Register board dimensions in the registry for other systems
        this.registry.set('boardDimensions', this.boardDimensions);
        
        // Clear any previous graphics
        if (this.boardBg) {
            this.boardBg.clear();
        }
        
        // Create main background - dark blue rounded square like the demo
        this.boardBg = this.add.graphics();
        
        // Add drop shadow first (under the board)
        const shadowGraphics = this.add.graphics();
        shadowGraphics.fillStyle(0x000000, 0.3); // Semi-transparent black
        shadowGraphics.fillRoundedRect(startX + 5, startY + 5, size, size, cornerRadius);
        shadowGraphics.setBlendMode(Phaser.BlendModes.MULTIPLY);
        
        // Create the rounded square board
        this.boardBg.fillStyle(0x34495e, 1); // Match demo background color
        this.boardBg.fillRoundedRect(startX, startY, size, size, cornerRadius);
        
        console.log('🎮 BOARD DIMENSIONS:', this.boardDimensions);
        console.log('🎮 BOARD BACKGROUND: Created perfect square with rounded corners');
    }
    
    /**
     * Create the main HUD (Heads-Up Display)
     */
    createHUD() {
        const hudY = 15;
        const hudHeight = 70;
        
        // HUD Background with rounded corners
        this.hudBackground = this.add.graphics();
        this.hudBackground.fillStyle(window.COLORS?.bgPanel || 0x34495e, 0.95);
        this.hudBackground.lineStyle(2, window.COLORS?.border || 0x2c3e50);
        this.hudBackground.fillRoundedRect(
            10,
            hudY,
            this.scale.width - 20,
            hudHeight,
            8
        );
        this.hudBackground.strokeRoundedRect(
            10,
            hudY,
            this.scale.width - 20,
            hudHeight,
            8
        );
        
        // Score Section (left)
        // Phaser HUD elements commented out - using HTML UI layer instead
        /*
        this.scoreLabel = this.add.text(25, hudY + 12, 'SCORE', {
            fontSize: '12px',
            fontFamily: 'Rubik, Arial, sans-serif',
            color: '#bdc3c7',
            fontStyle: 'bold'
        });
        
        this.scoreText = this.add.text(25, hudY + 28, '0', {
            fontSize: '20px',
            fontFamily: 'Rubik, Arial, sans-serif',
            color: '#f39c12',
            fontStyle: 'bold'
        });
        
        this.targetText = this.add.text(25, hudY + 52, 'Target: 0', {
            fontSize: '10px',
            fontFamily: 'Rubik, Arial, sans-serif',
            color: '#95a5a6'
        });
        
        // Progress Bar (center)
        const progressBarWidth = 180;
        const progressBarX = this.scale.width / 2 - progressBarWidth / 2;
        const progressBarY = hudY + 35;
        
        this.progressBarBg = this.add.graphics();
        this.progressBarBg.fillStyle(0x2c3e50);
        this.progressBarBg.fillRoundedRect(progressBarX, progressBarY, progressBarWidth, 6, 3);
        
        this.progressBar = this.add.graphics();
        this.updateProgressBar(0); // Initialize with 0 progress
        
        // Moves Section (right)
        this.movesLabel = this.add.text(this.scale.width - 120, hudY + 12, 'MOVES', {
            fontSize: '12px',
            fontFamily: 'Rubik, Arial, sans-serif',
            color: '#bdc3c7',
            fontStyle: 'bold'
        });
        
        this.movesText = this.add.text(this.scale.width - 120, hudY + 28, '15', {
            fontSize: '20px',
            fontFamily: 'Rubik, Arial, sans-serif',
            color: '#3498db',
            fontStyle: 'bold'
        });
        
        this.movesSubtext = this.add.text(this.scale.width - 120, hudY + 52, 'remaining', {
            fontSize: '10px',
            fontFamily: 'Rubik, Arial, sans-serif',
            color: '#95a5a6'
        });
        
        // Level indicator (top right)
        this.levelText = this.add.text(this.scale.width - 25, hudY + 35, `LEVEL ${this.currentLevel}`, {
            fontSize: '14px',
            fontFamily: 'Rubik, Arial, sans-serif',
            color: '#ecf0f1',
            fontStyle: 'bold'
        }).setOrigin(1, 0.5);
        */
    }
    
    /**
     * Update progress bar visual
     * @param {number} progress - Progress value between 0 and 1
     */
    updateProgressBar(progress) {
        if (!this.progressBar) return;
        
        const progressBarWidth = 180;
        const progressBarX = this.scale.width / 2 - progressBarWidth / 2;
        const progressBarY = 50; // hudY + 35
        
        this.progressBar.clear();
        
        if (progress > 0) {
            // Determine color based on progress
            let color;
            if (progress >= 1) {
                color = 0x27ae60; // Green when complete
            } else if (progress >= 0.7) {
                color = 0x2ecc71; // Light green when close
            } else if (progress >= 0.4) {
                color = 0x3498db; // Blue for medium progress
            } else {
                color = 0xe74c3c; // Red for low progress
            }
            
            this.progressBar.fillStyle(color);
            this.progressBar.fillRoundedRect(
                progressBarX,
                progressBarY,
                progressBarWidth * Math.min(progress, 1),
                6,
                3
            );
        }
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
        if (this.statusText) {
            this.statusText.setText('Select tiles to form words!');
        }
        
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
        if (this.gameState !== 'playing' || this.gameStateManager.gameStatus !== 'playing') {
            return;
        }
        
        // Validate word using WordValidator
        const isValid = this.wordValidator && this.wordValidator.isValid(word);
        
        console.log(`Word submitted: "${word}" (${isValid ? 'valid' : 'invalid'})`);
        
        if (isValid && tiles.length > 0) {
            // Use a move through GameState
            this.gameStateManager.useMove();
            this.movesRemaining = this.gameStateManager.movesRemaining;
            
            // Trigger ripple effects for valid word (includes explosion + cascades + scoring)
            // The cascade system will handle scoring internally through startCascadeSequence()
            this.effectsQueue.triggerWordRipple(tiles);
            
            if (this.statusText) {
                this.statusText.setText(`Great word: "${word.toUpperCase()}"!`);
                this.statusText.setColor('#27ae60');
            }
            
            // GameState will handle victory/defeat conditions automatically
            
        } else {
            if (this.statusText) {
                this.statusText.setText(tiles.length === 0 ? 'Select some tiles first!' : `"${word.toUpperCase()}" is not a valid word`);
                this.statusText.setColor('#e74c3c');
            }
            
            // Clear invalid selection
            this.grid.clearSelection();
        }
    }
    
    /**
     * Handle victory condition with level progression
     * @param {Object} victoryData - Victory data from GameState
     */
    handleVictoryWithTransition(victoryData) {
        this.setGameState('animating'); // Prevent further input
        
        // Update status text if it exists
        if (this.statusText) {
            this.statusText.setText('🎉 LEVEL COMPLETE! 🎉');
            this.statusText.setColor('#27ae60');
        }
        
        // Use HTML overlay instead of Phaser overlay
        if (window.UIManager) {
            const victoryDisplayData = {
                score: this.gameStateManager.currentScore,
                target: this.gameStateManager.targetScore,
                movesUsed: this.gameStateManager.maxMoves - this.gameStateManager.movesRemaining,
                maxMoves: this.gameStateManager.maxMoves,
                bestWord: this.scoreSystem.getBestWord() || 'NONE',
                bestScore: this.scoreSystem.getBestWordScore() || 0
            };
            
            window.UIManager.showVictory(victoryDisplayData);
        }
        
        // Keep legacy Phaser overlay for backward compatibility (but don't show it)
        if (!this.victoryOverlay) {
            // Create but don't display - HTML overlay takes precedence
            this.victoryOverlay = this.add.rectangle(
                this.scale.width / 2,
                this.scale.height / 2,
                this.scale.width,
                this.scale.height,
                0x000000,
                0.8
            ).setDepth(1000).setVisible(false);
            
            this.victoryPanel = this.add.rectangle(
                this.scale.width / 2,
                this.scale.height / 2,
                400,
                350,
                window.COLORS?.success || 0x27ae60
            ).setStrokeStyle(3, window.COLORS?.textLight || 0xecf0f1).setDepth(1001).setVisible(false);
            
            this.victoryText = this.add.text(
                this.scale.width / 2,
                this.scale.height / 2,
                '',
                {
                    fontSize: '20px',
                    fontFamily: 'Rubik, Arial, sans-serif',
                    color: '#ffffff',
                    align: 'center',
                    fontStyle: 'bold',
                    lineSpacing: 8
                }
            ).setOrigin(0.5, 0.5).setDepth(1002).setVisible(false);
            
            // Next Level button (hidden - HTML overlay handles this)
            this.nextLevelButton = this.add.rectangle(
                this.scale.width / 2,
                this.scale.height / 2 + 120,
                200,
                50,
                window.COLORS?.primary || 0x3498db
            ).setStrokeStyle(2, window.COLORS?.textLight || 0xecf0f1)
             .setDepth(1003)
             .setInteractive({ useHandCursor: true })
             .setVisible(false);
            
            this.nextLevelButtonText = this.add.text(
                this.scale.width / 2,
                this.scale.height / 2 + 120,
                'NEXT LEVEL',
                {
                    fontSize: '18px',
                    fontFamily: 'Rubik, Arial, sans-serif',
                    color: '#ffffff',
                    fontStyle: 'bold'
                }
            ).setOrigin(0.5, 0.5).setDepth(1004);
            
            // Button hover effects
            this.nextLevelButton.on('pointerover', () => {
                this.nextLevelButton.setFillStyle(window.COLORS?.primaryHover || 0x2980b9);
            });
            
            this.nextLevelButton.on('pointerout', () => {
                this.nextLevelButton.setFillStyle(window.COLORS?.primary || 0x3498db);
            });
            
            // Button click handler
            this.nextLevelButton.on('pointerdown', () => {
                this.handleNextLevelClick();
            });
        }
        
        // Update victory text with level progression info
        const nextLevelText = victoryData.nextLevelUnlocked ?
            `\n\nNext level unlocked!` :
            `\n\nAll levels completed!\nCongratulations!`;
            
        if (this.victoryText && this.victoryText.active) {
            try {
                this.victoryText.setText(
                    `🎉 LEVEL ${victoryData.level} COMPLETE! 🎉\n\nScore: ${victoryData.score}\nTarget: ${victoryData.targetScore}\nMoves Used: ${victoryData.movesUsed}\nTime: ${(victoryData.time / 1000).toFixed(1)}s${nextLevelText}`
                );
            } catch (error) {
                console.error('Error setting victory text:', error);
                // Recreate the victory text if it's corrupted
                this.createVictoryUI();
                if (this.victoryText) {
                    this.victoryText.setText(
                        `🎉 LEVEL ${victoryData.level} COMPLETE! 🎉\n\nScore: ${victoryData.score}\nTarget: ${victoryData.targetScore}\nMoves Used: ${victoryData.movesUsed}\nTime: ${(victoryData.time / 1000).toFixed(1)}s${nextLevelText}`
                    );
                }
            }
        } else {
            // Create victory UI if it doesn't exist
            this.createVictoryUI();
            if (this.victoryText) {
                this.victoryText.setText(
                    `🎉 LEVEL ${victoryData.level} COMPLETE! 🎉\n\nScore: ${victoryData.score}\nTarget: ${victoryData.targetScore}\nMoves Used: ${victoryData.movesUsed}\nTime: ${(victoryData.time / 1000).toFixed(1)}s${nextLevelText}`
                );
            }
        }
        
        if (this.victoryOverlay) this.victoryOverlay.setVisible(true);
        if (this.victoryPanel) this.victoryPanel.setVisible(true);
        if (this.victoryText) this.victoryText.setVisible(true);
        
        // Show/hide next level button based on whether there are more levels
        if (this.nextLevelButton && this.nextLevelButtonText) {
            if (victoryData.nextLevelUnlocked) {
                this.nextLevelButton.setVisible(true);
                this.nextLevelButtonText.setVisible(true);
                this.nextLevelButtonText.setText('NEXT LEVEL');
            } else {
                this.nextLevelButton.setVisible(true);
                this.nextLevelButtonText.setVisible(true);
                this.nextLevelButtonText.setText('PLAY AGAIN');
            }
        }
        
        console.log('Victory handled with transition data:', victoryData);
    }
    
    /**
     * Handle defeat condition with restart option
     * @param {Object} defeatData - Defeat data from GameState
     */
    handleDefeatWithRestart(defeatData) {
        this.setGameState('animating'); // Prevent further input
        
        // Update status text if it exists
        if (this.statusText) {
            this.statusText.setText('💀 GAME OVER 💀');
            this.statusText.setColor('#e74c3c');
        }
        
        // Use HTML overlay instead of Phaser overlay
        if (window.UIManager) {
            const defeatDisplayData = {
                score: this.gameStateManager.currentScore,
                target: this.gameStateManager.targetScore
            };
            
            window.UIManager.showDefeat(defeatDisplayData);
        }
        
        // Keep legacy Phaser overlay for backward compatibility (but don't show it)
        if (!this.defeatOverlay) {
            // Create but don't display - HTML overlay takes precedence
            this.defeatOverlay = this.add.rectangle(
                this.scale.width / 2,
                this.scale.height / 2,
                this.scale.width,
                this.scale.height,
                0x000000,
                0.8
            ).setDepth(1000).setVisible(false);
            
            this.defeatPanel = this.add.rectangle(
                this.scale.width / 2,
                this.scale.height / 2,
                400,
                350,
                window.COLORS?.danger || 0xe74c3c
            ).setStrokeStyle(3, window.COLORS?.textLight || 0xecf0f1).setDepth(1001).setVisible(false);
            
            this.defeatText = this.add.text(
                this.scale.width / 2,
                this.scale.height / 2,
                '',
                {
                    fontSize: '20px',
                    fontFamily: 'Rubik, Arial, sans-serif',
                    color: '#ffffff',
                    align: 'center',
                    fontStyle: 'bold',
                    lineSpacing: 8
                }
            ).setOrigin(0.5, 0.5).setDepth(1002);
        }
        
        // Update defeat text with detailed stats
        this.defeatText.setText(
            `💀 GAME OVER 💀\n\nScore: ${defeatData.score}\nTarget: ${defeatData.targetScore}\nProgress: ${defeatData.scoreProgress.toFixed(1)}%\nTime: ${(defeatData.time / 1000).toFixed(1)}s\n\nClick to restart level`
        );
        
        this.defeatOverlay.setVisible(true);
        this.defeatPanel.setVisible(true);
        this.defeatText.setVisible(true);
        
        // Add click handler for restart
        this.defeatOverlay.setInteractive().on('pointerdown', () => {
            this.gameStateManager.restartLevel();
        });
        
        console.log('Defeat handled with restart option:', defeatData);
    }
    
    /**
     * Handle all levels completed
     * @param {Object} completionData - Completion data from GameState
     */
    handleAllLevelsCompleted(completionData) {
        console.log('All levels completed!', completionData);
        if (this.statusText) {
            this.statusText.setText('🏆 ALL LEVELS COMPLETED! 🏆');
            this.statusText.setColor('#f1c40f');
        }
        
        // Could show a special completion screen here
        // For now, just log the achievement
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
            
            // Update HTML UI current word display
            if (window.UIManager) {
                window.UIManager.showCurrentWord(word.toUpperCase());
            }
            
            // Keep Phaser status text for backward compatibility
            if (this.statusText) {
                this.statusText.setText(`Current word: "${word.toUpperCase()}"`);
                this.statusText.setColor('#3498db');
            }
        } else {
            // Clear HTML UI current word display
            if (window.UIManager) {
                window.UIManager.showCurrentWord('');
            }
            
            // Keep Phaser status text for backward compatibility
            if (this.statusText) {
                this.statusText.setText('Select tiles to form words!');
                this.statusText.setColor('#7f8c8d');
            }
        }
    }

    /**
     * Create victory UI elements
     */
    createVictoryUI() {
        // Only create if they don't already exist
        if (!this.victoryOverlay || !this.victoryOverlay.active) {
            // Dark background overlay
            this.victoryOverlay = this.add.rectangle(
                this.scale.width / 2,
                this.scale.height / 2,
                this.scale.width,
                this.scale.height,
                0x000000,
                0.8
            ).setDepth(1000).setVisible(false);
        }
        
        if (!this.victoryPanel || !this.victoryPanel.active) {
            // Victory panel (from style guide)
            this.victoryPanel = this.add.rectangle(
                this.scale.width / 2,
                this.scale.height / 2,
                400,
                350,
                window.COLORS?.success || 0x27ae60
            ).setStrokeStyle(3, window.COLORS?.textLight || 0xecf0f1)
             .setDepth(1001).setVisible(false);
        }
        
        if (!this.victoryText || !this.victoryText.active) {
            // Victory text with better styling
            this.victoryText = this.add.text(
                this.scale.width / 2,
                this.scale.height / 2,
                '',
                {
                    fontSize: '20px',
                    fontFamily: 'Rubik, Arial, sans-serif',
                    color: '#ffffff',
                    align: 'center',
                    fontStyle: 'bold',
                    lineSpacing: 8
                }
            ).setOrigin(0.5, 0.5).setDepth(1002).setVisible(false);
        }
        
        if (!this.nextLevelButton || !this.nextLevelButton.active) {
            // Next Level button
            this.nextLevelButton = this.add.rectangle(
                this.scale.width / 2,
                this.scale.height / 2 + 120,
                200,
                50,
                window.COLORS?.primary || 0x3498db
            ).setStrokeStyle(2, window.COLORS?.textLight || 0xecf0f1)
             .setDepth(1003).setVisible(false)
             .setInteractive({ useHandCursor: true });
        }
        
        if (!this.nextLevelButtonText || !this.nextLevelButtonText.active) {
            this.nextLevelButtonText = this.add.text(
                this.scale.width / 2,
                this.scale.height / 2 + 120,
                'NEXT LEVEL',
                {
                    fontSize: '18px',
                    fontFamily: 'Rubik, Arial, sans-serif',
                    color: '#ffffff',
                    fontStyle: 'bold'
                }
            ).setOrigin(0.5, 0.5).setDepth(1004).setVisible(false);
        }
        
        // Set up button interactions
        if (this.nextLevelButton && this.nextLevelButton.active) {
            // Clear existing listeners to avoid duplicates
            this.nextLevelButton.removeAllListeners();
            
            // Button hover effects
            this.nextLevelButton.on('pointerover', () => {
                this.nextLevelButton.setFillStyle(window.COLORS?.primaryHover || 0x2980b9);
            });
            
            this.nextLevelButton.on('pointerout', () => {
                this.nextLevelButton.setFillStyle(window.COLORS?.primary || 0x3498db);
            });
            
            // Button click handler
            this.nextLevelButton.on('pointerdown', () => {
                this.handleNextLevelClick();
            });
        }
    }

    /**
     * Handle next level button click
     */
    /**
     * Handle next level button click from HTML UI
     */
    handleNextLevel() {
        this.handleNextLevelClick();
    }
    
    /**
     * Handle restart level button click from HTML UI
     */
    restartLevel() {
        if (this.gameStateManager) {
            this.gameStateManager.restartLevel();
        }
    }
    
    handleNextLevelClick() {
        // Hide victory modal
        if (this.victoryOverlay) this.victoryOverlay.setVisible(false);
        if (this.victoryPanel) this.victoryPanel.setVisible(false);
        if (this.victoryText) this.victoryText.setVisible(false);
        if (this.nextLevelButton) this.nextLevelButton.setVisible(false);
        if (this.nextLevelButtonText) this.nextLevelButtonText.setVisible(false);
        
        // Trigger level transition through GameState
        if (this.gameStateManager) {
            this.gameStateManager.transitionToNextLevel();
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
                break;
            case 'animating':
                this.inputSystem.setEnabled(false);
                this.grid.clearSelection();
                break;
        }
        
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
        // this.updateDebugInfo(); // Commented out - using HTML UI layer instead
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
        if (!this.scoreSystem || !this.gameStateManager) return;
        
        // Use GameState for authoritative data
        const currentScore = this.gameStateManager.currentScore;
        const targetScore = this.gameStateManager.targetScore;
        const movesRemaining = this.gameStateManager.movesRemaining;
        const maxMoves = this.gameStateManager.maxMoves;
        
        // Update HTML UI layer instead of Phaser UI
        if (window.UIManager) {
            window.UIManager.updateScore(currentScore, targetScore);
            window.UIManager.updateMoves(movesRemaining, maxMoves);
        }
        
        // Keep Phaser UI elements for backward compatibility (if they exist)
        if (this.scoreText) {
            this.scoreText.setText(currentScore.toString());
        }
        if (this.targetText) {
            this.targetText.setText(`Target: ${targetScore}`);
        }
        if (this.movesText) {
            this.movesText.setText(movesRemaining.toString());
            
            // Change moves color based on remaining moves
            if (movesRemaining <= 3) {
                this.movesText.setColor('#e74c3c'); // Red when low
            } else if (movesRemaining <= 6) {
                this.movesText.setColor('#f39c12'); // Orange when medium
            } else {
                this.movesText.setColor('#3498db'); // Blue when plenty
            }
        }
        if (this.levelText) {
            this.levelText.setText(`LEVEL ${this.currentLevel}`);
        }
        
        // Update progress bar using new method (if exists) - commented out, using HTML UI layer instead
        /*
        if (this.updateProgressBar) {
            const progress = this.gameStateManager.getScoreProgress();
            this.updateProgressBar(progress / 100); // Convert percentage to 0-1 range
        }
        */
        
        // Sync local variables with GameState
        this.movesRemaining = this.gameStateManager.movesRemaining;
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
     * Set up visibility change handlers to fix input issues when tab switching
     */
    setupVisibilityHandlers() {
        // Create handler functions that we can reference later for cleanup
        this.visibilityChangeHandler = () => {
            if (document.visibilityState === 'visible') {
                // CRITICAL FIX: Make sure the scene is active and resumed
                if (this.scene.isPaused()) {
                    this.scene.resume();
                }
                
                // Slightly delay reset to ensure DOM is ready after visibility change
                setTimeout(() => {
                    // Always recreate the input system on tab focus as the most reliable fix
                    this.recreateInputSystem();
                    
                    // Check if game is stuck in 'animating' state
                    if (this.gameState === 'animating') {
                        console.log('🔍 ROOT CAUSE: Game stuck in "animating" state - forcing to "playing" state');
                        
                        // Force game state to 'playing' which will enable input
                        this.setGameState('playing');
                        
                        // Reset EffectsQueue if it's stuck
                        if (this.effectsQueue) {
                            console.log('🔍 Resetting EffectsQueue state');
                            this.effectsQueue.isProcessing = false;
                            this.effectsQueue.currentEffect = null;
                            this.effectsQueue.clearQueue();
                            
                            // Manually emit queue-empty event to ensure proper state transition
                            this.effectsQueue.events.emit('queue-empty');
                        }
                    }
                    
                    // Still run the regular reset after recreation
                    this.resetPhaser();
                    
                    // Force a second reset after a short delay to catch edge cases
                    setTimeout(() => {
                        this.resetPhaser(true);
                    }, 300);
                }, 100);
            } else {
                console.log('🔍 TAB BLUR: Page hidden - pausing scene');
                // Pause the scene when the tab is not visible
                this.scene.pause();
                
                // If we have an active tracing, force end it to avoid stuck states
                if (this.inputSystem && this.inputSystem.isCurrentlyTracing()) {
                    this.inputSystem.endTrace();
                }
            }
        };
        
        // Handle window blur/focus events as backup
        this.windowBlurHandler = () => {
            console.log('🔍 WINDOW BLUR: Window lost focus');
            this.scene.pause();
            
            // If we have an active tracing, force end it to avoid stuck states
            if (this.inputSystem && this.inputSystem.isCurrentlyTracing()) {
                this.inputSystem.endTrace();
            }
        };
        
        this.windowFocusHandler = () => {
            // CRITICAL FIX: Make sure the scene is active and resumed
            if (this.scene.isPaused()) {
                this.scene.resume();
            }
            
            // Slightly delay reset to ensure DOM is ready
            setTimeout(() => {
                // Always recreate the input system on window focus as the most reliable fix
                this.recreateInputSystem();
                
                // Check if game is stuck in 'animating' state
                if (this.gameState === 'animating') {
                    console.log('🔍 ROOT CAUSE: Game stuck in "animating" state - forcing to "playing" state');
                    
                    // Force game state to 'playing' which will enable input
                    this.setGameState('playing');
                    
                    // Reset EffectsQueue if it's stuck
                    if (this.effectsQueue) {
                        console.log('🔍 Resetting EffectsQueue state');
                        this.effectsQueue.isProcessing = false;
                        this.effectsQueue.currentEffect = null;
                        this.effectsQueue.clearQueue();
                        
                        // Manually emit queue-empty event to ensure proper state transition
                        this.effectsQueue.events.emit('queue-empty');
                    }
                }
                
                // Still run the regular reset after recreation
                this.resetPhaser();
                
                // Force a second reset after a short delay to catch edge cases
                setTimeout(() => {
                    this.resetPhaser(true);
                }, 300);
            }, 100);
        };
        
        // Add the event listeners
        document.addEventListener('visibilitychange', this.visibilityChangeHandler);
        window.addEventListener('blur', this.windowBlurHandler);
        window.addEventListener('focus', this.windowFocusHandler);
        
        // Create a function to attempt resetting input periodically
        this.resetInputInterval = setInterval(() => {
            if (document.visibilityState === 'visible' &&
                this.game &&
                this.game.isRunning &&
                this.scene.isActive()) {
                this.resetPhaser(true); // quiet mode for interval checks
            }
        }, 5000); // Check every 5 seconds
        
        // Add game-specific event listener to handle resuming
        this.gameResumeHandler = () => {
            // CRITICAL FIX: Make sure the scene is active and resumed
            if (this.scene.isPaused()) {
                this.scene.resume();
            }
            
            // Always recreate the input system on game resume as the most reliable fix
            this.recreateInputSystem();
            
            // Check if game is stuck in 'animating' state
            if (this.gameState === 'animating') {
                console.log('🔍 ROOT CAUSE: Game stuck in "animating" state - forcing to "playing" state');
                
                // Force game state to 'playing' which will enable input
                this.setGameState('playing');
                
                // Reset EffectsQueue if it's stuck
                if (this.effectsQueue) {
                    console.log('🔍 Resetting EffectsQueue state');
                    this.effectsQueue.isProcessing = false;
                    this.effectsQueue.currentEffect = null;
                    this.effectsQueue.clearQueue();
                    
                    // Manually emit queue-empty event to ensure proper state transition
                    this.effectsQueue.events.emit('queue-empty');
                }
            }
            
            // Still run the regular reset after recreation
            this.resetPhaser();
        };
        this.game.events.on('resume', this.gameResumeHandler);
        
        console.log('Visibility change handlers set up');
    }
    
    /**
     * Reset all Phaser input systems
     * @param {boolean} quiet - If true, suppress console logs
     */
    resetPhaser(quiet = false) {
        try {
            // Check if game is stuck in 'animating' state
            if (this.gameState === 'animating') {
                // Force game state to 'playing' which will enable input
                this.setGameState('playing');
                
                // Reset EffectsQueue if it's stuck
                if (this.effectsQueue) {
                    this.effectsQueue.isProcessing = false;
                    this.effectsQueue.currentEffect = null;
                    this.effectsQueue.clearQueue();
                    
                    // Manually emit queue-empty event to ensure proper state transition
                    this.effectsQueue.events.emit('queue-empty');
                }
            }
            
            // Resume the scene if it was paused
            if (this.scene.isPaused()) {
                this.scene.resume();
            }
            
            // Reset our custom input system
            if (this.inputSystem) {
                this.inputSystem.reset();
                this.inputSystem.setEnabled(true);
                
                // Explicitly call reRegisterInputEvents to fix focus issues
                this.inputSystem.reRegisterInputEvents();
            }
            
            // Reset Phaser's internal input system
            if (this.input && this.input.manager) {
                // Re-enable the entire input manager
                this.input.enabled = true;
                this.input.manager.enabled = true;
                
                // Enable mouse and touch input if they exist
                if (this.input.mouse) this.input.mouse.enabled = true;
                if (this.input.touch) this.input.touch.enabled = true;
                if (this.input.keyboard) this.input.keyboard.enabled = true;
                
                // Reset the active pointer
                if (this.input.activePointer) {
                    this.input.activePointer.reset();
                }
                
                // Reset all pointers in the manager
                this.input.manager.pointers.forEach(pointer => {
                    pointer.reset();
                });
                
                // Reset all interactive objects in the scene - Very important for focus issues
                this.children.list.forEach(child => {
                    if (child.input) {
                        child.input.enabled = true;
                    }
                });
            }
            
            // Reset any disabled input components on tiles
            if (this.grid) {
                this.grid.getAllTiles().forEach(tile => {
                    if (tile.input) {
                        tile.input.enabled = true;
                    }
                });
            }
            
            // Set game state to playing if needed
            if (this.gameState !== 'playing' && !this.scene.isPaused()) {
                this.setGameState('playing');
            }
        } catch (error) {
            console.error('Error during Phaser reset:', error);
        }
    }
    
    /**
     * Force input system reset - utility function that can be called
     * from the console for debugging or triggered by game events
     * Implements a comprehensive reset of all input-related systems
     */
    /**
     * Completely recreate the input system from scratch
     * This is a last resort for fixing input issues after focus changes
     */
    recreateInputSystem() {
        try {
            // First destroy the existing input system if it exists
            if (this.inputSystem) {
                this.inputSystem.destroy();
                this.inputSystem = null;
            }
            
            // Reset Phaser's internal input system first
            if (this.input && this.input.manager) {
                // Re-enable the entire input manager
                this.input.enabled = true;
                this.input.manager.enabled = true;
                
                // Reset all pointers
                this.input.manager.pointers.forEach(pointer => {
                    pointer.reset();
                });
                
                // Make sure all input types are enabled
                if (this.input.mouse) this.input.mouse.enabled = true;
                if (this.input.touch) this.input.touch.enabled = true;
                if (this.input.keyboard) this.input.keyboard.enabled = true;
            }
            
            // Create a new input system
            this.inputSystem = new InputSystem(this, this.grid);
            this.registry.set('inputSystem', this.inputSystem);
            
            // Force re-registration of input events
            this.inputSystem.reRegisterInputEvents();
        } catch (error) {
            console.error('Error recreating input system:', error);
        }
    }
    
    forceInputReset() {
        console.log('🛠️ FORCE INPUT RESET: Performing emergency input system reset');
        
        try {
            // First ensure the scene is active and resumed
            if (this.scene.isPaused()) {
                this.scene.resume();
            }
            
            // Reset our custom input system completely
            if (this.inputSystem) {
                // End any active trace
                if (this.inputSystem.isCurrentlyTracing()) {
                    this.inputSystem.endTrace();
                }
                
                // Full reset of the input system state
                this.inputSystem.reset();
                this.inputSystem.setEnabled(true);
            }
            
            // Thorough reset of Phaser's input system
            if (this.input) {
                // Re-enable all input components
                this.input.enabled = true;
                
                if (this.input.manager) {
                    this.input.manager.enabled = true;
                    
                    // Clear any active pointers
                    this.input.manager.pointers.forEach(pointer => {
                        pointer.reset();
                        pointer.active = false;
                        pointer.dirty = false;
                    });
                }
                
                // Reset all input types
                if (this.input.mouse) {
                    this.input.mouse.enabled = true;
                    if (this.input.mouse.locked) {
                        this.input.mouse.releasePointerLock();
                    }
                }
                if (this.input.touch) this.input.touch.enabled = true;
                if (this.input.keyboard) this.input.keyboard.enabled = true;
                
                // Reset active pointer
                if (this.input.activePointer) {
                    this.input.activePointer.reset();
                    this.input.activePointer.updateWorldPoint(this.cameras.main);
                }
            }
            
            // Reset all interactive objects in the scene
            this.children.list.forEach(child => {
                if (child.input) {
                    child.input.enabled = true;
                    child.input.dragState = 0;
                    child.input.cursor = null;
                }
            });
            
            // Reset all tile inputs
            if (this.grid) {
                this.grid.getAllTiles().forEach(tile => {
                    if (tile.input) {
                        tile.input.enabled = true;
                    }
                    tile.setSelected(false);
                    tile.setHighlighted(false);
                });
            }
            
            console.log('🛠️ FORCE INPUT RESET: Complete');
        } catch (error) {
            console.error('Error during force input reset:', error);
        }
        
        return 'Input system reset complete'; // For console usage feedback
    }
    
    /**
     * Create a debug button to fix input issues
     * This adds a button to the bottom-right corner that users can click
     * to force a complete input system reset if they encounter issues
     */
    createDebugButton() {
        // Create a button element
        const button = document.createElement('button');
        button.textContent = 'Fix Input';
        button.style.position = 'fixed';
        button.style.bottom = '10px';
        button.style.right = '10px';
        button.style.zIndex = '1000';
        button.style.padding = '8px 12px';
        button.style.backgroundColor = '#e74c3c';
        button.style.color = 'white';
        button.style.border = 'none';
        button.style.borderRadius = '4px';
        button.style.fontWeight = 'bold';
        button.style.cursor = 'pointer';
        button.style.display = 'none'; // Hidden by default
        
        // Add click handler
        button.addEventListener('click', () => {
            console.log('🔧 DEBUG BUTTON: User clicked fix input button');
            this.recreateInputSystem();
            this.resetPhaser();
            
            // Force game state to playing
            if (this.gameState !== 'playing') {
                this.setGameState('playing');
            }
            
            // Flash the button to indicate it worked
            button.textContent = 'Fixed!';
            setTimeout(() => {
                button.textContent = 'Fix Input';
            }, 1000);
        });
        
        // Add to document
        document.body.appendChild(button);
        this.debugButton = button;
        
        // Show the button when focus changes
        window.addEventListener('focus', () => {
            button.style.display = 'block';
            
            // Auto-hide after 10 seconds
            setTimeout(() => {
                button.style.display = 'none';
            }, 10000);
        });
        
        // Also add keyboard shortcut (Ctrl+Shift+R)
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.shiftKey && e.key === 'R') {
                console.log('🔧 DEBUG SHORTCUT: User pressed Ctrl+Shift+R');
                this.recreateInputSystem();
                this.resetPhaser();
                
                // Force game state to playing
                if (this.gameState !== 'playing') {
                    this.setGameState('playing');
                }
                
                // Show feedback
                if (this.debugButton) {
                    this.debugButton.style.display = 'block';
                    this.debugButton.textContent = 'Fixed!';
                    setTimeout(() => {
                        this.debugButton.textContent = 'Fix Input';
                        this.debugButton.style.display = 'none';
                    }, 2000);
                }
                
                // Prevent browser refresh
                e.preventDefault();
            }
        });
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
        
        // Clean up visibility change handlers
        document.removeEventListener('visibilitychange', this.visibilityChangeHandler);
        window.removeEventListener('blur', this.windowBlurHandler);
        window.removeEventListener('focus', this.windowFocusHandler);
        
        // Remove game event handlers
        if (this.game && this.game.events) {
            this.game.events.off('resume', this.gameResumeHandler);
        }
        
        // Clear reset interval
        if (this.resetInputInterval) {
            clearInterval(this.resetInputInterval);
            this.resetInputInterval = null;
        }
        
        // Remove debug button if it exists
        if (this.debugButton && this.debugButton.parentNode) {
            this.debugButton.parentNode.removeChild(this.debugButton);
            this.debugButton = null;
        }
        
        if (this.gameStateManager) {
            // GameState doesn't need explicit destroy, but save progress
            this.gameStateManager.saveProgress();
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