/**
 * WordValidator.js - Word validation system with dictionary loading
 * Handles dictionary loading from assets/dict.txt and fast word lookup
 */

class WordValidator {
    /**
     * Create word validator
     */
    constructor() {
        this.dictionary = new Set();
        this.loaded = false;
        this.loading = false;
        this.loadPromise = null;
        
        // Performance tracking
        this.loadStartTime = null;
        this.loadEndTime = null;
        
        // Error handling
        this.lastError = null;
    }
    
    /**
     * Load dictionary from assets/dict.txt
     * @returns {Promise<boolean>} True if loaded successfully
     */
    async load() {
        // Prevent multiple simultaneous loads
        if (this.loading) {
            return this.loadPromise;
        }
        
        if (this.loaded) {
            return true;
        }
        
        this.loading = true;
        this.loadStartTime = performance.now();
        
        this.loadPromise = this._performLoad();
        
        try {
            const result = await this.loadPromise;
            return result;
        } finally {
            this.loading = false;
        }
    }
    
    /**
     * Internal method to perform dictionary loading
     * @private
     * @returns {Promise<boolean>} True if loaded successfully
     */
    async _performLoad() {
        try {
            console.log('WordValidator: Loading dictionary from assets/dict.txt...');
            
            const response = await fetch('./assets/dict.txt');
            
            if (!response.ok) {
                throw new Error(`Failed to fetch dictionary: ${response.status} ${response.statusText}`);
            }
            
            const text = await response.text();
            
            // Parse dictionary - split by lines, trim whitespace, convert to uppercase
            const words = text.split('\n')
                .map(word => word.trim().toUpperCase())
                .filter(word => word.length > 0); // Remove empty lines
            
            // Use Set for O(1) lookup performance
            this.dictionary = new Set(words);
            this.loaded = true;
            this.lastError = null;
            
            this.loadEndTime = performance.now();
            const loadTime = this.loadEndTime - this.loadStartTime;
            
            console.log(`WordValidator: Dictionary loaded successfully!`);
            console.log(`WordValidator: ${words.length} words loaded in ${loadTime.toFixed(2)}ms`);
            
            return true;
            
        } catch (error) {
            this.lastError = error;
            this.loaded = false;
            this.dictionary.clear();
            
            console.error('WordValidator: Failed to load dictionary:', error);
            
            // For development/testing, create a minimal fallback dictionary
            if (this._shouldUseFallback()) {
                console.warn('WordValidator: Using fallback dictionary for development');
                this._createFallbackDictionary();
                this.loaded = true;
                return true;
            }
            
            return false;
        }
    }
    
    /**
     * Check if word is valid
     * @param {string} word - Word to validate
     * @returns {boolean} True if word is valid
     */
    isValid(word) {
        if (!this.loaded) {
            console.warn('WordValidator: Dictionary not loaded, cannot validate word:', word);
            return false;
        }
        
        if (!word || typeof word !== 'string') {
            return false;
        }
        
        // Normalize to uppercase for case-insensitive validation
        const normalizedWord = word.trim().toUpperCase();
        
        // Minimum word length check (typically 2+ letters)
        if (normalizedWord.length < 2) {
            return false;
        }
        
        // Fast O(1) lookup using Set
        const startTime = performance.now();
        const isValid = this.dictionary.has(normalizedWord);
        const lookupTime = performance.now() - startTime;
        
        // Log slow lookups (should be sub-100ms as per requirements)
        if (lookupTime > 100) {
            console.warn(`WordValidator: Slow lookup detected: ${lookupTime.toFixed(2)}ms for word "${word}"`);
        }
        
        return isValid;
    }
    
    /**
     * Get dictionary statistics
     * @returns {Object} Dictionary stats
     */
    getStats() {
        return {
            loaded: this.loaded,
            loading: this.loading,
            wordCount: this.dictionary.size,
            loadTime: this.loadEndTime && this.loadStartTime ? 
                this.loadEndTime - this.loadStartTime : null,
            lastError: this.lastError
        };
    }
    
    /**
     * Check if dictionary is loaded and ready
     * @returns {boolean} True if ready for validation
     */
    isReady() {
        return this.loaded && !this.loading;
    }
    
    /**
     * Get all words starting with prefix (for potential autocomplete features)
     * @param {string} prefix - Prefix to search for
     * @returns {Array<string>} Array of matching words
     */
    getWordsWithPrefix(prefix) {
        if (!this.loaded || !prefix) {
            return [];
        }
        
        const normalizedPrefix = prefix.trim().toUpperCase();
        const matches = [];
        
        // Note: Set doesn't have efficient prefix search
        // For production, consider using a Trie data structure
        for (const word of this.dictionary) {
            if (word.startsWith(normalizedPrefix)) {
                matches.push(word);
            }
        }
        
        return matches.sort();
    }
    
    /**
     * Check if should use fallback dictionary (development mode)
     * @private
     * @returns {boolean} True if should use fallback
     */
    _shouldUseFallback() {
        // Use fallback in development or when explicitly enabled
        return window.location.hostname === 'localhost' || 
               window.location.hostname === '127.0.0.1' ||
               localStorage.getItem('wordValidator.useFallback') === 'true';
    }
    
    /**
     * Create minimal fallback dictionary for development
     * @private
     */
    _createFallbackDictionary() {
        const fallbackWords = [
            'THE', 'AND', 'FOR', 'ARE', 'BUT', 'NOT', 'YOU', 'ALL', 'CAN', 'HER', 'WAS', 'ONE',
            'OUR', 'HAD', 'BY', 'HOT', 'WORD', 'WHAT', 'SOME', 'WE', 'IT', 'DO', 'CAN', 'OUT',
            'OTHER', 'WERE', 'WHICH', 'THEIR', 'TIME', 'WILL', 'HOW', 'SAID', 'EACH', 'SHE',
            'TWO', 'MORE', 'VERY', 'WHAT', 'KNOW', 'WATER', 'THAN', 'CALL', 'FIRST', 'WHO',
            'ITS', 'NOW', 'FIND', 'LONG', 'DOWN', 'DAY', 'DID', 'GET', 'HAS', 'HIM', 'HIS',
            'HOW', 'MAN', 'NEW', 'OLD', 'SEE', 'TWO', 'WAY', 'WHO', 'BOY', 'DID', 'ITS', 'LET',
            'PUT', 'SAY', 'SHE', 'TOO', 'USE', 'CAT', 'DOG', 'RUN', 'SUN', 'BIG', 'RED', 'TOP',
            'HOT', 'LET', 'FLY', 'FAR', 'SEA', 'EYE', 'EAR', 'EGG', 'END', 'FEW', 'GOT', 'GUN',
            'HIT', 'JOB', 'LOT', 'MAP', 'MOM', 'POP', 'SIT', 'SIX', 'TEN', 'WIN', 'YES', 'ZOO'
        ];
        
        this.dictionary = new Set(fallbackWords);
        console.log(`WordValidator: Fallback dictionary created with ${fallbackWords.length} words`);
    }
    
    /**
     * Reload dictionary (for development/testing)
     * @returns {Promise<boolean>} True if reloaded successfully
     */
    async reload() {
        this.loaded = false;
        this.loading = false;
        this.loadPromise = null;
        this.dictionary.clear();
        this.lastError = null;
        
        return await this.load();
    }
    
    /**
     * Destroy validator and clean up
     */
    destroy() {
        this.dictionary.clear();
        this.loaded = false;
        this.loading = false;
        this.loadPromise = null;
        this.lastError = null;
    }
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = WordValidator;
}