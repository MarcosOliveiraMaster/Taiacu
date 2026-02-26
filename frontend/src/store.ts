import { create } from 'zustand'

type Usuario = {
  id: string
  nome: string
  email: string
  avatar_url?: string
}

type Sala = {
  id: string
  nome: string
  codigo: string
  status: string
  criador_id: string
  modo_jogo: 'sussegado' | 'arretado'
  musicas_por_jogador: number
  max_jogadores: number
}

type Jogador = {
  id: string
  nome: string
  avatar_url?: string
  pontuacao: number
}

type MusicaSelecionada = {
  deezer_id: string
  titulo: string
  artista: string
  preview_url: string
  cover_url: string
  dono_id: string
  dono_nome: string
}

type Fase = 'espera' | 'selecao' | 'jogo' | 'resultado' | 'fim'

type Store = {
  usuario: Usuario | null
  setUsuario: (usuario: Usuario) => void

  sala: Sala | null
  setSala: (sala: Sala) => void

  jogadores: Jogador[]
  setJogadores: (jogadores: Jogador[]) => void

  rodadaAtual: number
  setRodadaAtual: (numero: number) => void

  totalRodadas: number
  setTotalRodadas: (total: number) => void

  ws: WebSocket | null
  setWs: (ws: WebSocket) => void

  fase: Fase
  setFase: (fase: Fase) => void

  musicasSelecionadas: MusicaSelecionada[]
  setMusicasSelecionadas: (musicas: MusicaSelecionada[]) => void

  reset: () => void
}

export const useStore = create<Store>((set) => ({
  usuario: null,
  setUsuario: (usuario) => set({ usuario }),

  sala: null,
  setSala: (sala) => set({ sala }),

  jogadores: [],
  setJogadores: (jogadores) => set({ jogadores }),

  rodadaAtual: 0,
  setRodadaAtual: (numero) => set({ rodadaAtual: numero }),

  totalRodadas: 0,
  setTotalRodadas: (total) => set({ totalRodadas: total }),

  ws: null,
  setWs: (ws) => set({ ws }),

  fase: 'espera',
  setFase: (fase) => set({ fase }),

  musicasSelecionadas: [],
  setMusicasSelecionadas: (musicas) => set({ musicasSelecionadas: musicas }),

  reset: () => set({
    usuario: null,
    sala: null,
    jogadores: [],
    rodadaAtual: 0,
    totalRodadas: 0,
    ws: null,
    fase: 'espera',
    musicasSelecionadas: [],
  }),
}))