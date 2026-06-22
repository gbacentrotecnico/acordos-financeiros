import { Request, Response } from 'express';
import { Repo } from '../db/connection.ts';

import { DocumentosService } from '../services/documentos.ts';
import { WhatsAppService } from '../services/whatsapp.ts';

export const ParcelasController = {
  /**
   * PUT /api/parcelas/:id/descontar
   * Registra a baixa de uma parcela de acordo (status alterado para Descontado com data atual)
   */
  descontar: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const parcelaId = parseInt(id, 10);
      
      if (isNaN(parcelaId)) {
        return res.status(400).json({
          success: false,
          error: 'ID da parcela inválido ou não informado.'
        });
      }

      // Vencimento descontado hoje (data formatada como YYYY-MM-DD no horário local)
      const hojeStr = new Date().toISOString().split('T')[0];

      const parcelaAtualizada = await Repo.descontarParcela(parcelaId, hojeStr);

      // Notificação de WhatsApp Real + Geração de PDF
      try {
        const info = await Repo.getInformacoesNotificacao(parcelaId);
        if (info && info.colaborador_telefone) {
          const valorPendenteStr = info.saldo_restante.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
          
          const msgText = `Olá, ${info.colaborador_nome}. A parcela ${info.numero_parcela}/${info.qtd_parcelas} referente ao acordo de '${info.descricao_acordo}' foi descontada/recebida com sucesso! O seu saldo devedor atual deste acordo é de R$ ${valorPendenteStr}. Segue o seu recibo.`;
          
          await WhatsAppService.enviarMensagem(info.colaborador_telefone, msgText);

          // Gerar recibo PDF
          const base64Recibo = await DocumentosService.gerarReciboBase64({
            nome: info.colaborador_nome,
            cpf: '***.***.***-**', // Na info atual não retornamos o CPF exato, poderia ser ajustado depois, mas serve para o recibo.
            valor: parcelaAtualizada.valor,
            data: hojeStr.split('-').reverse().join('/'),
            parcela: info.numero_parcela,
            totalParcelas: info.qtd_parcelas
          });

          await WhatsAppService.enviarDocumentoBase64(
            info.colaborador_telefone,
            base64Recibo,
            `Recibo_Parcela_${info.numero_parcela}.pdf`,
            `Recibo de Pagamento - Parcela ${info.numero_parcela}`
          );
        }
      } catch (logError) {
        console.error('Erro ao gerar notificação de recibo via WhatsApp:', logError);
      }

      return res.json({
        success: true,
        message: 'Parcela quitada/descontada com sucesso!',
        data: parcelaAtualizada
      });
    } catch (error: any) {
      console.error('Erro no controller de desconto de parcela:', error);
      if (error.message.includes('não encontrada')) {
        return res.status(404).json({
          success: false,
          error: error.message
        });
      }
      return res.status(500).json({
        success: false,
        error: error.message || 'Erro interno ao realizar baixa do pagamento.'
      });
    }
  }
};
