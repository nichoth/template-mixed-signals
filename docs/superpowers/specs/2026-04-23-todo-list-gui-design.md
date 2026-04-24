# Todo List GUI — Design

Date: 2026-04-23
Status: Approved

## Goal

Add a working todo-list UI to the home route of the `template-mixed-signals`
demo. The state layer is already wired (signals + mixed-signals RPC over a
PartySocket WebSocket). The GUI should match the existing data model and
surface exactly what the model exposes — no more, no less.

## Scope

In scope:

- Render the list of todos from `state.todos.all`.
- Add a new todo via an input + submit button, calling `state.todos.add(text)`.
- Toggle a todo's done state via a checkbox, calling `todo.toggle()`.
- Strikethrough styling for items where `done === true`.

Out of scope (model does not expose these, do not add):

- Deleting todos.
- Editing existing todo text.
- Reordering.
- Persistence beyond what the server already does.

## Components

All three are already in `node_modules`.

- `@substrate-system/input` → `<substrate-input>` — text field for the new
  todo. We import it + its CSS once at the top level.
- `@substrate-system/button` → `<substrate-button>` — action button. The
  existing local wrapper in `src/client/components/button.ts` renders a plain
  `<button>`; we change its inner element to `<substrate-button>` so the
  counter buttons and the new "Add" button share one abstraction.
- `@substrate-system/check-box` → `<check-box>` — per-todo done state.

Imports and `define()` calls live in `src/client/index.ts` alongside the
existing top-level setup.

## Files Touched

- `src/client/index.ts` — import + `define()` the three web components, import
  their CSS.
- `src/client/components/button.ts` — swap inner `<button>` for
  `<substrate-button>`. Keep the existing `spinning` / `onClick` wrapper
  behavior.
- `src/client/routes/home.ts` — replace the placeholder `<ul>` with the real
  UI (form + list). Import a new `home.css`.
- `src/client/routes/home.css` — new file; list, item, and strikethrough
  styles.
- `src/client/state.ts` — tighten `state.todos` type from
  `{ all:Signal<any>, add }` to `{ all:Signal<Todo[]>, add:(text:string)=>Todo }`.

No server changes.

## UI Structure

Home route markup (conceptual):

```html
<div class="route home">
  <h2>todos</h2>

  <form class="add-todo">
    <substrate-input name="todo" placeholder="What needs doing?"></substrate-input>
    <Button type="submit">Add</Button>
  </form>

  <ul class="todo-list">
    <!-- one <li> per todo -->
    <li class="{done ? 'done' : ''}">
      <check-box checked={todo.done.value}>
        {todo.text.value}
      </check-box>
    </li>
  </ul>
</div>
```

## Data Flow

### Add

- The form's `onSubmit`:
  1. `ev.preventDefault()`.
  2. Read the text value from the `<substrate-input>`'s inner `<input>`
     (the input event bubbles; we hold the string in a local signal).
  3. Trim. If empty, no-op.
  4. Call `State.addTodo(state, text)` (already defined in `state.ts`).
  5. Clear the input (reset the local signal and the element value).
- The add action is synchronous/local; we do not use the button's
  `spinning` state for it.

### Toggle

- Each `<li>` renders a `<check-box>` with `checked=${todo.done.value}`.
- On `change`, call `todo.toggle()`. We do NOT derive checked state from
  the event — the model is the source of truth and the signal drives the
  re-render, which keeps the box visually correct.

### Rendering

- Preact tracks signal reads during render. Reading
  `state.todos.all.value`, `todo.text.value`, and `todo.done.value` inside
  the home component is enough — no extra `useComputed` needed for this
  view.

## Keys

`Todo` instances are object-identified; Preact needs a stable `key` per
list item. The model does not currently expose an id, and items are only
appended (never reordered), so the array index is a safe key for now. If
reordering or deletion is ever added, introduce an id on the `Todo` model
at that point.

## Styling

New file `src/client/routes/home.css`:

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

Follows the repo style rules: nested selectors, no font sizes below
1rem, no new colors.

## Type Tightening

In `src/client/state.ts`, replace:

```ts
todos:{ all:Signal<any>, add };
```

with:

```ts
todos:{ all:Signal<Todo[]>, add:(text:string)=>Todo };
```

`Todo` is already imported from `../shared.js`.

## Risks / Notes

- `state.ts:77` reassigns `state.todos = rpc.root.todos` inside an async
  IIFE. `state.todos` is a plain property, not a signal. The home route
  bails out when `state.rpc.value` is falsy (see `index.ts:28`), so by
  the time it reads `state.todos.all.value` the assignment has completed.
  This works today and we do not restructure it as part of this change,
  but we flag it for future work — wrapping the root with a signal would
  make the coupling explicit.

## Out of Scope / Deferred

- Per-todo ids (only needed if we add reorder/delete).
- Adding delete/edit UI (requires new model methods first).
- Wrapping `state.todos` itself in a signal.
- Tests — existing project has no test scaffolding for UI flows; we do
  not add one here.
