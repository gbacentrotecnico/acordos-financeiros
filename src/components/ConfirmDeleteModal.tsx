import React, { useState } from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';

interface Props {
  acordoId: number;
  colaboradorNome: string;
  token: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function ConfirmDeleteModal({ acordoId, colaboradorNome, token, onClose, onSuccess }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    setError(null);
    setLoading(true);

    try {
      const res = await fetch(`/api/acordos/${acordoId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      
      if (data.success) {
        onSuccess();
      } else {
        setError(data.error || 'Erro ao excluir o acordo.');
        setLoading(false);
      }
    } catch (err) {
      setError('Falha de rede ao excluir o acordo.');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="p-5 flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mb-4 shadow-sm border border-rose-200">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <h3 className="font-bold text-lg text-slate-900 mb-1">Excluir Acordo</h3>
          <p className="text-sm text-slate-500 mb-4">
            Tem certeza que deseja excluir o acordo <span className="font-bold text-slate-700">#AC{acordoId}</span> de <span className="font-bold text-slate-700">{colaboradorNome}</span>? Esta ação removerá <strong>todas</strong> as parcelas permanentemente e não pode ser desfeita.
          </p>

          {error && (
            <div className="w-full bg-rose-50 text-rose-700 p-3 rounded-lg text-xs flex items-center justify-center mb-4">
              {error}
            </div>
          )}

          <div className="flex w-full gap-3 mt-2">
            <button
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 font-semibold text-sm transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleDelete}
              disabled={loading}
              className="flex-1 px-4 py-2 bg-rose-600 text-white rounded-xl hover:bg-rose-700 font-semibold text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50 shadow-sm"
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              ) : (
                <>
                  <Trash2 className="h-4 w-4" />
                  Excluir
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
