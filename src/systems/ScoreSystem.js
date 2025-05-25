/**
 * ScoreSystem.js - Base scoring system implementation
 * Handles Scrabble-based tile values, word length bonuses, and score calculations
 */

class ScoreSystem {
    /**
     * Create a new scoring system
     * @param {Phaser.Scene} scene - The Phaser scene
     */
    constructor(scene) {
        this.scene = scene;
        this.currentScore = 0;
        this.targetScore = 0;
        this.settings = null;
        this.levelConfig = null;
        this.tileValues = null;
        
        this.initialize();
    }
    
    /**
     * Initialize the scoring system with configuration
     */
    initialize() {
        this.settings = this.scene.registry.get('settings');
        this.levelConfig = this.scene.registry.get('levelConfig');
        
        if (!this.settings) {
            console.warn('ScoreSystem: Settings not found, using defaults');
            this.settings = this.getDefaultSettings();
        }
        
        if (this.levelConfig) {
            this.targetScore = this.levelConfig.targetScore || 1000;
            this.loadTileValues();
        }
    }
    
    /**
     * Get default settings if not loaded
     * @returns {Object} Default scoring settings
     */
    getDefaultSettings() {
        return {
            scoring: {
                wordLengthBonus: {
                    "3": 0,
                    "4": 10,
                    "5": 20,
                    "6": 30,
                    "7": 50,
                    "8": 80,
                    "9": 120,
                    "10": 160,
                    "11": 200,
                    "12": 250,
                    "13": 300,
                    "14": 350,
                    "15": 400
                },
                cascadeMultiplier: 1.5,
                chainBonusBase: 100
            }
        };
    }
    
    /**
     * Load tile values from level configuration
     */
    loadTileValues() {
        if (!this.levelConfig || !this.levelConfig.tileDistribution) {
            console.warn('ScoreSystem: No tile distribution found, using default Scrabble values');
            this.tileValues = this.getDefaultTileValues();
            return;
        }
        
        // Extract tile values from distribution
        this.tileValues = {};
        const distribution = this.levelConfig.tileDistribution;
        
        for (const [letter, data] of Object.entries(distribution)) {
            this.tileValues[letter] = data.value;
        }
    }
    
    /**
     * Get default Scrabble tile values
     * @returns {Object} Default tile values
     */
    getDefaultTileValues() {
        return {
            'A': 1, 'B': 3, 'C': 3, 'D': 2, 'E': 1, 'F': 4, 'G': 2, 'H': 4,
            'I': 1, 'J': 8, 'K': 5, 'L': 1, 'M': 3, 'N': 1, 'O': 1, 'P': 3,
            'Q': 10, 'R': 1, 'S': 1, 'T': 1, 'U': 1, 'V': 4, 'W': 4, 'X': 8,
            'Y': 4, 'Z': 10
        };
    }
    
    /**
     * Calculate base score for a word
     * @param {Array<Tile>} tiles - Array of tiles forming the word
     * @returns {number} Base score for the word
     */
    calculateWordScore(tiles) {
        if (!tiles || tiles.length === 0) {
            return 0;
        }
        
        let baseScore = 0;
        
        // Sum up individual tile values
        for (const tile of tiles) {
            const letter = tile.letter.toUpperCase();
            const tileValue = this.getTileValue(letter);
            baseScore += tileValue;
        }
        
        // Apply word length bonus
        const wordLength = tiles.length;
        const lengthBonus = this.getWordLengthBonus(wordLength);
        
        const totalScore = baseScore + lengthBonus;
        
        // Emit scoring event for UI updates
        this.scene.events.emit('wordScored', {
            word: tiles.map(t => t.letter).join(''),
            baseScore: baseScore,
            lengthBonus: lengthBonus,
            totalScore: totalScore,
            tiles: tiles
        });
        
        return totalScore;
    }
    
    /**
     * Get tile value for a letter
     * @param {string} letter - The letter to get value for
     * @returns {number} Tile value
     */
    getTileValue(letter) {
        if (!this.tileValues) {
            this.loadTileValues();
        }
        
        return this.tileValues[letter.toUpperCase()] || 1;
    }
    
    /**
     * Get word length bonus
     * @param {number} length - Word length
     * @returns {number} Bonus points for word length
     */
    getWordLengthBonus(length) {
        const bonuses = this.settings.scoring.wordLengthBonus;
        const lengthStr = Math.min(length, 15).toString(); // Cap at 15
        return bonuses[lengthStr] || 0;
    }
    
    /**
     * Add score to current total
     * @param {number} points - Points to add
     */
    addScore(points) {
        if (points > 0) {
            this.currentScore += points;
            
            // Emit score update event
            this.scene.events.emit('scoreUpdated', {
                currentScore: this.currentScore,
                targetScore: this.targetScore,
                pointsAdded: points
            });
        }
    }
    
    /**
     * Process a completed word and add to score
     * @param {Array<Tile>} tiles - Tiles forming the word
     * @returns {number} Points scored
     */
    scoreWord(tiles) {
        const points = this.calculateWordScore(tiles);
        this.addScore(points);
        return points;
    }
    
    /**
     * Reset score to zero
     */
    resetScore() {
        this.currentScore = 0;
        this.scene.events.emit('scoreUpdated', {
            currentScore: this.currentScore,
            targetScore: this.targetScore,
            pointsAdded: 0
        });
    }
    
    /**
     * Set target score for the level
     * @param {number} target - Target score
     */
    setTargetScore(target) {
        this.targetScore = target;
        this.scene.events.emit('scoreUpdated', {
            currentScore: this.currentScore,
            targetScore: this.targetScore,
            pointsAdded: 0
        });
    }
    
    /**
     * Check if target score has been reached
     * @returns {boolean} True if target reached
     */
    hasReachedTarget() {
        return this.currentScore >= this.targetScore;
    }
    
    /**
     * Get current score
     * @returns {number} Current score
     */
    getCurrentScore() {
        return this.currentScore;
    }
    
    /**
     * Get target score
     * @returns {number} Target score
     */
    getTargetScore() {
        return this.targetScore;
    }
    
    /**
     * Get score progress as percentage
     * @returns {number} Progress percentage (0-100)
     */
    getProgress() {
        if (this.targetScore === 0) return 0;
        return Math.min((this.currentScore / this.targetScore) * 100, 100);
    }
    
    /**
     * Get detailed scoring breakdown for a word
     * @param {Array<Tile>} tiles - Tiles forming the word
     * @returns {Object} Detailed scoring information
     */
    getScoreBreakdown(tiles) {
        if (!tiles || tiles.length === 0) {
            return {
                word: '',
                tileScores: [],
                baseScore: 0,
                lengthBonus: 0,
                totalScore: 0
            };
        }
        
        const word = tiles.map(t => t.letter).join('');
        const tileScores = tiles.map(tile => ({
            letter: tile.letter,
            value: this.getTileValue(tile.letter)
        }));
        
        const baseScore = tileScores.reduce((sum, tile) => sum + tile.value, 0);
        const lengthBonus = this.getWordLengthBonus(tiles.length);
        const totalScore = baseScore + lengthBonus;
        
        return {
            word: word,
            tileScores: tileScores,
            baseScore: baseScore,
            lengthBonus: lengthBonus,
            totalScore: totalScore
        };
    }
    
    /**
     * Update configuration when level changes
     * @param {Object} newLevelConfig - New level configuration
     */
    updateLevelConfig(newLevelConfig) {
        this.levelConfig = newLevelConfig;
        if (newLevelConfig.targetScore) {
            this.setTargetScore(newLevelConfig.targetScore);
        }
        this.loadTileValues();
    }
    
    /**
     * Get scoring statistics
     * @returns {Object} Scoring statistics
     */
    getStats() {
        return {
            currentScore: this.currentScore,
            targetScore: this.targetScore,
            progress: this.getProgress(),
            hasReachedTarget: this.hasReachedTarget()
        };
    }
    
    /**
     * Destroy the scoring system and clean up
     */
    destroy() {
        // Clean up any event listeners if needed
        this.scene = null;
        this.settings = null;
        this.levelConfig = null;
        this.tileValues = null;
    }
}

// Make available globally for script tag imports
if (typeof window !== 'undefined') {
    window.ScoreSystem = ScoreSystem;
}

// Export for CommonJS if needed
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ScoreSystem };
}