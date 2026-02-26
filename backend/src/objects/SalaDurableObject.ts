import { DurableObject } from 'cloudflare:workers'

type Jogador = {
  id: string
  nome: string
  ws: WebSocket
  pontuacao: number
}

export class SalaDurableObject extends DurableObject {
  private jogadores: Map<string, Jogador> = new Map()
  private rodadaAtual: number = 0
  private emJogo: boolean = false

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)

    // Broadcast interno (chamado por rodadas.ts)
    if (url.pathname === '/broadcast') {
      const dados = await request.json()
      this.broadcast(dados)
      return new Response('ok', { status: 200 })
    }

    // Upgrade para WebSocket
    if (request.headers.get('Upgrade') === 'websocket') {
      const pair = new WebSocketPair()
      const [client, server] = Object.values(pair)

      this.ctx.acceptWebSocket(server)

      const usuario_id = url.searchParams.get('usuario_id') ?? 'anonimo'
      const nome = url.searchParams.get('nome') ?? 'Jogador'

      this.jogadores.set(usuario_id, {
        id: usuario_id,
        nome,
        ws: server,
        pontuacao: 0,
      })

      // Notifica todos com a lista atualizada
      this.broadcastJogadores()

      return new Response(null, { status: 101, webSocket: client })
    }

    return new Response('TAIÇU Sala Online', { status: 200 })
  }

  async webSocketMessage(ws: WebSocket, message: string) {
    const dados = JSON.parse(message)

    // Iniciar jogo — apenas o criador envia isso
    if (dados.tipo === 'iniciar_jogo') {
      if (this.emJogo) return
      this.emJogo = true
      this.rodadaAtual = 1

      this.broadcast({
        tipo: 'rodada_iniciada',
        numero: this.rodadaAtual,
      })
      return
    }

    // Palpite enviado via WebSocket
    if (dados.tipo === 'palpite') {
      const { usuario_id, nome, resposta } = dados

      // Verifica resposta (simples por ora)
      const correto = resposta?.toLowerCase().trim() === dados.resposta_correta?.toLowerCase().trim()

      if (correto) {
        const jogador = this.jogadores.get(usuario_id)
        if (jogador) {
          jogador.pontuacao += 100
          this.jogadores.set(usuario_id, jogador)
        }
      }

      // Feedback apenas para quem enviou
      ws.send(JSON.stringify({
        tipo: 'resultado_palpite',
        correto,
      }))

      // Placar atualizado para todos
      this.broadcastPlacar()
      return
    }

    // Fim de jogo
    if (dados.tipo === 'fim_de_jogo') {
      this.emJogo = false
      this.broadcast({
        tipo: 'fim_de_jogo',
        placar: this.getPlacar(),
      })
      return
    }

    // Broadcast genérico
    this.broadcast(dados)
  }

  async webSocketClose(ws: WebSocket) {
    this.jogadores.forEach((jogador, id) => {
      if (jogador.ws === ws) {
        this.jogadores.delete(id)
      }
    })
    this.broadcastJogadores()
  }

  private broadcast(dados: unknown) {
    const msg = JSON.stringify(dados)
    this.jogadores.forEach((jogador) => {
      if (jogador.ws.readyState === WebSocket.READY_STATE_OPEN) {
        jogador.ws.send(msg)
      }
    })
  }

  private broadcastJogadores() {
    this.broadcast({
      tipo: 'jogadores',
      jogadores: Array.from(this.jogadores.values()).map((j) => ({
        id: j.id,
        nome: j.nome,
        pontuacao: j.pontuacao,
      })),
    })
  }

  private broadcastPlacar() {
    this.broadcast({
      tipo: 'placar',
      placar: this.getPlacar(),
    })
  }

  private getPlacar() {
    return Array.from(this.jogadores.values())
      .map((j) => ({ nome: j.nome, pontuacao: j.pontuacao }))
      .sort((a, b) => b.pontuacao - a.pontuacao)
  }
}