import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'

export { SalaDurableObject } from './objects/SalaDurableObject'

export type Env = {
  taiacu_db: D1Database
  taiacu_kv: KVNamespace
  SALA: DurableObjectNamespace
}

const app = new Hono<{ Bindings: Env }>()

// Middlewares
app.use('*', logger())
app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
}))

// Health check
app.get('/', (c) => {
  return c.json({
    status: 'ok',
    app: 'TAIAÇU',
    version: '0.1.0',
  })
})

export default app