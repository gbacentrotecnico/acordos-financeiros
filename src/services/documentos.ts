import PDFDocument from 'pdfkit';

export class DocumentosService {
  static gerarReciboBase64(dados: {nome: string, cpf: string, valor: number, data: string, parcela: number, totalParcelas: number}): Promise<string> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50, size: 'A4' });
        const buffers: Buffer[] = [];
        
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {
          const pdfData = Buffer.concat(buffers);
          resolve(pdfData.toString('base64'));
        });

        // Header
        doc.fontSize(22).font('Helvetica-Bold').text('RECIBO DE PAGAMENTO', { align: 'center' });
        doc.moveDown(2);
        
        // Body
        doc.fontSize(12).font('Helvetica');
        doc.text(`Recebemos do(a) Sr(a) `, { continued: true });
        doc.font('Helvetica-Bold').text(dados.nome, { continued: true });
        doc.font('Helvetica').text(`, inscrito(a) sob o CPF nº `, { continued: true });
        doc.font('Helvetica-Bold').text(dados.cpf, { continued: true });
        doc.font('Helvetica').text(`, a quantia de `, { continued: true });
        doc.font('Helvetica-Bold').text(`R$ ${dados.valor.toFixed(2).replace('.', ',')}`, { continued: true });
        doc.font('Helvetica').text(`.`);
        
        doc.moveDown();
        doc.text(`Referente ao pagamento da parcela `, { continued: true });
        doc.font('Helvetica-Bold').text(`${dados.parcela}/${dados.totalParcelas}`, { continued: true });
        doc.font('Helvetica').text(` do seu Acordo Financeiro firmado com o Grupo Abucci.`);
        
        doc.moveDown(2);
        doc.text(`Data do Pagamento/Desconto: ${dados.data}`);
        
        // Signature Line
        doc.moveDown(4);
        doc.text('____________________________________________________', { align: 'center' });
        doc.font('Helvetica-Bold').text('Grupo Abucci - Gestão Financeira', { align: 'center' });
        doc.fontSize(10).font('Helvetica').text('Autenticação Digital', { align: 'center' });
        
        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }

  static gerarContratoBase64(dados: {nome: string, cpf: string, valor: number, tipo: string, parcelas: number, valorParcela: number}): Promise<string> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50, size: 'A4' });
        const buffers: Buffer[] = [];
        
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {
          const pdfData = Buffer.concat(buffers);
          resolve(pdfData.toString('base64'));
        });

        // Header
        doc.fontSize(22).font('Helvetica-Bold').text('CONTRATO DE ACORDO FINANCEIRO', { align: 'center' });
        doc.moveDown(2);
        
        // Body
        doc.fontSize(12).font('Helvetica');
        doc.text(`Pelo presente instrumento particular, a empresa GRUPO ABUCCI e o colaborador(a) `, { continued: true });
        doc.font('Helvetica-Bold').text(dados.nome, { continued: true });
        doc.font('Helvetica').text(`, CPF nº `, { continued: true });
        doc.font('Helvetica-Bold').text(dados.cpf, { continued: true });
        doc.font('Helvetica').text(`, firmam o presente Acordo Financeiro Extra-Salário, de acordo com as seguintes condições:`);
        
        doc.moveDown(2);
        
        // Details Box
        doc.font('Helvetica-Bold').text('DETALHES DO ACORDO:');
        doc.font('Helvetica');
        doc.moveDown(0.5);
        doc.text(`Tipo de Ativo/Motivo: `, { indent: 20, continued: true }).font('Helvetica-Bold').text(dados.tipo);
        doc.font('Helvetica').text(`Valor Total Autorizado: `, { indent: 20, continued: true }).font('Helvetica-Bold').text(`R$ ${dados.valor.toFixed(2).replace('.', ',')}`);
        doc.font('Helvetica').text(`Quantidade de Parcelas: `, { indent: 20, continued: true }).font('Helvetica-Bold').text(`${dados.parcelas} vezes`);
        doc.font('Helvetica').text(`Valor Médio da Parcela: `, { indent: 20, continued: true }).font('Helvetica-Bold').text(`R$ ${dados.valorParcela.toFixed(2).replace('.', ',')}`);
        
        doc.moveDown(2);
        doc.font('Helvetica').text(`O colaborador autoriza os referidos descontos a serem efetuados conforme cronograma gerado pelo sistema central de Acordos do Grupo Abucci, servindo este documento como aceite formal das condições pactuadas.`);
        
        // Signature Line
        doc.moveDown(5);
        doc.text('____________________________________________________', { align: 'center' });
        doc.font('Helvetica-Bold').text(dados.nome, { align: 'center' });
        doc.fontSize(10).font('Helvetica').text(`Colaborador(a) - CPF: ${dados.cpf}`, { align: 'center' });
        
        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }
}
