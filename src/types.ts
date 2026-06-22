// Tipos e Interfaces para o Controle de Acordos Financeiros

export type RoleUsuario = 'master' | 'diretor';

export interface Usuario {
  id: number;
  nome: string;
  email: string;
  senha_hash: string;
  role: RoleUsuario;
  created_at?: string | Date;
}

export interface Colaborador {
  id: number;
  nome: string;
  cpf: string;
  telefone: string;
  loja: string;
  cargo: string;
  created_at?: string | Date;
}

export type TipoAcordo = 'veiculo_usado' | 'moto' | 'emprestimo_vale';
export type StatusAcordo = 'ativo' | 'quitado';

export interface Acordo {
  id: number;
  colaborador_id: number;
  colaborador_nome?: string; // Campo auxiliar para junção
  colaborador_loja?: string; // Campo auxiliar para junção
  tipo: TipoAcordo;
  descricao: string;
  valor_total: number;
  qtd_parcelas: number;
  status: StatusAcordo;
  data_acordo: string;
  created_at?: string | Date;
}

export type StatusParcela = 'Pendente' | 'Descontado';

export interface Parcela {
  id: number;
  acordo_id: number;
  numero_parcela: number;
  valor: number;
  data_vencimento: string;
  status: StatusParcela;
  data_desconto: string | null;
  created_at?: string | Date;
}

// Interfaces de entrada para as APIs de criação
export interface CreateColaboradorDTO {
  nome: string;
  cpf: string;
  telefone: string;
  loja: string;
  cargo: string;
}

export interface CreateAcordoDTO {
  colaborador_id: number;
  tipo: TipoAcordo;
  descricao: string;
  valor_total: number;
  qtd_parcelas: number;
  data_acordo?: string; // formato YYYY-MM-DD
}

// Interface de resposta dos Indicadores do Dashboard
export interface DashboardIndicadores {
  saldoDevedorTotal: number;
  totalAmortizado: number;
  previsaoMesAtual: number;
  alertasAtraso: {
    parcela_id: number;
    acordo_id: number;
    colaborador_nome: string;
    loja: string;
    tipo: TipoAcordo;
    numero_parcela: number;
    valor: number;
    data_vencimento: string;
    dias_atraso: number;
  }[];
}
