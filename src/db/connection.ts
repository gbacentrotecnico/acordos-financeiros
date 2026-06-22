import pg from 'pg';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import { Colaborador, Acordo, Parcela, DashboardIndicadores, Usuario } from '../types.ts';

const { Pool } = pg;

// Direções de ambiente
const usePostgres = !!(
  process.env.DATABASE_URL ||
  (process.env.DB_HOST && process.env.DB_USER && process.env.DB_PASSWORD) ||
  (process.env.PGHOST && process.env.PGUSER && process.env.PGPASSWORD)
);

let pool: pg.Pool | null = null;

if (usePostgres) {
  const config: pg.PoolConfig = process.env.DATABASE_URL
    ? { connectionString: process.env.DATABASE_URL }
    : {
        host: process.env.DB_HOST || process.env.PGHOST,
        port: parseInt(process.env.DB_PORT || process.env.PGPORT || '5432', 10),
        user: process.env.DB_USER || process.env.PGUSER,
        password: process.env.DB_PASSWORD || process.env.PGPASSWORD,
        database: process.env.DB_NAME || process.env.PGDATABASE,
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
      };

  pool = new Pool(config);

  pool.on('error', (err) => {
    console.error('Erro inesperado no pool do PostgreSQL:', err);
  });

  console.log('🔌 Conectando ao Banco de Dados PostgreSQL Externo...');
} else {
  console.log('🤖 PostgreSQL não configurado no ambiente de preview. Inicializando Banco de Dados local (JSON) para testes em tempo real...');
}

// === SISTEMA DE EMULAÇÃO LOCAL (fallback impecável para o AI Studio Preview) ===
const FILE_DB_DIR = path.join(process.cwd(), 'data');
const FILE_DB_PATH = path.join(FILE_DB_DIR, 'db.json');

interface LocalDatabase {
  usuarios: Usuario[];
  colaboradores: Colaborador[];
  acordos: Acordo[];
  parcelas: Parcela[];
}

function ensureLocalDb() {
  if (!fs.existsSync(FILE_DB_DIR)) {
    fs.mkdirSync(FILE_DB_DIR, { recursive: true });
  }
  if (!fs.existsSync(FILE_DB_PATH)) {
    // Tenta pegar o admin das variáveis de ambiente, ou usa um padrão
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@grupoabucci.com.br';
    const adminPass = process.env.ADMIN_PASS || 'admin123';
    const senhaHash = bcrypt.hashSync(adminPass, 10);

    const defaultData: LocalDatabase = {
      usuarios: [
        {
          id: 1,
          nome: 'Gestão de Finanças',
          email: adminEmail,
          senha_hash: senhaHash,
          role: 'master',
          created_at: new Date().toISOString()
        }
      ],
      colaboradores: [],
      acordos: [],
      parcelas: []
    };
    fs.writeFileSync(FILE_DB_PATH, JSON.stringify(defaultData, null, 2), 'utf-8');
  }
}

function readLocalDb(): LocalDatabase {
  ensureLocalDb();
  try {
    const content = fs.readFileSync(FILE_DB_PATH, 'utf-8');
    const db = JSON.parse(content);
    
    // Fallback migration: If 'usuarios' array is missing from an old db.json
    if (!db.usuarios) {
      const adminEmail = process.env.ADMIN_EMAIL || 'admin@grupoabucci.com.br';
      const adminPass = process.env.ADMIN_PASS || 'admin123';
      const senhaHash = bcrypt.hashSync(adminPass, 10);
      
      db.usuarios = [{
        id: 1,
        nome: 'Gestão de Finanças',
        email: adminEmail,
        senha_hash: senhaHash,
        role: 'master',
        created_at: new Date().toISOString()
      }];
      writeLocalDb(db);
    }
    
    return db;
  } catch (err) {
    console.error('Erro de leitura do DB local JSON, recriando...', err);
    ensureLocalDb();
    return JSON.parse(fs.readFileSync(FILE_DB_PATH, 'utf-8'));
  }
}

function writeLocalDb(data: LocalDatabase) {
  ensureLocalDb();
  fs.writeFileSync(FILE_DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

// === MODELOS/QUERIES UNIFICADAS (Escolhe PostgreSQL ou Local-JSON dinamicamente) ===

export const Repo = {
  // --- SEGMENTO DE USUARIOS (AUTH) ---
  
  getUsuarioByEmail: async (email: string): Promise<Usuario | null> => {
    if (usePostgres && pool) {
      const sql = 'SELECT * FROM usuarios WHERE email = $1';
      try {
        const { rows } = await pool.query(sql, [email]);
        return rows.length > 0 ? rows[0] : null;
      } catch (err) {
        console.error('Erro ao buscar usuario no Postgres:', err);
        return null;
      }
    } else {
      const db = readLocalDb();
      return db.usuarios.find(u => u.email === email) || null;
    }
  },

  getUsuarios: async (): Promise<Usuario[]> => {
    if (usePostgres && pool) {
      const sql = 'SELECT id, nome, email, role, created_at FROM usuarios ORDER BY id ASC';
      try {
        const { rows } = await pool.query(sql);
        return rows;
      } catch (err) {
        console.error('Erro ao listar usuarios:', err);
        return [];
      }
    } else {
      const db = readLocalDb();
      return db.usuarios.map(u => ({ ...u, senha_hash: '' }));
    }
  },

  createUsuario: async (nome: string, email: string, senhaLimpa: string, role: string): Promise<Usuario> => {
    const hash = bcrypt.hashSync(senhaLimpa, 10);
    if (usePostgres && pool) {
      const sql = `
        INSERT INTO usuarios (nome, email, senha_hash, role)
        VALUES ($1, $2, $3, $4)
        RETURNING id, nome, email, role, created_at
      `;
      try {
        const { rows } = await pool.query(sql, [nome, email, hash, role]);
        return rows[0];
      } catch (err: any) {
        if (err.code === '23505') throw new Error('Email já cadastrado.');
        throw new Error('Falha ao cadastrar usuário.');
      }
    } else {
      const db = readLocalDb();
      if (db.usuarios.some(u => u.email === email)) throw new Error('Email já cadastrado.');
      const id = db.usuarios.length > 0 ? Math.max(...db.usuarios.map(u => u.id)) + 1 : 1;
      const novo: Usuario = { id, nome, email, senha_hash: hash, role: role as any, created_at: new Date().toISOString() };
      db.usuarios.push(novo);
      writeLocalDb(db);
      return { ...novo, senha_hash: '' };
    }
  },

  deleteUsuario: async (id: number): Promise<void> => {
    if (usePostgres && pool) {
      await pool.query('DELETE FROM usuarios WHERE id = $1', [id]);
    } else {
      const db = readLocalDb();
      db.usuarios = db.usuarios.filter(u => u.id !== id);
      writeLocalDb(db);
    }
  },

  // --- SEGMENTO DE COLABORADORES ---

  getColaboradores: async (): Promise<Colaborador[]> => {
    if (usePostgres && pool) {
      const sql = 'SELECT id, nome, cpf, telefone, loja, cargo, created_at FROM colaboradores ORDER BY nome ASC';
      try {
        const { rows } = await pool.query(sql);
        return rows;
      } catch (err) {
        console.error('Erro ao ler colaboradores no Postgres:', err);
        throw new Error('Falha na consulta de colaboradores.', { cause: err });
      }
    } else {
      const db = readLocalDb();
      return [...db.colaboradores].sort((a, b) => a.nome.localeCompare(b.nome));
    }
  },

  createColaborador: async (newColaborador: Omit<Colaborador, 'id'>): Promise<Colaborador> => {
    if (usePostgres && pool) {
      const sql = `
        INSERT INTO colaboradores (nome, cpf, telefone, loja, cargo)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, nome, cpf, telefone, loja, cargo, created_at
      `;
      const values = [newColaborador.nome, newColaborador.cpf, newColaborador.telefone, newColaborador.loja, newColaborador.cargo];
      try {
        const { rows } = await pool.query(sql, values);
        return rows[0];
      } catch (err: any) {
        console.error('Erro ao cadastrar colaborador no Postgres:', err);
        if (err.code === '23505') {
          throw new Error('CPF já cadastrado no sistema.');
        }
        throw new Error('Falha ao cadastrar colaborador.', { cause: err });
      }
    } else {
      const db = readLocalDb();
      const exists = db.colaboradores.some(c => c.cpf === newColaborador.cpf);
      if (exists) {
        throw new Error('CPF já cadastrado no sistema.');
      }
      const id = db.colaboradores.length > 0 ? Math.max(...db.colaboradores.map(c => c.id)) + 1 : 1;
      const created: Colaborador = {
        id,
        ...newColaborador,
        created_at: new Date().toISOString()
      };
      db.colaboradores.push(created);
      writeLocalDb(db);
      return created;
    }
  },

  // --- SEGMENTO DE ACORDOS ---

  getAcordos: async (): Promise<Acordo[]> => {
    if (usePostgres && pool) {
      const sql = `
        SELECT a.*, c.nome AS colaborador_nome, c.loja AS colaborador_loja
        FROM acordos a
        JOIN colaboradores c ON a.colaborador_id = c.id
        ORDER BY a.created_at DESC
      `;
      try {
        const { rows } = await pool.query(sql);
        return rows;
      } catch (err) {
        console.error('Erro ao ler acordos no Postgres:', err);
        throw new Error('Falha na consulta de acordos.', { cause: err });
      }
    } else {
      const db = readLocalDb();
      return db.acordos.map(acordo => {
        const colab = db.colaboradores.find(c => c.id === acordo.colaborador_id);
        return {
          ...acordo,
          colaborador_nome: colab ? colab.nome : 'Desconhecido',
          colaborador_loja: colab ? colab.loja : 'Desconhecida'
        };
      }).reverse();
    }
  },

  getAcordoById: async (id: number): Promise<Acordo | null> => {
    if (usePostgres && pool) {
      const sql = 'SELECT * FROM acordos WHERE id = $1';
      try {
        const { rows } = await pool.query(sql, [id]);
        return rows.length > 0 ? rows[0] : null;
      } catch (err) {
        console.error('Erro ao buscar acordo por ID no Postgres:', err);
        throw new Error('Erro ao buscar acordo por ID.', { cause: err });
      }
    } else {
      const db = readLocalDb();
      const match = db.acordos.find(a => a.id === id);
      return match || null;
    }
  },

  createAcordo: async (
    acordoData: Omit<Acordo, 'id' | 'status'>,
    parcelasInput: Omit<Parcela, 'id' | 'acordo_id' | 'status' | 'data_desconto'>[]
  ): Promise<{ acordo: Acordo; parcelas: Parcela[] }> => {
    if (usePostgres && pool) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        // Insere o Acordo
        const insertAcordoSql = `
          INSERT INTO acordos (colaborador_id, tipo, descricao, valor_total, qtd_parcelas, status, data_acordo)
          VALUES ($1, $2, $3, $4, $5, 'ativo', $6)
          RETURNING id, colaborador_id, tipo, descricao, valor_total::float AS valor_total, qtd_parcelas, status, data_acordo, created_at
        `;
        const { rows: acordoRows } = await client.query(insertAcordoSql, [
          acordoData.colaborador_id,
          acordoData.tipo,
          acordoData.descricao,
          acordoData.valor_total,
          acordoData.qtd_parcelas,
          acordoData.data_acordo,
        ]);
        const createdAcordo = acordoRows[0];

        // Insere as Parcelas
        const createdParcelas: Parcela[] = [];
        for (const p of parcelasInput) {
          const insertParcelaSql = `
            INSERT INTO parcelas (acordo_id, numero_parcela, valor, data_vencimento, status, data_desconto)
            VALUES ($1, $2, $3, $4, 'Pendente', NULL)
            RETURNING id, acordo_id, numero_parcela, valor::float AS valor, data_vencimento, status, data_desconto, created_at
          `;
          const { rows: pRows } = await client.query(insertParcelaSql, [
            createdAcordo.id,
            p.numero_parcela,
            p.valor,
            p.data_vencimento,
          ]);
          createdParcelas.push(pRows[0]);
        }

        await client.query('COMMIT');
        return { acordo: createdAcordo, parcelas: createdParcelas };
      } catch (err) {
        await client.query('ROLLBACK');
        console.error('Erro na transação de criação de acordo no Postgres:', err);
        throw new Error('Falha ao registrar novo acordo financeiro.', { cause: err });
      } finally {
        client.release();
      }
    } else {
      const db = readLocalDb();
      const colabExists = db.colaboradores.some(c => c.id === acordoData.colaborador_id);
      if (!colabExists) {
        throw new Error('Colaborador associado não encontrado no sistema.');
      }

      const acordoId = db.acordos.length > 0 ? Math.max(...db.acordos.map(a => a.id)) + 1 : 1;
      const createdAcordo: Acordo = {
        id: acordoId,
        colaborador_id: acordoData.colaborador_id,
        tipo: acordoData.tipo,
        descricao: acordoData.descricao,
        valor_total: acordoData.valor_total,
        qtd_parcelas: acordoData.qtd_parcelas,
        status: 'ativo',
        data_acordo: acordoData.data_acordo,
        created_at: new Date().toISOString()
      };

      const createdParcelas: Parcela[] = [];
      let nextParcelaId = db.parcelas.length > 0 ? Math.max(...db.parcelas.map(p => p.id)) + 1 : 1;

      for (const p of parcelasInput) {
        const newP: Parcela = {
          id: nextParcelaId++,
          acordo_id: acordoId,
          numero_parcela: p.numero_parcela,
          valor: p.valor,
          data_vencimento: p.data_vencimento,
          status: 'Pendente',
          data_desconto: null,
          created_at: new Date().toISOString()
        };
        db.parcelas.push(newP);
        createdParcelas.push(newP);
      }

      db.acordos.push(createdAcordo);
      writeLocalDb(db);

      const colab = db.colaboradores.find(c => c.id === createdAcordo.colaborador_id);
      createdAcordo.colaborador_nome = colab ? colab.nome : 'Desconhecido';
      createdAcordo.colaborador_loja = colab ? colab.loja : 'Desconhecida';

      return { acordo: createdAcordo, parcelas: createdParcelas };
    }
  },

  // --- SEGMENTO DE PARCELAS ---

  getParcelasByAcordo: async (acordoId: number): Promise<Parcela[]> => {
    if (usePostgres && pool) {
      const sql = 'SELECT id, acordo_id, numero_parcela, valor::float AS valor, data_vencimento, status, data_desconto, created_at FROM parcelas WHERE acordo_id = $1 ORDER BY numero_parcela ASC';
      try {
        const { rows } = await pool.query(sql, [acordoId]);
        return rows;
      } catch (err) {
        console.error('Erro ao buscar parcelas no Postgres:', err);
        throw new Error('Falha ao buscar parcelas.', { cause: err });
      }
    } else {
      const db = readLocalDb();
      return db.parcelas.filter(p => p.acordo_id === acordoId).sort((a, b) => a.numero_parcela - b.numero_parcela);
    }
  },

  descontarParcela: async (parcelaId: number, dataDesconto: string): Promise<Parcela> => {
    if (usePostgres && pool) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        // Atualiza a parcela
        const updateParcelaSql = `
          UPDATE parcelas
          SET status = 'Descontado', data_desconto = $2
          WHERE id = $1
          RETURNING id, acordo_id, numero_parcela, valor::float AS valor, data_vencimento, status, data_desconto, created_at
        `;
        const { rows } = await client.query(updateParcelaSql, [parcelaId, dataDesconto]);

        if (rows.length === 0) {
          throw new Error(`Parcela com ID ${parcelaId} não encontrada.`);
        }

        const updatedParcela = rows[0];
        const acordoId = updatedParcela.acordo_id;

        // Verifica se todas as parcelas do acordo estão pagas/descontadas. Se sim, quita o acordo.
        const checkSql = `
          SELECT COUNT(*) AS pendentes
          FROM parcelas
          WHERE acordo_id = $1 AND status = 'Pendente'
        `;
        const { rows: checkRows } = await client.query(checkSql, [acordoId]);
        const pendentes = parseInt(checkRows[0].pendentes, 10);

        if (pendentes === 0) {
          const updateAcordoSql = `
            UPDATE acordos
            SET status = 'quitado'
            WHERE id = $1
          `;
          await client.query(updateAcordoSql, [acordoId]);
        }

        await client.query('COMMIT');
        return updatedParcela;
      } catch (err) {
        await client.query('ROLLBACK');
        console.error('Erro ao dar baixa em de parcela no Postgres:', err);
        throw new Error('Falha ao dar baixa na parcela.', { cause: err });
      } finally {
        client.release();
      }
    } else {
      const db = readLocalDb();
      const pIdx = db.parcelas.findIndex(p => p.id === parcelaId);
      if (pIdx === -1) {
        throw new Error(`Parcela com ID ${parcelaId} não encontrada.`);
      }

      db.parcelas[pIdx].status = 'Descontado';
      db.parcelas[pIdx].data_desconto = dataDesconto;
      const updated = db.parcelas[pIdx];

      // Verificação para quitar o acordo
      const acordoId = updated.acordo_id;
      const temPendentes = db.parcelas.some(p => p.acordo_id === acordoId && p.status === 'Pendente');
      if (!temPendentes) {
        const aIdx = db.acordos.findIndex(a => a.id === acordoId);
        if (aIdx !== -1) {
          db.acordos[aIdx].status = 'quitado';
        }
      }

      writeLocalDb(db);
      return updated;
    }
  },

  // --- SEGMENTO DE DASHBOARD E INDICADORES ---

  getDashboardIndicadores: async (): Promise<DashboardIndicadores> => {
    // Definimos a data atual como string no fuso para verificações (vencimentos anteriores a hoje estão em atraso)
    const dataHojeStr = new Date().toISOString().split('T')[0];
    const dataComecoMesStr = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-01`;
    const dataFimMesStr = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-31`; // Simplificação para o SQL / filtro

    if (usePostgres && pool) {
      try {
        // 1. Saldo Devedor Total (Soma de todas as parcelas Pendentes)
        const saldoDevedorSql = "SELECT COALESCE(SUM(valor), 0)::float AS total FROM parcelas WHERE status = 'Pendente'";
        const { rows: sdRows } = await pool.query(saldoDevedorSql);
        const saldoDevedorTotal = sdRows[0].total;

        // 2. Total Amortizado (Soma das parcelas Descontadas)
        const amortizadoSql = "SELECT COALESCE(SUM(valor), 0)::float AS total FROM parcelas WHERE status = 'Descontado'";
        const { rows: amRows } = await pool.query(amortizadoSql);
        const totalAmortizado = amRows[0].total;

        // 3. Previsão do Mês Atual (Soma das parcelas com vencimento no mês atual independente do status, ou opcionalmente todas as do mês)
        // Vamos buscar parcelas com vencimento no mês atual
        const anoMesAtual = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
        const previsaoSql = `
          SELECT COALESCE(SUM(valor), 0)::float AS total 
          FROM parcelas 
          WHERE TO_CHAR(data_vencimento, 'YYYY-MM') = $1
        `;
        const { rows: prevRows } = await pool.query(previsaoSql, [anoMesAtual]);
        const previsaoMesAtual = prevRows[0].total;

        // 4. Alertas de Parcelas em Atraso (Vencidas, status 'Pendente', vencimento < HOJE)
        const alertasSql = `
          SELECT 
            p.id AS parcela_id,
            p.acordo_id,
            c.nome AS colaborador_nome,
            c.loja,
            a.tipo,
            p.numero_parcela,
            p.valor::float AS valor,
            p.data_vencimento::text AS data_vencimento,
            (CURRENT_DATE - p.data_vencimento) AS dias_atraso
          FROM parcelas p
          JOIN acordos a ON p.acordo_id = a.id
          JOIN colaboradores c ON a.colaborador_id = c.id
          WHERE p.status = 'Pendente' AND p.data_vencimento < CURRENT_DATE
          ORDER BY dias_atraso DESC
        `;
        const { rows: alertasRows } = await pool.query(alertasSql);

        return {
          saldoDevedorTotal,
          totalAmortizado,
          previsaoMesAtual,
          alertasAtraso: alertasRows,
        };
      } catch (err) {
        console.error('Erro ao ler indicadores do Postgres:', err);
        throw new Error('Falha ao gerar indicadores do dashboard.', { cause: err });
      }
    } else {
      const db = readLocalDb();
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);

      // 1. Saldo Devedor Total
      const saldoDevedorTotal = db.parcelas
        .filter(p => p.status === 'Pendente')
        .reduce((sum, p) => sum + p.valor, 0);

      // 2. Total Amortizado
      const totalAmortizado = db.parcelas
        .filter(p => p.status === 'Descontado')
        .reduce((sum, p) => sum + p.valor, 0);

      // 3. Previsão do Mês Atual (Parcelas cujo vencimento cai no mês atual)
      const mesAtual = new Date().getMonth();
      const anoAtual = new Date().getFullYear();
      const previsaoMesAtual = db.parcelas
        .filter(p => {
          const vDate = new Date(p.data_vencimento);
          return vDate.getMonth() === mesAtual && vDate.getFullYear() === anoAtual;
        })
        .reduce((sum, p) => sum + p.valor, 0);

      // 4. Alertas de atraso (Vencimento menor que hoje, status 'Pendente')
      const alertasAtraso = db.parcelas
        .filter(p => {
          if (p.status !== 'Pendente') return false;
          // data_vencimento está em YYYY-MM-DD
          const vDate = new Date(p.data_vencimento);
          vDate.setHours(24, 0, 0, 0); // Ajustar para evitar problemas de fuso
          return vDate.getTime() < hoje.getTime();
        })
        .map(p => {
          const acordo = db.acordos.find(a => a.id === p.acordo_id)!;
          const colab = db.colaboradores.find(c => c.id === acordo.colaborador_id)!;
          
          const vDate = new Date(p.data_vencimento);
          vDate.setHours(24, 0, 0, 0);
          const diffTime = Math.abs(hoje.getTime() - vDate.getTime());
          const dias_atraso = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

          return {
            parcela_id: p.id,
            acordo_id: p.acordo_id,
            colaborador_nome: colab ? colab.nome : 'Desconhecido',
            loja: colab ? colab.loja : 'Desconhecida',
            tipo: acordo ? acordo.tipo : 'emprestimo_vale',
            numero_parcela: p.numero_parcela,
            valor: p.valor,
            data_vencimento: p.data_vencimento,
            dias_atraso: dias_atraso
          };
        })
        .sort((a, b) => b.dias_atraso - a.dias_atraso);

      return {
        saldoDevedorTotal,
        totalAmortizado,
        previsaoMesAtual,
        alertasAtraso
      };
    }
  },

  deleteAcordo: async (id: number): Promise<void> => {
    if (usePostgres && pool) {
      await pool.query('DELETE FROM parcelas WHERE acordo_id = $1', [id]);
      await pool.query('DELETE FROM acordos WHERE id = $1', [id]);
    } else {
      const dbLocal = readLocalDb();
      dbLocal.parcelas = dbLocal.parcelas.filter((p: any) => p.acordo_id !== id);
      dbLocal.acordos = dbLocal.acordos.filter((a: any) => a.id !== id);
      writeLocalDb(dbLocal);
    }
  },

  getRankingColaboradores: async (): Promise<any[]> => {
    if (usePostgres && pool) {
      const sql = `
        SELECT 
          c.id, c.nome, c.telefone, c.loja, c.cargo,
          (
            SELECT COALESCE(SUM(
              CASE 
                WHEN p.data_desconto <= p.data_vencimento THEN 10
                ELSE -5 * EXTRACT(DAY FROM (p.data_desconto::timestamp - p.data_vencimento::timestamp))
              END
            ), 0)
            FROM parcelas p
            JOIN acordos a ON p.acordo_id = a.id
            WHERE a.colaborador_id = c.id AND p.status = 'Descontado'
          ) as pontuacao
        FROM colaboradores c
        ORDER BY pontuacao DESC
      `;
      const { rows } = await pool.query(sql);
      return rows;
    } else {
      const dbLocal = readLocalDb();
      const ranking = dbLocal.colaboradores.map((c: any) => {
        let pontuacao = 0;
        dbLocal.acordos.filter((a: any) => a.colaborador_id === c.id).forEach((a: any) => {
          dbLocal.parcelas.filter((p: any) => p.acordo_id === a.id && p.status === 'Descontado').forEach((p: any) => {
            const dVenc = new Date(p.data_vencimento);
            const dDesc = new Date(p.data_desconto);
            dVenc.setUTCHours(0,0,0,0);
            dDesc.setUTCHours(0,0,0,0);
            if (dDesc <= dVenc) {
              pontuacao += 10;
            } else {
              const diffTime = dDesc.getTime() - dVenc.getTime();
              const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
              pontuacao -= (diffDays * 5);
            }
          });
        });
        return { ...c, pontuacao };
      });
      return ranking.sort((a: any, b: any) => b.pontuacao - a.pontuacao);
    }
  },

  getInformacoesNotificacao: async (parcelaId: number): Promise<{
    colaborador_nome: string;
    colaborador_telefone: string;
    numero_parcela: number;
    qtd_parcelas: number;
    descricao_acordo: string;
    saldo_restante: number;
  } | null> => {
    // Note: usePostgres is evaluated outside
    const usePostgresLocal = !!(
      process.env.DATABASE_URL ||
      (process.env.DB_HOST && process.env.DB_USER && process.env.DB_PASSWORD) ||
      (process.env.PGHOST && process.env.PGUSER && process.env.PGPASSWORD)
    );
    if (usePostgresLocal && pool) {
      const sql = `
        SELECT 
          c.nome AS colaborador_nome,
          c.telefone AS colaborador_telefone,
          p.numero_parcela,
          a.qtd_parcelas,
          a.descricao AS descricao_acordo,
          a.tipo AS tipo_acordo,
          COALESCE((
            SELECT SUM(p2.valor) 
            FROM parcelas p2 
            WHERE p2.acordo_id = a.id AND p2.status = 'Pendente'
          ), 0)::float AS saldo_restante
        FROM parcelas p
        JOIN acordos a ON p.acordo_id = a.id
        JOIN colaboradores c ON a.colaborador_id = c.id
        WHERE p.id = $1
      `;
      try {
        const { rows } = await pool.query(sql, [parcelaId]);
        if (rows.length === 0) return null;
        const r = rows[0];
        
        let desc = r.descricao_acordo;
        if (!desc || !desc.trim()) {
          if (r.tipo_acordo === 'veiculo_usado') desc = 'Veículo Usado';
          else if (r.tipo_acordo === 'moto') desc = 'Motocicleta';
          else desc = 'Empréstimo / Vale';
        }

        return {
          colaborador_nome: r.colaborador_nome,
          colaborador_telefone: r.colaborador_telefone || '',
          numero_parcela: r.numero_parcela,
          qtd_parcelas: r.qtd_parcelas,
          descricao_acordo: desc,
          saldo_restante: r.saldo_restante
        };
      } catch (err) {
        console.error('Erro ao buscar info de notificacao no Postgres:', err);
        return null;
      }
    } else {
      // Como o DB local pode ser lido de forma síncrona
      const FILE_DB_DIR = path.join(process.cwd(), 'data');
      const FILE_DB_PATH = path.join(FILE_DB_DIR, 'db.json');
      if (!fs.existsSync(FILE_DB_PATH)) return null;
      try {
        const db = JSON.parse(fs.readFileSync(FILE_DB_PATH, 'utf-8'));
        const p = db.parcelas.find((parc: any) => parc.id === parcelaId);
        if (!p) return null;
        const a = db.acordos.find((acord: any) => acord.id === p.acordo_id);
        if (!a) return null;
        const c = db.colaboradores.find((col: any) => col.id === a.colaborador_id);
        if (!c) return null;

        const saldo_restante = db.parcelas
          .filter((p2: any) => p2.acordo_id === a.id && p2.status === 'Pendente')
          .reduce((sum: number, p2: any) => sum + p2.valor, 0);

        let desc = a.descricao;
        if (!desc || !desc.trim()) {
          if (a.tipo === 'veiculo_usado') desc = 'Veículo Usado';
          else if (a.tipo === 'moto') desc = 'Motocicleta';
          else desc = 'Empréstimo / Vale';
        }

        return {
          colaborador_nome: c.nome,
          colaborador_telefone: c.telefone || '',
          numero_parcela: p.numero_parcela,
          qtd_parcelas: a.qtd_parcelas,
          descricao_acordo: desc,
          saldo_restante: saldo_restante
        };
      } catch (e) {
        return null;
      }
    }
  }
};
