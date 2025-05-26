# Word Match 🎯

A challenging browser-based puzzle game that combines Scrabble-style word building with match-3 cascade mechanics. Trace words on a letter grid to trigger explosive chain reactions and reach your target score!

![Word Match Game](https://img.shields.io/badge/Status-Active%20Development-green) ![Browser Support](https://img.shields.io/badge/Browser-Chrome%2090%2B%20%7C%20Firefox%2088%2B%20%7C%20Safari%2014%2B-blue) ![Mobile Ready](https://img.shields.io/badge/Mobile-Optimized-brightgreen)

## 🎮 How to Play

### Core Gameplay
1. **Trace Words**: Click and drag to connect adjacent letters (8-directional movement)
2. **Create Explosions**: Valid words explode, triggering ripple effects
3. **Chain Reactions**: Affected tiles destabilize and may explode in cascades
4. **Reach Target**: Achieve the target score within your move limit to win

### Special Tiles
- **💣 Bomb Tiles**: Explode all adjacent tiles when triggered
- **🧊 Ice Tiles**: Require 2 hits to destroy, cannot be selected
- **🗿 Stone Tiles**: Require 4 hits to destroy, cannot be selected  
- **✨ Multiplier Tiles**: Double your entire move score when included
- **🔮 Hidden Tiles**: Letter revealed after 3 surge hits

### Scoring System
- **Base Score**: Scrabble letter values (A=1, Z=10, etc.)
- **Word Length Bonus**: Extra points for longer words
- **Chain Bonuses**: Exponential bonuses for cascade reactions
- **Multiplier Effects**: Special tiles can double your score

## 🚀 Quick Start

### Play Now
```bash
# Clone the repository
git clone <repository-url>
cd word-match

# Start local server
python3 -m http.server 8000

# Open in browser
open http://localhost:8000
```

### Browser Requirements
- **Chrome**: 90+
- **Firefox**: 88+  
- **Safari**: 14+
- **Edge**: 90+
- **Mobile**: iOS Safari 14+, Android Chrome 90+

### Performance
- **Target**: 60 FPS gameplay
- **Load Time**: Under 3 seconds
- **Mobile**: Optimized for 375px+ screens

## 🏗️ Architecture

### Hybrid UI System
Word Match uses a sophisticated **hybrid architecture** combining the strengths of both Phaser.js and HTML/CSS:

```
┌─────────────────────────────────────┐
│           HTML/CSS Layer            │
│  (UI Overlays, HUD, Menus)         │
├─────────────────────────────────────┤
│           Phaser Layer              │
│  (Game Board, Tiles, Effects)      │
└─────────────────────────────────────┘
```

#### Phaser Layer (Game Board)
- **High-performance** tile rendering and animations
- **Interactive elements**: Word tracing, hover effects
- **Visual effects**: Explosions, cascades, particle systems
- **Physics**: Gravity system and collision detection

#### HTML/CSS Layer (UI)
- **Professional overlays**: Victory/defeat screens with rich animations
- **Responsive HUD**: Score display, progress bars, move counter
- **Accessibility**: Screen reader support, keyboard navigation
- **Mobile optimization**: Touch-friendly interface

### Core Systems

#### 🎯 Game State Management
- [`GameState.js`](src/core/GameState.js) - Central state coordination
- [`GameScene.js`](src/core/GameScene.js) - Main game scene controller
- Event-driven architecture with loose coupling

#### 🔤 Word Processing
- [`WordValidator.js`](src/systems/WordValidator.js) - Dictionary validation (267,751 words)
- [`InputSystem.js`](src/systems/InputSystem.js) - Touch/mouse word tracing
- Sub-0.1ms word lookup performance using Set data structure

#### 💥 Effects Engine
- [`EffectsQueue.js`](src/systems/EffectsQueue.js) - Animation sequencing system
- [`Grid.js`](src/core/Grid.js) - Tile management and cascade logic
- [`Tile.js`](src/core/Tile.js) - Individual tile behavior and states

#### 🏆 Scoring System
- [`ScoreSystem.js`](src/systems/ScoreSystem.js) - Complex scoring calculations
- Scrabble-based values with word length bonuses
- Chain reaction multipliers and special tile effects

#### ⚙️ Configuration
- [`LevelLoader.js`](src/utils/LevelLoader.js) - JSON-based level loading
- [`config/levels.json`](config/levels.json) - Level definitions
- [`config/settings.json`](config/settings.json) - Game settings

## 🔧 Development Setup

### Prerequisites
```bash
# No build tools required - pure HTML/CSS/JavaScript
# Optional: Python for local server
python3 --version  # 3.6+ recommended
```

### Development Workflow
```bash
# 1. Start development server
python3 -m http.server 8000

# 2. Open game in browser
open http://localhost:8000

# 3. Run test suite
open http://localhost:8000/tests/

# 4. Edit files and refresh browser
# No build step required!
```

### Configuration System

#### Creating New Levels
Edit [`config/levels.json`](config/levels.json):
```json
{
  "id": 4,
  "name": "Your Level",
  "gridSize": { "width": 8, "height": 8 },
  "targetScore": 1000,
  "moves": 20,
  "ripple": {
    "spread": 0.5,
    "power": 1,
    "threshold": 3
  },
  "specialTiles": {
    "bomb": 0.05,
    "multiplier": 0.03,
    "ice": 0.04,
    "stone": 0.02,
    "hidden": 0.03
  }
}
```

#### Ripple Configuration
- **spread**: Percentage of surrounding tiles affected (0.0-1.0)
- **power**: Surge power added per ripple
- **threshold**: Surge hits needed to trigger explosion

#### Special Tile Spawn Rates
- Values represent probability (0.0-1.0) of spawning each type
- Set to 0.0 to disable specific tile types
- Balance carefully to maintain difficulty curve

## 📁 Project Structure

```
word-match/
├── index.html              # Main game entry point
├── style.css              # CSS styling and animations
├── README.md              # This file
├── kanban.md              # Project management board
├── word-match-prd.md      # Product requirements
├── word-match-ui-architecture.md  # Architecture docs
├── word-match-style-guide.md      # Visual design guide
├── word-match-tdd.md      # Technical design document
├── assets/
│   └── dict.txt           # Dictionary file (267,751 words)
├── config/
│   ├── levels.json        # Level configurations
│   └── settings.json      # Game settings
├── src/
│   ├── core/              # Core game systems
│   │   ├── GameScene.js   # Main game scene
│   │   ├── GameState.js   # State management
│   │   ├── Grid.js        # Grid and tile management
│   │   └── Tile.js        # Individual tile behavior
│   ├── systems/           # Game subsystems
│   │   ├── EffectsQueue.js    # Animation sequencing
│   │   ├── InputSystem.js     # Input handling
│   │   ├── ScoreSystem.js     # Scoring calculations
│   │   └── WordValidator.js   # Dictionary validation
│   └── utils/             # Utility modules
│       └── LevelLoader.js # Configuration loading
└── tests/                 # Test suite
    ├── index.html         # Test runner
    ├── test-*.html        # Individual test files
    └── test-styles.css    # Test styling
```

### Key Files Explained

#### Core Game Files
- **[`index.html`](index.html)**: Game entry point with hybrid UI structure
- **[`src/core/GameScene.js`](src/core/GameScene.js)**: Main Phaser scene coordinating all systems
- **[`src/core/GameState.js`](src/core/GameState.js)**: Central state management and persistence
- **[`src/core/Grid.js`](src/core/Grid.js)**: Grid system with tile management and cascade logic

#### System Modules
- **[`src/systems/EffectsQueue.js`](src/systems/EffectsQueue.js)**: Prevents timing conflicts in animations
- **[`src/systems/WordValidator.js`](src/systems/WordValidator.js)**: Fast dictionary lookup system
- **[`src/systems/ScoreSystem.js`](src/systems/ScoreSystem.js)**: Complex scoring with multipliers and bonuses
- **[`src/systems/InputSystem.js`](src/systems/InputSystem.js)**: Touch/mouse input with word tracing

#### Configuration
- **[`config/levels.json`](config/levels.json)**: All level definitions and parameters
- **[`src/utils/LevelLoader.js`](src/utils/LevelLoader.js)**: Configuration parsing and validation

## 🧪 Testing

### Test Suite
The game includes a comprehensive test suite accessible at `/tests/`:

```bash
# Run all tests
open http://localhost:8000/tests/

# Individual test files
open http://localhost:8000/tests/test-grid.html
open http://localhost:8000/tests/test-scoring-playable.html
open http://localhost:8000/tests/test-special-tiles-playable.html
```

### Test Categories

#### Functional Tests
- **Grid System**: Tile creation, neighbor detection, coordinate mapping
- **Word Validation**: Dictionary loading, lookup performance, edge cases
- **Scoring**: Base calculations, multipliers, chain bonuses
- **Effects**: Animation sequencing, cascade logic, timing

#### Playable Tests
- **[`test-scoring-playable.html`](tests/test-scoring-playable.html)**: Interactive scoring system demo
- **[`test-special-tiles-playable.html`](tests/test-special-tiles-playable.html)**: Special tile behavior demo
- **[`test-ripple-effects.html`](tests/test-ripple-effects.html)**: Cascade mechanics demo

#### Performance Tests
- **60 FPS**: Maintained during complex cascades
- **Memory**: Efficient tile management without leaks
- **Load Time**: Dictionary and assets under 3 seconds

### Running Tests
```bash
# Start server
python3 -m http.server 8000

# Open test runner
open http://localhost:8000/tests/

# All tests should pass with green indicators
# Playable tests allow interactive verification
```

## 📱 Browser Support & Performance

### Supported Browsers
| Browser | Version | Status | Notes |
|---------|---------|--------|-------|
| Chrome | 90+ | ✅ Full Support | Recommended |
| Firefox | 88+ | ✅ Full Support | Good performance |
| Safari | 14+ | ✅ Full Support | iOS compatible |
| Edge | 90+ | ✅ Full Support | Chromium-based |

### Mobile Optimization
- **Responsive Design**: Supports 375px+ screen widths
- **Touch Optimization**: Large hit areas, gesture support
- **Performance**: Optimized for mobile GPUs
- **PWA Ready**: Installable on mobile devices

### Performance Characteristics
- **Frame Rate**: Stable 60 FPS during gameplay
- **Load Time**: Under 3 seconds initial load
- **Memory Usage**: Efficient tile pooling system
- **Dictionary**: Sub-0.1ms word lookup performance

## 🤝 Contributing

### Development Workflow
This project uses a Kanban board system for task management:

1. **Check [`kanban.md`](kanban.md)** for current tasks and priorities
2. **Follow the TDD approach** outlined in [`word-match-tdd.md`](word-match-tdd.md)
3. **Maintain code quality** per guidelines in custom instructions
4. **Update Kanban** before committing changes

### Code Quality Standards
- **Files < 400 lines** - Suggest refactoring at 350 lines
- **No hard-coded variables** - Use constants and configuration
- **Single responsibility** - Each module has one clear purpose
- **80%+ test coverage** - Comprehensive testing required
- **Descriptive naming** - Self-documenting code preferred

### Git Workflow
```bash
# 1. Create focused commits
git add src/systems/NewFeature.js
git commit -m "feat: implement new feature system"

# 2. Update kanban before pushing
# Edit kanban.md to move tasks to 'done'

# 3. Push working code only
# Verify all tests pass first
```

### Architecture Principles
- **Separation of Concerns**: Logic, rendering, and data clearly separated
- **Event-Driven**: Loose coupling between systems via events
- **State Management**: Single source of truth for game state
- **Performance First**: 60 FPS target with optimization focus

## 🔧 Technical Details

### Performance Optimizations
- **Tile Pooling**: Reuse tile objects to prevent garbage collection
- **Batched Processing**: Handle multiple explosions efficiently
- **Animation Queue**: Prevent timing conflicts and ensure smooth playback
- **Dictionary Optimization**: Set-based lookup for O(1) word validation

### Extensibility
The modular architecture supports easy extension:

#### Adding New Special Tiles
1. Extend [`Tile.js`](src/core/Tile.js) with new tile type
2. Add behavior in [`Grid.js`](src/core/Grid.js) special tile handling
3. Configure spawn rates in [`levels.json`](config/levels.json)
4. Add visual styling in [`style.css`](style.css)

#### Creating New Game Modes
1. Define new level structure in [`levels.json`](config/levels.json)
2. Extend [`LevelLoader.js`](src/utils/LevelLoader.js) if needed
3. Add mode-specific logic in [`GameState.js`](src/core/GameState.js)

#### Adding Visual Effects
1. Implement in [`EffectsQueue.js`](src/systems/EffectsQueue.js)
2. Coordinate timing with existing animation system
3. Ensure 60 FPS performance is maintained

### Configuration Reference

#### Level Configuration Options
```json
{
  "id": 1,
  "name": "Level Name",
  "gridSize": { "width": 6, "height": 6 },
  "targetScore": 300,
  "moves": 12,
  "tileDistribution": "scrabble_uk",
  "ripple": {
    "spread": 0.2,        // 0.0-1.0: Ripple spread percentage
    "power": 1,           // Surge power per ripple
    "threshold": 4        // Surges needed to explode
  },
  "specialTiles": {
    "bomb": 0.0,          // 0.0-1.0: Spawn probability
    "multiplier": 0.03,   // 0.0-1.0: Spawn probability
    "ice": 0.0,           // 0.0-1.0: Spawn probability
    "stone": 0.0,         // 0.0-1.0: Spawn probability
    "hidden": 0.0         // 0.0-1.0: Spawn probability
  }
}
```

## ⚠️ Known Issues

### Visual Bug
There is currently an unresolved visual bug in the game that affects display rendering. This issue is being tracked and will be addressed in a future update.

## 📄 License

This project is developed as part of a game development portfolio. Please refer to the repository license for usage terms.

---

## 🎯 Quick Links

- **Play Game**: [http://localhost:8000](http://localhost:8000)
- **Run Tests**: [http://localhost:8000/tests/](http://localhost:8000/tests/)
- **Project Board**: [`kanban.md`](kanban.md)
- **Architecture**: [`word-match-ui-architecture.md`](word-match-ui-architecture.md)
- **Design Guide**: [`word-match-style-guide.md`](word-match-style-guide.md)

**Status**: Active Development | **Version**: 1.0 | **Last Updated**: May 26, 2025