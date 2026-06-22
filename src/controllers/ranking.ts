import { Request, Response } from 'express';
import { Repo } from '../db/connection.ts';

export const RankingController = {
  /**
   * GET /api/ranking
   * Retorna o ranking dos colaboradores baseado na pontualidade.
   */
  getRanking: async (req: Request, res: Response) => {
    try {
      const ranking = await Repo.getRankingColaboradores();
      return res.json({
        success: true,
        data: ranking
      });
    } catch (error: any) {
      console.error('Erro ao calcular ranking:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Erro interno ao carregar ranking.'
      });
    }
  }
};
