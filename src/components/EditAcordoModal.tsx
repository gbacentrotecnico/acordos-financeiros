import React, { useState } from 'react';
import { X, Edit3, AlertCircle, Users, DollarSign, Calendar, FileText } from 'lucide-react';
import { TipoAcordo, Acordo, Colaborador } from '../types';

interface Props {
  acordo: Acordo;
  colaboradores: Colaborador[];
  token: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function EditAcordoModal({ acordo, colaboradores, token, onClose, onSuccess }: Props) {
  const [tipo, setTipo] = useState<TipoAcordo>(acordo.tipo);
  const [descricao, setDescricao] = useState(acordo.descricao || '');
  const [colaboradorId, setColaboradorId] = useState(String(acordo.colaborador_id));
  const [valorTotal, setValorTotal] = useState(String(acordo.valor_total));
  const [dataAcordo, setDataAcordo] = useState(
    acordo.data_acordo ? acordo.data_acordo.split('T')[0] : ''
  );
  const [status, setStatus] = useState(acordo.status);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const valTotal = parseFloat(valorTotal);
    if (isNaN(valTotal) || valTotal <= 0) {
      setError('O valor total deve ser maior que zero.');
      return;
    }

    if (!colaboradorId) {
      setError('Selecione um colaborador.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`/api/acordos/${acordo.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          tipo,
          descricao,
          colaborador_id: parseInt(colaboradorId, 10),
          valor_total: valTotal,
          data_acordo: dataAcordo,
          status
        })
      });
      const data = await res.json();
      
      if (data.success) {
        onSuccess();
      } else {
        setError(data.error || 'Erro ao editar o acordo.');
      }
    } catch (err) {
      setError('Falha de rede ao editar o acordo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="bg-indigo-600 p-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Edit3 className="h-5 w-5" />
            <h3 className="font-bold text-base">Editar Acordo #AC{acordo.id}</h3>
          </div>
          <button onClick={onClose} className="hover:bg-indigo-700 p-1 rounded-lg transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          {error && (
            <div className="bg-rose-50 text-rose-700 p-3 rounded-lg text-sm flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          {/* Colaborador */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 flex items-center gap-1">
              <Users className="h-3.5 w-3.5" />
              Colaborador
            </label>
            <select
              value={colaboradorId}
              onChange={(e) => setColaboradorId(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Selecione...</option>
              {colaboradores.map(c => (
                <option key={c.id} value={c.id}>{c.nome} — {c.loja}</option>
              ))}
            </select>
          </div>

          {/* Tipo de Acordo */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">
              Origem / Tipo de Operação
            </label>
            <select
              value={tipo}
              onChange={(e) => setTipo(e.target.value as TipoAcordo)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="veiculo_usado">Venda de Veículo Usado</option>
              <option value="moto">Venda de Motocicleta</option>
              <option value="emprestimo_vale">Empréstimo / Vale Corporativo</option>
            </select>
          </div>

          {/* Valor Total */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 flex items-center gap-1">
              <DollarSign className="h-3.5 w-3.5" />
              Valor Total do Acordo
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={valorTotal}
              onChange={(e) => setValorTotal(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
              placeholder="Ex: 18000.00"
            />
            <p className="text-[10px] text-amber-600 mt-1">
              ⚠️ Alterar o valor total NÃO recalcula as parcelas automaticamente. Use a função "Amortizar" para isso.
            </p>
          </div>

          {/* Data do Acordo */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              Data do Acordo
            </label>
            <input
              type="date"
              value={dataAcordo}
              onChange={(e) => setDataAcordo(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Status */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">
              Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as any)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ativo">Ativo</option>
              <option value="quitado">Quitado</option>
            </select>
          </div>

          {/* Descrição */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 flex items-center gap-1">
              <FileText className="h-3.5 w-3.5" />
              Descrição / Observações
            </label>
            <textarea
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Detalhes adicionais do acordo..."
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 h-24 resize-none"
            />
          </div>

          <div className="pt-2 flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 hover:bg-slate-100 text-slate-600 text-sm font-semibold py-2.5 rounded-xl transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold py-2.5 rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-50 flex justify-center items-center h-[40px]"
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              ) : (
                'Salvar Alterações'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
