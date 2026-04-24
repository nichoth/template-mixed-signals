import { html } from 'htm/preact'
import { type FunctionComponent } from 'preact'
import { useSignal } from '@preact/signals'
import { type AppState, State } from '../state.js'
import { Button } from '../components/button.js'
import Debug from '@substrate-system/debug'
import { SubstrateInput } from '@substrate-system/input'
import '@substrate-system/input/css'
import { CheckBox } from '@substrate-system/check-box'
import '@substrate-system/check-box/css'
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
            <${SubstrateInput.TAG}
                name="todo"
                placeholder="What needs doing?"
                onInput=${onInput}
            ><//>
            <${Button} type="submit">Add<//>
        </form>

        <ul class="todo-list">
            ${list.map((todo, i) => {
                const done = todo.done.value
                return html`<li
                    key=${i}
                    class=${done ? 'done' : ''}
                >
                    <${CheckBox.TAG}
                        checked=${done}
                        onChange=${() => todo.toggle()}
                    >${todo.text.value}<//>
                </li>`
            })}
        </ul>
    </div>`
}
