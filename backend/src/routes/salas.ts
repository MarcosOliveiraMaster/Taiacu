import { Hono } from 'hono'
import type { Env } from '../index'

const salas = new Hono<{ Bindings: Env }>()

// Gera código único de 6 letras
function gerarCodigo(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase()
}

// POST /salas — Criar sala
salas.post('/', async (c) => {
  const { nome, criador_id } = await c.req.json()

  if (!nome || !criador_id) {
    return c.json({ erro: 'Nome e criador_id são obrigatórios' }, 400)
  }

  const codigo = gerarCodigo()

  const sala = await c.env.taiacu_db
    .prepare('INSERT INTO salas (nome, codigo, criador_id) VALUES (?, ?, ?) RETURNING *')
    .bind(nome, codigo, criador_id)
    .first()

  // Adiciona criador como jogador
  await c.env.taiacu_db
    .prepare('INSERT INTO jogadores_sala (sala_id, usuario_id) VALUES (?, ?)')
    .bind((sala as any).id, criador_id)
    .run()

  return c.json({ sala }, 201)
})

// GET /salas/:codigo — Buscar sala por código
salas.get('/:codigo', async (c) => {
  const codigo = c.req.param('codigo')

  const sala = await c.env.taiacu_db
    .prepare('SELECT * FROM salas WHERE codigo = ?')
    .bind(codigo)
    .first()

  if (!sala) {
    return c.json({ erro: 'Sala não encontrada' }, 404)
  }

  // Busca jogadores da sala
  const jogadores = await c.env.taiacu_db
    .prepare(`
      SELECT u.id, u.nome, u.avatar_url, js.pontuacao
      FROM jogadores_sala js
      JOIN usuarios u ON u.id = js.usuario_id
      WHERE js.sala_id = ?
    `)
    .bind((sala as any).id)
    .all()

  return c.json({ sala, jogadores: jogadores.results })
})

// POST /salas/:codigo/entrar — Entrar na sala
salas.post('/:codigo/entrar', async (c) => {
  const codigo = c.req.param('codigo')
  const { usuario_id } = await c.req.json()

  const sala = await c.env.taiacu_db
    .prepare('SELECT * FROM salas WHERE codigo = ?')
    .bind(codigo)
    .first()

  if (!sala) {
    return c.json({ erro: 'Sala não encontrada' }, 404)
  }

  if ((sala as any).status !== 'aguardando') {
    return c.json({ erro: 'Sala já iniciada' }, 400)
  }

  // Verifica se já está na sala
  const jaEntrou = await c.env.taiacu_db
    .prepare('SELECT * FROM jogadores_sala WHERE sala_id = ? AND usuario_id = ?')
    .bind((sala as any).id, usuario_id)
    .first()

  if (!jaEntrou) {
    await c.env.taiacu_db
      .prepare('INSERT INTO jogadores_sala (sala_id, usuario_id) VALUES (?, ?)')
      .bind((sala as any).id, usuario_id)
      .run()
  }

  return c.json({ sala })
})

export default salas