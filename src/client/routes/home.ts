import { html } from 'htm/preact'
import { type FunctionComponent } from 'preact'
import { type AppState } from '../state.js'
import Debug from '@substrate-system/debug'
const debug = Debug('mixed-signals')

export const HomeRoute:FunctionComponent<{
    state:AppState
}> = function HomeRoute ({ state }) {
    const { todos } = state
    debug('todos', todos)

    return html`<div class="route home">
        <p>home route</p>

        ${todos.all.value ?
            html`<ul>

            </ul>` :
            null
        }
    </div>`
}
