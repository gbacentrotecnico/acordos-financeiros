import { Request, Response } from 'express';
import { Repo } from '../db/connection.ts';
import { CreateLojaDTO } from '../types.ts';

export const LojasController = {
  list: async (req: Request, res: Response) => {
    try {
      const lojas = await Repo.getLojas();
      return res.json({ success: true, data: lojas });
    } catch (err: any) {
      console.error('Erro no LojasController.list:', err);
      return res.status(500).json({ success: false, error: 'Erro ao listar lojas.' });
    }
  },

  create: async (req: Request, res: Response) => {
    try {
      const data: CreateLojaDTO = req.body;
      if (!data.nome || !data.endereco) {
        return res.status(400).json({ success: false, error: 'Nome e endereço são obrigatórios.' });
      }

      const novaLoja = await Repo.createLoja(data.nome, data.endereco);
      return res.status(201).json({ success: true, data: novaLoja });
    } catch (err: any) {
      console.error('Erro no LojasController.create:', err);
      return res.status(500).json({ success: false, error: err.message || 'Erro interno ao criar loja.' });
    }
  },

  update: async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id, 10);
      const data: CreateLojaDTO = req.body;

      if (isNaN(id)) {
        return res.status(400).json({ success: false, error: 'ID inválido.' });
      }

      if (!data.nome || !data.endereco) {
        return res.status(400).json({ success: false, error: 'Nome e endereço são obrigatórios.' });
      }

      const lojaAtualizada = await Repo.updateLoja(id, data.nome, data.endereco);
      return res.json({ success: true, data: lojaAtualizada });
    } catch (err: any) {
      console.error('Erro no LojasController.update:', err);
      return res.status(500).json({ success: false, error: err.message || 'Erro ao atualizar loja.' });
    }
  },

  delete: async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ success: false, error: 'ID inválido.' });
      }

      await Repo.deleteLoja(id);
      return res.json({ success: true });
    } catch (err: any) {
      console.error('Erro no LojasController.delete:', err);
      return res.status(500).json({ success: false, error: 'Erro ao remover loja.' });
    }
  }
};
