import { Hono } from 'hono'
import type { Env } from '../index'

const ws = new Hono<{ Bindings: Env }>()

// GET /ws/:codigoSala — Conectar WebSocket na sala
ws.get('/:codigoSala', async (c) => {
  const codigoSala = c.req.param('codigoSala')

  // Busca a sala no D1 para obter o id real e configurações
  const sala = await c.env.DB
    .prepare('SELECT * FROM salas WHERE codigo = ?')
    .bind(codigoSala)
    .first() as any

  if (!sala) {
    return c.json({ erro: 'Sala não encontrada' }, 404)
  }

  // Usa o código como nome do DO (garante mesma instância)
  const id = c.env.SALA.idFromName(codigoSala)
  const obj = c.env.SALA.get(id)

  // Repassa TODOS os query params + configurações da sala
  const url = new URL(c.req.url)
  url.searchParams.set('usuario_id', c.req.query('usuario_id') ?? 'anonimo')
  url.searchParams.set('nome', c.req.query('nome') ?? 'Jogador')
  url.searchParams.set('modo_jogo', sala.modo_jogo ?? 'sussegado')
  url.searchParams.set('musicas_por_jogador', String(sala.musicas_por_jogador ?? 2))
  url.searchParams.set('criador_id', String(sala.criador_id ?? ''))

  return obj.fetch(new Request(url.toString(), c.req.raw))
})

export default ws