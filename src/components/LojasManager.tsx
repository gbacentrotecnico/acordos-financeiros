import React, { useState, useEffect } from 'react';
import { Store, Trash2, Plus, Edit2, Loader2, AlertCircle, CheckCircle, Save, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext.tsx';
import { Loja } from '../types.ts';

export default function LojasManager() {
  const { token } = useAuth();
  const [lojas, setLojas] = useState<Loja[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Form states for Create
  const [nome, setNome] = useState('');
  const [endereco, setEndereco] = useState('');

  // Edit states
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editNome, setEditNome] = useState('');
  const [editEndereco, setEditEndereco] = useState('');

  const fetchLojas = async () => {
    try {
      const res = await fetch('/api/lojas', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setLojas(data.data || []);
      }
    } catch (err) {
      setErrorMsg('Erro ao carregar lojas.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchLojas();
    }
  }, [token]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const res = await fetch('/api/lojas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ nome, endereco })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessMsg('Loja cadastrada com sucesso!');
        setNome('');
        setEndereco('');
        fetchLojas();
      } else {
        setErrorMsg(data.error || 'Erro ao cadastrar loja');
      }
    } catch (err) {
      setErrorMsg('Erro de rede.');
    }
  };

  const startEditing = (loja: Loja) => {
    setEditingId(loja.id);
    setEditNome(loja.nome);
    setEditEndereco(loja.endereco);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditNome('');
    setEditEndereco('');
  };

  const handleUpdate = async (id: number) => {
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const res = await fetch(`/api/lojas/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ nome: editNome, endereco: editEndereco })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessMsg('Loja atualizada com sucesso!');
        setEditingId(null);
        fetchLojas();
      } else {
        setErrorMsg(data.error || 'Erro ao atualizar loja');
      }
    } catch (err) {
      setErrorMsg('Erro de rede.');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Deseja realmente remover esta loja? (Pode afetar relatórios se houver colaboradores vinculados a ela)')) return;
    
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const res = await fetch(`/api/lojas/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessMsg('Loja deletada.');
        fetchLojas();
      } else {
        setErrorMsg(data.error || 'Erro ao deletar loja.');
      }
    } catch (err) {
      setErrorMsg('Erro de rede.');
    }
  };

  if (loading) return <div className="p-8 text-center text-slate-500"><Loader2 className="animate-spin inline mr-2" /> Carregando gestão de lojas...</div>;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mt-8">
      <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
        <div>
          <h2 className="font-bold text-lg text-slate-900 flex items-center gap-2"><Store className="w-5 h-5 text-indigo-600" /> Gestão de Lojas</h2>
          <p className="text-sm text-slate-500">Cadastre e gerencie as unidades (lojas) da rede</p>
        </div>
      </div>

      <div className="p-5 grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <form onSubmit={handleCreate} className="space-y-4 bg-slate-50 p-5 rounded-xl border border-slate-100">
            <h3 className="font-bold text-sm text-slate-700 uppercase tracking-wide">Nova Loja</h3>
            
            {errorMsg && <div className="text-xs text-rose-600 flex gap-1 items-start"><AlertCircle className="w-4 h-4 flex-shrink-0" /> {errorMsg}</div>}
            {successMsg && <div className="text-xs text-emerald-600 flex gap-1 items-start"><CheckCircle className="w-4 h-4 flex-shrink-0" /> {successMsg}</div>}

            <div>
              <label className="text-xs font-semibold text-slate-600">Nome da Loja</label>
              <input required value={nome} onChange={e=>setNome(e.target.value)} type="text" className="w-full mt-1 text-sm p-2 rounded-lg border border-slate-200" placeholder="Ex: Auto Center Leste" />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600">Endereço Completo</label>
              <textarea required value={endereco} onChange={e=>setEndereco(e.target.value)} className="w-full mt-1 text-sm p-2 rounded-lg border border-slate-200" placeholder="Av. Principal, 1000 - Bairro" rows={3}></textarea>
            </div>
            <button type="submit" className="w-full bg-indigo-600 text-white font-bold text-sm py-2 rounded-lg hover:bg-indigo-700 transition flex items-center justify-center gap-2">
              <Plus className="w-4 h-4" /> Cadastrar Loja
            </button>
          </form>
        </div>

        <div className="lg:col-span-2">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-100 text-slate-500 uppercase text-xs font-bold">
              <tr>
                <th className="p-3 rounded-tl-lg">Nome</th>
                <th className="p-3">Endereço</th>
                <th className="p-3 text-right rounded-tr-lg">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {lojas.map(loja => (
                <tr key={loja.id} className="hover:bg-slate-50">
                  <td className="p-3">
                    {editingId === loja.id ? (
                      <input 
                        type="text" 
                        value={editNome} 
                        onChange={(e) => setEditNome(e.target.value)} 
                        className="w-full text-sm p-1.5 rounded border border-slate-300"
                      />
                    ) : (
                      <span className="font-semibold text-slate-800">{loja.nome}</span>
                    )}
                  </td>
                  <td className="p-3 text-slate-600">
                    {editingId === loja.id ? (
                      <textarea 
                        value={editEndereco} 
                        onChange={(e) => setEditEndereco(e.target.value)} 
                        className="w-full text-sm p-1.5 rounded border border-slate-300"
                        rows={2}
                      />
                    ) : (
                      <span className="text-sm">{loja.endereco}</span>
                    )}
                  </td>
                  <td className="p-3 text-right whitespace-nowrap">
                    {editingId === loja.id ? (
                      <div className="flex justify-end gap-1">
                        <button onClick={() => handleUpdate(loja.id)} className="text-emerald-600 hover:bg-emerald-50 p-1.5 rounded-lg transition-colors" title="Salvar">
                          <Save className="w-4 h-4" />
                        </button>
                        <button onClick={cancelEditing} className="text-slate-500 hover:bg-slate-100 p-1.5 rounded-lg transition-colors" title="Cancelar">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex justify-end gap-1">
                        <button onClick={() => startEditing(loja)} className="text-indigo-500 hover:bg-indigo-50 p-1.5 rounded-lg transition-colors" title="Editar">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(loja.id)} className="text-rose-500 hover:bg-rose-50 p-1.5 rounded-lg transition-colors" title="Deletar">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {lojas.length === 0 && (
                <tr><td colSpan={3} className="p-5 text-center text-slate-400">Nenhuma loja cadastrada.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
