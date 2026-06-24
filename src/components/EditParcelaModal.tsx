import React, { useState } from 'react';
import { X, Edit3, AlertCircle } from 'lucide-react';

interface Props {
  parcelaId: number;
  numeroParcela: number;
  valorAtual: number;
  dataVencimentoAtual: string;
  token: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function EditParcelaModal({ parcelaId, numeroParcela, valorAtual, dataVencimentoAtual, token, onClose, onSuccess }: Props) {
  const [valor, setValor] = useState(valorAtual.toString());
  const [dataVencimento, setDataVencimento] = useState(dataVencimentoAtual);
  const [redistribuir, setRedistribuir] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const numValor = parseFloat(valor);
    if (isNaN(numValor) || numValor <= 0) {
      setError('O valor deve ser maior que zero.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/parcelas/${parcelaId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ valor: numValor, data_vencimento: dataVencimento, redistribuir })
      });
      const data = await res.json();
      if (data.success) {
        onSuccess();
      } else {
        setError(data.error || 'Erro ao editar parcela.');
      }
    } catch (err) {
      setError('Falha na comunicação com o servidor.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="bg-indigo-600 p-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Edit3 className="h-5 w-5" />
            <h3 className="font-bold text-base">Editar Parcela {numeroParcela}</h3>
          </div>
          <button onClick={onClose} className="hover:bg-indigo-700 p-1 rounded-lg">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="bg-rose-50 text-rose-700 p-3 rounded-lg text-sm flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Novo Valor (R$)</label>
            <input 
              type="number"
              step="0.01"
              required
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Vencimento</label>
            <input 
              type="date"
              required
              value={dataVencimento}
              onChange={(e) => setDataVencimento(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <label className="flex items-center gap-2 mt-2 cursor-pointer">
            <input 
              type="checkbox" 
              checked={redistribuir}
              onChange={(e) => setRedistribuir(e.target.checked)}
              className="rounded text-indigo-600 focus:ring-indigo-500"
            />
            <span className="text-sm font-medium text-slate-700">Redistribuir diferença nas outras parcelas?</span>
          </label>

          <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl">Cancelar</button>
            <button type="submit" disabled={loading} className="px-5 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md transition-colors disabled:opacity-50">
              {loading ? 'Processando...' : 'Salvar Alteração'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
