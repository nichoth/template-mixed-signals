# Todo List GUI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire a working todo-list UI into the home route of `template-mixed-signals`, driven by the existing mixed-signals RPC state.

**Architecture:** Swap the local `<button>` wrapper to render `<substrate-button>`, register the three substrate web components at app entry, tighten the `state.todos` type, and replace the placeholder `<ul>` in the home route with a form (`<substrate-input>` + wrapped `<substrate-button>`) plus a list of `<check-box>`-backed items.

**Tech Stack:** Preact + htm, `@preact/signals`, mixed-signals RPC over PartySocket, `@substrate-system/{input,button,check-box}` web components.

**Out of scope (per spec):** No UI tests — the project has no test scaffolding for UI flows; we do not add one here.

---

## File Structure

- `src/client/state.ts` — tighten `state.todos` type.
- `src/client/components/button.ts` — swap inner `<button>` for `<substrate-button>`.
- `src/client/index.ts` — import the three substrate web components (side-effect register) and their CSS.
- `src/client/routes/home.css` — new file with list/item/strikethrough styles.
- `src/client/routes/home.ts` — replace placeholder markup with real todo UI.

Order matters: type tightening first (Task 1) so later files compile against the tightened shape; the wrapper swap (Task 2) is orthogonal; imports (Task 3) unlock Tasks 4–5.

---

### Task 1: Tighten `state.todos` type

Replace the loose `{ all:Signal<any>, add }` shape with a concrete `{ all:Signal<Todo[]>, add:(text:string)=>Todo }` so that `home.ts` can rely on it.

**Files:**
- Modify: `src/client/state.ts` (type definition on lines 19–26)

- [ ] **Step 1: Edit the `AppState` type**

In `src/client/state.ts`, replace the line

```ts
    todos:{ all:Signal<any>, add };
```

with

```ts
    todos:{ all:Signal<Todo[]>, add:(text:string)=>Todo };
```

`Todo` is already imported via `import type { Todo, Todos } from '../shared.js'` on line 5, so no new import is needed.

- [ ] **Step 2: Verify the file still typechecks**

Run: `npx tsc --noEmit`
Expected: Clean exit (no new errors introduced by this edit). If the repo already has pre-existing errors unrelated to this change, confirm they are not new.

- [ ] **Step 3: Commit**

```bash
git add src/client/state.ts
git commit -m "types: tighten state.todos shape"
```

---

### Task 2: Swap `button.ts` inner element to `<substrate-button>`

Keep the existing `spinning` / `onClick` wrapper behavior, but render `<substrate-button>` as the outer element so the counter buttons and the new "Add" button share one abstraction. Children are passed through; `<substrate-button>` captures innerHTML at connection time and wraps it with its own template.

**Files:**
- Modify: `src/client/components/button.ts`

- [ ] **Step 1: Replace the returned markup**

Replace the existing `return html\`<button ...>` block (lines 34–41 in `src/client/components/button.ts`) with:

```ts
    return html`<substrate-button
        ...${_props}
        onClick=${click}
        disabled=${isSpinning.value || _props.disabled}
        spinning=${isSpinning.value ? '' : null}
        className=${classes}
    >
        <span className="btn-content">${props.children}</span>
    </substrate-button>`
```

Notes:
- `spinning` is a presence-attribute on `<substrate-button>`; pass `''` to set it, `null` to omit.
- The host-level `spinning` class is still applied via `classes`, preserving the existing CSS selector match on `.btn.spinning`.
- Do NOT import `@substrate-system/button` here — that import lives in `index.ts` (Task 3).

- [ ] **Step 2: Verify TypeScript still compiles**

Run: `npx tsc --noEmit`
Expected: No new errors. Preact/htm accept arbitrary custom element tag names.

- [ ] **Step 3: Commit**

```bash
git add src/client/components/button.ts
git commit -m "feat: render Button wrapper as <substrate-button>"
```

---

### Task 3: Register substrate web components in `index.ts`

All three packages call `define(TAG, class)` at module load, so a side-effect import is sufficient to register the custom elements. We also import each package's CSS once at the top level.

**Files:**
- Modify: `src/client/index.ts` (imports near the top of the file, after line 8)

- [ ] **Step 1: Add the six imports**

Immediately after the existing `import './style.css'` line (currently line 9 of `src/client/index.ts`), insert:

```ts
import '@substrate-system/input'
import '@substrate-system/input/css'
import '@substrate-system/button'
import '@substrate-system/button/css'
import '@substrate-system/check-box'
import '@substrate-system/check-box/css'
```

Place these after `./style.css` so substrate CSS loads after the app baseline (substrate values win where they overlap — none expected, but this matches import order elsewhere in the repo).

- [ ] **Step 2: Start the dev server and open the home route**

Run: `npm start`
Open: http://localhost:<port>/ (watch the terminal for the actual port)

Expected:
- No build errors in the terminal.
- No `Uncaught` errors in the browser console.
- The existing counter buttons still render and increment/decrement normally (they now use `<substrate-button>` internally).

- [ ] **Step 3: Commit**

```bash
git add src/client/index.ts
git commit -m "feat: register substrate-input, substrate-button, check-box"
```

---

### Task 4: Add `home.css`

Create the styles for the todo form, list, and strikethrough state.

**Files:**
- Create: `src/client/routes/home.css`

- [ ] **Step 1: Create the file with the exact contents below**

```css
.route.home {
    & .add-todo {
        display: flex;
        gap: 0.5rem;
        align-items: flex-end;
    }

    & .todo-list {
        list-style: none;
        padding: 0;

        & li {
            margin-bottom: 0.5rem;

            &.done {
                text-decoration: line-through;
                opacity: 0.6;
            }
        }
    }
}
```

This follows repo style rules: nested selectors, no font sizes below 1rem, no new colors.

- [ ] **Step 2: Commit**

```bash
git add src/client/routes/home.css
git commit -m "feat: add home route styles"
```

---

### Task 5: Build the real home route UI

Replace the placeholder `<ul>` with the form + list. Use a local signal for the input text; on submit, trim → no-op if empty → call `State.addTodo` → reset the signal and the form. For each todo, render a `<check-box>` whose `change` event invokes `todo.toggle()`. Keys are array indices (items are only appended).

**Files:**
- Modify: `src/client/routes/home.ts`

- [ ] **Step 1: Replace the file contents**

Overwrite `src/client/routes/home.ts` with:

```ts
import { html } from 'htm/preact'
import { type FunctionComponent } from 'preact'
import { useSignal } from '@preact/signals'
import { type AppState } from '../state.js'
import { State } from '../state.js'
import { Button } from '../components/button.js'
import Debug from '@substrate-system/debug'
import './home.css'
const debug = Debug('mixed-signals:route:home')

export const HomeRoute:FunctionComponent<{
    state:AppState
}> = function HomeRoute ({ state }) {
    if (!state.rpc.value) return null
    const todos = state.todos
    const list = todos.all.value
    const draft = useSignal<string>('')
    debug('todos', list)

    function onInput (ev:Event) {
        const target = ev.target as HTMLInputElement
        draft.value = target.value
    }

    function onSubmit (ev:Event) {
        ev.preventDefault()
        const text = draft.value.trim()
        if (!text) return
        State.addTodo(state, text)
        draft.value = ''
        const form = ev.currentTarget as HTMLFormElement
        form.reset()
    }

    return html`<div class="route home">
        <h2>todos</h2>

        <form class="add-todo" onSubmit=${onSubmit}>
            <substrate-input
                name="todo"
                placeholder="What needs doing?"
                onInput=${onInput}
            ></substrate-input>
            <${Button} type="submit">Add<//>
        </form>

        <ul class="todo-list">
            ${list.map((todo, i) => {
                const done = todo.done.value
                return html`<li
                    key=${i}
                    class=${done ? 'done' : ''}
                >
                    <check-box
                        checked=${done}
                        onChange=${() => todo.toggle()}
                    >${todo.text.value}</check-box>
                </li>`
            })}
        </ul>
    </div>`
}
```

Notes:
- `onInput` on `<substrate-input>` fires for every keystroke because the inner `<input>`'s input event bubbles through the custom element.
- Pass `checked=${done}` (a boolean). Preact sets matching properties on custom elements as DOM properties, and `CheckBox`'s `checked` setter expects a boolean — passing `''`/`null` both collapse to falsy and break untoggling.
- We do NOT read the checkbox's own `checked` value on change — the signal drives the re-render and re-render drives the `checked` attribute back to truth. This keeps the box visually consistent with the model.
- Keys are indices; acceptable because `todos` is append-only today.

- [ ] **Step 2: Verify TypeScript still compiles**

Run: `npx tsc --noEmit`
Expected: Clean exit, no new errors.

- [ ] **Step 3: Manually verify the UI in the browser**

Run: `npm start`
Open: http://localhost:<port>/

Verify:
- The "todos" heading and empty list render on load (no items yet).
- Typing into the input updates the internal signal (not directly visible, but the next step exercises it).
- Submitting an empty input does nothing.
- Submitting non-empty text adds a new item and clears the input.
- Clicking the check-box of an item toggles the strikethrough + dimmed appearance.
- Unchecking restores the original appearance.
- No console errors.

- [ ] **Step 4: Commit**

```bash
git add src/client/routes/home.ts
git commit -m "feat: build todo list UI on home route"
```

---

## Self-Review Notes

Spec coverage:
- Render list from `state.todos.all` → Task 5.
- Add todo via input + button → Task 5 (`onSubmit` + `State.addTodo`).
- Toggle done via check-box → Task 5 (`onChange` + `todo.toggle()`).
- Strikethrough styling when `done === true` → Task 4 (`li.done`) + Task 5 (class binding).
- Register three web components → Task 3.
- Swap local button wrapper to `<substrate-button>` → Task 2.
- Tighten `state.todos` type → Task 1.
- New `home.css` → Task 4.
- No tests, no delete/edit/reorder, no new model methods → honored.

Type consistency: `State.addTodo(state, text)` signature unchanged; `Todo` already exported from `../shared.js`; `Todos.add` matches the tightened type.

No placeholders remain in any step.
