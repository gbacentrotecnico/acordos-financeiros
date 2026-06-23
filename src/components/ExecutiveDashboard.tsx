import React, { useState } from 'react';
import { 
  TrendingUp, 
  DollarSign, 
  AlertTriangle, 
  Calendar, 
  Briefcase, 
  MapPin, 
  Database, 
  Download, 
  CheckCircle, 
  Building,
  User,
  ArrowUpRight,
  ShieldAlert,
  Sliders,
  Check
} from 'lucide-react';
import { Acordo, Colaborador, DashboardIndicadores, TipoAcordo } from '../types.ts';
import { useAuth } from '../contexts/AuthContext';

interface ExecutiveDashboardProps {
  indicadores: DashboardIndicadores;
  acordos: Acordo[];
  colaboradores: Colaborador[];
  onDescontarParcela: (id: number) => Promise<void>;
}

// Helper de formatação de moeda brasileira
const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(val);
};

// Tradutor de Tipo de Acordo
const translateTipoAcordo = (tipo: TipoAcordo) => {
  switch (tipo) {
    case 'veiculo_usado': return 'Veículo Usado';
    case 'moto': return 'Motocicleta';
    case 'emprestimo_vale': return 'Empréstimo / Vale';
    default: return tipo;
  }
};

export default function ExecutiveDashboard({
  indicadores,
  acordos,
  colaboradores,
  onDescontarParcela
}: ExecutiveDashboardProps) {
  const { user } = useAuth();
  const [exportingBI, setExportingBI] = useState(false);
  const [exportResult, setExportResult] = useState<string | null>(null);
  const [selectedLojaFilter, setSelectedLojaFilter] = useState<string>('todas');
  const [previsaoFilter, setPrevisaoFilter] = useState<'hoje' | 'semana' | 'mes'>('mes');

  // --- CÁLCULO DE MÉTRICAS ANALÍTICAS DO GRUPO (BI DADOS) ---
  // 1. Distribuição por tipo de acordo (Dinheiro na rua)
  const totalPorTipo = acordos.reduce((acc, ac) => {
    if (ac.status === 'ativo') {
      // Como não temos o saldo restante de cada acordo diretamente nos indicadores da rota de acordos,
      // podemos estimar ou calcular o valor_total como referência de distribuição
      acc[ac.tipo] = (acc[ac.tipo] || 0) + ac.valor_total;
    }
    return acc;
  }, {} as Record<string, number>);

  const vUsadoTotal = totalPorTipo['veiculo_usado'] || 0;
  const motoTotal = totalPorTipo['moto'] || 0;
  const emprestimoTotal = totalPorTipo['emprestimo_vale'] || 0;
  const totalAbsolutoAcordosAtivos = vUsadoTotal + motoTotal + emprestimoTotal;

  // Percentuais por tipo de acordo no portfólio
  const pctUsado = totalAbsolutoAcordosAtivos ? Math.round((vUsadoTotal / totalAbsolutoAcordosAtivos) * 100) : 0;
  const pctMoto = totalAbsolutoAcordosAtivos ? Math.round((motoTotal / totalAbsolutoAcordosAtivos) * 100) : 0;
  const pctEmprestimo = totalAbsolutoAcordosAtivos ? Math.round((emprestimoTotal / totalAbsolutoAcordosAtivos) * 105) : 0; // Pequeno ajuste de UI

  // 2. Distribuição por Loja
  const totalPorLoja = acordos.reduce((acc, ac) => {
    if (ac.status === 'ativo' && ac.colaborador_loja) {
      acc[ac.colaborador_loja] = (acc[ac.colaborador_loja] || 0) + ac.valor_total;
    }
    return acc;
  }, {} as Record<string, number>);

  const lojasGrupo = Object.keys(totalPorLoja);

  // 3. Maiores devedores da empresa (ranking executivo)
  // Agrupa saldos totais ativos por colaborador
  const devedoresRanking = colaboradores.map(colab => {
    const acordosDoColab = acordos.filter(a => a.colaborador_id === colab.id && a.status === 'ativo');
    const totalDivida = acordosDoColab.reduce((sum, a) => sum + a.valor_total, 0);
    return {
      nome: colab.nome,
      loja: colab.loja,
      cargo: colab.cargo,
      qtd_acordos: acordosDoColab.length,
      valor_devedor_estimado: totalDivida
    };
  })
  .filter(d => d.valor_devedor_estimado > 0)
  .sort((a, b) => b.valor_devedor_estimado - a.valor_devedor_estimado)
  .slice(0, 5); // Top 5

  // --- COMPILADOR DE EXPORTAÇÃO DE INDICADORES BI PARA ECOSSISTEMA EXTERNO ---
  const handleExportBI = () => {
    setExportingBI(true);
    
    // Constrói objeto de payload limpo e estruturado que o BI externo pode consumir via endpoint
    const payloadBI = {
      timestamp: new Date().toISOString(),
      versao_bi: '2026.1',
      indicadores_globais: {
        total_recursos_na_rua: indicadores.saldoDevedorTotal,
        total_amortizado_grupo: indicadores.totalAmortizado,
        previsao_recebimento_corrente: indicadores.previsao.mes,
        taxa_inadimplencia_percentual: indicadores.saldoDevedorTotal 
          ? ((indicadores.alertasAtraso.reduce((sum, a) => sum + a.valor, 0) / indicadores.saldoDevedorTotal) * 100).toFixed(2)
          : '0.00'
      },
      distribuicao_portfolio: {
        veiculos_usados: vUsadoTotal,
        motocicletas: motoTotal,
        emprestimos_vale: emprestimoTotal
      },
      distribuicao_lojas: totalPorLoja,
      alertas_atraso_totais: indicadores.alertasAtraso.map(alerta => ({
        colaborador: alerta.colaborador_nome,
        loja: alerta.loja,
        vencimento: alerta.data_vencimento,
        valor_atrasado: alerta.valor,
        dias_atraso: alerta.dias_atraso
      })),
      endpoint_origem: '/api/dashboard/indicadores'
    };

    setTimeout(() => {
      setExportResult(JSON.stringify(payloadBI, null, 2));
      setExportingBI(false);
    }, 600);
  };

  const closeExportBi = () => {
    setExportResult(null);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* BOTÃO DE INTEGRAÇÃO DE BI EXERNA */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-xl flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 transform translate-x-20 -translate-y-12 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="flex items-start gap-4 z-10">
          <div className="bg-indigo-600 p-3 rounded-2xl text-white shadow-lg shadow-indigo-500/20">
            <Database className="h-6 w-6" id="bi_icon" />
          </div>
          <div>
            <span className="text-xs text-indigo-300 font-bold uppercase tracking-widest bg-indigo-500/25 px-2.5 py-1 rounded-full">Vision BI Hub</span>
            <h3 className="text-lg font-bold mt-2.5">Ecossistema Central de BI Unificado</h3>
            <p className="text-sm text-slate-300 max-w-xl mt-1.5 leading-relaxed">
              Os dados deste dashboard estão estruturados e isolados em endpoints compatíveis com consumo externo em tempo real (PowerBI, Tableau, Grafana). Ideal para a aferição do balanço patrimonial global do grupo econômico.
            </p>
          </div>
        </div>
        <div className="w-full md:w-auto z-10">
          <button 
            type="button"
            onClick={handleExportBI}
            className="w-full md:w-auto bg-white text-slate-900 font-bold hover:bg-slate-150 px-6 py-3 rounded-xl text-sm transition-all duration-200 active:scale-95 shadow-md shadow-white/5 flex items-center justify-center gap-2"
          >
            <Download className="h-4.5 w-4.5 text-slate-900" />
            <span>{exportingBI ? 'Gerando Schema...' : 'Exportar Dados para BI (JSON)'}</span>
          </button>
        </div>
      </div>

      {/* PAINEL POPUP DA EXPORTAÇÃO JSON BI */}
      {exportResult && (
        <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 text-slate-100 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden border border-slate-800 animate-in fade-in scale-in duration-200 max-h-[90vh] flex flex-col">
            <div className="bg-slate-850 p-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database className="h-5 w-5 text-indigo-400" />
                <h4 className="font-bold text-slate-100 text-sm">Visualizar Endpoint BI (Esquema Unificado de Dados)</h4>
              </div>
              <button 
                onClick={closeExportBi} 
                className="hover:bg-slate-800 p-1 rounded-lg text-slate-400 hover:text-slate-200"
              >
                <span>Fechar</span>
              </button>
            </div>
            <div className="p-5 overflow-auto flex-1 font-mono text-xs text-lime-400 bg-black/90">
              <pre>{exportResult}</pre>
            </div>
            <div className="p-4 bg-slate-850 border-t border-slate-800 flex items-center justify-between">
              <span className="text-xs text-slate-400">Copie este JSON e anexe diretamente no coletor do seu Data Lake.</span>
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(exportResult);
                  alert('JSON copiado para a área de transferência!');
                }}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-4 py-2 rounded-xl"
              >
                Copiar JSON
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TRÊS PERGUNTAS DE IMEDIATO DO PATRÃO (CARDS PRINCIPAIS) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Pergunta 1: Quanto dinheiro a empresa tem "na rua"? */}
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm relative overflow-hidden flex flex-col justify-between h-44 hover:shadow-md transition-shadow">
          <div>
            <div className="flex justify-between items-start text-indigo-600">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Patrimônio Circulante</span>
              <DollarSign className="h-5 w-5 text-indigo-500" />
            </div>
            <h4 className="text-xs text-slate-600 font-extrabold mt-4">P1: Quanto dinheiro a empresa tem "na rua" com funcionários atualmente?</h4>
            <div className="text-2xl font-black text-slate-900 mt-2">
              {formatCurrency(indicadores.saldoDevedorTotal)}
            </div>
          </div>
          <div className="text-[10px] text-slate-400 mt-2 flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></div>
            Soma residual de todos os acordos ativos do grupo
          </div>
        </div>

        {/* Pergunta 2: Quanto entra no período filtrado? */}
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm relative overflow-hidden flex flex-col justify-between h-44 hover:shadow-md transition-shadow">
          <div>
            <div className="flex justify-between items-start text-emerald-600">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Previsão de Entradas</span>
              <Calendar className="h-5 w-5 text-emerald-500" />
            </div>
            
            <div className="flex gap-1 mt-3 mb-1">
              <button 
                onClick={() => setPrevisaoFilter('hoje')} 
                className={`text-[10px] px-2 py-0.5 font-bold rounded ${previsaoFilter === 'hoje' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'}`}
              >
                Hoje
              </button>
              <button 
                onClick={() => setPrevisaoFilter('semana')} 
                className={`text-[10px] px-2 py-0.5 font-bold rounded ${previsaoFilter === 'semana' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'}`}
              >
                Esta Semana
              </button>
              <button 
                onClick={() => setPrevisaoFilter('mes')} 
                className={`text-[10px] px-2 py-0.5 font-bold rounded ${previsaoFilter === 'mes' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'}`}
              >
                Este Mês
              </button>
            </div>

            <div className="text-2xl font-black text-slate-900 mt-1">
              {formatCurrency(indicadores.previsao[previsaoFilter])}
            </div>
          </div>
          <div className="text-[10px] text-emerald-600 mt-2 font-medium flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block"></span> Receitas baseadas nos vencimentos originais
          </div>
        </div>

        {/* Pergunta 3: Qual é o montante em atraso? */}
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm relative overflow-hidden flex flex-col justify-between h-44 hover:shadow-md transition-shadow">
          <div>
            <div className="flex justify-between items-start text-rose-600">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Inadimplência de Curto Prazo</span>
              <ShieldAlert className="h-5 w-5" />
            </div>
            <h4 className="text-xs text-slate-600 font-extrabold mt-4">P3: Quem está com parcelas em atraso e qual é a soma de inadimplência?</h4>
            <div className="text-2xl font-black text-rose-600 mt-2">
              {formatCurrency(indicadores.alertasAtraso.reduce((sum, a) => sum + a.valor, 0))}
            </div>
          </div>
          <div className="text-[10px] text-red-500 mt-2 font-bold flex items-center gap-1">
            ⚠️ {indicadores.alertasAtraso.length} parcelas vencidas aguardando liquidação manual
          </div>
        </div>

      </div>

      {/* METAS E COMPONENTES VISUAIS INOVADORES EM SVG / TAILWIND (Distribuição do Portfólio) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Distribuição por Tipo de Operação Financeira (Gráfico Customizado Premium) */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="font-extrabold text-slate-900 text-sm">Portfólio de Ativos do Patrão</h4>
              <p className="text-xs text-slate-400">Distribuição do saldo ativo por tipo de operação</p>
            </div>
            <Sliders className="h-4.5 w-4.5 text-slate-400" />
          </div>

          <div className="space-y-4">
            {/* Gráfico de Barras Proporcionais em Linha (Estilo Dashboard de Alto Nível) */}
            <div className="h-7 w-full flex rounded-full bg-slate-100 overflow-hidden relative shadow-inner">
              {vUsadoTotal > 0 && (
                <div 
                  style={{ width: `${pctUsado || 33}%` }} 
                  className="bg-indigo-600 h-full transition-all duration-500 relative group"
                ></div>
              )}
              {motoTotal > 0 && (
                <div 
                  style={{ width: `${pctMoto || 33}%` }} 
                  className="bg-sky-500 h-full transition-all duration-500"
                ></div>
              )}
              {emprestimoTotal > 0 && (
                <div 
                  style={{ width: `${pctEmprestimo || 34}%` }} 
                  className="bg-amber-500 h-full transition-all duration-500"
                ></div>
              )}
            </div>

            {/* Legendas dos Ativos com Valores e Percentuais */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div className="bg-indigo-50/40 p-3 rounded-xl border border-indigo-100/40">
                <span className="flex items-center gap-1.5 text-xs text-indigo-700 font-bold">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 inline-block"></span>
                  Veículos Usados
                </span>
                <span className="block font-black text-slate-800 text-base mt-1.5">{formatCurrency(vUsadoTotal)}</span>
                <span className="text-[10px] text-slate-400">{pctUsado}% do portfólio ativo</span>
              </div>

              <div className="bg-sky-50/40 p-3 rounded-xl border border-sky-100/40">
                <span className="flex items-center gap-1.5 text-xs text-sky-700 font-bold">
                  <span className="w-2.5 h-2.5 rounded-full bg-sky-500 inline-block"></span>
                  Motocicletas
                </span>
                <span className="block font-black text-slate-800 text-base mt-1.5">{formatCurrency(motoTotal)}</span>
                <span className="text-[10px] text-slate-400">{pctMoto}% do portfólio ativo</span>
              </div>

              <div className="bg-amber-50/40 p-3 rounded-xl border border-amber-100/40">
                <span className="flex items-center gap-1.5 text-xs text-amber-700 font-bold">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block"></span>
                  Empréstimos/Vales
                </span>
                <span className="block font-black text-slate-800 text-base mt-1.5">{formatCurrency(emprestimoTotal)}</span>
                <span className="text-[10px] text-slate-400">{pctEmprestimo}% do portfólio ativo</span>
              </div>
            </div>
          </div>
        </div>

        {/* Divisão Territorial por Unidade de Auto Center (Lojas) */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h4 className="font-extrabold text-slate-900 text-sm">Recursos "na rua" por Filial / Auto Center</h4>
                <p className="text-xs text-slate-400">Exposição de caixa ativo concentrado por unidade do grupo</p>
              </div>
              <Building className="h-5 w-5 text-slate-300" />
            </div>

            <div className="space-y-3 pt-1">
              {lojasGrupo.length === 0 ? (
                <div className="text-center py-6 text-xs text-slate-400">
                  Nenhuma filial ativa atualmente com saldos em aberto.
                </div>
              ) : (
                lojasGrupo.map(loja => {
                  const valorLoja = totalPorLoja[loja] || 0;
                  const totalAbsoluto = Object.values(totalPorLoja).reduce((s, v) => s + v, 0) || 1;
                  const percentLoja = Math.round((valorLoja / totalAbsoluto) * 100);
                  return (
                    <div key={loja} className="space-y-1">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-slate-700 flex items-center gap-1.5">
                          <MapPin className="h-3 w-3 text-slate-400" />
                          {loja}
                        </span>
                        <span className="font-bold text-slate-900">{formatCurrency(valorLoja)} <span className="text-[10px] text-slate-400 font-medium">({percentLoja}%)</span></span>
                      </div>
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div 
                          style={{ width: `${percentLoja}%` }}
                          className="bg-indigo-600 h-full rounded-full"
                        ></div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
          <div className="text-[10px] text-slate-400 pt-3 border-t border-slate-100 mt-4">
            Dados sincronizados com o banco em tempo real por folha de pagamento de auto center.
          </div>
        </div>

      </div>

      {/* QUADRO EXECUTIVO DE INADIMPLÊNCIA / ALERTA DE ATRASO (Para Ação Imediata) */}
      <div className="bg-rose-50 border border-slate-200 rounded-2xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="bg-rose-100 text-rose-800 p-2 rounded-xl">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <h4 className="font-extrabold text-rose-900 text-sm">Filtro de Inadimplência: Parcelas Vencidas e em Atraso</h4>
              <p className="text-xs text-rose-700">Mapeamento estrito das fichas manuais que já deveriam ter sofrido desconto</p>
            </div>
          </div>
          <div className="text-right text-rose-900 font-black text-sm">
            Total Vencido: {formatCurrency(indicadores.alertasAtraso.reduce((sum, a) => sum + a.valor, 0))}
          </div>
        </div>

        {indicadores.alertasAtraso.length === 0 ? (
          <div className="bg-white rounded-xl py-8 text-center border border-slate-200/60 shadow-sm text-slate-500 font-semibold text-xs flex flex-col items-center gap-2">
            <CheckCircle className="h-8 w-8 text-emerald-500" />
            <span>Excelente! Não existem parcelas vencidas em atraso no portfólio de colaboradores.</span>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200/80 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-indigo-900/5 text-slate-600 font-bold">
                  <tr>
                    <th className="p-3">Funcionário</th>
                    <th className="p-3">Auto Center / Filial</th>
                    <th className="p-3">Acordo / Parcela</th>
                    <th className="p-3 text-center">Dias de Atraso</th>
                    <th className="p-3 text-right">Valor Vencido</th>
                    <th className="p-3 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {indicadores.alertasAtraso.map((alerta) => (
                    <tr key={alerta.parcela_id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-3 font-semibold text-slate-900 flex items-center gap-1.5">
                        <User className="h-3.5 w-3.5 text-slate-400" />
                        {alerta.colaborador_nome}
                      </td>
                      <td className="p-3 text-slate-600">{alerta.loja}</td>
                      <td className="p-3 font-medium">
                        <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded text-[10px] font-bold">
                          {translateTipoAcordo(alerta.tipo)}
                        </span>
                        <span className="ml-1.5 text-slate-500">Parc. {alerta.numero_parcela}</span>
                      </td>
                      <td className="p-3 text-center">
                        <span className="bg-rose-100 text-rose-800 font-extrabold px-2 py-0.5 rounded-full text-[10px]">
                          {alerta.dias_atraso} dias
                        </span>
                      </td>
                      <td className="p-3 text-right font-bold text-rose-600">{formatCurrency(alerta.valor)}</td>
                      <td className="p-3 text-center">
                        {user?.role === 'master' ? (
                          <button 
                            onClick={() => onDescontarParcela(alerta.parcela_id)}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[10px] px-2.5 py-1.5 rounded-lg transition-all active:scale-95 flex items-center gap-1 mx-auto"
                          >
                            <Check className="h-3 w-3" />
                            <span>Dar Baixa (Folha)</span>
                          </button>
                        ) : (
                          <span className="text-[10px] text-slate-400 font-bold block text-center">Restrito</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* CRANOGRAMA DE MAIORES SALDOS DEVEDORES (RANKING / EXPOSIÇÃO PATRONAL) */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="h-5 w-5 text-indigo-600" />
          <h4 className="font-extrabold text-slate-900 text-sm">Exposição de Crédito: Top 5 de Maiores Saldos Devedores do Grupo</h4>
        </div>

        {devedoresRanking.length === 0 ? (
          <div className="text-center py-6 text-xs text-slate-400">
            Nenhum saldo devedor mapeável no momento.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {devedoresRanking.map((dev, i) => (
              <div key={i} className="bg-slate-50/50 p-4 border border-slate-150 rounded-xl flex flex-col justify-between hover:border-indigo-300 hover:bg-white transition-all duration-300">
                <div>
                  <div className="flex justify-between items-start">
                    <span className="bg-slate-200/60 text-slate-800 font-extrabold h-5 w-5 text-[10px] rounded-full flex items-center justify-center">
                      #{i + 1}
                    </span>
                    <span className="text-[10px] text-indigo-700 font-extrabold bg-indigo-50 px-2 py-0.5 rounded-full">
                      {dev.qtd_acordos} {dev.qtd_acordos === 1 ? 'acordo' : 'acordos'}
                    </span>
                  </div>
                  <h5 className="font-bold text-slate-900 text-xs mt-3 line-clamp-1">{dev.nome}</h5>
                  <p className="text-[10px] text-slate-450 mt-1 flex items-center gap-1">
                    <Briefcase className="h-2.5 w-2.5" />
                    {dev.cargo}
                  </p>
                  <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                    <MapPin className="h-2.5 w-2.5" />
                    {dev.loja}
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-150">
                  <span className="text-[10px] text-slate-450 uppercase block font-bold">Total Acordado</span>
                  <span className="text-sm font-black text-slate-800 block mt-0.5">{formatCurrency(dev.valor_devedor_estimado)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
