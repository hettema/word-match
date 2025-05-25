# Product Requirements Document

**Product:** Word Cascade | **Version:** 1.0 | **Date:** May 25, 2025 | **Status:** Draft

## 1. Executive Summary

Word Cascade is a browser-based puzzle game combining Scrabble-style word building with match-3 cascade mechanics. Players trace words on a letter grid to trigger chain reactions, with fully configurable game parameters enabling diverse level design.

## 2. Game Concept

### Core Loop
1. Player traces connected letters (8-directional) to form words
2. Valid words explode, creating ripple effects
3. Affected tiles destabilize and may trigger secondary explosions
4. Grid refills from top with new letters
5. Player aims to reach target score within move limit

### Victory Condition
Achieve target score within allocated moves to progress to next level

### Failure Condition
Exhaust moves without reaching target score, losing one life

## 3. Technical Architecture

### Core Systems
- **Grid System**: Configurable NxM grid with tile management
- **Word Validation**: Dictionary lookup using dict.txt file
- **Physics Engine**: Handles explosions, ripples, and cascade effects
- **Scoring Engine**: Calculates base scores, multipliers, and chain bonuses
- **Level Manager**: Loads and manages level configurations
- **State Machine**: Controls game flow and prevents timing conflicts

### Configuration System
All game parameters loaded from JSON files:
```json
{
  "levelId": 1,
  "gridSize": { "width": 8, "height": 8 },
  "targetScore": 1000,
  "moveLimit": 20,
  "tileDistribution": {
    "A": { "count": 9, "value": 1 },
    "E": { "count": 12, "value": 1 },
    // ... UK Scrabble distribution
  },
  "rippleConfig": {
    "spreadPercentage": 0.5,
    "surgePower": 1,
    "destabilizationThreshold": 3
  },
  "specialTiles": {
    "bomb": { "spawnRate": 0.05 },
    "multiplier": { "spawnRate": 0.03, "value": 2 },
    "ice": { "spawnRate": 0.04, "health": 2 },
    "stone": { "spawnRate": 0.02, "health": 4 },
    "hidden": { "spawnRate": 0.03, "revealThreshold": 3 }
  }
}
```

### Module Structure
- **Game Core**: Main game loop and state management
- **Grid Module**: Tile creation, positioning, and grid operations
- **Input Handler**: Touch/mouse input with word tracing logic
- **Validation Module**: Word checking against dictionary
- **Effects Controller**: Manages all visual effects and animations
- **Score Calculator**: Handles all scoring logic
- **Level Loader**: Parses and applies level configurations

## 4. Feature Specifications

### Grid & Tiles
- **Configurable Size**: Support any grid dimensions
- **Letter Distribution**: Configurable per level (default: UK Scrabble)
- **Tile States**: Normal, Destabilized, Exploding, Falling, Locked

### Word Mechanics
- **Tracing**: 8-directional selection (horizontal, vertical, diagonal)
- **Minimum Length**: 3 letters (configurable)
- **Validation**: Check against dict.txt dictionary
- **Scoring**: Base Scrabble values + word length bonus + cascade multipliers

### Explosion System
- **Primary Explosion**: Selected word tiles explode
- **Ripple Effect**: Configurable percentage of surrounding tiles affected
- **Surge Mechanics**: Each ripple adds surge power to affected tiles
- **Chain Reactions**: Tiles reaching destabilization threshold explode
- **Queue System**: Ensures proper execution order to prevent timing bugs

### Special Tiles
- **Bomb**: Triggers full explosion on all adjacent tiles
- **Multiplier**: Multiplies entire move score by X
- **Ice Blocker**: Requires 2 additional hits, unselectable
- **Stone Blocker**: Requires 4 additional hits, unselectable
- **Hidden**: Letter concealed until 3 surges, then normal

### Cascade System
- **Gravity**: Tiles fall to fill empty spaces
- **Spawn**: New tiles generate from top
- **Settle Detection**: System waits for grid stability before allowing input

## 5. Design Requirements

### Responsive Design
- **Desktop**: Full experience with hover states
- **Tablet**: Touch-optimized with larger hit areas
- **Mobile**: Minimum 375px width, scaled UI elements

### Visual Design
- **Tile Design**: Clear letters with point values, distinct special tile icons
- **Effects**: Smooth particle explosions, clear ripple visualization
- **Animations**: Fluid tile movement, no jarring transitions
- **Color Coding**: Consistent palette for tile values and states

### User Interface
- **HUD**: Score display, move counter, target score, pause button
- **Feedback**: Clear indication of valid/invalid words
- **Progress**: Visual level progression indicator

## 6. Development Principles

### Code Architecture
- **Separation of Concerns**: Logic, rendering, and data clearly separated
- **Event-Driven**: Loose coupling between systems via event bus
- **State Management**: Single source of truth for game state
- **Animation Queue**: Centralized system preventing timing conflicts

### Performance Requirements
- **Frame Rate**: Stable 60 FPS during gameplay
- **Load Time**: Under 3 seconds initial load
- **Memory**: Efficient tile pooling and resource management

### Browser Support
- **Chrome**: 90+
- **Firefox**: 88+
- **Safari**: 14+
- **Edge**: 90+

## 7. Data & Analytics

### Tracking Events
- Level starts/completions
- Average moves per level
- Word length distribution
- Special tile usage
- Session duration

### Storage
- Local storage for progress and settings
- Configuration files cached for offline play

## 8. Risk Mitigation

### Technical Risks
- **Timing Bugs**: Implement robust state machine and animation queue
- **Performance**: Profile and optimize cascade calculations
- **Dictionary Size**: Optimize lookup performance for large word lists

### Design Risks
- **Difficulty Balance**: Extensive playtesting with configurable parameters
- **Visual Clarity**: User testing for tile readability at various sizes

## 9. Success Criteria

- Clean, bug-free cascade animations
- Sub-100ms word validation
- Consistent 60 FPS performance
- Intuitive controls across all devices
- Engaging difficulty progression through configuration

## 10. Open Questions

- Optimal surge power and destabilization threshold defaults?
- Should word rarity affect scoring?
- How to handle extremely long cascades (score caps)?
- Best way to tutorial special tiles without overwhelming players?
- Should special tiles be included in traced words?

---
**Last updated:** May 25, 2025