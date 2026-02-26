import { Hono } from 'hono'
import type { Env } from '../index'

const auth = new Hono<{ Bindings: Env }>()

// POST /auth — Login ou Registro
auth.post('/', async (c) => {
  const { nome, email } = await c.req.json()

  if (!nome || !email) {
    return c.json({ erro: 'Nome e email são obrigatórios' }, 400)
  }

  // Verifica se usuário já existe
  const existente = await c.env.taiacu_db
    .prepare('SELECT * FROM usuarios WHERE email = ?')
    .bind(email)
    .first()

  if (existente) {
    return c.json({ usuario: existente })
  }

  // Cria novo usuário
  const novo = await c.env.taiacu_db
    .prepare('INSERT INTO usuarios (nome, email) VALUES (?, ?) RETURNING *')
    .bind(nome, email)
    .first()

  return c.json({ usuario: novo }, 201)
})

// GET /auth/:id — Buscar usuário por ID
auth.get('/:id', async (c) => {
  const id = c.req.param('id')

  const usuario = await c.env.taiacu_db
    .prepare('SELECT * FROM usuarios WHERE id = ?')
    .bind(id)
    .first()

  if (!usuario) {
    return c.json({ erro: 'Usuário não encontrado' }, 404)
  }

  return c.json({ usuario })
})

export default auth