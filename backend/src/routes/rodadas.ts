import { Hono } from 'hono'
import type { Env } from '../index'

const rodadas = new Hono<{ Bindings: Env }>()

// POST /rodadas — Iniciar nova rodada
rodadas.post('/', async (c) => {
  const { sala_id, musica_id, numero } = await c.req.json()

  if (!sala_id || !musica_id || !numero) {
    return c.json({ erro: 'sala_id, musica_id e numero são obrigatórios' }, 400)
  }

  const rodada = await c.env.DB
    .prepare('INSERT INTO rodadas (sala_id, musica_id, numero) VALUES (?, ?, ?) RETURNING *')
    .bind(sala_id, musica_id, numero)
    .first()

  // Notifica jogadores via Durable Object
  const id = c.env.SALA.idFromName(sala_id)
  const sala = c.env.SALA.get(id)
  await sala.fetch(new Request('https://sala/broadcast', {
    method: 'POST',
    body: JSON.stringify({
      tipo: 'nova_rodada',
      rodada,
    }),
  }))

  return c.json({ rodada }, 201)
})

// GET /rodadas/:id — Buscar rodada
rodadas.get('/:id', async (c) => {
  const id = c.req.param('id')

  const rodada = await c.env.DB
    .prepare('SELECT * FROM rodadas WHERE id = ?')
    .bind(id)
    .first()

  if (!rodada) {
    return c.json({ erro: 'Rodada não encontrada' }, 404)
  }

  return c.json({ rodada })
})

// PATCH /rodadas/:id/finalizar — Finalizar rodada
rodadas.patch('/:id/finalizar', async (c) => {
  const id = c.req.param('id')

  await c.env.DB
    .prepare("UPDATE rodadas SET status = 'finalizada' WHERE id = ?")
    .bind(id)
    .run()

  const rodada = await c.env.DB
    .prepare('SELECT * FROM rodadas WHERE id = ?')
    .bind(id)
    .first()

  return c.json({ rodada })
})

export default rodadas