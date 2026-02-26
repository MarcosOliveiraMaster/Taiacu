import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'

import auth from './routes/auth'
import salas from './routes/salas'
import ws from './routes/ws'
import rodadas from './routes/rodadas'
import palpites from './routes/palpites'
import musicas from './routes/musicas'

export { SalaDurableObject } from './objects/SalaDurableObject'

export type Env = {
  DB: D1Database
  SALA: DurableObjectNamespace
}

const app = new Hono<{ Bindings: Env }>()

app.use('*', logger())
app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
}))

app.get('/', (c) => {
  return c.json({
    status: 'ok',
    app: 'TAIAÇU',
    version: '0.2.0',
    rotas: ['/auth', '/salas', '/ws', '/rodadas', '/palpites', '/musicas'],
  })
})

app.route('/auth', auth)
app.route('/salas', salas)
app.route('/ws', ws)
app.route('/rodadas', rodadas)
app.route('/palpites', palpites)
app.route('/musicas', musicas)

export default app