import React, { useState } from 'react';
import { X, HandCoins, AlertCircle } from 'lucide-react';

interface Props {
  acordoId: number;
  acordoDescricao: string;
  token: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function AmortizacaoModal({ acordoId, acordoDescricao, token, onClose, onSuccess }: Props) {
  const [valor, setValor] = useState('');
  const [tipo, setTipo] = useState<'redividir' | 'tras_pra_frente'>('tras_pra_frente');
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
      const res = await fetch(`/api/acordos/${acordoId}/amortizar`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ valor: numValor, tipo })
      });
      const data = await res.json();
      if (data.success) {
        onSuccess();
      } else {
        setError(data.error || 'Erro ao realizar amortização.');
      }
    } catch (err) {
      setError('Falha na comunicação com o servidor.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="bg-emerald-600 p-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <HandCoins className="h-5 w-5" />
            <h3 className="font-bold text-base">Amortizar Acordo</h3>
          </div>
          <button onClick={onClose} className="hover:bg-emerald-700 p-1 rounded-lg">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="text-sm text-slate-600 bg-slate-50 p-3 rounded-lg mb-4">
            Amortizando: <strong>Acordo #{acordoId}</strong><br/>
            <span className="text-xs text-slate-500">{acordoDescricao}</span>
          </div>

          {error && (
            <div className="bg-rose-50 text-rose-700 p-3 rounded-lg text-sm flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Valor a Amortizar (R$)</label>
            <input 
              type="number"
              step="0.01"
              required
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="Ex: 500.00"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Modalidade</label>
            <div className="space-y-2 mt-2">
              <label className="flex items-start gap-3 p-3 border rounded-xl cursor-pointer hover:bg-slate-50 transition-colors">
                <input 
                  type="radio" 
                  name="tipo" 
                  value="tras_pra_frente" 
                  checked={tipo === 'tras_pra_frente'} 
                  onChange={() => setTipo('tras_pra_frente')}
                  className="mt-1"
                />
                <div>
                  <div className="font-bold text-sm text-slate-800">De Trás pra Frente</div>
                  <div className="text-xs text-slate-500">Quita ou reduz as últimas parcelas do acordo, diminuindo o prazo total, sem alterar o valor das parcelas atuais.</div>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3 border rounded-xl cursor-pointer hover:bg-slate-50 transition-colors">
                <input 
                  type="radio" 
                  name="tipo" 
                  value="redividir" 
                  checked={tipo === 'redividir'} 
                  onChange={() => setTipo('redividir')}
                  className="mt-1"
                />
                <div>
                  <div className="font-bold text-sm text-slate-800">Redividir Saldo Restante</div>
                  <div className="text-xs text-slate-500">Abate do montante final e diminui o valor de todas as parcelas pendentes, mantendo o prazo.</div>
                </div>
              </label>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl">Cancelar</button>
            <button type="submit" disabled={loading} className="px-5 py-2 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md transition-colors disabled:opacity-50">
              {loading ? 'Processando...' : 'Confirmar Amortização'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
