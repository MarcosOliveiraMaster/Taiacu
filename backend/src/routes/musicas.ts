import { Hono } from 'hono'
import type { Env } from '../index'

const musicas = new Hono<{ Bindings: Env }>()

// GET /musicas — Listar todas as músicas
musicas.get('/', async (c) => {
  const { busca, genero, decada } = c.req.query()

  let query = 'SELECT * FROM musicas WHERE 1=1'
  const params: string[] = []

  if (busca) {
    query += ' AND (titulo LIKE ? OR artista LIKE ?)'
    params.push(`%${busca}%`, `%${busca}%`)
  }

  if (genero) {
    query += ' AND genero = ?'
    params.push(genero)
  }

  if (decada) {
    query += ' AND decada = ?'
    params.push(decada)
  }

  query += ' ORDER BY titulo ASC LIMIT 100'

  const resultado = await c.env.DB
    .prepare(query)
    .bind(...params)
    .all()

  return c.json({ musicas: resultado.results })
})

// POST /musicas — Adicionar música
musicas.post('/', async (c) => {
  const { titulo, artista, youtube_id, genero, decada } = await c.req.json()

  if (!titulo || !artista || !youtube_id) {
    return c.json({ erro: 'titulo, artista e youtube_id são obrigatórios' }, 400)
  }

  const musica = await c.env.DB
    .prepare('INSERT INTO musicas (titulo, artista, youtube_id, genero, decada) VALUES (?, ?, ?, ?, ?) RETURNING *')
    .bind(titulo, artista, youtube_id, genero ?? null, decada ?? null)
    .first()

  return c.json({ musica }, 201)
})

export default musicas