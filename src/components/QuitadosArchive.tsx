import React, { useState } from 'react';
import { Archive, Search, Trash2, Loader2, MapPin } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Acordo } from '../types';

interface QuitadosArchiveProps {
  acordos: Acordo[];
  onUpdate: () => void;
}

export default function QuitadosArchive({ acordos, onUpdate }: QuitadosArchiveProps) {
  const { user, token } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [loadingId, setLoadingId] = useState<number | null>(null);

  // Filtra apenas os quitados
  const quitados = acordos.filter(ac => ac.status === 'quitado');

  // Filtro de busca por nome ou descrição
  const filteredQuitados = quitados.filter(ac => {
    const nomeColab = ac.colaborador_nome?.toLowerCase() || '';
    const desc = ac.descricao?.toLowerCase() || '';
    return nomeColab.includes(searchTerm.toLowerCase()) || desc.includes(searchTerm.toLowerCase());
  });

  const handleDelete = async (id: number) => {
    if (!confirm('Deseja realmente EXCLUIR PERMANENTEMENTE este acordo quitado e todas as suas parcelas do histórico? Essa ação não pode ser desfeita.')) return;
    
    setLoadingId(id);
    try {
      const res = await fetch(`/api/acordos/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        onUpdate();
      } else {
        alert('Erro ao tentar excluir acordo do histórico.');
      }
    } catch (err) {
      alert('Erro de rede ao excluir.');
    } finally {
      setLoadingId(null);
    }
  };

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in duration-300">
      <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50">
        <div>
          <h2 className="font-bold text-lg text-slate-900 flex items-center gap-2">
            <Archive className="w-5 h-5 text-indigo-600" /> Histórico de Acordos Quitados
          </h2>
          <p className="text-sm text-slate-500">Consulte acordos que já foram totalmente pagos ou remova registros antigos.</p>
        </div>
        
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input 
            type="text" 
            placeholder="Buscar quitados..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-slate-100/50 text-slate-500 uppercase text-xs font-bold">
            <tr>
              <th className="px-5 py-3 rounded-tl-lg">ID</th>
              <th className="px-5 py-3">Colaborador</th>
              <th className="px-5 py-3">Descrição</th>
              <th className="px-5 py-3 text-right">Valor Total</th>
              <th className="px-5 py-3 text-center">Data Ref.</th>
              <th className="px-5 py-3 text-center rounded-tr-lg">Ação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredQuitados.length > 0 ? (
              filteredQuitados.map(ac => (
                <tr key={ac.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-4 font-mono text-xs text-slate-400">#AC{ac.id}</td>
                  <td className="px-5 py-4">
                    <div className="font-bold text-slate-900">{ac.colaborador_nome}</div>
                    <div className="text-xs text-slate-500 font-medium flex items-center gap-1 mt-0.5">
                      <MapPin className="h-3 w-3 inline text-slate-450" />
                      {ac.colaborador_loja}
                    </div>
                  </td>
                  <td className="px-5 py-4 text-slate-600 truncate max-w-xs" title={ac.descricao}>
                    {ac.descricao || 'Sem descrição'}
                  </td>
                  <td className="px-5 py-4 text-right font-bold text-slate-900">
                    {formatCurrency(ac.valor_total)}
                  </td>
                  <td className="px-5 py-4 text-center text-slate-500">
                    {new Date(ac.data_acordo).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-5 py-4 text-center">
                    {user?.role === 'master' ? (
                      <button 
                        onClick={() => handleDelete(ac.id)}
                        disabled={loadingId === ac.id}
                        className="text-rose-500 hover:bg-rose-50 p-2 rounded-lg transition-colors disabled:opacity-50"
                        title="Excluir acordo permanentemente"
                      >
                        {loadingId === ac.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                      </button>
                    ) : (
                      <span className="text-xs text-slate-400">Apenas Leitura</span>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="px-5 py-12 text-center">
                  <Archive className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                  <h3 className="text-sm font-bold text-slate-600">Nenhum acordo quitado</h3>
                  <p className="text-xs text-slate-400 mt-1">
                    {searchTerm ? 'Nenhum resultado encontrado para a busca.' : 'Os acordos aparecerão aqui assim que tiverem todas as parcelas baixadas.'}
                  </p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
