-- Script de Criação do Banco de Dados PostgreSQL
-- Sistema Central de Acordos Financeiros - Rede de Auto Centers

-- 1. Tabela de Usuários (Autenticação e Perfis)
CREATE TABLE IF NOT EXISTS usuarios (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    senha_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'diretor' CHECK (role IN ('master', 'diretor')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 1.5 Tabela de Lojas
CREATE TABLE IF NOT EXISTS lojas (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(150) NOT NULL,
    endereco TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Tabela de Colaboradores
CREATE TABLE IF NOT EXISTS colaboradores (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(150) NOT NULL,
    cpf VARCHAR(14) UNIQUE NOT NULL,
    telefone VARCHAR(20) NOT NULL DEFAULT '',
    loja VARCHAR(100) NOT NULL,
    cargo VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Tabela de Acordos Financeiros
-- Tipos: 'veiculo_usado', 'moto', 'emprestimo_vale'
CREATE TABLE IF NOT EXISTS acordos (
    id SERIAL PRIMARY KEY,
    colaborador_id INTEGER NOT NULL REFERENCES colaboradores(id) ON DELETE CASCADE,
    tipo VARCHAR(50) NOT NULL,
    descricao TEXT,
    valor_total DECIMAL(12, 2) NOT NULL CHECK (valor_total > 0),
    qtd_parcelas INTEGER NOT NULL CHECK (qtd_parcelas > 0),
    status VARCHAR(20) NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'quitado')),
    data_acordo DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Tabela de Parcelas de Acordos
-- Status: 'Pendente', 'Descontado'
CREATE TABLE IF NOT EXISTS parcelas (
    id SERIAL PRIMARY KEY,
    acordo_id INTEGER NOT NULL REFERENCES acordos(id) ON DELETE CASCADE,
    numero_parcela INTEGER NOT NULL CHECK (numero_parcela > 0),
    valor DECIMAL(12, 2) NOT NULL CHECK (valor > 0),
    data_vencimento DATE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'Pendente' CHECK (status IN ('Pendente', 'Descontado')),
    data_desconto DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_parcela_acordo UNIQUE (acordo_id, numero_parcela)
);

-- Índices para otimização de buscas e relatórios
CREATE INDEX IF NOT EXISTS idx_acordos_colaborador ON acordos(colaborador_id);
CREATE INDEX IF NOT EXISTS idx_parcelas_acordo ON parcelas(acordo_id);
CREATE INDEX IF NOT EXISTS idx_parcelas_status ON parcelas(status);
CREATE INDEX IF NOT EXISTS idx_parcelas_data_vencimento ON parcelas(data_vencimento);
