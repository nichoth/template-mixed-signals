import { type Signal, signal } from '@preact/signals'
import PartySocket from 'partysocket'
import { RPCClient, createReflectedModel } from 'mixed-signals/client'
import Route from 'route-event'
import type { Todo, Todos } from '../shared.js'
import Debug from '@substrate-system/debug'
const debug = Debug('mixed-signals')

const TodoModel = createReflectedModel<Todo>(['text', 'done'], ['toggle'])
const TodosModel = createReflectedModel<Todos>(['all'], ['add'])

let HOST = 'example.com'
if (import.meta.env.DEV) {
    HOST = 'localhost:8888'
} else if (import.meta.env.MODE === 'staging') {
    HOST = 'staging.example.com'
}

export type AppState = {
    route:Signal<string>;
    count:Signal<number>;
    todos:{ all:Signal<any>, add };
    _setRoute:(path:string)=>void;
    socket:PartySocket;
    rpc:Signal<RPCClient|null>;
}

/**
 * Setup any state
 *   - routes
 */
export function State ():AppState {  // eslint-disable-line indent
    const onRoute = Route()
    const socket = new PartySocket({
        host: HOST,
        prefix: 'rpc',  // replaces the default `parties` URL segment
        // Must match the DO binding name in wrangler.jsonc, lowercased
        party: 'main',
        room: 'rpc',
    })

    debug('in state')

    const rpc = new RPCClient({
        send: socket.send.bind(socket),
        onMessage: socket.addEventListener.bind(socket, 'message'),
        ready: new Promise((resolve) => {
            socket.addEventListener('open', () => {
                debug('open!!!')
                resolve()
            }, { once: true })
        })
    }, {})
    rpc.registerModel('Todo', TodoModel)
    rpc.registerModel('Todos', TodosModel)

    debug('rpcccccccc', rpc)

    const state = {
        _setRoute: onRoute.setRoute.bind(onRoute),
        socket,
        rpc: signal<null|RPCClient>(null),
        count: signal<number>(0),
        route: signal<string>(location.pathname + location.search),
        // rpc.root is the synchronized instance of TodosModel
        todos: rpc.root,
    };

    (async () => {
        await rpc.ready
        state.rpc.value = rpc
    })()

    /**
     * set the app state to match the browser URL
     */
    onRoute((path:string, data) => {
        if (state.route.value !== path) {
            state.route.value = path
        }
        // handle scroll state like a web browser
        // (restore scroll position on back/forward)
        if (data.popstate) {
            return window.scrollTo(data.scrollX, data.scrollY)
        }

        // if this was a link click (not back button), then scroll to top
        window.scrollTo(0, 0)
    })

    return state
}

State.addTodo = function (state:AppState, text:string) {
    state.todos.add(text)
}

State.Increase = function (state:ReturnType<typeof State>) {
    state.count.value++
}

State.Decrease = function (state:ReturnType<typeof State>) {
    state.count.value--
}
