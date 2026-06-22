import { Request, Response } from 'express';
import { Repo } from '../db/connection.ts';
import { CreateColaboradorDTO } from '../types.ts';

/**
 * Controller para Colaboradores
 */
export const ColaboradoresController = {
  /**
   * GET /api/colaboradores
   * Lista todos os funcionários com suas respectivas lojas e cargos
   */
  list: async (req: Request, res: Response) => {
    try {
      const colaboradores = await Repo.getColaboradores();
      return res.json({
        success: true,
        data: colaboradores
      });
    } catch (error: any) {
      console.error('Erro no controller de listagem de colaboradores:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Erro interno ao listar colaboradores.'
      });
    }
  },

  /**
   * POST /api/colaboradores
   * Cadastra um novo funcionário associado a uma loja
   */
  create: async (req: Request, res: Response) => {
    try {
      const { nome, cpf, telefone, loja, cargo } = req.body as CreateColaboradorDTO;

      // Validações básicas
      if (!nome || !nome.trim()) {
        return res.status(400).json({ success: false, error: 'O nome do colaborador é obrigatório.' });
      }
      if (!cpf || !cpf.trim()) {
        return res.status(400).json({ success: false, error: 'O CPF do colaborador é obrigatório.' });
      }
      if (!telefone || !telefone.trim()) {
        return res.status(400).json({ success: false, error: 'O telefone/WhatsApp do colaborador é obrigatório.' });
      }
      if (!loja || !loja.trim()) {
        return res.status(400).json({ success: false, error: 'A loja associada é obrigatória.' });
      }
      if (!cargo || !cargo.trim()) {
        return res.status(400).json({ success: false, error: 'O cargo do colaborador é obrigatório.' });
      }

      // Limpar formatação simples de CPF para consistência (apenas números)
      const cpfLimpo = cpf.replace(/\D/g, '');
      if (cpfLimpo.length !== 11) {
        return res.status(400).json({ success: false, error: 'CPF inválido. Deve possuir 11 dígitos.' });
      }

      // Máscara amigável para persistir (ex: 123.456.789-00)
      const cpfMascara = `${cpfLimpo.slice(0, 3)}.${cpfLimpo.slice(3, 6)}.${cpfLimpo.slice(6, 9)}-${cpfLimpo.slice(9, 11)}`;

      const novoColab = await Repo.createColaborador({
        nome: nome.trim(),
        cpf: cpfMascara,
        telefone: telefone.trim(),
        loja: loja.trim(),
        cargo: cargo.trim()
      });

      return res.status(201).json({
        success: true,
        message: 'Colaborador cadastrado com sucesso!',
        data: novoColab
      });
    } catch (error: any) {
      console.error('Erro no controller de cadastro de colaborador:', error);
      if (error.message.includes('CPF já cadastrado')) {
        return res.status(409).json({
          success: false,
          error: error.message
        });
      }
      return res.status(500).json({
        success: false,
        error: error.message || 'Erro interno ao cadastrar colaborador.'
      });
    }
  }
};
