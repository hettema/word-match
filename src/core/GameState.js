/**
 * GameState.js - Level Progression & Victory Conditions System
 * Manages game state, level progression, victory/failure conditions, and progress persistence
 */

class GameState {
    constructor(scene) {
        this.scene = scene;
        this.currentLevel = 1;
        this.maxUnlockedLevel = 1;
        this.gameStatus = 'playing'; // 'playing', 'victory', 'defeat', 'transitioning'
        
        // Game session data
        this.currentScore = 0;
        this.targetScore = 0;
        this.movesRemaining = 0;
        this.maxMoves = 0;
        this.levelStartTime = 0;
        
        // Progress tracking
        this.levelStats = {};
        this.totalPlayTime = 0;
        this.totalWordsFormed = 0;
        this.totalScore = 0;
        
        // Level transition settings
        this.transitionDelay = 2000; // 2 seconds before auto-transition
        this.autoTransition = true;
        
        // Load saved progress
        this.loadProgress();
        
        console.log('GameState initialized');
    }
    
    /**
     * Initialize a new level
     * @param {number} levelId - Level ID to initialize
     * @param {Object} levelConfig - Level configuration
     */
    async initializeLevel(levelId, levelConfig) {
        try {
            this.currentLevel = levelId;
            this.targetScore = levelConfig.targetScore;
            this.maxMoves = levelConfig.moves;
            this.movesRemaining = levelConfig.moves;
            this.currentScore = 0;
            this.gameStatus = 'playing';
            this.levelStartTime = Date.now();
            
            // Initialize level stats if not exists
            if (!this.levelStats[levelId]) {
                this.levelStats[levelId] = {
                    attempts: 0,
                    victories: 0,
                    bestScore: 0,
                    bestTime: null,
                    totalPlayTime: 0
                };
            }
            
            this.levelStats[levelId].attempts++;
            
            console.log(`Level ${levelId} initialized: Target ${this.targetScore}, Moves ${this.maxMoves}`);
            
            // Update UI
            this.updateGameStateUI();
            
        } catch (error) {
            console.error('Failed to initialize level:', error);
            throw error;
        }
    }
    
    /**
     * Update score and check for victory condition
     * @param {number} points - Points to add
     * @param {Object} scoreData - Additional score data
     */
    updateScore(points, scoreData = {}) {
        if (this.gameStatus !== 'playing') return;
        
        this.currentScore += points;
        
        // Check for victory condition
        if (this.currentScore >= this.targetScore) {
            this.handleVictory();
        }
        
        console.log(`Score updated: ${this.currentScore}/${this.targetScore} (${this.getScoreProgress().toFixed(1)}%)`);
    }
    
    /**
     * Use a move and check for defeat condition
     */
    useMove() {
        if (this.gameStatus !== 'playing') return;
        
        this.movesRemaining = Math.max(0, this.movesRemaining - 1);
        
        // Emit move update event
        this.scene.events.emit('moveUsed', {
            movesRemaining: this.movesRemaining,
            maxMoves: this.maxMoves,
            movesUsed: this.maxMoves - this.movesRemaining
        });
        
        // Check for defeat condition
        if (this.movesRemaining <= 0 && this.currentScore < this.targetScore) {
            this.handleDefeat();
        }
        
        console.log(`Move used: ${this.movesRemaining}/${this.maxMoves} remaining`);
        
        // Update UI
        this.updateGameStateUI();
    }
    
    /**
     * Handle victory condition
     */
    handleVictory() {
        if (this.gameStatus !== 'playing') return;
        
        this.gameStatus = 'victory';
        const levelTime = Date.now() - this.levelStartTime;
        
        // Update level stats
        const stats = this.levelStats[this.currentLevel];
        stats.victories++;
        stats.totalPlayTime += levelTime;
        
        if (this.currentScore > stats.bestScore) {
            stats.bestScore = this.currentScore;
        }
        
        if (!stats.bestTime || levelTime < stats.bestTime) {
            stats.bestTime = levelTime;
        }
        
        // Update total stats
        this.totalScore += this.currentScore;
        this.totalPlayTime += levelTime;
        
        // Unlock next level
        const nextLevel = this.currentLevel + 1;
        if (nextLevel > this.maxUnlockedLevel) {
            this.maxUnlockedLevel = nextLevel;
            console.log(`Level ${nextLevel} unlocked!`);
        }
        
        // Save progress
        this.saveProgress();
        
        // Emit victory event
        this.scene.events.emit('levelVictory', {
            level: this.currentLevel,
            score: this.currentScore,
            targetScore: this.targetScore,
            movesUsed: this.maxMoves - this.movesRemaining,
            time: levelTime,
            nextLevelUnlocked: nextLevel <= this.getMaxAvailableLevel()
        });
        
        console.log(`Victory! Level ${this.currentLevel} completed with score ${this.currentScore}`);
        
        // Auto-transition to next level or level select
        if (this.autoTransition) {
            this.scheduleTransition();
        }
    }
    
    /**
     * Handle defeat condition
     */
    handleDefeat() {
        if (this.gameStatus !== 'playing') return;
        
        this.gameStatus = 'defeat';
        const levelTime = Date.now() - this.levelStartTime;
        
        // Update level stats
        const stats = this.levelStats[this.currentLevel];
        stats.totalPlayTime += levelTime;
        
        // Update total stats
        this.totalPlayTime += levelTime;
        
        // Save progress
        this.saveProgress();
        
        // Emit defeat event
        this.scene.events.emit('levelDefeat', {
            level: this.currentLevel,
            score: this.currentScore,
            targetScore: this.targetScore,
            movesUsed: this.maxMoves,
            time: levelTime,
            scoreProgress: this.getScoreProgress()
        });
        
        console.log(`Defeat! Level ${this.currentLevel} failed with score ${this.currentScore}/${this.targetScore}`);
    }
    
    /**
     * Schedule automatic transition to next level or menu
     */
    scheduleTransition() {
        this.scene.time.delayedCall(this.transitionDelay, () => {
            if (this.gameStatus === 'victory') {
                this.transitionToNextLevel();
            }
        });
    }
    
    /**
     * Transition to next level or back to level select
     */
    async transitionToNextLevel() {
        const nextLevel = this.currentLevel + 1;
        const maxLevel = this.getMaxAvailableLevel();
        
        if (nextLevel <= maxLevel) {
            // Load next level
            this.gameStatus = 'transitioning';
            
            try {
                // Emit transition start event
                this.scene.events.emit('levelTransitionStart', {
                    fromLevel: this.currentLevel,
                    toLevel: nextLevel
                });
                
                // Load next level configuration
                const levelConfig = await LevelLoader.load(nextLevel);
                
                // Restart scene with new level
                this.scene.scene.restart({ level: nextLevel });
                
            } catch (error) {
                console.error('Failed to transition to next level:', error);
                this.gameStatus = 'victory'; // Reset to victory state
            }
        } else {
            // All levels completed - show completion screen or return to menu
            this.scene.events.emit('allLevelsCompleted', {
                totalScore: this.totalScore,
                totalTime: this.totalPlayTime,
                levelsCompleted: this.maxUnlockedLevel - 1
            });
        }
    }
    
    /**
     * Restart current level
     */
    restartLevel() {
        this.scene.scene.restart({ level: this.currentLevel });
    }
    
    /**
     * Get score progress as percentage
     * @returns {number} Progress percentage (0-100)
     */
    getScoreProgress() {
        if (this.targetScore <= 0) return 0;
        return Math.min(100, (this.currentScore / this.targetScore) * 100);
    }
    
    /**
     * Get moves progress as percentage
     * @returns {number} Progress percentage (0-100)
     */
    getMovesProgress() {
        if (this.maxMoves <= 0) return 0;
        return ((this.maxMoves - this.movesRemaining) / this.maxMoves) * 100;
    }
    
    /**
     * Get maximum available level (from configuration)
     * @returns {number} Maximum level ID
     */
    getMaxAvailableLevel() {
        // This should be loaded from level configuration
        // For now, return 5 based on levels.json
        return 5;
    }
    
    /**
     * Check if a level is unlocked
     * @param {number} levelId - Level ID to check
     * @returns {boolean} True if level is unlocked
     */
    isLevelUnlocked(levelId) {
        return levelId <= this.maxUnlockedLevel;
    }
    
    /**
     * Get level statistics
     * @param {number} levelId - Level ID (optional, defaults to current)
     * @returns {Object} Level statistics
     */
    getLevelStats(levelId = this.currentLevel) {
        return this.levelStats[levelId] || {
            attempts: 0,
            victories: 0,
            bestScore: 0,
            bestTime: null,
            totalPlayTime: 0
        };
    }
    
    /**
     * Get overall game statistics
     * @returns {Object} Overall statistics
     */
    getOverallStats() {
        return {
            currentLevel: this.currentLevel,
            maxUnlockedLevel: this.maxUnlockedLevel,
            totalScore: this.totalScore,
            totalPlayTime: this.totalPlayTime,
            totalWordsFormed: this.totalWordsFormed,
            levelsCompleted: Math.max(0, this.maxUnlockedLevel - 1),
            totalAttempts: Object.values(this.levelStats).reduce((sum, stats) => sum + stats.attempts, 0),
            totalVictories: Object.values(this.levelStats).reduce((sum, stats) => sum + stats.victories, 0)
        };
    }
    
    /**
     * Update game state UI elements
     */
    updateGameStateUI() {
        // Update HUD elements if they exist
        if (this.scene.scoreText) {
            this.scene.scoreText.setText(this.currentScore.toString());
        }
        
        if (this.scene.targetText) {
            this.scene.targetText.setText(`Target: ${this.targetScore}`);
        }
        
        if (this.scene.movesText) {
            this.scene.movesText.setText(this.movesRemaining.toString());
            
            // Color-code moves based on remaining count
            const movesRatio = this.movesRemaining / this.maxMoves;
            if (movesRatio > 0.5) {
                this.scene.movesText.setColor('#3498db'); // Blue - plenty of moves
            } else if (movesRatio > 0.25) {
                this.scene.movesText.setColor('#f39c12'); // Orange - getting low
            } else {
                this.scene.movesText.setColor('#e74c3c'); // Red - critical
            }
        }
        
        if (this.scene.levelText) {
            this.scene.levelText.setText(`LEVEL ${this.currentLevel}`);
        }
        
        // Update progress bar
        if (this.scene.updateProgressBar) {
            this.scene.updateProgressBar(this.getScoreProgress() / 100);
        }
    }
    
    /**
     * Save progress to localStorage
     */
    saveProgress() {
        try {
            const progressData = {
                maxUnlockedLevel: this.maxUnlockedLevel,
                levelStats: this.levelStats,
                totalScore: this.totalScore,
                totalPlayTime: this.totalPlayTime,
                totalWordsFormed: this.totalWordsFormed,
                lastPlayed: Date.now(),
                version: '1.0.0'
            };
            
            localStorage.setItem('wordCascadeProgress', JSON.stringify(progressData));
            console.log('Progress saved to localStorage');
            
        } catch (error) {
            console.error('Failed to save progress:', error);
        }
    }
    
    /**
     * Load progress from localStorage
     */
    loadProgress() {
        try {
            const savedData = localStorage.getItem('wordCascadeProgress');
            if (!savedData) {
                console.log('No saved progress found');
                return;
            }
            
            const progressData = JSON.parse(savedData);
            
            // Validate and load data
            if (progressData.version && progressData.maxUnlockedLevel) {
                this.maxUnlockedLevel = Math.max(1, progressData.maxUnlockedLevel);
                this.levelStats = progressData.levelStats || {};
                this.totalScore = progressData.totalScore || 0;
                this.totalPlayTime = progressData.totalPlayTime || 0;
                this.totalWordsFormed = progressData.totalWordsFormed || 0;
                
                console.log(`Progress loaded: Level ${this.maxUnlockedLevel} unlocked, Total score: ${this.totalScore}`);
            } else {
                console.log('Invalid progress data format');
            }
            
        } catch (error) {
            console.error('Failed to load progress:', error);
        }
    }
    
    /**
     * Reset all progress (for testing or new game)
     */
    resetProgress() {
        this.maxUnlockedLevel = 1;
        this.levelStats = {};
        this.totalScore = 0;
        this.totalPlayTime = 0;
        this.totalWordsFormed = 0;
        
        try {
            localStorage.removeItem('wordCascadeProgress');
            console.log('Progress reset');
        } catch (error) {
            console.error('Failed to reset progress:', error);
        }
    }
    
    /**
     * Export progress data for backup
     * @returns {string} JSON string of progress data
     */
    exportProgress() {
        const progressData = {
            maxUnlockedLevel: this.maxUnlockedLevel,
            levelStats: this.levelStats,
            totalScore: this.totalScore,
            totalPlayTime: this.totalPlayTime,
            totalWordsFormed: this.totalWordsFormed,
            exportDate: Date.now(),
            version: '1.0.0'
        };
        
        return JSON.stringify(progressData, null, 2);
    }
    
    /**
     * Import progress data from backup
     * @param {string} progressJson - JSON string of progress data
     */
    importProgress(progressJson) {
        try {
            const progressData = JSON.parse(progressJson);
            
            if (progressData.version && progressData.maxUnlockedLevel) {
                this.maxUnlockedLevel = progressData.maxUnlockedLevel;
                this.levelStats = progressData.levelStats || {};
                this.totalScore = progressData.totalScore || 0;
                this.totalPlayTime = progressData.totalPlayTime || 0;
                this.totalWordsFormed = progressData.totalWordsFormed || 0;
                
                this.saveProgress();
                console.log('Progress imported successfully');
                return true;
            } else {
                throw new Error('Invalid progress data format');
            }
            
        } catch (error) {
            console.error('Failed to import progress:', error);
            return false;
        }
    }
}

// Export for use in other modules (CommonJS)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GameState;
}

// Make available globally for script tag imports
if (typeof window !== 'undefined') {
    window.GameState = GameState;
}