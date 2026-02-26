import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'

import auth from './routes/auth'
import salas from './routes/salas'
import ws from './routes/ws'
import rodadas from './routes/rodadas'
import palpites from './routes/palpites'

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
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
}))

// Health check
app.get('/', (c) => {
  return c.json({
    status: 'ok',
    app: 'TAIAÇU',
    version: '0.1.0',
    rotas: ['/auth', '/salas', '/ws', '/rodadas', '/palpites'],
  })
})

// Rotas
app.route('/auth', auth)
app.route('/salas', salas)
app.route('/ws', ws)
app.route('/rodadas', rodadas)
app.route('/palpites', palpites)

export default app