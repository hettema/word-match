/**
 * LevelLoader - Configuration System for Word Cascade
 * Handles loading and validation of level configurations and game settings
 */
class LevelLoader {
    constructor() {
        this.levelsCache = null;
        this.settingsCache = null;
        this.loaded = false;
    }

    /**
     * Load a specific level configuration by ID
     * @param {number} levelId - The level ID to load
     * @returns {Promise<Object>} Level configuration object
     * @throws {Error} If level not found or loading fails
     */
    static async load(levelId) {
        try {
            const config = await LevelLoader.loadLevels();
            const level = config.levels.find(l => l.id === levelId);
            
            if (!level) {
                throw new Error(`Level ${levelId} not found`);
            }

            // Validate level configuration
            LevelLoader.validateLevel(level);
            
            // Merge with tile distribution data
            if (level.tileDistribution && config.tileDistributions[level.tileDistribution]) {
                level.tileDistributionData = config.tileDistributions[level.tileDistribution];
            } else {
                throw new Error(`Tile distribution '${level.tileDistribution}' not found`);
            }

            return level;
        } catch (error) {
            console.error('Failed to load level:', error);
            throw new Error(`Failed to load level ${levelId}: ${error.message}`);
        }
    }

    /**
     * Load all levels configuration
     * @returns {Promise<Object>} Complete levels configuration
     */
    static async loadLevels() {
        try {
            const response = await fetch('/config/levels.json?v=' + Date.now());
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const config = await response.json();
            
            // Validate configuration structure
            if (!config.levels || !Array.isArray(config.levels)) {
                throw new Error('Invalid levels configuration: missing or invalid levels array');
            }

            if (!config.tileDistributions || typeof config.tileDistributions !== 'object') {
                throw new Error('Invalid levels configuration: missing or invalid tileDistributions');
            }

            return config;
        } catch (error) {
            console.error('Failed to load levels configuration:', error);
            throw new Error(`Failed to load levels configuration: ${error.message}`);
        }
    }

    /**
     * Load game settings configuration
     * @returns {Promise<Object>} Game settings object
     */
    static async loadSettings() {
        try {
            const response = await fetch('/config/settings.json?v=' + Date.now());
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const settings = await response.json();
            
            // Validate settings structure
            LevelLoader.validateSettings(settings);
            
            return settings;
        } catch (error) {
            console.error('Failed to load settings:', error);
            throw new Error(`Failed to load settings: ${error.message}`);
        }
    }

    /**
     * Get list of available levels
     * @returns {Promise<Array>} Array of level metadata
     */
    static async getAvailableLevels() {
        try {
            const config = await LevelLoader.loadLevels();
            return config.levels.map(level => ({
                id: level.id,
                name: level.name,
                targetScore: level.targetScore,
                moves: level.moves,
                gridSize: level.gridSize
            }));
        } catch (error) {
            console.error('Failed to get available levels:', error);
            throw error;
        }
    }

    /**
     * Validate level configuration
     * @param {Object} level - Level configuration to validate
     * @throws {Error} If validation fails
     */
    static validateLevel(level) {
        const required = ['id', 'gridSize', 'targetScore', 'moves', 'tileDistribution', 'ripple', 'specialTiles'];
        
        for (const field of required) {
            if (!(field in level)) {
                throw new Error(`Missing required field: ${field}`);
            }
        }

        // Validate grid size
        if (!level.gridSize.width || !level.gridSize.height || 
            level.gridSize.width < 4 || level.gridSize.height < 4 ||
            level.gridSize.width > 12 || level.gridSize.height > 12) {
            throw new Error('Invalid grid size: must be between 4x4 and 12x12');
        }

        // Validate target score and moves
        if (level.targetScore <= 0 || level.moves <= 0) {
            throw new Error('Target score and moves must be positive numbers');
        }

        // Validate ripple configuration
        if (!level.ripple.spread || !level.ripple.power || !level.ripple.threshold ||
            level.ripple.spread < 0 || level.ripple.spread > 1 ||
            level.ripple.power < 1 || level.ripple.threshold < 1) {
            throw new Error('Invalid ripple configuration');
        }

        // Validate special tiles spawn rates
        const totalSpawnRate = Object.values(level.specialTiles).reduce((sum, rate) => sum + rate, 0);
        if (totalSpawnRate > 0.5) {
            throw new Error('Total special tile spawn rate cannot exceed 50%');
        }
    }

    /**
     * Validate settings configuration
     * @param {Object} settings - Settings configuration to validate
     * @throws {Error} If validation fails
     */
    static validateSettings(settings) {
        const required = ['game', 'display', 'gameplay', 'scoring', 'effects'];
        
        for (const section of required) {
            if (!(section in settings)) {
                throw new Error(`Missing required settings section: ${section}`);
            }
        }

        // Validate display settings
        if (settings.display.width <= 0 || settings.display.height <= 0) {
            throw new Error('Display dimensions must be positive');
        }

        if (settings.display.tileSize <= 0) {
            throw new Error('Tile size must be positive');
        }

        // Validate gameplay settings
        if (settings.gameplay.minWordLength < 2 || settings.gameplay.maxWordLength < settings.gameplay.minWordLength) {
            throw new Error('Invalid word length settings');
        }

        // Validate performance settings
        if (settings.performance && settings.performance.tilePoolSize <= 0) {
            throw new Error('Tile pool size must be positive');
        }
    }

    /**
     * Create default level configuration (fallback)
     * @returns {Object} Default level configuration
     */
    static createDefaultLevel() {
        return {
            id: 1,
            name: "Default Level",
            gridSize: { width: 6, height: 6 },
            targetScore: 500,
            moves: 15,
            tileDistribution: "scrabble_uk",
            ripple: {
                spread: 0.5,
                power: 1,
                threshold: 3
            },
            specialTiles: {
                bomb: 0.02,
                multiplier: 0.01,
                ice: 0.02,
                stone: 0.01,
                hidden: 0.02
            }
        };
    }

    /**
     * Create default settings configuration (fallback)
     * @returns {Object} Default settings configuration
     */
    static createDefaultSettings() {
        return {
            game: { name: "Word Cascade", version: "1.0.0", debug: false },
            display: { width: 800, height: 600, tileSize: 64, responsive: true },
            gameplay: { minWordLength: 3, maxWordLength: 15, animationSpeed: 1.0 },
            scoring: { wordLengthBonus: { "3": 0, "4": 10, "5": 20 } },
            effects: { particleCount: 20, explosionRadius: 80 },
            performance: { tilePoolSize: 100, targetFPS: 60 }
        };
    }
}

// Export for use in other modules (CommonJS)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = LevelLoader;
}

// Make available globally for script tag imports
if (typeof window !== 'undefined') {
    window.LevelLoader = LevelLoader;
}