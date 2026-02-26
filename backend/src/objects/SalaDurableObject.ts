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
  private estadoCarregado = false
  private env: Env

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env)
    this.env = env
    // Restaura estado persistido ao acordar do hibernation
    this.ctx.blockConcurrencyWhile(async () => {
      await this.carregarEstado()
    })
  }

  // ─── Persistência ────────────────────────────────────────────

  private async carregarEstado() {
    const storage = this.ctx.storage
    const fase = await storage.get<'espera' | 'selecao' | 'jogo'>('fase')
    const musicas = await storage.get<Musica[]>('musicas')
    const jogadoresArr = await storage.get<JogadorInfo[]>('jogadores')
    const rodadaAtual = await storage.get<number>('rodadaAtual')
    const musicaAtual = await storage.get<Musica | null>('musicaAtual')
    const modoJogo = await storage.get<'sussegado' | 'arretado'>('modoJogo')
    const musicas_por_jogador = await storage.get<number>('musicas_por_jogador')

    if (fase) this.fase = fase
    if (musicas) this.musicas = musicas
    if (rodadaAtual) this.rodadaAtual = rodadaAtual
    if (musicaAtual !== undefined) this.musicaAtual = musicaAtual
    if (modoJogo) this.modoJogo = modoJogo
    if (musicas_por_jogador) this.musicas_por_jogador = musicas_por_jogador

    // Restaura jogadores (sem WebSocket — serão reconectados)
    if (jogadoresArr) {
      for (const j of jogadoresArr) {
        this.jogadores.set(j.id, j)
      }
    }

    this.estadoCarregado = true
    console.log(`[DO] Estado restaurado: fase=${this.fase}, jogadores=${this.jogadores.size}`)
  }

  private async salvarEstado() {
    const storage = this.ctx.storage
    await storage.put('fase', this.fase)
    await storage.put('musicas', this.musicas)
    await storage.put('rodadaAtual', this.rodadaAtual)
    await storage.put('musicaAtual', this.musicaAtual)
    await storage.put('modoJogo', this.modoJogo)
    await storage.put('musicas_por_jogador', this.musicas_por_jogador)
    await storage.put('jogadores', Array.from(this.jogadores.values()))
  }

  // ─── WebSocket ────────────────────────────────────────────────

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)

    if (request.headers.get('Upgrade') === 'websocket') {
      const pair = new WebSocketPair()
      const [client, server] = Object.values(pair)

      const usuario_id = url.searchParams.get('usuario_id') ?? 'anonimo'
      const nome = decodeURIComponent(url.searchParams.get('nome') ?? 'Jogador')

      // Só atualiza config se vier como parâmetro válido
      const modoParam = url.searchParams.get('modo_jogo')
      const musicasParam = url.searchParams.get('musicas_por_jogador')
      if (modoParam) this.modoJogo = modoParam as 'sussegado' | 'arretado'
      if (musicasParam) this.musicas_por_jogador = parseInt(musicasParam)

      // Aceita com tag = usuario_id
      this.ctx.acceptWebSocket(server, [usuario_id])

      // Registra ou atualiza jogador
      const existente = this.jogadores.get(usuario_id)
      this.jogadores.set(usuario_id, {
        id: usuario_id,
        nome,
        pontuacao: existente?.pontuacao ?? 0,
        confirmou_selecao: existente?.confirmou_selecao ?? false,
        musicas_count: existente?.musicas_count ?? 0,
      })

      await this.salvarEstado()

      // Envia estado atual para o novo jogador
      server.send(JSON.stringify({
        tipo: 'jogadores',
        jogadores: this.getJogadoresPublico(),
      }))

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

      if (this.fase === 'jogo' && this.musicaAtual) {
        server.send(JSON.stringify({
          tipo: 'rodada_iniciada',
          numero: this.rodadaAtual,
          total: this.musicas.length,
          musica: {
            preview_url: this.musicaAtual.preview_url,
            cover_url: this.musicaAtual.cover_url,
          },
        }))
      }

      this.broadcastJogadores()

      return new Response(null, { status: 101, webSocket: client })
    }

    return new Response('TAIAÇU Online')
  }

  async webSocketMessage(ws: WebSocket, message: string) {
    const tags = this.ctx.getTags(ws)
    const usuario_id = tags[0] ?? 'anonimo'

    let dados: Record<string, unknown>
    try {
      dados = JSON.parse(message)
    } catch {
      return
    }

    console.log(`[WS] tipo=${dados.tipo} usuario=${usuario_id}`)

    if (dados.tipo === 'iniciar_selecao') {
      if (this.fase !== 'espera') return
      this.fase = 'selecao'
      await this.salvarEstado()
      this.broadcast({ tipo: 'fase_selecao', musicas_por_jogador: this.musicas_por_jogador })
      return
    }

    if (dados.tipo === 'musica_adicionada') {
      if (dados.sync) return
      const jogador = this.jogadores.get(usuario_id)
      if (!jogador) return
      jogador.musicas_count = (jogador.musicas_count ?? 0) + 1
      await this.salvarEstado()
      this.broadcastProgresso()
      return
    }

    if (dados.tipo === 'musica_removida') {
      const jogador = this.jogadores.get(usuario_id)
      if (!jogador) return
      jogador.musicas_count = Math.max(0, (jogador.musicas_count ?? 1) - 1)
      await this.salvarEstado()
      this.broadcastProgresso()
      return
    }

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

      for (const m of musicas) {
        try {
          await this.env.DB
            .prepare('INSERT OR IGNORE INTO musicas (titulo, artista, youtube_id) VALUES (?, ?, ?)')
            .bind(m.titulo, m.artista, m.deezer_id)
            .run()
        } catch {}
      }

      await this.salvarEstado()
      this.broadcastProgresso()

      const confirmados = Array.from(this.jogadores.values()).filter((j) => j.confirmou_selecao)
      console.log(`[SELECAO] ${confirmados.length}/${this.jogadores.size} confirmaram`)

      if (confirmados.length === this.jogadores.size && this.jogadores.size > 0) {
        await this.iniciarJogo()
      }
      return
    }

    if (dados.tipo === 'voto') {
      const votado_id = dados.votado_id as string
      const tempo_ms = dados.tempo_ms as number
      if (this.votos.has(usuario_id)) return

      this.votos.set(usuario_id, votado_id)
      this.temposVoto.set(usuario_id, tempo_ms ?? 30000)

      const votantes = Array.from(this.jogadores.keys())
        .filter((id) => id !== this.musicaAtual?.dono_id)

      console.log(`[VOTO] ${this.votos.size}/${votantes.length}`)

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
      // Não remove o jogador — apenas desconecta (pode reconectar)
      console.log(`[WS] ${usuario_id} desconectou`)
    }
    // Envia lista atualizada de quem está conectado agora
    this.broadcastJogadores()
  }

  async webSocketError(ws: WebSocket) {
    const tags = this.ctx.getTags(ws)
    console.error(`[WS] erro para ${tags[0]}`)
  }

  // ─── Jogo ─────────────────────────────────────────────────────

  private async iniciarJogo() {
    this.fase = 'jogo'
    this.musicas = this.musicas.sort(() => Math.random() - 0.5)
    this.rodadaAtual = 0
    await this.salvarEstado()

    console.log(`[JOGO] Iniciando com ${this.musicas.length} músicas`)
    this.broadcast({ tipo: 'jogo_iniciando' })

    await new Promise((r) => setTimeout(r, 1000))
    await this.proximaRodada()
  }

  private async proximaRodada() {
    this.rodadaAtual += 1

    if (this.rodadaAtual > this.musicas.length) {
      this.broadcast({ tipo: 'fim_de_jogo', placar: this.getPlacar() })
      this.fase = 'espera'
      await this.salvarEstado()
      return
    }

    this.musicaAtual = this.musicas[this.rodadaAtual - 1]
    this.votos = new Map()
    this.temposVoto = new Map()
    await this.salvarEstado()

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

    await this.salvarEstado()

    this.broadcast({
      tipo: 'resultado_rodada',
      resultado: { dono_id, dono_nome: this.musicaAtual.dono_nome, votos: votosObj },
      jogadores: this.getJogadoresPublico(),
    })

    setTimeout(async () => {
      if (this.rodadaAtual >= this.musicas.length) {
        this.broadcast({ tipo: 'fim_de_jogo', placar: this.getPlacar() })
        this.fase = 'espera'
        await this.salvarEstado()
      } else {
        await this.proximaRodada()
      }
    }, 5500)
  }

  // ─── Helpers ─────────────────────────────────────────────────

  private broadcast(dados: unknown) {
    const msg = JSON.stringify(dados)
    for (const ws of this.ctx.getWebSockets()) {
      try { ws.send(msg) } catch {}
    }
  }

  private broadcastJogadores() {
    this.broadcast({ tipo: 'jogadores', jogadores: this.getJogadoresPublico() })
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
      id: j.id, nome: j.nome,
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