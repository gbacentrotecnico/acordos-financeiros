import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Repo } from '../db/connection.ts';

const JWT_SECRET = process.env.JWT_SECRET || 'secret_temporario_seguro_123';

export const AuthController = {
  login: async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: 'Email e senha são obrigatórios' });
      }

      const user = await Repo.getUsuarioByEmail(email);

      if (!user) {
        return res.status(401).json({ error: 'Credenciais inválidas' });
      }

      const isValid = bcrypt.compareSync(password, user.senha_hash);

      if (!isValid) {
        return res.status(401).json({ error: 'Credenciais inválidas' });
      }

      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role, nome: user.nome },
        JWT_SECRET,
        { expiresIn: '8h' }
      );

      return res.json({
        token,
        user: {
          id: user.id,
          nome: user.nome,
          email: user.email,
          role: user.role
        }
      });
    } catch (err: any) {
      console.error('Erro no login:', err);
      return res.status(500).json({ error: 'Erro interno no servidor' });
    }
  }
};
