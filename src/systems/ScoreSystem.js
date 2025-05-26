/**
 * ScoreSystem.js - Advanced scoring system implementation
 * Handles Scrabble-based tile values, word length bonuses, multipliers, chain bonuses, and cascade scoring
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
        
        // Advanced scoring tracking
        this.cascadeChainLength = 0;
        this.currentCascadeScore = 0;
        this.chainReactionCount = 0;
        this.cascadeMultiplierActive = false;
        
        // Best word tracking
        this.bestWord = '';
        this.bestWordScore = 0;
        
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
                chainBonusBase: 100,
                chainBonusMultiplier: 1.2,
                cascadeLengthBonus: 50,
                multiplierFactor: 2.0,
                maxChainBonus: 1000
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
        let hasMultiplier = false;
        
        // Sum up individual tile values and check for multiplier tiles
        for (const tile of tiles) {
            const letter = tile.letter.toUpperCase();
            const tileValue = this.getTileValue(letter);
            baseScore += tileValue;
            
            // Check if this tile is a multiplier tile
            if (tile.type === TILE_TYPES.MULTIPLIER) {
                hasMultiplier = true;
            }
        }
        
        // Apply word length bonus
        const wordLength = tiles.length;
        const lengthBonus = this.getWordLengthBonus(wordLength);
        
        let totalScore = baseScore + lengthBonus;
        
        // Apply multiplier if any multiplier tiles were used
        let multiplierBonus = 0;
        if (hasMultiplier) {
            const multiplierFactor = this.settings.scoring.multiplierFactor || 2.0;
            const originalScore = totalScore;
            totalScore = Math.floor(totalScore * multiplierFactor);
            multiplierBonus = totalScore - originalScore;
        }
        
        // Emit scoring event for UI updates
        this.scene.events.emit('wordScored', {
            word: tiles.map(t => t.letter).join(''),
            baseScore: baseScore,
            lengthBonus: lengthBonus,
            multiplierBonus: multiplierBonus,
            hasMultiplier: hasMultiplier,
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
        const word = tiles.map(t => t.letter).join('');
        
        // Track best word
        this.updateBestWord(word, points);
        
        this.addScore(points);
        return points;
    }
    
    /**
     * Reset score to zero
     */
    resetScore() {
        this.currentScore = 0;
        this.bestWord = '';
        this.bestWordScore = 0;
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
     * Start a new cascade sequence
     * Resets cascade tracking for chain bonus calculations
     */
    startCascadeSequence() {
        this.cascadeChainLength = 0;
        this.currentCascadeScore = 0;
        this.chainReactionCount = 0;
        this.cascadeMultiplierActive = true;
        
        console.log('Started new cascade sequence');
        
        // Emit cascade start event
        this.scene.events.emit('cascadeStarted', {
            chainLength: this.cascadeChainLength,
            chainCount: this.chainReactionCount
        });
    }
    
    /**
     * End the current cascade sequence and apply final bonuses
     */
    endCascadeSequence() {
        if (!this.cascadeMultiplierActive) return;
        
        const finalBonus = this.calculateCascadeBonus();
        
        if (finalBonus > 0) {
            this.addScore(finalBonus);
            
            // Emit cascade completion event with bonus details
            this.scene.events.emit('cascadeCompleted', {
                chainLength: this.cascadeChainLength,
                chainCount: this.chainReactionCount,
                cascadeScore: this.currentCascadeScore,
                finalBonus: finalBonus,
                totalBonus: this.currentCascadeScore + finalBonus
            });
        }
        
        // Reset cascade tracking
        this.cascadeChainLength = 0;
        this.currentCascadeScore = 0;
        this.chainReactionCount = 0;
        this.cascadeMultiplierActive = false;
        
        console.log(`Ended cascade sequence with ${finalBonus} bonus points`);
    }
    
    /**
     * Calculate cascade bonus based on chain length and reaction count
     * @returns {number} Cascade bonus points
     */
    calculateCascadeBonus() {
        if (this.cascadeChainLength <= 1 && this.chainReactionCount === 0) {
            return 0; // No bonus for single actions
        }
        
        const settings = this.settings.scoring;
        let bonus = 0;
        
        // Chain reaction bonus (exponential growth)
        if (this.chainReactionCount > 0) {
            const chainBase = settings.chainBonusBase || 100;
            const chainMultiplier = settings.chainBonusMultiplier || 1.2;
            const maxBonus = settings.maxChainBonus || 1000;
            
            bonus += Math.min(
                chainBase * Math.pow(chainMultiplier, this.chainReactionCount - 1),
                maxBonus
            );
        }
        
        // Cascade length bonus (linear growth)
        if (this.cascadeChainLength > 1) {
            const lengthBonus = settings.cascadeLengthBonus || 50;
            bonus += lengthBonus * (this.cascadeChainLength - 1);
        }
        
        // Apply cascade multiplier to total cascade score
        if (this.currentCascadeScore > 0) {
            const cascadeMultiplier = settings.cascadeMultiplier || 1.5;
            const multiplierBonus = Math.floor(this.currentCascadeScore * (cascadeMultiplier - 1));
            bonus += multiplierBonus;
        }
        
        return Math.floor(bonus);
    }
    
    /**
     * Record a chain reaction explosion
     * @param {Array<Tile>} explodedTiles - Tiles that exploded in this chain
     */
    recordChainReaction(explodedTiles) {
        if (!this.cascadeMultiplierActive) return;
        
        this.chainReactionCount++;
        this.cascadeChainLength++;
        
        console.log(`Chain reaction ${this.chainReactionCount}, cascade length: ${this.cascadeChainLength}`);
        
        // Emit chain reaction event
        this.scene.events.emit('chainReaction', {
            chainCount: this.chainReactionCount,
            cascadeLength: this.cascadeChainLength,
            tilesExploded: explodedTiles.length
        });
    }
    
    /**
     * Score a word within a cascade sequence
     * @param {Array<Tile>} tiles - Tiles forming the word
     * @returns {number} Points scored
     */
    scoreCascadeWord(tiles) {
        const points = this.calculateWordScore(tiles);
        
        if (this.cascadeMultiplierActive) {
            this.currentCascadeScore += points;
            this.cascadeChainLength++;
        }
        
        this.addScore(points);
        return points;
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
                multiplierBonus: 0,
                hasMultiplier: false,
                totalScore: 0
            };
        }
        
        const word = tiles.map(t => t.letter).join('');
        const tileScores = tiles.map(tile => ({
            letter: tile.letter,
            value: this.getTileValue(tile.letter),
            type: tile.type
        }));
        
        const baseScore = tileScores.reduce((sum, tile) => sum + tile.value, 0);
        const lengthBonus = this.getWordLengthBonus(tiles.length);
        const hasMultiplier = tiles.some(tile => tile.type === TILE_TYPES.MULTIPLIER);
        
        let totalScore = baseScore + lengthBonus;
        let multiplierBonus = 0;
        
        if (hasMultiplier) {
            const multiplierFactor = this.settings.scoring.multiplierFactor || 2.0;
            const originalScore = totalScore;
            totalScore = Math.floor(totalScore * multiplierFactor);
            multiplierBonus = totalScore - originalScore;
        }
        
        return {
            word: word,
            tileScores: tileScores,
            baseScore: baseScore,
            lengthBonus: lengthBonus,
            multiplierBonus: multiplierBonus,
            hasMultiplier: hasMultiplier,
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
     * Get scoring statistics including cascade information
     * @returns {Object} Scoring statistics
     */
    getStats() {
        return {
            currentScore: this.currentScore,
            targetScore: this.targetScore,
            progress: this.getProgress(),
            hasReachedTarget: this.hasReachedTarget(),
            cascadeActive: this.cascadeMultiplierActive,
            chainLength: this.cascadeChainLength,
            chainReactions: this.chainReactionCount,
            cascadeScore: this.currentCascadeScore
        };
    }
    
    /**
     * Create animated score popup
     * @param {number} points - Points to display
     * @param {number} x - World X position
     * @param {number} y - World Y position
     * @param {Object} options - Animation options
     */
    createScorePopup(points, x, y, options = {}) {
        const {
            color = '#ffffff',
            fontSize = 24,
            duration = 1000,
            offsetY = -50,
            isBonus = false
        } = options;
        
        // Create score text
        const scoreText = this.scene.add.text(x, y, `+${points}`, {
            fontSize: `${fontSize}px`,
            fill: color,
            fontFamily: 'Arial, sans-serif',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 2
        }).setOrigin(0.5);
        
        // Add bonus indicator for special scores
        if (isBonus) {
            scoreText.setText(`BONUS +${points}`);
            scoreText.setFontSize(fontSize + 4);
        }
        
        // Animate the popup
        this.scene.tweens.add({
            targets: scoreText,
            y: y + offsetY,
            alpha: 0,
            scale: 1.2,
            duration: duration,
            ease: 'Power2',
            onComplete: () => scoreText.destroy()
        });
        
        return scoreText;
    }
    
    /**
     * Create chain reaction bonus popup
     * @param {number} chainCount - Number of chain reactions
     * @param {number} bonus - Bonus points awarded
     * @param {number} x - World X position
     * @param {number} y - World Y position
     */
    createChainBonusPopup(chainCount, bonus, x, y) {
        const chainText = this.scene.add.text(x, y, `${chainCount}x CHAIN!`, {
            fontSize: '20px',
            fill: '#f39c12',
            fontFamily: 'Arial, sans-serif',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 2
        }).setOrigin(0.5);
        
        const bonusText = this.scene.add.text(x, y + 25, `+${bonus}`, {
            fontSize: '28px',
            fill: '#e74c3c',
            fontFamily: 'Arial, sans-serif',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 2
        }).setOrigin(0.5);
        
        // Animate chain indicator
        this.scene.tweens.add({
            targets: chainText,
            y: y - 30,
            alpha: 0,
            scale: 1.3,
            duration: 1200,
            ease: 'Power2',
            onComplete: () => chainText.destroy()
        });
        
        // Animate bonus points
        this.scene.tweens.add({
            targets: bonusText,
            y: y - 50,
            alpha: 0,
            scale: 1.5,
            duration: 1500,
            ease: 'Power2',
            onComplete: () => bonusText.destroy()
        });
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
    
    /**
     * Get the best word scored this level
     * @returns {string} Best word
     */
    getBestWord() {
        return this.bestWord;
    }
    
    /**
     * Get the best word score this level
     * @returns {number} Best word score
     */
    getBestWordScore() {
        return this.bestWordScore;
    }
    
    /**
     * Update best word tracking
     * @param {string} word - The word
     * @param {number} score - The word's score
     */
    updateBestWord(word, score) {
        if (score > this.bestWordScore) {
            this.bestWord = word;
            this.bestWordScore = score;
        }
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