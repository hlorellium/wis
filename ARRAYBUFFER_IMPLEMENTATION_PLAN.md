# ArrayBuffer Hard-Switch Implementation Plan  
*(drawing-app performance upgrade)*

## 0 – Summary  
We will replace all shape storage and inter-tab command serialization with typed-array / ArrayBuffer
representations.  
The rest of the architecture – `stateProxy` for reactivity and `eventBus` for decoupled messaging –
remains intact by wrapping each buffer in lightweight proxy-friendly objects.

---

## 1 – Goals
| ID | Goal | Success Metric |
|----|------|---------------|
| G1 | Shapes stored in contiguous binary buffers | ≥ 60 % RAM drop for 10 k shapes |
| G2 | Command sync uses binary protocol | ≥ 75 % smaller BroadcastChannel payloads |
| G3 | No breaking changes to UI or tests | All current unit/E2E tests green |
| G4 | Maintain stateProxy reactivity | `state.__v` increments on buffer mutations |

---

## 2 – Key Design Decisions

### 2.1 Binary Shape Representation
```
byte 0            : ShapeType (uint8)
byte 1            : Flags (uint8) – fillMode, strokeStyle
bytes 4..7        : strokeWidth (float32)
bytes 8..23       : RGBA stroke + fill (8×uint8)
bytes 24..N       : Geometry (float32[])
```
Size table  
Rectangle / Line → 40 B, Circle → 36 B, Bezier → 56 B.

### 2.2 Wrapper Classes (proxy-safe)
```ts
class BinaryShapeWrapper {           // used everywhere instead of raw object
  private view: DataView;
  id: string;
  get x(): number { ... }            // getters/setters write into buffer
}
class BinaryShapeArray extends Array<BinaryShapeWrapper> { /* overrides push/splice */ }
```
Because `BinaryShapeArray` extends native `Array`, the **existing stateProxy deep-proxy logic
detects mutations automatically** – no changes inside `stateProxy` required.

### 2.3 Binary Protocol for Commands
Header (16 B):
```
[0..3]  uint32  commandType
[4..7]  uint32  payloadLength
[8..15]  8 bytes commandId (Uint8[8])
```
Payload layouts are command-specific.  
`SyncManager` sends/receives `{ type: "binary-command", data: ArrayBuffer }`.

### 2.4 Renderer Overhaul
`BinaryRenderer` iterates `state.scene.shapes` (wrappers) and reads geometry directly from
`DataView` for ultra-fast draw commands.

---

## 3 – Work Breakdown & Timeline (5 weeks)

| Week | Deliverables |
|------|--------------|
| **W1** | `BinaryShapeWrapper`, `BinaryShapeArray`, shape buffer factory, unit tests. |
| **W2** | Replace `State.scene.shapes` with `BinaryShapeArray`; adapt all tools & commands to create wrappers; green unit tests. |
| **W3** | Implement `BinaryRenderer`; drop legacy `ShapeRenderer`; visual parity manual QA. |
| **W4** | Implement `BinaryProtocol`; update `SyncManager`; update persistence (`IndexedDbStore`) to store raw buffers; multi-tab E2E tests. |
| **W5** | Performance benchmarking, memory audit, docs update, risk fixes, remove legacy JSON paths. |

---

## 4 – Code-Level TODOs

### 4.1 New files
```
src/core/binary/shapeBuffer.ts
src/core/binary/binaryShapeWrapper.ts
src/core/binary/binaryShapeArray.ts
src/core/binary/binaryRenderer.ts
src/sync/binaryProtocol.ts
```

### 4.2 Modified files
* `src/state.ts` → replace `Shape[]` with `BinaryShapeArray`.
* `src/tools/**/*.ts` → use buffer factory when creating shapes.
* `src/commands/**/*Command.ts` → accept / return IDs only (no full objects).
* `src/sync/syncManager.ts` → switch to binaryProtocol.
* `src/persistence/persistenceManager.ts` → store buffers.

---

## 5 – EventBus & History Integration
* `CommandExecutor` emits **same** `commandExecuted` events; wrapper changes are invisible to listeners.
* `HistoryManager` stores command objects (lightweight) – memory heavy shape state is **not** stored,
  so no change required.

---

## 6 – Testing Strategy
1. **Unit**:  
   * Wrapper getters/setters reflect bytes correctly.  
   * Protocol encode/decode is symmetric.
2. **Integration**:  
   * All existing Vitest suites must pass.  
   * Add shape-count stress test (≥ 20 000 shapes).
3. **E2E / Playwright**:  
   * Verify drawing, editing, undo/redo, multi-tab sync.
4. **Performance**:  
   * Record FPS & heap before/after with Chrome DevTools.

---

## 7 – Risks & Mitigations
| Risk | Mitigation |
|------|------------|
| Typed-array GC pressure | Implement buffer pooling & reuse |
| In-place mutation bugs (no immutable copies) | Strict unit tests on history/undo |
| Large migration PR difficult to review | Merge by feature flags per week |

---

## 8 – Acceptance Criteria
* All automated tests pass.  
* Manual visual QA shows no regression.  
* Benchmark report included in PR:
  * Memory usage ↓ ≥ 60 % with 10 k shapes.
  * Broadcast payload size ↓ ≥ 75 %.
  * FPS ↑ ≥ 30 % on stress scene.

---

*Prepared 30 Jun 2025*
