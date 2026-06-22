import axios from 'axios';

// Variáveis de ambiente devem estar configuradas no .env
const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || 'http://localhost:8080';
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || 'YOUR_API_KEY';
const INSTANCE_NAME = process.env.EVOLUTION_INSTANCE_NAME || 'default';

export class WhatsAppService {
  /**
   * Formata o telefone para o padrão DDI+DDD+NUMERO (ex: 5511999999999)
   */
  static formatPhone(phone: string): string {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10 || cleaned.length === 11) {
      return `55${cleaned}`;
    }
    return cleaned;
  }

  static async enviarMensagem(telefone: string, mensagem: string): Promise<boolean> {
    try {
      if (!process.env.EVOLUTION_API_URL) {
        console.warn('⚠️ EVOLUTION_API_URL não configurada. Simulando envio de mensagem:', mensagem);
        return true;
      }

      const url = `${EVOLUTION_API_URL}/message/sendText/${INSTANCE_NAME}`;
      const numFormatado = this.formatPhone(telefone);
      
      await axios.post(url, {
        number: numFormatado,
        options: {
          delay: 1200,
          presence: "composing",
        },
        textMessage: {
          text: mensagem
        }
      }, {
        headers: { apikey: EVOLUTION_API_KEY }
      });
      return true;
    } catch (error: any) {
      console.error('Erro ao enviar mensagem Evolution:', error?.response?.data || error.message);
      return false;
    }
  }

  static async enviarDocumentoBase64(telefone: string, base64Data: string, fileName: string, caption: string): Promise<boolean> {
    try {
      if (!process.env.EVOLUTION_API_URL) {
        console.warn(`⚠️ EVOLUTION_API_URL não configurada. Simulando envio de documento ${fileName}`);
        return true;
      }

      const url = `${EVOLUTION_API_URL}/message/sendMedia/${INSTANCE_NAME}`;
      const numFormatado = this.formatPhone(telefone);
      const base64Prefix = 'data:application/pdf;base64,';
      const formattedBase64 = base64Data.startsWith('data:') ? base64Data : base64Prefix + base64Data;
      
      await axios.post(url, {
        number: numFormatado,
        options: {
          delay: 1200,
          presence: "composing",
        },
        mediaMessage: {
          mediatype: "document",
          fileName: fileName,
          caption: caption,
          media: formattedBase64
        }
      }, {
        headers: { apikey: EVOLUTION_API_KEY }
      });
      return true;
    } catch (error: any) {
      console.error('Erro ao enviar documento Evolution:', error?.response?.data || error.message);
      return false;
    }
  }
}
