import { Hono } from 'hono'
import type { Env } from '../index'

const ws = new Hono<{ Bindings: Env }>()

// GET /ws/:salaId — Conectar WebSocket na sala
ws.get('/:salaId', async (c) => {
  const salaId = c.req.param('salaId')
  const usuario_id = c.req.query('usuario_id') ?? 'anonimo'
  const nome = c.req.query('nome') ?? 'Jogador'

  // Busca ou cria o Durable Object da sala
  const id = c.env.SALA.idFromName(salaId)
  const sala = c.env.SALA.get(id)

  // Repassa a requisição para o Durable Object
  const url = new URL(c.req.url)
  url.searchParams.set('usuario_id', usuario_id)
  url.searchParams.set('nome', nome)

  return sala.fetch(new Request(url.toString(), c.req.raw))
})

export default ws