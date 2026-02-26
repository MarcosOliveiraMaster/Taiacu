import { Hono } from 'hono'
import type { Env } from '../index'

const palpites = new Hono<{ Bindings: Env }>()

// POST /palpites — Enviar palpite
palpites.post('/', async (c) => {
  const { rodada_id, usuario_id, resposta, tempo_ms } = await c.req.json()

  if (!rodada_id || !usuario_id || !resposta) {
    return c.json({ erro: 'rodada_id, usuario_id e resposta são obrigatórios' }, 400)
  }

  // Busca a rodada para verificar a música
  const rodada = await c.env.DB
    .prepare('SELECT * FROM rodadas WHERE id = ?')
    .bind(rodada_id)
    .first() as any

  if (!rodada) {
    return c.json({ erro: 'Rodada não encontrada' }, 404)
  }

  // Busca a música da rodada
  const musica = await c.env.DB
    .prepare('SELECT * FROM musicas WHERE id = ?')
    .bind(rodada.musica_id)
    .first() as any

  // Verifica se o palpite está correto
  const respostaLimpa = resposta.toLowerCase().trim()
  const tituloLimpo = musica.titulo.toLowerCase().trim()
  const artistaLimpo = musica.artista.toLowerCase().trim()
  const correto = respostaLimpa === tituloLimpo || respostaLimpa === artistaLimpo ? 1 : 0

  // Salva o palpite
  const palpite = await c.env.DB
    .prepare(`
      INSERT INTO palpites (rodada_id, usuario_id, resposta, correto, tempo_ms)
      VALUES (?, ?, ?, ?, ?) RETURNING *
    `)
    .bind(rodada_id, usuario_id, resposta, correto, tempo_ms ?? 0)
    .first() as any

  // Se correto, soma pontos ao jogador
  if (correto) {
    const pontos = Math.max(100 - Math.floor(tempo_ms / 100), 10)
    await c.env.DB
      .prepare(`
        UPDATE jogadores_sala
        SET pontuacao = pontuacao + ?
        WHERE sala_id = ? AND usuario_id = ?
      `)
      .bind(pontos, rodada.sala_id, usuario_id)
      .run()
  }

  return c.json({ palpite, correto: correto === 1 }, 201)
})

// GET /palpites/:rodadaId — Listar palpites de uma rodada
palpites.get('/:rodadaId', async (c) => {
  const rodadaId = c.req.param('rodadaId')

  const resultado = await c.env.DB
    .prepare(`
      SELECT p.*, u.nome, u.avatar_url
      FROM palpites p
      JOIN usuarios u ON u.id = p.usuario_id
      WHERE p.rodada_id = ?
      ORDER BY p.tempo_ms ASC
    `)
    .bind(rodadaId)
    .all()

  return c.json({ palpites: resultado.results })
})

export default palpites