import { Request, Response } from 'express';
import { Repo } from '../db/connection.ts';

export const UsuariosController = {
  list: async (req: Request, res: Response) => {
    try {
      const usuarios = await Repo.getUsuarios();
      res.json(usuarios);
    } catch (error) {
      res.status(500).json({ error: 'Erro ao buscar usuários' });
    }
  },

  create: async (req: Request, res: Response) => {
    try {
      const { nome, email, senha, role } = req.body;

      if (!nome || !email || !senha) {
        return res.status(400).json({ error: 'Nome, email e senha são obrigatórios' });
      }

      const roleValida = role === 'master' || role === 'diretor' ? role : 'diretor';

      const novoUsuario = await Repo.createUsuario(nome, email, senha, roleValida);
      res.status(201).json(novoUsuario);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  },

  delete: async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'ID inválido' });
      }
      
      // Validação de segurança opcional: não permitir deletar a si mesmo (precisa vir do req.user)
      await Repo.deleteUsuario(id);
      res.json({ message: 'Usuário deletado com sucesso' });
    } catch (error) {
      res.status(500).json({ error: 'Erro ao deletar usuário' });
    }
  }
};
