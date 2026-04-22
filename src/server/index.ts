import { Hono } from 'hono'
import { type Fetcher } from '@cloudflare/workers-types'
import { cors } from 'hono/cors'
import { basicAuth } from 'hono/basic-auth'

type Bindings = {
    ASSETS:Fetcher
    STAGING_AUTH?:string
    STAGING_PASSWORD?:string
    NODE_ENV:string
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
