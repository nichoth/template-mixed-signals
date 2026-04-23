import { html } from 'htm/preact'
import { type FunctionComponent } from 'preact'
import { type AppState } from '../state.js'
import Debug from '@substrate-system/debug'
const debug = Debug('mixed-signals:route:home')

export const HomeRoute:FunctionComponent<{
    state:AppState
}> = function HomeRoute ({ state }) {
    if (!state.rpc.value) return null
    // state.todos exists when state.rpc is truthy
    const list = state.todos.all.value
    const { todos } = state
    debug('state.root', state.rpc.value?.root)
    debug('todos', list)
    debug('state.todos', todos)

    return html`<div class="route home">
        <p>home route</p>

        ${todos.all.value ?
            html`<ul>

            </ul>` :
            null
        }
    </div>`
}
