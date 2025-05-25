# Technical Design Document

**Product:** Word Cascade | **Version:** 1.0 | **Date:** May 25, 2025
**github repo** https://github.com/hettema/word-match.git

## 1. Architecture Overview

### Core Principle: Keep It Simple
- Single HTML file + Phaser 3
- Modular ES6 classes
- Event-driven communication
- JSON configuration files

### File Structure
```
word-cascade/
├── index.html
├── game.js           # Entry point
├── config/
│   ├── levels.json   # Level configurations
│   └── settings.json # Game settings
├── src/
│   ├── core/
│   │   ├── GameScene.js      # Main game scene
│   │   ├── Grid.js           # Grid management
│   │   ├── Tile.js           # Tile class
│   │   └── GameState.js      # State management
│   ├── systems/
│   │   ├── InputSystem.js    # Touch/mouse handling
│   │   ├── WordValidator.js  # Dictionary checking
│   │   ├── ScoreSystem.js    # Scoring logic
│   │   └── EffectsQueue.js   # Animation sequencing
│   └── utils/
│       └── LevelLoader.js    # Config loading
├── assets/
│   └── dict.txt      # Word dictionary
└── style.css
```

## 2. Core Systems

### GameScene.js - Main Controller
```javascript
class GameScene extends Phaser.Scene {
    create() {
        this.grid = new Grid(this, config);
        this.inputSystem = new InputSystem(this);
        this.scoreSystem = new ScoreSystem();
        this.effectsQueue = new EffectsQueue();
        this.state = new GameState();
        
        // Event listeners
        this.events.on('wordSubmitted', this.handleWord, this);
        this.events.on('effectComplete', this.checkStability, this);
    }
    
    handleWord(tiles) {
        if (this.state.isAnimating) return;
        
        const word = tiles.map(t => t.letter).join('');
        if (this.wordValidator.isValid(word)) {
            this.state.isAnimating = true;
            this.processWord(tiles);
        }
    }
}
```

### Grid.js - Tile Management
```javascript
class Grid {
    constructor(scene, config) {
        this.tiles = [];
        this.width = config.gridSize.width;
        this.height = config.gridSize.height;
        this.tileSize = 64; // Base size, scales with screen
    }
    
    createTile(x, y, letter, value) {
        const tile = new Tile(this.scene, x, y, letter, value);
        this.tiles[y][x] = tile;
        return tile;
    }
    
    getNeighbors(tile, radius = 1) {
        // Returns all tiles within radius (for ripple effects)
    }
    
    dropTiles() {
        // Handle gravity after explosions
    }
    
    refillGrid() {
        // Spawn new tiles from top
    }
}
```

### EffectsQueue.js - Animation Sequencing
```javascript
class EffectsQueue {
    constructor() {
        this.queue = [];
        this.running = false;
    }
    
    add(effect) {
        this.queue.push(effect);
        if (!this.running) this.processNext();
    }
    
    async processNext() {
        if (this.queue.length === 0) {
            this.running = false;
            this.scene.events.emit('effectsComplete');
            return;
        }
        
        this.running = true;
        const effect = this.queue.shift();
        await this.runEffect(effect);
        this.processNext();
    }
}
```

## 3. Game Flow Implementation

### State Machine
```javascript
const GameStates = {
    WAITING: 'waiting',      // Waiting for input
    VALIDATING: 'validating', // Checking word
    EXPLODING: 'exploding',   // Processing explosions
    CASCADING: 'cascading',   // Tiles falling
    SETTLING: 'settling'      // Waiting for stability
};

class GameState {
    constructor() {
        this.current = GameStates.WAITING;
        this.moves = 0;
        this.score = 0;
        this.isAnimating = false;
    }
    
    canAcceptInput() {
        return this.current === GameStates.WAITING && !this.isAnimating;
    }
}
```

### Word Processing Pipeline
```javascript
async processWord(tiles) {
    // 1. Calculate base score
    const baseScore = this.scoreSystem.calculateBase(tiles);
    
    // 2. Queue explosion effects
    tiles.forEach(tile => {
        this.effectsQueue.add({
            type: 'explode',
            tile: tile,
            callback: () => this.handleExplosion(tile)
        });
    });
    
    // 3. Process ripples
    const ripples = this.calculateRipples(tiles);
    this.effectsQueue.add({
        type: 'ripple',
        tiles: ripples,
        callback: () => this.processRipples(ripples)
    });
    
    // 4. Wait for effects to complete
    this.events.once('effectsComplete', () => {
        this.grid.dropTiles();
        this.grid.refillGrid();
        this.state.isAnimating = false;
    });
}
```

## 4. Configuration System

### Level Config Structure
```json
{
    "levels": [
        {
            "id": 1,
            "gridSize": { "width": 8, "height": 8 },
            "targetScore": 1000,
            "moves": 20,
            "tileDistribution": "scrabble_uk", // References preset
            "ripple": {
                "spread": 0.5,      // 50% of surrounding tiles
                "power": 1,         // Surge strength
                "threshold": 3      // Hits to explode
            },
            "specialTiles": {
                "bomb": 0.05,       // 5% spawn rate
                "multiplier": 0.03,
                "ice": 0.04,
                "stone": 0.02,
                "hidden": 0.03
            }
        }
    ]
}
```

### Settings Loader
```javascript
class LevelLoader {
    static async load(levelId) {
        const config = await fetch('./config/levels.json')
            .then(r => r.json());
        return config.levels.find(l => l.id === levelId);
    }
}
```

## 5. Special Tile Implementation

### Tile Types
```javascript
const TileTypes = {
    NORMAL: 'normal',
    BOMB: 'bomb',
    MULTIPLIER: 'multiplier',
    ICE: 'ice',
    STONE: 'stone',
    HIDDEN: 'hidden'
};

class Tile extends Phaser.GameObjects.Container {
    constructor(scene, x, y, letter, value, type = TileTypes.NORMAL) {
        super(scene);
        this.letter = letter;
        this.value = value;
        this.type = type;
        this.surgeCount = 0;
        this.health = this.getInitialHealth();
        
        this.createVisuals();
    }
    
    getInitialHealth() {
        switch(this.type) {
            case TileTypes.ICE: return 2;
            case TileTypes.STONE: return 4;
            default: return 0;
        }
    }
    
    canSelect() {
        return this.type === TileTypes.NORMAL || 
               this.type === TileTypes.HIDDEN ||
               (this.isSpecial() && this.health <= 0);
    }
}
```

## 6. Input Handling

### Word Tracing
```javascript
class InputSystem {
    constructor(scene) {
        this.scene = scene;
        this.selectedTiles = [];
        this.isTracing = false;
        
        this.setupInput();
    }
    
    setupInput() {
        this.scene.input.on('pointerdown', this.startTrace, this);
        this.scene.input.on('pointermove', this.updateTrace, this);
        this.scene.input.on('pointerup', this.endTrace, this);
    }
    
    updateTrace(pointer) {
        if (!this.isTracing) return;
        
        const tile = this.getTileAt(pointer.x, pointer.y);
        if (tile && this.canAddTile(tile)) {
            this.selectedTiles.push(tile);
            tile.setSelected(true);
        }
    }
    
    canAddTile(tile) {
        if (!tile.canSelect()) return false;
        if (this.selectedTiles.includes(tile)) return false;
        
        // Check if adjacent to last selected
        if (this.selectedTiles.length > 0) {
            const last = this.selectedTiles[this.selectedTiles.length - 1];
            return this.areAdjacent(last, tile);
        }
        
        return true;
    }
}
```

## 7. Performance Optimizations

### Tile Pooling
```javascript
class TilePool {
    constructor(scene, size = 100) {
        this.pool = [];
        this.active = [];
        
        // Pre-create tiles
        for (let i = 0; i < size; i++) {
            const tile = new Tile(scene, 0, 0, '', 0);
            tile.setVisible(false);
            this.pool.push(tile);
        }
    }
    
    get() {
        return this.pool.pop() || new Tile(this.scene, 0, 0, '', 0);
    }
    
    release(tile) {
        tile.reset();
        tile.setVisible(false);
        this.pool.push(tile);
    }
}
```

### Dictionary Optimization
```javascript
class WordValidator {
    constructor() {
        this.dictionary = new Set();
        this.loaded = false;
    }
    
    async load() {
        const text = await fetch('./assets/dict.txt').then(r => r.text());
        const words = text.split('\n').map(w => w.trim().toUpperCase());
        this.dictionary = new Set(words);
        this.loaded = true;
    }
    
    isValid(word) {
        return this.dictionary.has(word.toUpperCase());
    }
}
```

## 8. Deployment

### Build Process
```bash
# Simple static hosting - no build required!
# Just serve the files:
python -m http.server 8000
# or
npx serve .
```

### Production Considerations
- Minify JS/CSS for production
- Cache dictionary file
- Use CDN for Phaser
- Enable gzip compression

## 9. Testing Strategy

### Critical Test Points
1. **Timing**: Ensure animations don't overlap
2. **State**: Verify state machine prevents invalid actions
3. **Memory**: Check tile pooling prevents leaks
4. **Touch**: Test on actual devices
5. **Dictionary**: Verify word validation speed

### Simple Test Harness
```javascript
// Add to game.js in dev mode
if (DEBUG) {
    window.game = this;
    window.testWord = (word) => {
        // Simulate word selection
    };
    window.testCascade = () => {
        // Trigger massive cascade
    };
}
```

## 10. Quick Start

1. Create file structure
2. Implement Grid and Tile classes
3. Add basic input handling
4. Implement word validation
5. Add explosion effects
6. Implement cascade system
7. Add special tiles
8. Polish and ship!

---
**Remember:** Working game > Perfect architecture. Ship it!