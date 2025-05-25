# Kanban Card Standards
This document defines the standard elements for all Kanban cards derived from the PRD.

## Card Elements

### 1. Task ID
A unique identifier that links the task to features and components.

**Format:** `[Feature]-[Number]`
- Example: `GRID-01`, `EFFECTS-03`, `LEVELS-02`
- Features: GRID, INPUT, EFFECTS, SCORING, LEVELS, UI, CONFIG

### 2. Title
A short, descriptive name that clearly identifies the work.

- Keep under 60 characters
- Begin with a verb
- Example: "Implement Word Tracing Mechanic"

### 3. Description
A clear explanation of the goal and relevant context.

- Reference the specific PRD/TDD section
- Focus on the "what" not the "how"
- Include visual references when applicable (mockups, GIFs, sketches)
- Example: "Develop the core word tracing mechanic as described in PRD Section 3.1. Users must be able to trace words horizontally, vertically, and diagonally in any direction. See attached GIF for desired tracing feedback."

### 4. Acceptance Criteria
Specific, testable outcomes that define when the task is complete.

**Technical Criteria:**
- Words can be traced in all 8 directions
- Valid words are accepted and trigger explosions
- Invalid words bounce back with appropriate feedback

**Player Experience Criteria:**
- Player feels immediate satisfaction from visual feedback
- Tracing feels responsive and natural
- No frame drops during interactions

### 5. Dependencies & Blockers
Related tasks, core files, or external requirements.

**Depends On:** [Task IDs this task needs completed first]
**Blocks:** [Task IDs waiting for this task]
**Current Blockers:** 
- ❌ Waiting for explosion sprites
- ❌ Need clarification on ripple percentage
- ✅ Dictionary file received

Example: "Depends On: GRID-03 (Grid System) | Blocks: EFFECTS-01 (Explosion System)"

### 6. Technical Notes (Developer Section)
Additional information for developers to fill in - helps PM understand progress.

- Key files touched
- Performance considerations  
- Technical risks identified
- Architecture decisions made

Example: "Using event queue to prevent timing bugs. Main files: EffectsQueue.js, GameScene.js. Risk: Complex cascades might cause frame drops."

### 7. Effort & Risk Assessment
Assessment of implementation complexity and risk level.

**Effort:** S, M, L
- S: 1-4 hours focused work
- M: 4-8 hours (preferred maximum)
- L: 1-2 days (consider breaking down)

**Risk:** Low, Medium, High
- High: Core game mechanics, timing-critical features
- Medium: Special features, complex UI
- Low: Config changes, simple UI elements

Example: "Effort: M | Risk: High (core mechanic)"

### 8. Testing Requirements
Three types of testing for game features:

**Functional Testing:** 
- Word validation accepts 3+ letter words
- All 8 directional traces work correctly

**Play Testing:** 
- Tracing feels responsive and satisfying
- Visual feedback enhances gameplay

**Device Testing:**
- iPhone 12+ (Safari)
- iPad (Safari) 
- Chrome desktop
- Optional: Android Chrome

### 9. Visual/Audio Assets Needed
List of required game assets and their status.

- Explosion particle effect (placeholder OK)
- Tile selection highlight sprite
- Ripple effect animation
- Special tile icons (bomb, ice, stone)

Status: `[Placeholder]` `[Final]` `[Not Started]`

### 10. Definition of Done
Game-specific checklist for task completion.

- [ ] Feature works as specified
- [ ] No console errors
- [ ] Feels good to play
- [ ] Tested on 3 devices minimum
- [ ] Code reviewed (if applicable)
- [ ] Merged to main branch
- [ ] Documentation updated

## kanban.md format (MUST FOLLOW)
File starts with:
---

kanban-plugin: board

---
LISTS AND CARDS LOOK LIKE THIS:
## list title
- [ ] sample card 

File ends with:
%% kanban:settings
```
{"kanban-plugin":"board","list-collapse":[false,false,false]}
```
%%

## Visual Labels and Colors

Use these labels to quickly identify card status and type:

**Status Labels:**
- 🔴 **Blocked** - Needs immediate attention
- 🟡 **At Risk** - Might miss deadline  
- 🟢 **On Track** - Progressing smoothly
- 🔵 **Needs Assets** - Waiting for art/audio
- 🟣 **Core Mechanic** - Critical path feature

**Type Labels:**
- **Frontend** - UI/Visual features
- **Backend** - Logic/Systems
- **Config** - Settings/Levels
- **Polish** - Effects/Juice
- **Balance** - Gameplay tuning

## Kanban Best Practices

**Card Creation:**
- Define cards around complete functional units rather than arbitrary complexity
- Each card should deliver tangible value that stakeholders would recognize as progress
- Group technically related "trivial" tasks into a single meaningful card
- Cards should represent logical boundaries in the codebase
- Aim for 10-20 cards per major feature area (not hundreds of tiny tasks)

**Prioritization:** Work on cards from top to bottom within each column.

**Work in Progress (WIP) Limits:** Maintain a maximum of 2 cards per person in "In Progress" status.

**Daily Review:** Review the board daily to identify blocked tasks or bottlenecks.

**Completion Definition:** A card is only "Done" when all acceptance criteria are met, including documentation updates.

**Card Updates:** Keep cards updated with current status, blockers, and notes.

---
This standard helps maintain consistency across all tasks and ensures proper traceability back to the PRD throughout development.