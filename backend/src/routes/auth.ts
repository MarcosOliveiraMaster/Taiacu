import { Hono } from 'hono'
import type { Env } from '../index'

const auth = new Hono<{ Bindings: Env }>()

// POST /auth/cadastrar
auth.post('/cadastrar', async (c) => {
  const { nome, email, senha } = await c.req.json()

  if (!nome || !email || !senha) {
    return c.json({ erro: 'Nome, email e senha são obrigatórios' }, 400)
  }

  // Verifica se usuário já existe
  const existente = await c.env.DB
    .prepare('SELECT * FROM usuarios WHERE email = ?')
    .bind(email)
    .first()

  if (existente) {
    return c.json({ erro: 'Email já cadastrado' }, 409)
  }

  // Cria novo usuário
  const novo = await c.env.DB
    .prepare('INSERT INTO usuarios (nome, email, senha) VALUES (?, ?, ?) RETURNING *')
    .bind(nome, email, senha)
    .first()

  return c.json({ usuario: novo }, 201)
})

// POST /auth/entrar
auth.post('/entrar', async (c) => {
  const { email, senha } = await c.req.json()

  if (!email || !senha) {
    return c.json({ erro: 'Email e senha são obrigatórios' }, 400)
  }

  const usuario = await c.env.DB
    .prepare('SELECT * FROM usuarios WHERE email = ? AND senha = ?')
    .bind(email, senha)
    .first()

  if (!usuario) {
    return c.json({ erro: 'Email ou senha incorretos' }, 401)
  }

  return c.json({ usuario })
})

// GET /auth/:id
auth.get('/:id', async (c) => {
  const id = c.req.param('id')

  const usuario = await c.env.DB
    .prepare('SELECT * FROM usuarios WHERE id = ?')
    .bind(id)
    .first()

  if (!usuario) {
    return c.json({ erro: 'Usuário não encontrado' }, 404)
  }

  return c.json({ usuario })
})

export default auth