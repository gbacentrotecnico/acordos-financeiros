import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { ColaboradoresController } from './src/controllers/colaboradores.ts';
import { AcordosController } from './src/controllers/acordos.ts';
import { ParcelasController } from './src/controllers/parcelas.ts';
import { ImportacaoController } from './src/controllers/importacao.ts';
import { AuthController } from './src/controllers/auth.ts';
import { UsuariosController } from './src/controllers/usuarios.ts';
import { LojasController } from './src/controllers/lojas.ts';
import { RankingController } from './src/controllers/ranking.ts';
import { authMiddleware, roleMiddleware } from './src/middlewares/authMiddleware.ts';
import multer from 'multer';

async function startServer() {
  const app = express();
  const PORT = 3000;
  const upload = multer({ storage: multer.memoryStorage() });

  // Middlewares para análise de requisições JSON e CORS básico
  app.use(express.json());

  // Log simples de requisições
  app.use((req, res, next) => {
    console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.url}`);
    next();
  });

  // === ROTAS DA API ===

  // 0. Autenticação (Pública)
  app.post('/api/auth/login', AuthController.login);

  // 1. Gestão de Usuários (Protegida - Apenas Master)
  app.get('/api/usuarios', authMiddleware, roleMiddleware(['master']), UsuariosController.list);
  app.post('/api/usuarios', authMiddleware, roleMiddleware(['master']), UsuariosController.create);
  app.delete('/api/usuarios/:id', authMiddleware, roleMiddleware(['master']), UsuariosController.delete);

  // 1.5 Lojas (Protegida)
  app.get('/api/lojas', authMiddleware, LojasController.list);
  app.post('/api/lojas', authMiddleware, roleMiddleware(['master']), LojasController.create);
  app.put('/api/lojas/:id', authMiddleware, roleMiddleware(['master']), LojasController.update);
  app.delete('/api/lojas/:id', authMiddleware, roleMiddleware(['master']), LojasController.delete);

  // 2. Colaboradores (Protegida)
  app.get('/api/colaboradores', authMiddleware, ColaboradoresController.list);
  app.post('/api/colaboradores', authMiddleware, roleMiddleware(['master', 'diretor']), ColaboradoresController.create);

  // 3. Acordos (Protegida)
  app.get('/api/acordos', authMiddleware, AcordosController.list);
  app.post('/api/acordos', authMiddleware, roleMiddleware(['master', 'diretor']), AcordosController.create);
  app.delete('/api/acordos/:id', authMiddleware, roleMiddleware(['master']), AcordosController.delete);
  app.get('/api/acordos/:id/parcelas', authMiddleware, AcordosController.getParcelas);

  // 4. Indicadores do Dashboard (Protegida)
  app.get('/api/dashboard/indicadores', authMiddleware, AcordosController.getIndicators);
  app.get('/api/ranking', authMiddleware, RankingController.getRanking);

  // 5. Baixa de Parcelas (Protegida - Apenas Master)
  app.put('/api/parcelas/:id/descontar', authMiddleware, roleMiddleware(['master']), ParcelasController.descontar);

  // 6. Edição e Amortização de Acordos e Parcelas (Protegida - Apenas Master)
  app.post('/api/acordos/:id/amortizar', authMiddleware, roleMiddleware(['master']), AcordosController.amortizar);
  app.put('/api/acordos/:id', authMiddleware, roleMiddleware(['master']), AcordosController.update);
  app.put('/api/parcelas/:id', authMiddleware, roleMiddleware(['master']), AcordosController.updateParcela);
  app.put('/api/parcelas/:id/reverter', authMiddleware, roleMiddleware(['master']), AcordosController.reverterParcela);

  // 6. Importação em Lote (Protegida - Apenas Master)
  app.get('/api/importacao/template', authMiddleware, roleMiddleware(['master']), ImportacaoController.downloadTemplate);
  app.post('/api/importacao/upload', authMiddleware, roleMiddleware(['master']), upload.single('file'), ImportacaoController.uploadSpreadsheet);

  // Endpoint de integridade rápida
  app.get('/api/health', (req, res) => {
    res.json({ success: true, status: 'ok', environment: process.env.NODE_ENV || 'development' });
  });

  // === VITE MIDDLEWARE (Fluxo de Desenvolvimento React vs Produção Estática) ===
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    // Fallback do SPA React para rotas que não batem com a API
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n======================================================`);
    console.log(`🚀 Servidor Central de Acordos rodando na porta ${PORT}`);
    console.log(`💻 Modo de execução: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔗 URL local: http://localhost:${PORT}`);
    console.log(`======================================================\n`);
  });
}

startServer().catch((err) => {
  console.error('Falha crítica ao iniciar o servidor central:', err);
});
