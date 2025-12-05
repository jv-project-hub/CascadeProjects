# Battleship-AI - Debugging History

This document summarizes the main bugs discovered and fixed during development of the Battleship-AI project. For each bug it describes what went wrong, why it happened, how we fixed it, how to reproduce the original behavior, and tips to avoid similar issues in the future.

---

## 1. Recursive `aiFire()` and Potential Stack Overflow

**Related PR:** [#1 - Convert recursive aiFire to iterative approach](https://github.com/jv-project-hub/Battleship-AI/pull/1)  
**Key commit:** `096d6210c5ab387a1f8b1997a374fb193c949769`

### 1.1 Bug / Risk Description

The original `aiFire()` implementation used recursion to keep trying new coordinates if it selected a cell that had already been hit. Given the current data model (a shuffled list of unique available shots), this worked in practice, but it introduced a theoretical risk of deep recursion and stack overflow if the model changed in the future.

This was more of a **defensive fix** than a user-visible bug.

### 1.2 Root Cause Analysis

- The AI logic used a recursive pattern: "pick a shot; if invalid, call `aiFire()` again."
- There was no hard guardrail against pathological cases, such as:
  - A corrupted `aiAvailableShots` array containing many already-hit cells.
  - Future refactors unintentionally reintroducing duplicates or failing to mark hits.
- In such scenarios, the recursion depth could grow unnecessarily, potentially exhausting the call stack.

### 1.3 How It Was Fixed

`aiFire()` was rewritten to use an **iterative loop**:
- Pop coordinates from `aiAvailableShots` in a `while` loop.
- Skip already-hit cells inside the loop and continue iterating until a valid cell is found.
- If `aiAvailableShots` is exhausted, the function declares a draw.

This removed recursion entirely, ensuring the call stack usage remains stable regardless of board state.

### 1.4 How to Reproduce the Original Problem

In the current codebase you can't easily reproduce an actual stack overflow because the data model is now correct and iterative. To simulate the old risk:

1. Check out a commit before PR #1 (or the original recursive version of `aiFire()`).
2. Manually corrupt `aiAvailableShots` (for example, push many duplicate coordinates).
3. Run the game and let the AI fire repeatedly; in extreme cases you could hit recursion depth limits.

### 1.5 Prevention Tips

- Avoid recursion for simple retry loops over finite collections; prefer iteration, especially in game loops that run many times per session.
- When recursion is used, always reason explicitly about maximum depth based on data invariants.
- Consider adding sanity checks (asserts) for collections like `aiAvailableShots` to ensure they remain unique and within bounds.

---

## 2. AI Hunt Mode and Difficulty Bugs

**Related PR:** [#2 - Add difficulty toggle that modifies AI behavior](https://github.com/jv-project-hub/Battleship-AI/pull/2)  
**Key commits:**  
- `3d31d0917718894f76ee0463afe9a0a228a01f4d` - Fix skipping last adjacent cell  
- `ff7312f7d8ec54e4bfd7164da4388de5ffaef885` - Fix adjacent ships bug in hunt mode  
- `710479eadda781ab8f595724e83e81249f6d44fa` - Differentiate Easy, Medium, Hard

### 2.1 Bug A - AI Skipping the Last Adjacent Cell After a Hit

#### Bug Description

In hunt mode, after the AI scored a hit, it was supposed to try all adjacent cells (up, down, left, right) before falling back to random shots. However, there was a bug where the AI could skip the final adjacent cell and instead jump back to random targeting.

#### Root Cause Analysis

- The AI used a queue or list of "hunt targets" (neighbor cells to check after a hit).
- The control flow mixed "use hunt target" and "fallback to random" logic.
- A missing `usedHuntTarget` flag meant that even after successfully consuming a hunt target, the code could still proceed into its random-target branch in the same decision path, effectively discarding the last queued neighbor.

#### How It Was Fixed

Introduced a `usedHuntTarget` boolean flag within the AI firing logic:
- When a hunt target is successfully dequeued and fired upon, `usedHuntTarget` is set to `true`.
- The random fallback path only executes if `usedHuntTarget` is `false`, meaning no valid neighbor was used this turn.

This guarantees that **all** queued adjacent cells are tried before any random shot logic triggers.

#### How to Reproduce the Original Bug

(Only applicable on pre-fix versions.)

1. Place a ship such that the AI will eventually hit it (e.g., in a central area).
2. Play on a difficulty that uses hunt mode (Hard).
3. When the AI hits a cell, observe subsequent AI moves - it should target neighbors, but in some sequences it will switch back to random firing before trying the last neighbor.

#### Prevention Tips

- When implementing stateful strategies like hunt mode, clearly separate "I had a structured target and used it" from "I had no structured target and used fallback behavior."
- Use explicit state flags (`usedHuntTarget`, `hasHuntTarget`) rather than implicit logic flows.

---

### 2.2 Bug B - AI Losing Hunt Targets When Ships Are Adjacent

#### Bug Description

When two ships were placed adjacent to each other (sharing a cell edge), the AI's hunt mode could "lose" valid targets after sinking one ship. As a result, it might stop hunting the neighboring ship cells even though they were logically part of the same cluster.

#### Root Cause Analysis

There were two distinct logic issues:

1. **Neighbors from the killing shot were not enqueued.**  
   - The adjacency logic that queued neighbors after a hit was placed in an `else if` block.  
   - When the shot both **hit** and **sank** a ship, the `else if` conditions prevented neighbor-enqueueing from running.  
   - This meant the final, decisive hit on a ship never contributed its neighbors to the hunt queue.

2. **Entire hunt queue cleared when a ship sank.**  
   - On sinking a ship, the code cleared the entire hunt queue to "reset" hunt mode.  
   - This indiscriminately discarded valid targets that belonged to **other ships** adjacent to the sunk one.

#### How It Was Fixed

The fix had two main parts:

- **Adjacency logic restructuring:** Moved neighbor-enqueueing out of the restrictive `else if` so that it also runs for the killing shot.
- **More careful queue management on sink:** Instead of blindly clearing the entire hunt queue on sink, the logic now preserves relevant targets so that adjacent ship cells remain in the hunt sequence.

#### How to Reproduce the Original Bug

(On a pre-fix version.)

1. Place two ships adjacent to each other (e.g., a 3-length and a 2-length ship sharing a border).
2. Play on Hard difficulty so the AI uses full hunt mode.
3. Allow the AI to eventually hit one of the ships and continue firing.
4. When it sinks that ship, observe that it often stops hunting the remaining adjacent ship cells and goes back to random shots.

#### Prevention Tips

- When clearing or resetting state on an event (like sinking a ship), review what else depends on that state.
- Prefer explicit queues keyed by ship or by cluster, rather than a single global queue if you expect overlapping concerns.
- Write targeted tests where adjacent entities exist to catch logic that implicitly assumes isolation.

---

### 2.3 Bug C - Easy and Medium Difficulties Behaving Identically

#### Bug Description

The game exposed three difficulty levels: Easy, Medium, and Hard. However, Easy and Medium effectively behaved the same way: both used pure random targeting for the AI. This meant there was no real gameplay difference between those two options.

#### Root Cause Analysis

- The difficulty selector UI existed, but the underlying AI logic did not differentiate Easy and Medium.
- Both difficulty levels mapped to the same AI strategy (random firing).
- Only Hard had special behavior (hunt mode after hits).

#### How It Was Fixed

The AI logic was updated to associate distinct behaviors with each difficulty:
- **Easy:** Pure random targeting. The AI never uses hunt mode.
- **Medium:** Mixed strategy. When hunt targets exist, the AI uses them with 50% probability and fires randomly the rest of the time.
- **Hard:** Always uses hunt mode when targets exist (aggressive and efficient).

#### How to Reproduce the Original Bug

(Pre-fix version.)

1. Start the game and select **Easy**, play several turns, observing the AI's shot pattern.
2. Restart, select **Medium**, and play again.
3. Observe that Easy and Medium exhibit indistinguishable behavior: both are fully random.

#### Prevention Tips

- When adding UI for multiple modes (difficulty, options), write a quick behavioral checklist for each mode and verify they differ in measurable ways.
- Consider small diagnostics or logging during development to confirm the wiring between UI and behavior.

---

## 3. Player Ship Images Persisting After Restart

**Related PR:** [#5 - Fix ship images persisting after starting new game](https://github.com/jv-project-hub/Battleship-AI/pull/5)  
**Key commit:** `6b4eb83974c7a198970bc451605f92a4fc48c702`

### 3.1 Bug Description

After finishing a game and clicking **Start Game / Restart** to start a new one, the **ship overlay images** from the previous game remained visible on the player board. While the internal board state was reset, the DOM elements representing the ships weren't cleared, leading to a confusing visual mismatch between game state and UI.

### 3.2 Root Cause Analysis

- Player ship images are created by `createPlayerShipImage(...)` in `script.js`.  
  - This function appends `<div class="ship-image">` elements to `playerBoardWrapper` (the `.player-board-wrapper` container that sits around `#player-board`).
- When the game is reset via `initGame()`:
  - `playerBoard` and `aiBoard` are recreated.
  - `buildBoards()` is called, which does `playerBoardEl.innerHTML = ""` and `aiBoardEl.innerHTML = ""`.
  - This clears the grid cells inside `#player-board` but **does not touch** elements appended directly to `playerBoardWrapper`.
- As a result, old `.ship-image` elements from the previous game survive across `initGame()` calls, visually overlaying the fresh, empty board.

### 3.3 How It Was Fixed

`initGame()` was updated to explicitly remove all existing ship images from `playerBoardWrapper` before rebuilding the boards:

```javascript
function initGame() {
  gameOver = false;
  playerTurn = true;
  placingIndex = 0;
  horizontal = true;
  placementDone = false;

  // Remove any existing player ship images from previous games
  if (playerBoardWrapper) {
    const oldImages = playerBoardWrapper.querySelectorAll(".ship-image");
    oldImages.forEach((img) => img.remove());
  }

  playerShips = [];
  aiShips = [];
  // ... rest of initGame
}
```

### 3.4 How to Reproduce the Original Bug

(Pre-fix version.)

1. Load the game.
2. Place all ships on the player board (observe the overlay ship images).
3. Click **Start Game** and play until the game ends (win or lose).
4. When the game is over, click **Restart**.
5. Observe the player board: the grid is reset for new placements, but the old ship overlay images from the previous game are still visible.

### 3.5 Prevention Tips

- Whenever UI elements are appended outside the main container being reset (like overlays added to a wrapper), ensure the reset/init function also clears those siblings.
- Centralize **all** "new game" cleanup in a single function that resets both data structures and their visual counterparts.
- Consider using a small helper like `clearBoardUI()` that wipes board cells, overlays, and any per-game markers.


## 4. Misaligned Ship Images on Player Board

**Related PR:** [#X - Fix ship overlay alignment and stacking](https://github.com/jv-project-hub/Battleship-AI/pull/X)  
**Key commit:** `TBD`

### 4.1 Bug / Risk Description

Something happened to how the ship images were being displayed on the board. The ship overlays appeared shifted relative to the underlying 10×10 grid cells.

- Ship images no longer lined up with the grid.
- The green “ship pad” area and the cell borders did not visually match where the ship image was drawn.
- Game logic (hits/misses, sunk ships) still operated on the correct cells, but the visual representation was offset, which was confusing to the player.

This was a **visual alignment bug** isolated to the rendering layer.

### 4.2 Root Cause Analysis

The root cause was a mismatch between the coordinate system used for ship overlays and the actual layout of the board grid:

- The board layout and/or cell dimensions changed (e.g., padding, borders, wrapper elements, or CSS that affected cell size and position).
- The ship overlay positioning logic still assumed the old geometry, using `(row, col)` to pixel conversion that no longer matched the real top‑left of the visible grid.
- Specifically, the code computing:

  - `top = rowIndex * cellSize`
  - `left = colIndex * cellSize`

  assumed an origin aligned with the grid’s top-left cell. After adding layout/styling changes (ocean background wrappers, borders, etc.), that origin effectively moved, but the positioning math did not.

As a result, all ships rendered with a consistent offset, even though the internal game state (which cells a ship occupied) remained correct.

### 4.3 Fix Implementation

We fixed the bug by re‑synchronizing the overlay positioning with the visual grid layout:

- **Anchored overlays to the correct container**
  - Ensured the board wrapper that visually contains the grid is `position: relative`.
  - Ensured ship images (and other overlays) are absolutely positioned within this same container so that `(0,0)` in overlay coordinates matches the top‑left of the grid.

- **Synced `cellSize` with CSS**
  - Confirmed that the size used in JavaScript for cell coordinates (`cellSize`) matches the CSS-defined width/height of a grid cell.
  - Removed any hard-coded values that did not match the actual computed cell size.

- **Eliminated extra offsets**
  - Verified that padding and borders around the grid are not double-counted in the positioning math.
  - Adjusted calculations so they assume:

    - `shipTop = rowIndex * cellSize`
    - `shipLeft = colIndex * cellSize`

    from the **true** top-left of the grid.

- **Verified orientation-specific dimensions**
  - Horizontal ships: `width = shipLength * cellSize`, `height = cellSize`.
  - Vertical ships: `height = shipLength * cellSize`, `width = cellSize`.

With these changes, ships visually snap exactly to the cells they occupy.

### 4.4 How to Reproduce the Original Bug

1. Use the version of the code **before** the fix.
2. Start the game and place the player’s ships (or allow automatic placement if supported).
3. Observe the player board:
   - Compare ship images against grid cell borders and the green pad background.
   - The ships will be visibly offset (e.g., shifted up, left, or right) relative to the underlying cells.
4. Fire on cells that visually contain a ship:
   - Hits and misses still behave correctly according to the **logical** grid, confirming that only the rendering is misaligned.

### 4.5 Prevention / Lessons Learned

- **Single source of truth for sizing**
  - Derive `cellSize` from CSS (or keep it defined in exactly one place) and ensure both JS and CSS use the same value.

- **Align overlays with the same container as the grid**
  - All overlays (ships, hit sprites, placement previews) should share a common `position: relative` parent that directly wraps the grid.

- **Recheck overlays after layout changes**
  - Any change to:
    - Grid padding, margins, or borders.
    - Wrapper structure around the board.
    - Cell width/height.
  - Should trigger a regression check for overlay alignment.

- **Keep visual and logical coordinates conceptually separate**
  - Treat `(row, col)` → pixel conversion as a clearly defined layer.
  - When changing layout, review that mapping explicitly rather than assuming it still holds.
```
---

## Summary Table

| Bug | PR | Severity | Category |
|-----|-----|----------|----------|
| Recursive aiFire stack overflow risk | #1 | Low (defensive) | Performance/Safety |
| AI skipping last adjacent cell | #2 | Medium | AI Logic |
| AI losing hunt targets for adjacent ships | #2 | Medium | AI Logic |
| Easy/Medium difficulties identical | #2 | Low | Feature/UX |
| Ship images persisting after restart | #5 | Medium | UI/Visual |

---

## Notes

- This document is based on the PR history visible in the repository (PRs #1, #2, and #5).
- PRs #3 (Sound Effects) and #4 (README) were feature additions without bug fixes.
- If there were additional bugs fixed via direct commits or in-session debugging that didn't result in separate PRs, they may not be captured here.

---

*Document generated: December 2025*
