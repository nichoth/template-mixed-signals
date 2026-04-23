import { signal } from '@preact/signals-core'
import { RPC, createModel } from 'mixed-signals/server'
import {
    type Connection,
    type ConnectionContext,
    Server,
    type WSMessage
} from 'partyserver'
import { partyserverMiddleware } from 'hono-party'
import { Hono } from 'hono'
import type { DurableObjectNamespace, Fetcher } from '@cloudflare/workers-types'
import { cors } from 'hono/cors'
import { basicAuth } from 'hono/basic-auth'

type Bindings = {
    ASSETS:Fetcher
    MAIN:DurableObjectNamespace
    STAGING_AUTH?:string
    STAGING_PASSWORD?:string
    NODE_ENV:string
}

export const Counter = createModel((initial = 0) => {
    const count = signal(initial)
    const increment = () => count.value++
    const decrement = () => count.value--
    return { count, increment, decrement }
})

const Todo = createModel((_text = '') => {
    const text = signal(_text)
    const done = signal(false)
    const toggle = () => { done.value = !done.value }

    return { text, done, toggle }
})
export type Todo = InstanceType<typeof Todo>;

export const Todos = createModel(() => {
    const all = signal<Todo[]>([])
    function add (text: string) {
        const todo = new Todo(text)
        all.value = [...all.value, todo]
        return todo
    }

    return { all, add }
})
export type Todos = InstanceType<typeof Todos>;

const todos = new Todos()
const rpc = new RPC({ todos })
rpc.registerModel('Todo', Todo)
rpc.registerModel('Todos', Todos)

export class Main extends Server {
    todos = new Todos()
    rpc = new RPC({ todos: this.todos })

    // track cleanup functions per connection
    clients = new Map()

    // map connection.id -> message handler installed by rpc.addClient()
    clientHandlers = new Map()
    clientCleanup = new Map()

    constructor (state, env) {
        super(state, env)
        // Register the models so the RPC knows how to serialize them
        this.rpc.registerModel('Todo', Todo)
        this.rpc.registerModel('Todos', Todos)
    }

    onMessage (connection:Connection, message:WSMessage):void|Promise<void> {
        const handler = this.clientHandlers.get(connection.id)
        if (!handler) return

        try {
            const raw = typeof message === 'string' ?
                message :
                new TextDecoder().decode(message)

            handler(JSON.parse(raw))
        } catch (err) {
            console.error('Invalid JSON from client', err)
        }
    }

    onClose (connection:any):void {
        this.clientHandlers.delete(connection.id)

        const cleanup = this.clientCleanup.get(connection.id)
        if (cleanup) {
            cleanup()
            this.clientCleanup.delete(connection.id)
        }
    }

    onError (connection:Connection, error:unknown) {
        console.error(`WebSocket error for ${connection.id}`, error)
    }

    // Handle new WebSocket connections
    // onConnect (conn) {
    onConnect (conn:Connection, _ctx:ConnectionContext):void|Promise<void> {
        let msgHandler:(data:any)=>void = () => {}
        const removeClient = this.rpc.addClient({
            send: (message) => conn.send(JSON.stringify(message)),
            onMessage: (cb) => { msgHandler = cb }
        })

        this.clientHandlers.set(conn.id, msgHandler)
        this.clientCleanup.set(conn.id, removeClient)
    }
}

const app = new Hono<{ Bindings:Bindings }>()

/**
 * Basic auth for staging branch deploys.
 * Set the secret via:
 *   wrangler secret put STAGING_PASSWORD --env staging
 */
app.use('*', async (c, next) => {
    if (!c.env.STAGING_AUTH || !(c.env.NODE_ENV === 'staging')) return next()

    const auth = basicAuth({
        username: 'admin',
        password: c.env.STAGING_PASSWORD || '',
    })

    return auth(c, next)
})

// Mount PartyServer routes.
app.use('/rpc/*', partyserverMiddleware({
    options: {
        prefix: 'rpc',
    },
    onError: (err) => {
        console.error('**errr**', err)
    },
}))

app.use('/api/*', cors())

/**
 * Health check
 */
app.get('/api/health', (c) => {
    return c.json({ status: 'ok', service: 'example' })
})

app.get('/api/helloworld', (c) => {
    return c.json({ message: 'Hello, World!' })
})

app.get('/health', c => {
    return c.json({ status: 'ok' })
})

/**
 * Serve static assets (Preact frontend)
 */
app.all('*', async (c) => {
    if (!(c.env?.ASSETS)) {
        // In dev mode, let Vite handle static assets
        return c.notFound()
    }

    return await c.env.ASSETS.fetch(c.req.url) as unknown as Response
})

export default app
