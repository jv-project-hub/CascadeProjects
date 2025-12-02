# Battleship-AI Efficiency Analysis Report

This report identifies several areas in the codebase where efficiency could be improved, along with recommendations and trade-offs for each.

## 1. Recursive AI Fire Logic (script.js:468-527) - FIXED IN THIS PR

The `aiFire` function uses recursion to retry when encountering an already-hit tile. While this works correctly in the current implementation (since `aiAvailableShots` contains unique coordinates), recursion for retry logic is unnecessary and could cause stack overflow issues if the data model changes in the future.

**Current code:**
```javascript
function aiFire() {
  // ...
  if (tile.hit) {
    return aiFire(); // recursive call
  }
  // ...
}
```

**Recommendation:** Convert to an iterative loop using `while(true)` with explicit `break` statements. This is safer, equally readable, and immune to stack-depth concerns.

**Impact:** Low runtime impact currently, but improves code robustness and maintainability.

---

## 2. Event Listener Attachment in buildBoards (script.js:163-186)

The `buildBoards` function creates 200 cells (100 per board) and attaches individual event listeners to each cell. This results in 400+ event listeners being created on game initialization.

**Recommendation:** Use event delegation by attaching a single click listener to each board container and determining the clicked cell from `event.target`. Note that `mouseenter`/`mouseleave` do not bubble, so those would need to remain per-cell or be converted to `mouseover`/`mouseout` with additional logic.

**Trade-offs:** Event delegation reduces memory usage and speeds up initialization, but adds complexity for non-bubbling events. For a 10x10 board, the current approach is acceptable.

---

## 3. DOM Rebuilding in renderFleetPanel (script.js:219-247)

The `renderFleetPanel` function completely rebuilds the fleet panel DOM on every call (after each shot and during placement). While the DOM tree is small (max 5 ships), this could be optimized.

**Recommendation:** Instead of rebuilding, update only the changed elements by tracking ship state and modifying existing DOM nodes. Alternatively, use a virtual DOM library for more complex UIs.

**Trade-offs:** The current implementation is simple and works well for the small fleet size. Optimization would add complexity for minimal performance gain.

---

## 4. Duplicated Horizontal/Vertical Logic (Multiple Functions)

Several functions contain duplicated code blocks for horizontal vs vertical orientation:
- `placeShipsRandomly` (lines 53-104)
- `canPlaceShip` (lines 327-340)
- `placeShip` (lines 342-364)
- `showPlacementPreview` (lines 125-149)

**Recommendation:** Create a helper function that computes row/column deltas based on orientation:
```javascript
function getDeltas(horizontal) {
  return horizontal ? { dr: 0, dc: 1 } : { dr: 1, dc: 0 };
}
```
Then use shared loops with these deltas instead of separate if/else branches.

**Trade-offs:** Reduces code duplication and bug risk, but requires careful refactoring to avoid introducing off-by-one errors.

---

## 5. AI Shot Generation in resetAIShots (script.js:188-196)

The function pre-generates all 100 possible shot coordinates as objects and shuffles them. This is efficient for a 10x10 board but could be memory-intensive for larger boards.

**Recommendation:** For the current board size, this approach is fine. For larger boards, consider a lazy generation strategy or using a Set of remaining coordinates.

**Trade-offs:** Current implementation is O(n) for both creation and shuffle (Fisher-Yates), which is optimal. Only worth changing if board size becomes dynamic and large.

---

## 6. Full Board Redraw in redrawPlayerShips (script.js:397-414)

The function queries all 100 cells and updates their classes on every call, even if only one cell changed.

**Recommendation:** Track which cells changed and update only those, or maintain a dirty flag system.

**Trade-offs:** The function is called infrequently (mainly during placement), so the performance impact is negligible. Optimization would add complexity without meaningful benefit.

---

## Summary

| Issue | Severity | Effort | Recommended Action |
|-------|----------|--------|-------------------|
| Recursive aiFire | Medium | Low | Fix (done in this PR) |
| Event listeners | Low | Medium | Document for future |
| DOM rebuilding | Low | Medium | Document for future |
| Code duplication | Low | Medium | Consider refactoring |
| AI shot generation | Low | Low | No action needed |
| Full board redraw | Low | Medium | No action needed |

The recursive `aiFire` issue was selected for this PR because it represents a structural improvement with minimal risk and clear correctness benefits.
