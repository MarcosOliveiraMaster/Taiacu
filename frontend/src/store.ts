import { create } from 'zustand'

type Usuario = {
  id: number
  nome: string
  email: string
  avatar_url?: string
}

type Sala = {
  id: number
  nome: string
  codigo: string
  status: string
  criador_id: number
}

type Jogador = {
  id: number
  nome: string
  avatar_url?: string
  pontuacao: number
}

type Store = {
  // Usuário
  usuario: Usuario | null
  setUsuario: (usuario: Usuario) => void

  // Sala
  sala: Sala | null
  setSala: (sala: Sala) => void

  // Jogadores
  jogadores: Jogador[]
  setJogadores: (jogadores: Jogador[]) => void

  // Rodada
  rodadaAtual: number
  setRodadaAtual: (numero: number) => void

  // WebSocket
  ws: WebSocket | null
  setWs: (ws: WebSocket) => void

  // Reset
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

  ws: null,
  setWs: (ws) => set({ ws }),

  reset: () => set({
    usuario: null,
    sala: null,
    jogadores: [],
    rodadaAtual: 0,
    ws: null,
  }),
}))