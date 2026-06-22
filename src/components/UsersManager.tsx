import React, { useState, useEffect } from 'react';
import { Users, Trash2, Plus, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface UsuarioList {
  id: number;
  nome: string;
  email: string;
  role: string;
  created_at: string;
}

export default function UsersManager() {
  const { token, user: currentUser } = useAuth();
  const [usuarios, setUsuarios] = useState<UsuarioList[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Form states
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [role, setRole] = useState('diretor');

  const fetchUsuarios = async () => {
    try {
      const res = await fetch('/api/usuarios', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUsuarios(data);
      }
    } catch (err) {
      setErrorMsg('Erro ao carregar usuários.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchUsuarios();
    }
  }, [token]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const res = await fetch('/api/usuarios', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ nome, email, senha, role })
      });
      const data = await res.json();
      if (res.ok) {
        setSuccessMsg('Usuário criado com sucesso!');
        setNome('');
        setEmail('');
        setSenha('');
        setRole('diretor');
        fetchUsuarios();
      } else {
        setErrorMsg(data.error || 'Erro ao criar usuário');
      }
    } catch (err) {
      setErrorMsg('Erro de rede.');
    }
  };

  const handleDelete = async (id: number) => {
    if (id === currentUser?.id) {
      setErrorMsg('Você não pode deletar a si mesmo.');
      return;
    }
    if (!confirm('Deseja realmente remover este usuário?')) return;
    
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const res = await fetch(`/api/usuarios/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setSuccessMsg('Usuário deletado.');
        fetchUsuarios();
      } else {
        setErrorMsg('Erro ao deletar usuário.');
      }
    } catch (err) {
      setErrorMsg('Erro de rede.');
    }
  };

  if (loading) return <div className="p-8 text-center text-slate-500"><Loader2 className="animate-spin inline mr-2" /> Carregando gestão de usuários...</div>;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
        <div>
          <h2 className="font-bold text-lg text-slate-900 flex items-center gap-2"><Users className="w-5 h-5 text-indigo-600" /> Gestão de Acessos</h2>
          <p className="text-sm text-slate-500">Crie contas para diretores ou outros administradores</p>
        </div>
      </div>

      <div className="p-5 grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <form onSubmit={handleCreate} className="space-y-4 bg-slate-50 p-5 rounded-xl border border-slate-100">
            <h3 className="font-bold text-sm text-slate-700 uppercase tracking-wide">Novo Usuário</h3>
            
            {errorMsg && <div className="text-xs text-rose-600 flex gap-1"><AlertCircle className="w-4 h-4" /> {errorMsg}</div>}
            {successMsg && <div className="text-xs text-emerald-600 flex gap-1"><CheckCircle className="w-4 h-4" /> {successMsg}</div>}

            <div>
              <label className="text-xs font-semibold text-slate-600">Nome</label>
              <input required value={nome} onChange={e=>setNome(e.target.value)} type="text" className="w-full mt-1 text-sm p-2 rounded-lg border border-slate-200" placeholder="Ex: Roberto Diretor" />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600">E-mail</label>
              <input required value={email} onChange={e=>setEmail(e.target.value)} type="email" className="w-full mt-1 text-sm p-2 rounded-lg border border-slate-200" placeholder="diretor@abucci.com.br" />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600">Senha Inicial</label>
              <input required value={senha} onChange={e=>setSenha(e.target.value)} type="password" className="w-full mt-1 text-sm p-2 rounded-lg border border-slate-200" />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600">Perfil de Acesso</label>
              <select value={role} onChange={e=>setRole(e.target.value)} className="w-full mt-1 text-sm p-2 rounded-lg border border-slate-200">
                <option value="diretor">Diretor (Apenas Visualização do Dashboard)</option>
                <option value="master">Master (Total Acesso e Cadastros)</option>
              </select>
            </div>
            <button type="submit" className="w-full bg-indigo-600 text-white font-bold text-sm py-2 rounded-lg hover:bg-indigo-700 transition flex items-center justify-center gap-2">
              <Plus className="w-4 h-4" /> Adicionar Usuário
            </button>
          </form>
        </div>

        <div className="lg:col-span-2">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-100 text-slate-500 uppercase text-xs font-bold">
              <tr>
                <th className="p-3 rounded-tl-lg">Nome</th>
                <th className="p-3">E-mail</th>
                <th className="p-3 text-center">Perfil</th>
                <th className="p-3 text-right rounded-tr-lg">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {usuarios.map(u => (
                <tr key={u.id} className="hover:bg-slate-50">
                  <td className="p-3 font-semibold text-slate-800">{u.nome}</td>
                  <td className="p-3 text-slate-600">{u.email}</td>
                  <td className="p-3 text-center">
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wider ${u.role === 'master' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'}`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="p-3 text-right">
                    {u.id !== currentUser?.id && (
                      <button onClick={() => handleDelete(u.id)} className="text-rose-500 hover:bg-rose-50 p-2 rounded-lg transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {usuarios.length === 0 && (
                <tr><td colSpan={4} className="p-5 text-center text-slate-400">Nenhum usuário encontrado.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
