import { batch, type Signal, signal } from '@preact/signals'
import PartySocket from 'partysocket'
import { RPCClient, createReflectedModel } from 'mixed-signals/client'
import Route from 'route-event'
import type { Todo, Todos } from '../shared.js'
import Debug from '@substrate-system/debug'
const debug = Debug('mixed-signals:state')

const TodoModel = createReflectedModel<Todo>(['text', 'done'], ['toggle'])
const TodosModel = createReflectedModel<Todos>(['all'], ['add'])

let HOST = 'example.com'
if (import.meta.env.DEV) {
    HOST = location.host
} else if (import.meta.env.MODE === 'staging') {
    HOST = 'staging.example.com'
}

export type AppState = {
    route:Signal<string>;
    count:Signal<number>;
    todos:{ all:Signal<Todo[]>, add:(text:string)=>Todo };
    _setRoute:(path:string)=>void;
    socket:PartySocket;
    rpc:Signal<RPCClient|null>;
}

/**
 * Setup state
 *   - routes
 *   - websocket
 *   - rpc/mixed-signals
 */
export function State ():AppState {
    const onRoute = Route()
    const socket = new PartySocket({
        host: HOST,
        prefix: 'rpc',  // replace the default `parties` URL segment
        // match the DO binding name in wrangler.jsonc
        party: 'main',
        room: 'rpc',
    })

    const rpc = new RPCClient({
        send: socket.send.bind(socket),
        onMessage: (cb) => {
            socket.addEventListener('message', (ev:MessageEvent) => {
                cb(ev.data)
            })
        },
        ready: new Promise((resolve) => {
            socket.addEventListener('open', () => {
                resolve()
            }, { once: true })
        })
    }, {})

    rpc.registerModel('Todo', TodoModel)
    rpc.registerModel('Todos', TodosModel)

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
        debug('waiting!')
        await rpc.ready
        debug('all ready...')
        batch(() => {
            state.rpc.value = rpc
            state.todos = rpc.root.todos
        })
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
