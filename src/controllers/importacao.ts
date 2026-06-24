import { Request, Response } from 'express';
import * as xlsx from 'xlsx';
import { Repo } from '../db/connection.ts';
import { DocumentosService } from '../services/documentos.ts';
import { WhatsAppService } from '../services/whatsapp.ts';
import { addWeeks, addMonths, addDays } from 'date-fns';
import { TipoAcordo } from '../types.ts';

export const ImportacaoController = {
  downloadTemplate: (req: Request, res: Response) => {
    try {
      const isCsv = req.query.format === 'csv';
      const ws_name = "Planilha Modelo";
      
      const header = [
        "NOME_COLABORADOR", 
        "CPF", 
        "TELEFONE", 
        "LOJA", 
        "TIPO_ACORDO", 
        "DESCRICAO",
        "VALOR_TOTAL", 
        "VALOR_PARCELA", 
        "QTD_PARCELAS", 
        "FREQUENCIA", 
        "DATA_PRIMEIRA_PARCELA"
      ];
      
      const exampleRow = [
        "Erisvaldo", "123.456.789-00", "(11) 99999-9999", "01", "4 pneus", "", 
        2000, 500, 4, "Semanal", "21/02/2026"
      ];

      const ws = xlsx.utils.aoa_to_sheet([header, exampleRow]);
      const wb = xlsx.utils.book_new();
      xlsx.utils.book_append_sheet(wb, ws, ws_name);

      if (isCsv) {
        const csv = xlsx.utils.sheet_to_csv(ws);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="modelo_acordos.csv"');
        return res.send(csv);
      } else {
        const buf = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename="modelo_acordos.xlsx"');
        return res.send(buf);
      }
    } catch (error: any) {
      console.error('Erro ao gerar template:', error);
      res.status(500).json({ success: false, error: 'Erro ao gerar template' });
    }
  },

  uploadSpreadsheet: async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, error: 'Nenhum arquivo enviado.' });
      }

      const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const data: any[] = xlsx.utils.sheet_to_json(sheet);

      if (data.length === 0) {
        return res.status(400).json({ success: false, error: 'Planilha vazia.' });
      }

      let importados = 0;
      let erros = [];

      for (let i = 0; i < data.length; i++) {
        const row = data[i];
        try {
          const nome = row['NOME_COLABORADOR'];
          const cpf = row['CPF'];
          const telefone = row['TELEFONE'] || '';
          const loja = row['LOJA'] || 'Matriz';
          let rawTipo = String(row['TIPO_ACORDO'] || '').toLowerCase();
          let tipo: TipoAcordo = 'emprestimo_vale'; // fallback
          
          if (rawTipo.includes('oto')) {
            tipo = 'moto';
          } else if (rawTipo.includes('usado') || rawTipo.includes('veiculo') || rawTipo.includes('carro')) {
            tipo = 'veiculo_usado';
          } else {
            tipo = 'emprestimo_vale';
          }

          const descricao = row['DESCRICAO'] || '';
          const valorTotal = parseFloat(row['VALOR_TOTAL']);
          const valorParcela = parseFloat(row['VALOR_PARCELA']);
          let qtdParcelas = parseInt(row['QTD_PARCELAS'], 10);
          const frequencia = (row['FREQUENCIA'] || 'Mensal').toString().toLowerCase();
          const dataInicialStr = row['DATA_PRIMEIRA_PARCELA'];

          if (!nome || !cpf || !tipo || isNaN(valorTotal) || !dataInicialStr) {
            erros.push(`Linha ${i+2}: Dados obrigatórios faltando (Nome, CPF, Tipo, Valor, Data).`);
            continue;
          }

          if (isNaN(qtdParcelas) && !isNaN(valorParcela)) {
            qtdParcelas = Math.ceil(valorTotal / valorParcela);
          }
          if (isNaN(qtdParcelas) || qtdParcelas <= 0) {
            erros.push(`Linha ${i+2}: Quantidade de parcelas inválida.`);
            continue;
          }

          const colaboradores = await Repo.getColaboradores();
          let colaborador = colaboradores.find(c => c.cpf === cpf);
          
          if (!colaborador) {
             colaborador = await Repo.createColaborador({
               nome, cpf, telefone, loja, cargo: 'Colaborador'
             });
          }

          let dataAtual: Date;
          if (typeof dataInicialStr === 'number') {
            dataAtual = new Date(Math.round((dataInicialStr - 25569) * 86400 * 1000));
          } else {
             const partes = dataInicialStr.toString().split('/');
             if (partes.length === 3) {
               dataAtual = new Date(Number(partes[2]), Number(partes[1]) - 1, Number(partes[0]), 12, 0, 0);
             } else {
               dataAtual = new Date(dataInicialStr);
             }
          }

          const parcelasInput: any[] = [];
          
          for (let p = 1; p <= qtdParcelas; p++) {
             const vencimento = dataAtual.toISOString().split('T')[0];
             let valorP = valorParcela;
             if (isNaN(valorP) || p === qtdParcelas) {
               if (isNaN(valorP)) valorP = valorTotal / qtdParcelas;
               else {
                 const pagoAteAgora = valorParcela * (qtdParcelas - 1);
                 valorP = valorTotal - pagoAteAgora;
               }
             }

             parcelasInput.push({
               numero_parcela: p,
               valor: valorP,
               data_vencimento: vencimento
             });

             if (frequencia.includes('semanal')) {
               dataAtual = addWeeks(dataAtual, 1);
             } else if (frequencia.includes('quinzenal')) {
               dataAtual = addDays(dataAtual, 15);
             } else {
               dataAtual = addMonths(dataAtual, 1);
             }
          }

          const resultado = await Repo.createAcordo({
            colaborador_id: colaborador.id,
            tipo,
            descricao,
            valor_total: valorTotal,
            qtd_parcelas: qtdParcelas,
            data_acordo: new Date().toISOString().split('T')[0]
          }, parcelasInput);

          if (colaborador.telefone) {
             const base64Contrato = await DocumentosService.gerarContratoBase64({
               nome: colaborador.nome,
               cpf: colaborador.cpf,
               valor: valorTotal,
               tipo: tipo,
               parcelas: qtdParcelas,
               valorParcela: valorTotal / qtdParcelas
             });
             
             const msgText = `Olá ${colaborador.nome}, o seu Acordo Financeiro referente a '${tipo}' no valor de R$ ${valorTotal.toFixed(2)} foi registrado. Segue o contrato em PDF assinado digitalmente.`;
             await WhatsAppService.enviarMensagem(colaborador.telefone, msgText);
             await WhatsAppService.enviarDocumentoBase64(
               colaborador.telefone, 
               base64Contrato, 
               `Contrato_${tipo.replace(/[^a-zA-Z0-9]/g, '')}.pdf`, 
               "Contrato de Acordo"
             );
          }

          importados++;
        } catch (err: any) {
          erros.push(`Linha ${i+2}: Erro interno - ${err.message}`);
        }
      }

      return res.json({
        success: true,
        message: `Importação concluída. ${importados} acordos criados com sucesso.`,
        erros: erros.length > 0 ? erros : undefined
      });

    } catch (error: any) {
      console.error('Erro na importação:', error);
      res.status(500).json({ success: false, error: 'Erro crítico na leitura do arquivo.' });
    }
  }
};
