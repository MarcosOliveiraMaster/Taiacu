-- ================================
-- TAIAÇU — Schema do Banco D1
-- ================================

-- Usuários
CREATE TABLE IF NOT EXISTS usuarios (
  id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  nome        TEXT NOT NULL,
  email       TEXT UNIQUE NOT NULL,
  avatar_url  TEXT,
  criado_em   TEXT DEFAULT (datetime('now'))
);

-- Salas
CREATE TABLE IF NOT EXISTS salas (
  id           TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  codigo       TEXT UNIQUE NOT NULL,
  nome         TEXT NOT NULL,
  criador_id   TEXT NOT NULL REFERENCES usuarios(id),
  max_jogadores INTEGER DEFAULT 8,
  status       TEXT DEFAULT 'aguardando', -- aguardando | em_jogo | finalizada
  criado_em    TEXT DEFAULT (datetime('now'))
);

-- Jogadores na Sala
CREATE TABLE IF NOT EXISTS jogadores_sala (
  id         TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  sala_id    TEXT NOT NULL REFERENCES salas(id),
  usuario_id TEXT NOT NULL REFERENCES usuarios(id),
  pontuacao  INTEGER DEFAULT 0,
  entrou_em  TEXT DEFAULT (datetime('now')),
  UNIQUE(sala_id, usuario_id)
);

-- Músicas
CREATE TABLE IF NOT EXISTS musicas (
  id         TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  titulo     TEXT NOT NULL,
  artista    TEXT NOT NULL,
  youtube_id TEXT NOT NULL,
  genero     TEXT,
  decada     TEXT,
  criado_em  TEXT DEFAULT (datetime('now'))
);

-- Rodadas
CREATE TABLE IF NOT EXISTS rodadas (
  id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  sala_id     TEXT NOT NULL REFERENCES salas(id),
  musica_id   TEXT NOT NULL REFERENCES musicas(id),
  numero      INTEGER NOT NULL,
  status      TEXT DEFAULT 'tocando', -- tocando | respondendo | finalizada
  iniciada_em TEXT DEFAULT (datetime('now'))
);

-- Palpites
CREATE TABLE IF NOT EXISTS palpites (
  id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  rodada_id   TEXT NOT NULL REFERENCES rodadas(id),
  usuario_id  TEXT NOT NULL REFERENCES usuarios(id),
  resposta    TEXT NOT NULL,
  correto     INTEGER DEFAULT 0,
  tempo_ms    INTEGER,
  criado_em   TEXT DEFAULT (datetime('now')),
  UNIQUE(rodada_id, usuario_id)
);