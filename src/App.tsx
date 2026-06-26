import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Handshake, 
  DollarSign, 
  TrendingUp, 
  AlertCircle, 
  Plus, 
  MapPin, 
  Briefcase, 
  CheckCircle, 
  Clock, 
  Calendar, 
  ChevronRight, 
  ChevronDown, 
  Search,
  Filter, 
  FileText,
  Building,
  CreditCard,
  Check,
  X,
  LayoutDashboard,
  Smartphone,
  FileSpreadsheet,
  Loader2,
  Trash2
} from 'lucide-react';
import { Colaborador, Acordo, Parcela, DashboardIndicadores, TipoAcordo, Loja } from './types.ts';
import ExecutiveDashboard from './components/ExecutiveDashboard.tsx';
import ImportModal from './components/ImportModal.tsx';
import Login from './components/Login.tsx';
import UsersManager from './components/UsersManager.tsx';
import QuitadosArchive from './components/QuitadosArchive.tsx';
import RankingBoard from './components/RankingBoard.tsx';
import LojasManager from './components/LojasManager.tsx';
import { AmortizacaoModal } from './components/AmortizacaoModal.tsx';
import { EditParcelaModal } from './components/EditParcelaModal.tsx';
import { EditAcordoModal } from './components/EditAcordoModal.tsx';
import { ConfirmDeleteModal } from './components/ConfirmDeleteModal.tsx';
import { useAuth } from './contexts/AuthContext.tsx';
import { LogOut, Settings, HandCoins, Edit3 } from 'lucide-react';

// Helper de formatação de moeda brasileira
const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(val);
};

// Helper de formatação de data
const formatDate = (dateStr: string) => {
  if (!dateStr) return '';
  // Se a data vier com fuso/ISO completa, pega apenas a primeira parte YYYY-MM-DD
  const cleanDate = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
  const parts = cleanDate.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
};

// Tradutor dos tipos de acordo
const translateTipoAcordo = (tipo: TipoAcordo) => {
  switch (tipo) {
    case 'veiculo_usado': return 'Veículo Usado';
    case 'moto': return 'Motocicleta';
    case 'emprestimo_vale': return 'Empréstimo / Vale';
    default: return tipo;
  }
};

export default function App() {
  // --- ESTADOS ---
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  const [acordos, setAcordos] = useState<Acordo[]>([]);
  const [selectedAcordo, setSelectedAcordo] = useState<Acordo | null>(null);
  const [parcelas, setParcelas] = useState<Parcela[]>([]);
  const [lojas, setLojas] = useState<Loja[]>([]);
  const [indicadores, setIndicadores] = useState<DashboardIndicadores>({
    saldoDevedorTotal: 0,
    totalAmortizado: 0,
    previsao: {
      hoje: 0,
      semana: 0,
      mes: 0
    },
    alertasAtraso: []
  });

  // UI States
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [modalColaboradorOpen, setModalColaboradorOpen] = useState(false);
  const [modalAcordoOpen, setModalAcordoOpen] = useState(false);
  const [modalImportOpen, setModalImportOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [tipoFilter, setTipoFilter] = useState<string>('todos');
  const [activeTab, setActiveTab] = useState<'rh' | 'executivo' | 'quitados' | 'ranking' | 'config'>('rh');
  const [filtroPrevisao, setFiltroPrevisao] = useState<'hoje' | 'semana' | 'mes'>('mes');
  const [modalAmortizacaoOpen, setModalAmortizacaoOpen] = useState(false);
  const [modalEditAcordoOpen, setModalEditAcordoOpen] = useState(false);
  const [acordoToDelete, setAcordoToDelete] = useState<Acordo | null>(null);
  const [editParcelaData, setEditParcelaData] = useState<null | { id: number, num: number, valor: number, dataVencimento: string }>(null);

  const { user, token, loading: authLoading, logout } = useAuth();

  // Form Colaborador
  const [formColab, setFormColab] = useState({
    nome: '',
    cpf: '',
    telefone: '',
    loja: '',
    cargo: ''
  });

  // Form Acordo
  const [formAcordo, setFormAcordo] = useState({
    colaborador_id: '',
    tipo: 'veiculo_usado' as TipoAcordo,
    descricao: '',
    valor_total: '',
    qtd_parcelas: '1',
    data_acordo: new Date().toISOString().split('T')[0],
    periodicidade: 'mensal' as 'semanal'|'quinzenal'|'mensal',
    data_primeiro_vencimento: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // default +30 dias
  });

  // --- CARREGAMENTO DE DADOS ---
  const fetchAllData = async () => {
    if (!token) return;
    setLoading(true);
    setErrorMsg(null);
    const headers = { Authorization: `Bearer ${token}` };
    try {
      // 1. Indicadores
      const indRes = await fetch('/api/dashboard/indicadores', { headers });
      if (indRes.status === 401 || indRes.status === 403) {
        logout();
        return;
      }
      const indJson = await indRes.json();
      if (indJson.success) {
        setIndicadores(indJson.data);
      }

      // 2. Colaboradores
      const colRes = await fetch('/api/colaboradores', { headers });
      const colJson = await colRes.json();
      if (colJson.success) {
        setColaboradores(colJson.data);
      }

      // 3. Acordos
      const acRes = await fetch('/api/acordos', { headers });
      if (acRes.status === 401 || acRes.status === 403) {
        logout();
        return;
      }
      const acJson = await acRes.json();
      if (acJson.success) {
        setAcordos(acJson.data);
      }

      // 4. Lojas
      const lojasRes = await fetch('/api/lojas', { headers });
      const lojasJson = await lojasRes.json();
      if (lojasJson.success) {
        setLojas(lojasJson.data);
      }

      // Se houver acordo selecionado ativo, recarrega suas parcelas
      if (selectedAcordo) {
        fetchParcelas(selectedAcordo.id);
      }
    } catch (err) {
      console.error('Erro ao carregar dados do backend:', err);
      setErrorMsg('Não foi possível sincronizar com o backend. Rodando em modo demonstrativo offline.');
    } finally {
      setLoading(false);
    }
  };

  const fetchParcelas = async (acordoId: number) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/acordos/${acordoId}/parcelas`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.status === 401 || res.status === 403) {
        logout();
        return;
      }
      const json = await res.json();
      if (json.success) {
        setParcelas(json.data);
      }
    } catch (err) {
      console.error('Erro ao carregar parcelas:', err);
    }
  };

  useEffect(() => {
    if (token) {
      fetchAllData();
    }
  }, [token]);

  const selectAcordo = (acordo: Acordo) => {
    setSelectedAcordo(acordo);
    fetchParcelas(acordo.id);
  };

  // --- AÇÕES ---

  // Cadastrar Colaborador
  const handleCreateColaborador = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    // Validações básicas
    if (!formColab.nome.trim()) return setErrorMsg('O nome é obrigatório.');
    if (!formColab.cpf.trim()) return setErrorMsg('O CPF é obrigatório.');
    if (!formColab.telefone.trim()) return setErrorMsg('O número de telefone/WhatsApp é obrigatório.');
    if (!formColab.loja) return setErrorMsg('A loja é obrigatória.');
    if (!formColab.cargo.trim()) return setErrorMsg('O cargo é obrigatório.');

    try {
      const res = await fetch('/api/colaboradores', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify(formColab)
      });
      const data = await res.json();

      if (data.success) {
        setSuccessMsg('Colaborador cadastrado com sucesso!');
        setFormColab({ nome: '', cpf: '', telefone: '', loja: '', cargo: '' });
        setModalColaboradorOpen(false);
        fetchAllData();
      } else {
        setErrorMsg(data.error || 'Erro ao cadastrar colaborador.');
      }
    } catch (err) {
      setErrorMsg('Falha de rede ao se comunicar com o servidor.');
    }
  };

  // Cadastrar Acordo
  const handleCreateAcordo = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const valTotal = parseFloat(formAcordo.valor_total);
    const qtdParc = parseInt(formAcordo.qtd_parcelas, 10);

    if (!formAcordo.colaborador_id) return setErrorMsg('Selecione um colaborador.');
    if (isNaN(valTotal) || valTotal <= 0) return setErrorMsg('Insira um valor total válido e maior que zero.');
    if (isNaN(qtdParc) || qtdParc <= 0) return setErrorMsg('A quantidade de parcelas deve ser maior que zero.');

    try {
      const res = await fetch('/api/acordos', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({
          colaborador_id: parseInt(formAcordo.colaborador_id, 10),
          tipo: formAcordo.tipo,
          descricao: formAcordo.descricao,
          valor_total: valTotal,
          qtd_parcelas: qtdParc,
          data_acordo: formAcordo.data_acordo,
          periodicidade: formAcordo.periodicidade,
          data_primeiro_vencimento: formAcordo.data_primeiro_vencimento
        })
      });
      const data = await res.json();

      if (data.success) {
        setSuccessMsg(`Acordo financeiro registrado! ${qtdParc} parcelas geradas.`);
        setFormAcordo({
          colaborador_id: '',
          tipo: 'veiculo_usado',
          descricao: '',
          valor_total: '',
          qtd_parcelas: '1',
          data_acordo: new Date().toISOString().split('T')[0],
          periodicidade: 'mensal',
          data_primeiro_vencimento: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        });
        setModalAcordoOpen(false);
        fetchAllData();
      } else {
        setErrorMsg(data.error || 'Erro ao registrar acordo.');
      }
    } catch (err) {
      setErrorMsg('Falha de rede ao se comunicar com o servidor.');
    }
  };

  // Dar Baixa em Parcela (Descontar)
  const handleDescontarParcela = async (parcelaId: number) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const res = await fetch(`/api/parcelas/${parcelaId}/descontar`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();

      if (data.success) {
        setSuccessMsg('Parcela descontada com sucesso e indicador atualizado!');
        // Atualiza os indicadores e a lista de parcelas na hora!
        fetchAllData();
      } else {
        setErrorMsg(data.error || 'Erro ao dar baixa na parcela.');
      }
    } catch (err) {
      setErrorMsg('Falha de rede ao registrar baixa da parcela.');
    }
  };



  // CPF Input Format Mask
  const handleCpfChange = (val: string) => {
    const raw = val.replace(/\D/g, '').slice(0, 11);
    setFormColab(prev => ({ ...prev, cpf: raw }));
  };

  // Filtros de busca de acordos (Somente ATIVOS para o dashboard principal)
  const filteredAcordos = acordos.filter(ac => {
    if (ac.status === 'quitado') return false; // Remove quitados da visão principal
    const nomeColab = ac.colaborador_nome?.toLowerCase() || '';
    const desc = ac.descricao?.toLowerCase() || '';
    const matchesSearch = nomeColab.includes(searchTerm.toLowerCase()) || desc.includes(searchTerm.toLowerCase());
    const matchesTipo = tipoFilter === 'todos' ? true : ac.tipo === tipoFilter;
    return matchesSearch && matchesTipo;
  });

  // Previsão do valor de cada parcela no formulário de criação em tempo real
  const getProjetarParcelas = () => {
    const valTotal = parseFloat(formAcordo.valor_total);
    const qtdParc = parseInt(formAcordo.qtd_parcelas, 10);
    if (isNaN(valTotal) || valTotal <= 0 || isNaN(qtdParc) || qtdParc <= 0) return [];

    const valorTotalCentavos = Math.round(valTotal * 100);
    const parcelaBaseCentavos = Math.floor(valorTotalCentavos / qtdParc);
    const restoCentavos = valorTotalCentavos % qtdParc;

    const projecoes: number[] = [];
    for (let i = 1; i <= qtdParc; i++) {
      const valorCentavos = i === qtdParc ? parcelaBaseCentavos + restoCentavos : parcelaBaseCentavos;
      projecoes.push(valorCentavos / 100);
    }
    return projecoes;
  };

  if (authLoading) return <div className="min-h-screen bg-slate-900 flex items-center justify-center"><Loader2 className="w-10 h-10 animate-spin text-indigo-500" /></div>;
  if (!user || !token) return <Login />;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans flex flex-col">
      {/* HEADER */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center mr-2">
              <img src="/Logo.png" alt="Logo Grupo Abucci" className="h-12 w-auto object-contain" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">Central de Acordos Financeiros</h1>
              <p className="text-xs text-slate-500">Rede de Auto Centers — Gestão Centralizada Diretoria &amp; RH</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            {user.role === 'master' && (
              <button 
                onClick={() => setModalImportOpen(true)}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-2 hover:bg-slate-100 text-slate-700 bg-white border border-slate-200 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 active:scale-95"
              >
                <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                <span>Importar Lote</span>
              </button>
            )}
            <button 
              onClick={() => setModalColaboradorOpen(true)}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 hover:bg-slate-100 text-slate-700 bg-white border border-slate-200 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 active:scale-95"
            >
              <Users className="h-4 w-4 text-slate-500" />
              <span>Novo Colaborador</span>
            </button>
            <button 
              onClick={() => setModalAcordoOpen(true)}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-sm font-medium shadow-md shadow-indigo-100 transition-all duration-200 hover:shadow-lg active:scale-95"
            >
              <Plus className="h-5 w-5" />
              <span>Novo Acordo</span>
            </button>
            <button 
              onClick={logout}
              className="flex items-center justify-center gap-2 bg-slate-100 hover:bg-rose-100 hover:text-rose-600 text-slate-600 p-2.5 rounded-xl text-sm font-medium transition-all"
              title="Sair do Sistema"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      {/* ÁREA DE NOTIFICAÇÕES GLOBAIS */}
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 mt-4">
        {successMsg && (
          <div className="bg-emerald-50 border-l-4 border-emerald-500 rounded-lg p-3.5 flex items-center justify-between text-emerald-800 text-sm shadow-sm transition-all duration-300">
            <div className="flex items-center gap-2.5">
              <CheckCircle className="h-5 w-5 text-emerald-500" />
              <span>{successMsg}</span>
            </div>
            <button onClick={() => setSuccessMsg(null)} className="hover:bg-emerald-100 p-1 rounded transition-colors text-emerald-600">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
        {errorMsg && (
          <div className="bg-amber-50 border-l-4 border-amber-500 rounded-lg p-3.5 flex items-center justify-between text-amber-800 text-sm shadow-sm transition-all duration-300">
            <div className="flex items-center gap-2.5">
              <AlertCircle className="h-5 w-5 text-amber-500" />
              <span>{errorMsg}</span>
            </div>
            <button onClick={() => setErrorMsg(null)} className="hover:bg-amber-100 p-1 rounded transition-colors text-amber-600">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {/* DASHBOARD PRINCIPAL */}
      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 flex-1 flex flex-col gap-8">
        
        {/* SELETOR DE ABAS OPERACIONAL VS EXECUTIVO */}
        <div className="flex bg-slate-100/50 p-1 rounded-xl">
          <button onClick={() => setActiveTab('rh')} className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === 'rh' ? 'bg-white shadow-sm text-indigo-700' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'}`}>
            Painel RH
          </button>
          <button onClick={() => setActiveTab('executivo')} className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === 'executivo' ? 'bg-white shadow-sm text-indigo-700' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'}`}>
            Gestão Executiva
          </button>
          <button onClick={() => setActiveTab('quitados')} className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === 'quitados' ? 'bg-white shadow-sm text-indigo-700' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'}`}>
            Acordos Quitados
          </button>
          <button onClick={() => setActiveTab('ranking')} className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === 'ranking' ? 'bg-white shadow-sm text-indigo-700' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'}`}>
            Ranking
          </button>
          {user?.role === 'master' && (
            <button onClick={() => setActiveTab('config')} className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === 'config' ? 'bg-white shadow-sm text-indigo-700' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'}`}>
              Configurações
            </button>
          )}
        </div>

        {activeTab === 'config' && user.role === 'master' ? (
          <div>
            <UsersManager />
            <LojasManager />
          </div>
        ) : activeTab === 'executivo' ? (
          /* DASHBOARD EXECUTIVO ISOLADO (DEDICADO AO PROPONENTO) */
          <ExecutiveDashboard 
            indicadores={indicadores}
            acordos={filteredAcordos}
            colaboradores={colaboradores}
            onDescontarParcela={handleDescontarParcela}
          />
        ) : activeTab === 'quitados' ? (
          <QuitadosArchive acordos={acordos} onUpdate={fetchAllData} />
        ) : activeTab === 'ranking' ? (
          <RankingBoard />
        ) : (
          /* FLUXO TRADICIONAL DE CONTROLE OPERACIONAL RH */
          <>
            {/* CARDS TRADICIONAIS DO RH */}
            <section className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* Card 1: Saldo Devedor Total */}
              <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Saldo Devedor Total</p>
                  <h3 className="text-2xl font-bold text-slate-900 mt-2">{formatCurrency(indicadores.saldoDevedorTotal)}</h3>
                  <p className="text-xs text-amber-600 font-medium mt-1 flex items-center gap-1">
                    <Clock className="h-3 w-3 inline" />
                    Valor total ainda pendente de desconto em folha
                  </p>
                </div>
                <div className="bg-amber-50 p-3.5 rounded-2xl text-amber-600">
                  <DollarSign className="h-7 w-7" />
                </div>
              </div>

              {/* Card 2: Total Amortizado */}
              <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Amortizado</p>
                  <h3 className="text-2xl font-bold text-slate-900 mt-2">{formatCurrency(indicadores.totalAmortizado)}</h3>
                  <p className="text-xs text-emerald-600 font-medium mt-1 flex items-center gap-1">
                    <CheckCircle className="h-3 w-3 inline" />
                    Soma de parcelas descontadas e quitadas
                  </p>
                </div>
                <div className="bg-emerald-50 p-3.5 rounded-2xl text-emerald-600">
                  <TrendingUp className="h-7 w-7" />
                </div>
              </div>

              {/* Card 3: Previsão (Filtro) */}
              <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
                <div>
                  <div className="flex items-center justify-between mb-2 gap-4">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Previsão</p>
                    <select 
                      value={filtroPrevisao}
                      onChange={(e) => setFiltroPrevisao(e.target.value as 'hoje' | 'semana' | 'mes')}
                      className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="hoje">Hoje</option>
                      <option value="semana">Esta Semana</option>
                      <option value="mes">Este Mês</option>
                    </select>
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900">{formatCurrency(indicadores.previsao?.[filtroPrevisao] || 0)}</h3>
                  <p className="text-xs text-blue-600 font-medium mt-1 flex items-center gap-1">
                    <Calendar className="h-3 w-3 inline" />
                    Compromissos acordados no período
                  </p>
                </div>
                <div className="bg-blue-50 p-3.5 rounded-2xl text-blue-600">
                  <Handshake className="h-7 w-7" />
                </div>
              </div>
            </section>

            {/* ALERTAS DE ATRASO (Apenas se houver alertas) */}
            {indicadores.alertasAtraso && indicadores.alertasAtraso.length > 0 && (
              <section className="bg-rose-50 border border-rose-200 rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <AlertCircle className="h-5 w-5 text-rose-600" />
                  <h2 className="text-base font-bold text-rose-900">Alertas de Parcelas Vencidas em Atraso ({indicadores.alertasAtraso.length})</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {indicadores.alertasAtraso.map((alerta) => (
                    <div 
                      key={alerta.parcela_id} 
                      className="bg-white rounded-xl p-4 border border-rose-100 flex flex-col justify-between shadow-sm hover:border-rose-300 transition-colors"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-bold text-sm text-slate-900">{alerta.colaborador_nome}</span>
                          <span className="bg-rose-100 text-rose-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full tracking-wider uppercase">
                            {alerta.dias_atraso} dias de atraso
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 mt-1.5 space-y-0.5">
                          <p><strong className="text-slate-600">Loja:</strong> {alerta.loja}</p>
                          <p><strong className="text-slate-600">Acordo:</strong> {translateTipoAcordo(alerta.tipo)} (Parc. {alerta.numero_parcela})</p>
                          <p><strong className="text-slate-600">Vencimento:</strong> {formatDate(alerta.data_vencimento)}</p>
                        </div>
                      </div>
                      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                        <span className="text-base font-bold text-rose-600">{formatCurrency(alerta.valor)}</span>
                        {user.role === 'master' ? (
                          <button 
                            onClick={() => handleDescontarParcela(alerta.parcela_id)}
                            className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 active:scale-95 shadow-sm"
                          >
                            <Check className="h-3 w-3" />
                            <span>Dar Baixa (Folha)</span>
                          </button>
                        ) : (
                          <span className="text-xs text-slate-400 font-bold">Ação Restrita</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* LEDGER DE ACORDOS */}
            <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Lateral Esquerda / Central: Lista de Acordos */}
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm shadow-slate-100 lg:col-span-2 overflow-hidden flex flex-col">
                <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/50">
                  <div>
                    <h2 className="font-bold text-base text-slate-900">Acordos Ativos e Históricos</h2>
                    <p className="text-xs text-slate-500">Selecione um acordo para visualizar e baixar parcelas</p>
                  </div>

                  {/* Filtros */}
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                      <input 
                        type="text" 
                        placeholder="Buscar por colaborador..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9 pr-4 py-1.5 w-full sm:w-56 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm"
                      />
                    </div>
                    <div className="relative">
                      <select 
                        value={tipoFilter} 
                        onChange={(e) => setTipoFilter(e.target.value)}
                        className="py-1.5 pl-3 pr-8 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-slate-600 shadow-sm"
                      >
                        <option value="todos">Todos os Acordos</option>
                        <option value="veiculo_usado">Veículos</option>
                        <option value="moto">Motos</option>
                        <option value="emprestimo_vale">Empréstimos</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Listagem de Acordos */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100 text-[11px] font-extrabold text-slate-400 uppercase tracking-widest">
                        <th className="px-5 py-3">Cód</th>
                        <th className="px-5 py-3">Colaborador / Loja</th>
                        <th className="px-5 py-3">Tipo Acordo</th>
                        <th className="px-5 py-3 text-right">Valor Total</th>
                        <th className="px-5 py-3 text-center">Status</th>
                        <th className="px-5 py-3 text-center">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                      {filteredAcordos.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="text-center py-12 text-slate-400">
                            Nenhum acordo cadastrado para esta pesquisa.
                          </td>
                        </tr>
                      ) : (
                        filteredAcordos.map((acord) => (
                          <tr 
                            key={acord.id} 
                            className={`hover:bg-slate-50/70 transition-colors cursor-pointer ${selectedAcordo?.id === acord.id ? 'bg-indigo-50/30' : ''}`}
                            onClick={() => selectAcordo(acord)}
                          >
                            <td className="px-5 py-4 font-mono text-xs text-slate-400">#AC{acord.id}</td>
                            <td className="px-5 py-4">
                              <div className="font-bold text-slate-900">{acord.colaborador_nome}</div>
                              <div className="text-xs text-slate-500 font-medium flex items-center gap-1 mt-0.5">
                                <MapPin className="h-3 w-3 inline text-slate-450" />
                                {acord.colaborador_loja}
                              </div>
                            </td>
                            <td className="px-5 py-4">
                              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                                {translateTipoAcordo(acord.tipo)}
                              </span>
                            </td>
                            <td className="px-5 py-4 text-right font-bold text-slate-900">{formatCurrency(acord.valor_total)}</td>
                            <td className="px-5 py-4 text-center">
                              <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full tracking-wider uppercase border ${
                                acord.status === 'quitado' 
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                                  : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                              }`}>
                                {acord.status === 'quitado' ? 'Quitado' : 'Ativo'}
                              </span>
                            </td>
                            <td className="px-5 py-4 text-center">
                              {user.role === 'master' ? (
                                <div className="flex items-center justify-center gap-2">
                                  {acord.status !== 'quitado' && (
                                    <button 
                                      onClick={(e) => { e.stopPropagation(); selectAcordo(acord); setModalAmortizacaoOpen(true); }}
                                      className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 hover:text-emerald-700 transition-colors border border-emerald-100 shadow-sm"
                                      title="Amortizar Acordo"
                                    >
                                      <HandCoins className="h-4 w-4" />
                                    </button>
                                  )}
                                  <button 
                                    onClick={(e) => { e.stopPropagation(); selectAcordo(acord); setModalEditAcordoOpen(true); }}
                                    className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 hover:text-indigo-700 transition-colors border border-indigo-100 shadow-sm"
                                    title="Editar Acordo"
                                  >
                                    <Edit3 className="h-4 w-4" />
                                  </button>
                                  <button 
                                    onClick={(e) => { e.stopPropagation(); selectAcordo(acord); setAcordoToDelete(acord); }}
                                    className="p-1.5 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 hover:text-rose-700 transition-colors border border-rose-100 shadow-sm"
                                    title="Excluir Acordo"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                              ) : (
                                <div className="text-slate-400 text-xs font-medium">--</div>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Lateral Direita: Detalhamento de Parcelas */}
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm shadow-slate-100 overflow-hidden flex flex-col justify-between">
                <div>
                  <div className="p-5 border-b border-slate-100 bg-slate-50/55 flex items-center justify-between">
                    <div>
                      <h2 className="font-bold text-base text-slate-900">Parcelas do Acordo</h2>
                      {selectedAcordo ? (
                        <p className="text-xs text-slate-500 font-medium">Acordo #AC{selectedAcordo.id} — {selectedAcordo.colaborador_nome}</p>
                      ) : (
                        <p className="text-xs text-slate-500">Selecione um acordo para auditar parcelas</p>
                      )}
                    </div>
                    {selectedAcordo && (
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-bold text-slate-400">Total: {selectedAcordo.qtd_parcelas} parc.</span>
                      </div>
                    )}
                  </div>

                  {!selectedAcordo ? (
                    <div className="py-24 text-center text-slate-400 p-5 flex flex-col items-center justify-center gap-3">
                      <CreditCard className="h-10 w-10 text-slate-300" />
                      <p className="text-sm">Por favor, selecione um acordo ao lado para conferir as parcelas e dar baixa financeira.</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100 max-h-[480px] overflow-y-auto">
                      {parcelas.length === 0 ? (
                        <p className="text-center py-8 text-xs text-slate-400">Nenhuma parcela gerada.</p>
                      ) : (
                        parcelas.map((parc) => (
                          <div key={parc.id} className="p-4 flex items-center justify-between text-sm hover:bg-slate-50/30 transition-colors">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-900">Parcela {parc.numero_parcela} de {selectedAcordo.qtd_parcelas}</span>
                                <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded tracking-wide uppercase ${
                                  parc.status === 'Descontado'
                                    ? 'bg-emerald-50 text-emerald-700'
                                    : 'bg-amber-50 text-amber-700'
                                }`}>
                                  {parc.status}
                                </span>
                              </div>
                              <div className="text-xs text-slate-500 mt-1 flex flex-col gap-0.5">
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-3.5 w-3.5 text-slate-400 inline" />
                                  Vencimento: {formatDate(parc.data_vencimento)}
                                </span>
                                {parc.status === 'Descontado' && (
                                  <span className="flex items-center gap-1 font-medium text-emerald-600">
                                    <Check className="h-3.5 w-3.5 inline" />
                                    Descontado em: {formatDate(parc.data_desconto || '')}
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="text-right flex flex-col items-end gap-2.5">
                              <span className="font-bold text-slate-900 text-sm">{formatCurrency(parc.valor)}</span>
                              <div className="flex items-center gap-1.5">
                                {parc.status === 'Pendente' && user.role === 'master' && (
                                  <>
                                    <button 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setEditParcelaData({ id: parc.id, num: parc.numero_parcela, valor: parc.valor, dataVencimento: parc.data_vencimento });
                                      }}
                                      className="bg-indigo-100 hover:bg-indigo-200 text-indigo-700 text-[10px] font-bold px-2 py-1 rounded-md transition-colors active:scale-95"
                                      title="Editar valor desta parcela"
                                    >
                                      Editar
                                    </button>
                                    <button 
                                      onClick={() => handleDescontarParcela(parc.id)}
                                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold px-2.5 py-1 rounded-md transition-colors active:scale-95 shadow-sm"
                                    >
                                      Dar Baixa
                                    </button>
                                  </>
                                )}
                                {parc.status === 'Descontado' && user.role === 'master' && (
                                  <button 
                                    onClick={async (e) => {
                                      e.stopPropagation();
                                      if (!confirm(`Tem certeza que deseja REVERTER a baixa da parcela ${parc.numero_parcela}? Ela voltará para "Pendente".`)) return;
                                      try {
                                        const res = await fetch(`/api/parcelas/${parc.id}/reverter`, {
                                          method: 'PUT',
                                          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
                                        });
                                        const data = await res.json();
                                        if (data.success) {
                                          setSuccessMsg('Baixa revertida com sucesso!');
                                          fetchAllData();
                                          if (selectedAcordo) selectAcordo(selectedAcordo);
                                        } else {
                                          setErrorMsg(data.error || 'Erro ao reverter.');
                                        }
                                      } catch { setErrorMsg('Falha de rede.'); }
                                    }}
                                    className="bg-amber-100 hover:bg-amber-200 text-amber-800 text-[10px] font-bold px-2 py-1 rounded-md transition-colors active:scale-95"
                                    title="Reverter esta baixa"
                                  >
                                    Reverter
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>

                {selectedAcordo && (
                  <div className="p-4 bg-slate-50 border-t border-slate-100 text-xs text-slate-500 flex flex-col gap-1">
                    <span className="font-medium text-slate-700">Resumo da Descrição:</span>
                    <span>{selectedAcordo.descricao || 'Sem descrição cadastrada'}</span>
                  </div>
                )}
              </div>
            </section>
          </>
        )}
      </main>

      {/* FOOTER */}
      <footer className="bg-white border-t border-slate-200 mt-12 py-5 text-center text-xs text-slate-400">
        <p>© 2026 Sistema Central de Acordos Financeiros • Pronto para VPS • Banco de Dados PostgreSQL</p>
      </footer>

      {/* MODAL CADASTRAR COLABORADOR */}
      {modalColaboradorOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="bg-indigo-600 p-4.5 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                <h3 className="font-bold text-base">Cadastrar Novo Colaborador</h3>
              </div>
              <button onClick={() => setModalColaboradorOpen(false)} className="hover:bg-indigo-700 p-1 rounded-lg">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateColaborador} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Nome Completo</label>
                <input 
                  type="text" 
                  required
                  placeholder="Ex: João da Silva Santos"
                  value={formColab.nome}
                  onChange={(e) => setFormColab(prev => ({ ...prev, nome: e.target.value }))}
                  className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 font-medium">CPF (Cadastro de Pessoa Física)</label>
                <input 
                  type="text" 
                  required
                  placeholder="Apenas números (Ex: 12345678911)"
                  value={formColab.cpf}
                  maxLength={11}
                  onChange={(e) => handleCpfChange(e.target.value)}
                  className="font-mono w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                {formColab.cpf.length > 0 && formColab.cpf.length < 11 && (
                  <p className="text-[10px] text-amber-600 mt-1">O CPF deve conter exatamente 11 números.</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 font-medium">WhatsApp / Celular com DDD</label>
                <input 
                  type="text" 
                  required
                  placeholder="Ex: (11) 98888-7777"
                  value={formColab.telefone}
                  onChange={(e) => setFormColab(prev => ({ ...prev, telefone: e.target.value }))}
                  className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Lojas do Grupo</label>
                <select 
                  value={formColab.loja}
                  onChange={(e) => setFormColab(prev => ({ ...prev, loja: e.target.value }))}
                  className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="" disabled>-- Selecione a Loja --</option>
                  {lojas.map(loja => (
                    <option key={loja.id} value={loja.nome}>{loja.nome}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Função / Cargo</label>
                <input 
                  type="text" 
                  required
                  placeholder="Ex: Alinhador Chefe"
                  value={formColab.cargo}
                  onChange={(e) => setFormColab(prev => ({ ...prev, cargo: e.target.value }))}
                  className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="pt-4 flex items-center gap-3 border-t border-slate-100">
                <button 
                  type="button" 
                  onClick={() => setModalColaboradorOpen(false)}
                  className="flex-1 hover:bg-slate-100 text-slate-600 text-sm font-semibold py-2 rounded-xl transition-all"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  disabled={formColab.cpf.length !== 11}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold py-2 rounded-xl shadow-md transition-all"
                >
                  Confirmar Cadastro
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL CADASTRAR ACORDO */}
      {modalAcordoOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="bg-indigo-600 p-4.5 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Handshake className="h-5 w-5" />
                <h3 className="font-bold text-base">Registrar Acordo Financeiro</h3>
              </div>
              <button onClick={() => setModalAcordoOpen(false)} className="hover:bg-indigo-700 p-1 rounded-lg">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateAcordo} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Colaborador Associado</label>
                <select 
                  required
                  value={formAcordo.colaborador_id}
                  onChange={(e) => setFormAcordo(prev => ({ ...prev, colaborador_id: e.target.value }))}
                  className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">-- Selecione o funcionário beneficiário --</option>
                  {colaboradores.map((c) => (
                    <option key={c.id} value={c.id}>{c.nome} ({c.loja} - {c.cargo})</option>
                  ))}
                </select>
                {colaboradores.length === 0 && (
                  <p className="text-[10px] text-amber-600 mt-1">Aviso: É preciso cadastrar pelo menos um colaborador antes.</p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Origem / Tipo de Operação</label>
                  <select 
                    value={formAcordo.tipo}
                    onChange={(e) => setFormAcordo(prev => ({ ...prev, tipo: e.target.value as TipoAcordo }))}
                    className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="veiculo_usado">Venda de Veículo Usado</option>
                    <option value="moto">Venda de Motocicleta</option>
                    <option value="emprestimo_vale">Empréstimo / Vale Corporativo</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Data do Acordo</label>
                  <input 
                    type="date" 
                    required
                    value={formAcordo.data_acordo}
                    onChange={(e) => setFormAcordo(prev => ({ ...prev, data_acordo: e.target.value }))}
                    className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Periodicidade</label>
                  <select 
                    value={formAcordo.periodicidade}
                    onChange={(e) => setFormAcordo(prev => ({ ...prev, periodicidade: e.target.value as any }))}
                    className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="semanal">Semanal</option>
                    <option value="quinzenal">Quinzenal</option>
                    <option value="mensal">Mensal</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">1º Vencimento</label>
                  <input 
                    type="date" 
                    required
                    value={formAcordo.data_primeiro_vencimento}
                    onChange={(e) => setFormAcordo(prev => ({ ...prev, data_primeiro_vencimento: e.target.value }))}
                    className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Valor Total do Acordo (R$)</label>
                  <input 
                    type="number" 
                    step="0.01"
                    min="0.01"
                    required
                    placeholder="Ex: 14500.00"
                    value={formAcordo.valor_total}
                    onChange={(e) => setFormAcordo(prev => ({ ...prev, valor_total: e.target.value }))}
                    className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Número de Parcelas</label>
                  <input 
                    type="number" 
                    min="1"
                    max="120"
                    required
                    value={formAcordo.qtd_parcelas}
                    onChange={(e) => setFormAcordo(prev => ({ ...prev, qtd_parcelas: e.target.value }))}
                    className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 font-medium">Descrição / Observações</label>
                <textarea 
                  placeholder="Detalhes adicionais (ex: Placa do veículo, modelo, ano ou destino do empréstimo)"
                  value={formAcordo.descricao}
                  onChange={(e) => setFormAcordo(prev => ({ ...prev, descricao: e.target.value }))}
                  className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 h-16 resize-none"
                />
              </div>

              {/* SIMULADOR DE DETALHE DE DIVISÃO EM TEMPO REAL */}
              {getProjetarParcelas().length > 0 && (
                <div className="bg-slate-55 p-3 rounded-xl border border-slate-200/60">
                  <span className="block text-[10px] font-bold text-slate-450 uppercase mb-2">Simulação de Divisão das Parcelas (Centavos Ajustados):</span>
                  <div className="max-h-24 overflow-y-auto space-y-1.5 text-xs text-slate-600 font-mono pr-2">
                    {getProjetarParcelas().map((projVal, i) => (
                      <div key={i} className="flex justify-between items-center bg-white px-2.5 py-1 rounded border border-slate-100">
                        <span>Parcela {i + 1} de {formAcordo.qtd_parcelas}:</span>
                        <span className="font-bold text-slate-900">{formatCurrency(projVal)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-4 flex items-center gap-3 border-t border-slate-100">
                <button 
                  type="button" 
                  onClick={() => setModalAcordoOpen(false)}
                  className="flex-1 hover:bg-slate-100 text-slate-600 text-sm font-semibold py-2 rounded-xl transition-all"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold py-2 rounded-xl shadow-md transition-all active:scale-95"
                >
                  Registrar Acordo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL IMPORTACAO */}
      {modalImportOpen && (
        <ImportModal 
          onClose={() => setModalImportOpen(false)} 
          onSuccess={() => {
            setModalImportOpen(false);
            fetchAllData();
          }} 
        />
      )}

      {/* MODAL AMORTIZAÇÃO */}
      {modalAmortizacaoOpen && selectedAcordo && (
        <AmortizacaoModal 
          acordoId={selectedAcordo.id}
          acordoDescricao={selectedAcordo.descricao || translateTipoAcordo(selectedAcordo.tipo)}
          token={token!}
          onClose={() => setModalAmortizacaoOpen(false)}
          onSuccess={() => {
            setModalAmortizacaoOpen(false);
            setSuccessMsg('Amortização realizada com sucesso!');
            fetchAllData();
            selectAcordo(selectedAcordo);
          }}
        />
      )}

      {/* MODAL EDITAR ACORDO */}
      {modalEditAcordoOpen && selectedAcordo && (
        <EditAcordoModal 
          acordo={selectedAcordo}
          colaboradores={colaboradores}
          token={token!}
          onClose={() => setModalEditAcordoOpen(false)}
          onSuccess={() => {
            setModalEditAcordoOpen(false);
            setSuccessMsg('Acordo atualizado com sucesso!');
            fetchAllData();
            selectAcordo(selectedAcordo);
          }}
        />
      )}

      {/* MODAL CONFIRMAR EXCLUSÃO */}
      {acordoToDelete && (
        <ConfirmDeleteModal 
          acordoId={acordoToDelete.id}
          colaboradorNome={acordoToDelete.colaborador_nome || 'Colaborador'}
          token={token!}
          onClose={() => setAcordoToDelete(null)}
          onSuccess={() => {
            setAcordoToDelete(null);
            setSuccessMsg('Acordo excluído com sucesso!');
            if (selectedAcordo?.id === acordoToDelete.id) {
              setSelectedAcordo(null);
              setParcelas([]);
            }
            fetchAllData();
          }}
        />
      )}

      {/* MODAL EDITAR PARCELA */}
      {editParcelaData && (
        <EditParcelaModal 
          parcelaId={editParcelaData.id}
          numeroParcela={editParcelaData.num}
          valorAtual={editParcelaData.valor}
          dataVencimentoAtual={editParcelaData.dataVencimento}
          token={token!}
          onClose={() => setEditParcelaData(null)}
          onSuccess={() => {
            setEditParcelaData(null);
            setSuccessMsg('Parcela atualizada com sucesso!');
            fetchAllData();
            if (selectedAcordo) selectAcordo(selectedAcordo);
          }}
        />
      )}
    </div>
  );
}
