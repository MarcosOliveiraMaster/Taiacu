import { DurableObject } from 'cloudflare:workers'

type JogadorInfo = {
  id: string
  nome: string
  pontuacao: number
  confirmou_selecao: boolean
  musicas_count: number
}

type Musica = {
  deezer_id: string
  titulo: string
  artista: string
  preview_url: string
  cover_url: string
  dono_id: string
  dono_nome: string
}

type Env = {
  DB: D1Database
}

export class SalaDurableObject extends DurableObject {
  // Dados dos jogadores (sem WebSocket — gerenciado pelo Cloudflare)
  private jogadores: Map<string, JogadorInfo> = new Map()
  private fase: 'espera' | 'selecao' | 'jogo' = 'espera'
  private musicas: Musica[] = []
  private rodadaAtual: number = 0
  private musicaAtual: Musica | null = null
  private votos: Map<string, string> = new Map()
  private temposVoto: Map<string, number> = new Map()
  private modoJogo: 'sussegado' | 'arretado' = 'sussegado'
  private musicas_por_jogador: number = 2
  private rodadaTimer: ReturnType<typeof setTimeout> | null = null
  private env: Env

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env)
    this.env = env
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)

    if (request.headers.get('Upgrade') === 'websocket') {
      const pair = new WebSocketPair()
      const [client, server] = Object.values(pair)

      const usuario_id = url.searchParams.get('usuario_id') ?? 'anonimo'
      const nome = decodeURIComponent(url.searchParams.get('nome') ?? 'Jogador')
      this.modoJogo = (url.searchParams.get('modo_jogo') ?? 'sussegado') as 'sussegado' | 'arretado'
      this.musicas_por_jogador = parseInt(url.searchParams.get('musicas_por_jogador') ?? '2')

      // Aceita WebSocket com TAG = usuario_id (permite identificar depois)
      this.ctx.acceptWebSocket(server, [usuario_id])

      // Registra jogador (preserva dados se reconectar)
      const existente = this.jogadores.get(usuario_id)
      this.jogadores.set(usuario_id, {
        id: usuario_id,
        nome,
        pontuacao: existente?.pontuacao ?? 0,
        confirmou_selecao: existente?.confirmou_selecao ?? false,
        musicas_count: existente?.musicas_count ?? 0,
      })

      // Envia estado atual só para esse jogador
      server.send(JSON.stringify({
        tipo: 'jogadores',
        jogadores: this.getJogadoresPublico(),
      }))

      // Se já está em seleção, envia progresso atual
      if (this.fase === 'selecao') {
        server.send(JSON.stringify({
          tipo: 'fase_selecao',
          musicas_por_jogador: this.musicas_por_jogador,
        }))
        server.send(JSON.stringify({
          tipo: 'selecao_progresso',
          jogadores_progresso: this.getProgresso(),
          total_musicas: this.contarMusicasAdicionadas(),
          confirmados: Array.from(this.jogadores.values())
            .filter((j) => j.confirmou_selecao).map((j) => j.id),
          total: this.jogadores.size,
        }))
      }

      // Avisa todos sobre o novo jogador
      this.broadcastJogadores()

      return new Response(null, { status: 101, webSocket: client })
    }

    return new Response('TAIAÇU Online')
  }

  async webSocketMessage(ws: WebSocket, message: string) {
    // Identifica o jogador pela tag
    const tags = this.ctx.getTags(ws)
    const usuario_id = tags[0] ?? 'anonimo'

    let dados: Record<string, unknown>
    try {
      dados = JSON.parse(message)
    } catch {
      return
    }

    console.log(`[WS] tipo=${dados.tipo} usuario=${usuario_id}`)

    // Criador inicia fase de seleção
    if (dados.tipo === 'iniciar_selecao') {
      if (this.fase !== 'espera') return
      this.fase = 'selecao'
      this.broadcast({ tipo: 'fase_selecao', musicas_por_jogador: this.musicas_por_jogador })
      return
    }

    // Jogador adicionou UMA música
    if (dados.tipo === 'musica_adicionada') {
      if (dados.sync) return // ignora o ping de sync
      const jogador = this.jogadores.get(usuario_id)
      if (!jogador) return
      jogador.musicas_count = (jogador.musicas_count ?? 0) + 1
      this.broadcastProgresso()
      return
    }

    // Jogador removeu UMA música
    if (dados.tipo === 'musica_removida') {
      const jogador = this.jogadores.get(usuario_id)
      if (!jogador) return
      jogador.musicas_count = Math.max(0, (jogador.musicas_count ?? 1) - 1)
      this.broadcastProgresso()
      return
    }

    // Jogador confirmou todas as músicas
    if (dados.tipo === 'musicas_selecionadas') {
      const musicas = dados.musicas as Musica[]
      const jogador = this.jogadores.get(usuario_id)
      if (!jogador || jogador.confirmou_selecao) return

      jogador.confirmou_selecao = true
      jogador.musicas_count = musicas.length

      for (const m of musicas) {
        if (!this.musicas.find((x) => x.deezer_id === m.deezer_id)) {
          this.musicas.push({
            deezer_id: m.deezer_id,
            titulo: m.titulo,
            artista: m.artista,
            preview_url: m.preview_url,
            cover_url: m.cover_url,
            dono_id: usuario_id,
            dono_nome: jogador.nome,
          })
        }
      }

      // Salva no D1
      for (const m of musicas) {
        try {
          await this.env.DB
            .prepare('INSERT OR IGNORE INTO musicas (titulo, artista, youtube_id) VALUES (?, ?, ?)')
            .bind(m.titulo, m.artista, m.deezer_id)
            .run()
        } catch {}
      }

      this.broadcastProgresso()

      // Verifica se todos confirmaram
      const confirmados = Array.from(this.jogadores.values())
        .filter((j) => j.confirmou_selecao)

      console.log(`[SELECAO] ${confirmados.length}/${this.jogadores.size} confirmaram`)

      if (confirmados.length === this.jogadores.size && this.jogadores.size > 0) {
        await this.iniciarJogo()
      }
      return
    }

    // Voto
    if (dados.tipo === 'voto') {
      const votado_id = dados.votado_id as string
      const tempo_ms = dados.tempo_ms as number
      if (this.votos.has(usuario_id)) return

      this.votos.set(usuario_id, votado_id)
      this.temposVoto.set(usuario_id, tempo_ms ?? 30000)

      const votantes = Array.from(this.jogadores.keys())
        .filter((id) => id !== this.musicaAtual?.dono_id)

      console.log(`[VOTO] ${this.votos.size}/${votantes.length} votos`)

      if (this.votos.size >= votantes.length) {
        if (this.rodadaTimer) clearTimeout(this.rodadaTimer)
        await this.encerrarRodada()
      }
      return
    }
  }

  async webSocketClose(ws: WebSocket) {
    const tags = this.ctx.getTags(ws)
    const usuario_id = tags[0]
    if (usuario_id) {
      this.jogadores.delete(usuario_id)
      console.log(`[WS] ${usuario_id} desconectou`)
    }
    this.broadcastJogadores()
  }

  async webSocketError(ws: WebSocket, error: unknown) {
    console.error('[WS] erro:', error)
    const tags = this.ctx.getTags(ws)
    const usuario_id = tags[0]
    if (usuario_id) this.jogadores.delete(usuario_id)
  }

  private async iniciarJogo() {
    this.fase = 'jogo'
    this.musicas = this.musicas.sort(() => Math.random() - 0.5)
    this.rodadaAtual = 0

    console.log(`[JOGO] Iniciando com ${this.musicas.length} músicas`)

    this.broadcast({ tipo: 'jogo_iniciando' })

    // Pequeno delay para o frontend navegar
    await new Promise((r) => setTimeout(r, 800))
    await this.proximaRodada()
  }

  private async proximaRodada() {
    this.rodadaAtual += 1

    if (this.rodadaAtual > this.musicas.length) {
      this.broadcast({ tipo: 'fim_de_jogo', placar: this.getPlacar() })
      return
    }

    this.musicaAtual = this.musicas[this.rodadaAtual - 1]
    this.votos = new Map()
    this.temposVoto = new Map()

    console.log(`[RODADA] ${this.rodadaAtual}/${this.musicas.length}: ${this.musicaAtual.titulo}`)

    this.broadcast({
      tipo: 'rodada_iniciada',
      numero: this.rodadaAtual,
      total: this.musicas.length,
      musica: {
        preview_url: this.musicaAtual.preview_url,
        cover_url: this.musicaAtual.cover_url,
      },
    })

    this.rodadaTimer = setTimeout(async () => {
      await this.encerrarRodada()
    }, 30000)
  }

  private async encerrarRodada() {
    if (!this.musicaAtual) return

    const dono_id = this.musicaAtual.dono_id
    const votosObj: Record<string, string> = Object.fromEntries(this.votos)
    const foiDescoberto = Array.from(this.votos.values()).includes(dono_id)

    for (const [votanteId, votadoId] of this.votos) {
      if (votadoId !== dono_id) continue
      const jogador = this.jogadores.get(votanteId)
      if (!jogador) continue

      if (this.modoJogo === 'sussegado') {
        jogador.pontuacao += 1
      } else {
        const tempoMs = this.temposVoto.get(votanteId) ?? 30000
        const tempoS = Math.max(1, tempoMs / 1000)
        jogador.pontuacao += Math.round(30 / tempoS)
      }
    }

    if (!foiDescoberto) {
      const donoJogador = this.jogadores.get(dono_id)
      if (donoJogador) {
        donoJogador.pontuacao += this.modoJogo === 'sussegado' ? 3 : 40
      }
    }

    this.broadcast({
      tipo: 'resultado_rodada',
      resultado: { dono_id, dono_nome: this.musicaAtual.dono_nome, votos: votosObj },
      jogadores: this.getJogadoresPublico(),
    })

    setTimeout(async () => {
      if (this.rodadaAtual >= this.musicas.length) {
        this.broadcast({ tipo: 'fim_de_jogo', placar: this.getPlacar() })
      } else {
        await this.proximaRodada()
      }
    }, 5500)
  }

  // ─── Helpers ────────────────────────────────────────────────

  private broadcast(dados: unknown) {
    const msg = JSON.stringify(dados)
    // USA getWebSockets() — correto para acceptWebSocket com hibernação
    for (const ws of this.ctx.getWebSockets()) {
      try { ws.send(msg) } catch {}
    }
  }

  private broadcastJogadores() {
    this.broadcast({
      tipo: 'jogadores',
      jogadores: this.getJogadoresPublico(),
    })
  }

  private broadcastProgresso() {
    this.broadcast({
      tipo: 'selecao_progresso',
      jogadores_progresso: this.getProgresso(),
      total_musicas: this.contarMusicasAdicionadas(),
      confirmados: Array.from(this.jogadores.values())
        .filter((j) => j.confirmou_selecao).map((j) => j.id),
      total: this.jogadores.size,
    })
  }

  private getProgresso() {
    return Array.from(this.jogadores.values()).map((j) => ({
      id: j.id,
      nome: j.nome,
      musicas_count: j.musicas_count ?? 0,
      confirmou: j.confirmou_selecao,
      limite: this.musicas_por_jogador,
    }))
  }

  private contarMusicasAdicionadas(): number {
    return Array.from(this.jogadores.values())
      .reduce((acc, j) => acc + (j.musicas_count ?? 0), 0)
  }

  private getJogadoresPublico() {
    return Array.from(this.jogadores.values()).map((j) => ({
      id: j.id, nome: j.nome, pontuacao: j.pontuacao,
    }))
  }

  private getPlacar() {
    return Array.from(this.jogadores.values())
      .map((j) => ({ nome: j.nome, pontuacao: j.pontuacao }))
      .sort((a, b) => b.pontuacao - a.pontuacao)
  }
}