import { Request, Response } from 'express';
import { Repo } from '../db/connection.ts';
import { CreateAcordoDTO, Parcela } from '../types.ts';

/**
 * Helper para calcular datas de vencimento mensais consecutivas
 */
function getNextDueDate(baseDateStr: string, index: number, periodicidade: 'semanal' | 'quinzenal' | 'mensal'): string {
  const d = new Date(baseDateStr + 'T12:00:00');
  
  // index is 0-based for additions (first parcel is index=0, so adds 0)
  if (periodicidade === 'semanal') {
    d.setDate(d.getDate() + (index * 7));
  } else if (periodicidade === 'quinzenal') {
    d.setDate(d.getDate() + (index * 15));
  } else {
    // mensal
    d.setMonth(d.getMonth() + index);
  }
  
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  
  return `${y}-${m}-${day}`;
}

export const AcordosController = {
  /**
   * GET /api/acordos
   * Lista todos os acordos cadastrados com nomes dos colaboradores e parcelas
   */
  list: async (req: Request, res: Response) => {
    try {
      const acordos = await Repo.getAcordos();
      return res.json({
        success: true,
        data: acordos
      });
    } catch (error: any) {
      console.error('Erro na listagem de acordos:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Erro interno ao listar acordos.'
      });
    }
  },

  /**
   * GET /api/acordos/:id/parcelas
   * Retorna as parcelas de um acordo específico
   */
  getParcelas: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const acordoId = parseInt(id, 10);
      if (isNaN(acordoId)) {
        return res.status(400).json({ success: false, error: 'ID do acordo inválido.' });
      }

      const parcelas = await Repo.getParcelasByAcordo(acordoId);
      return res.json({
        success: true,
        data: parcelas
      });
    } catch (error: any) {
      console.error('Erro ao listar parcelas do acordo:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Erro interno ao carregar parcelas.'
      });
    }
  },

  /**
   * POST /api/acordos
   * Cadastra uma nova venda ou empréstimo e gera as parcelas correspondentes divide-se o valor total.
   */
  create: async (req: Request, res: Response) => {
    try {
      const { colaborador_id, tipo, descricao, valor_total, qtd_parcelas, data_acordo, periodicidade, data_primeiro_vencimento } = req.body as CreateAcordoDTO;

      // Validações básicas
      if (!colaborador_id) {
        return res.status(400).json({ success: false, error: 'O colaborador é obrigatório.' });
      }
      if (!tipo) {
        return res.status(400).json({ success: false, error: 'Tipo de acordo inválido ou não informado.' });
      }
      if (!valor_total || valor_total <= 0) {
        return res.status(400).json({ success: false, error: 'O valor total deve ser maior que zero.' });
      }
      if (!qtd_parcelas || qtd_parcelas <= 0) {
        return res.status(400).json({ success: false, error: 'A quantidade de parcelas deve ser maior que zero.' });
      }

      if (!periodicidade || !['semanal', 'quinzenal', 'mensal'].includes(periodicidade)) {
        return res.status(400).json({ success: false, error: 'A periodicidade deve ser semanal, quinzenal ou mensal.' });
      }
      if (!data_primeiro_vencimento || !/^\d{4}-\d{2}-\d{2}$/.test(data_primeiro_vencimento)) {
        return res.status(400).json({ success: false, error: 'A data do primeiro vencimento é obrigatória e deve ser válida.' });
      }

      const dataBaseValida = data_acordo && /^\d{4}-\d{2}-\d{2}$/.test(data_acordo)
        ? data_acordo
        : new Date().toISOString().split('T')[0];

      // === ALGORITMO FINANCEIRO DE PRECISÃO (Divisão sem perda de centavos) ===
      const valorTotalCentavos = Math.round(valor_total * 100);
      const parcelaBaseCentavos = Math.floor(valorTotalCentavos / qtd_parcelas);
      const restoCentavos = valorTotalCentavos % qtd_parcelas;

      const parcelasInput: Omit<Parcela, 'id' | 'acordo_id' | 'status' | 'data_desconto'>[] = [];

      for (let i = 1; i <= qtd_parcelas; i++) {
        // Se for a última parcela, ela absorve qualquer diferença de centavos
        const valorParcelaCentavos = i === qtd_parcelas 
          ? parcelaBaseCentavos + restoCentavos 
          : parcelaBaseCentavos;

        const valorFinal = valorParcelaCentavos / 100;
        const vencimento = getNextDueDate(data_primeiro_vencimento, i - 1, periodicidade);

        parcelasInput.push({
          numero_parcela: i,
          valor: valorFinal,
          data_vencimento: vencimento
        });
      }

      // Envia os dados para salvar via repositório (com suporte a transações no Postgres)
      const resultado = await Repo.createAcordo({
        colaborador_id,
        tipo,
        descricao: (descricao || '').trim(),
        valor_total: valor_total,
        qtd_parcelas,
        data_acordo: dataBaseValida
      }, parcelasInput);

      return res.status(201).json({
        success: true,
        message: `Acordo registrado com sucesso! ${qtd_parcelas} parcelas geradas automaticamente.`,
        data: {
          acordo: resultado.acordo,
          parcelas: resultado.parcelas
        }
      });
    } catch (error: any) {
      console.error('Erro no controller de criação de acordo:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Erro interno ao cadastrar acordo.'
      });
    }
  },

  /**
   * GET /api/dashboard/indicadores
   * Retorna os indicadores do painel administrativo
   */
  getIndicators: async (req: Request, res: Response) => {
    try {
      const indicadores = await Repo.getDashboardIndicadores();
      return res.json({
        success: true,
        data: indicadores
      });
    } catch (error: any) {
      console.error('Erro ao compilar indicadores do dashboard:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Erro interno ao processar indicadores do painel.'
      });
    }
  },

  /**
   * DELETE /api/acordos/:id
   * Exclui permanentemente um acordo e todas as suas parcelas.
   */
  delete: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const acordoId = parseInt(id, 10);
      if (isNaN(acordoId)) {
        return res.status(400).json({ success: false, error: 'ID do acordo inválido.' });
      }

      await Repo.deleteAcordo(acordoId);
      
      return res.json({
        success: true,
        message: 'Acordo e parcelas removidos com sucesso.'
      });
    } catch (error: any) {
      console.error('Erro ao excluir acordo:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Erro interno ao excluir acordo.'
      });
    }
  }
};
