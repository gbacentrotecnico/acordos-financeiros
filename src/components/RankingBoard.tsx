import React, { useState, useEffect } from 'react';
import { Trophy, TrendingUp, TrendingDown, Medal, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface RankingItem {
  id: number;
  nome: string;
  loja: string;
  pontuacao: number;
}

export default function RankingBoard() {
  const { token } = useAuth();
  const [ranking, setRanking] = useState<RankingItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRanking = async () => {
      if (!token) return;
      try {
        const res = await fetch('/api/ranking', {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success) {
          setRanking(data.data);
        }
      } catch (err) {
        console.error('Erro ao buscar ranking', err);
      } finally {
        setLoading(false);
      }
    };
    fetchRanking();
  }, [token]);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl p-12 text-center border border-slate-200">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mx-auto mb-4" />
        <h3 className="text-slate-600 font-medium">Calculando pontuações...</h3>
      </div>
    );
  }

  // Filtrar apenas quem tem pontuação > 0 ou <= 0 se quiser mostrar todos
  // Vamos mostrar o top 10 ou todos.
  const top3 = ranking.slice(0, 3);
  const others = ranking.slice(3);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      <div className="bg-gradient-to-r from-indigo-600 to-violet-600 rounded-2xl p-6 md:p-8 text-white shadow-lg">
        <div className="flex items-center gap-3 mb-2">
          <div className="bg-white/20 p-2.5 rounded-xl backdrop-blur-sm">
            <Trophy className="w-6 h-6 text-yellow-300" />
          </div>
          <h2 className="text-2xl font-black tracking-tight">Ranking de Pontualidade</h2>
        </div>
        <p className="text-indigo-100 max-w-2xl text-sm leading-relaxed mt-2">
          Acompanhe o desempenho financeiro dos colaboradores. Pontos são ganhos ao pagar parcelas em dia (+10) e perdidos por dias de atraso (-5/dia).
        </p>
      </div>

      {ranking.length === 0 ? (
        <div className="bg-white p-10 rounded-2xl text-center border border-slate-200">
          <p className="text-slate-500">Nenhuma parcela descontada ainda para gerar ranking.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Pódio (Top 3) */}
          <div className="md:col-span-1 space-y-4">
            <h3 className="font-bold text-slate-700 uppercase tracking-wider text-xs mb-4">Top 3 Colaboradores</h3>
            
            {top3.map((colab, idx) => (
              <div key={colab.id} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden flex flex-col items-center text-center">
                <div className={`absolute top-0 left-0 w-full h-1 ${idx === 0 ? 'bg-yellow-400' : idx === 1 ? 'bg-slate-300' : 'bg-amber-600'}`}></div>
                
                <div className="mb-3 mt-1">
                  {idx === 0 ? <Medal className="w-10 h-10 text-yellow-400" /> 
                   : idx === 1 ? <Medal className="w-8 h-8 text-slate-300" /> 
                   : <Medal className="w-8 h-8 text-amber-600" />}
                </div>
                
                <h4 className="font-extrabold text-slate-900 text-lg line-clamp-1">{colab.nome}</h4>
                <p className="text-xs text-slate-500 mb-4">{colab.loja}</p>
                
                <div className="bg-slate-50 px-4 py-2 rounded-xl border border-slate-100 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-500" />
                  <span className="font-black text-emerald-600">{colab.pontuacao} pts</span>
                </div>
              </div>
            ))}
          </div>

          {/* Restante do Ranking */}
          <div className="md:col-span-2">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden h-full">
              <div className="p-5 border-b border-slate-100 bg-slate-50">
                <h3 className="font-bold text-slate-700 uppercase tracking-wider text-xs">Posições Seguintes</h3>
              </div>
              
              <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
                {others.length > 0 ? others.map((colab, idx) => (
                  <div key={colab.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 font-bold text-xs flex items-center justify-center">
                        #{idx + 4}
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-800 text-sm">{colab.nome}</h4>
                        <p className="text-xs text-slate-500">{colab.loja}</p>
                      </div>
                    </div>
                    
                    <div className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-xs font-bold ${
                      colab.pontuacao > 0 ? 'bg-emerald-50 text-emerald-600' : 
                      colab.pontuacao < 0 ? 'bg-rose-50 text-rose-600' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {colab.pontuacao > 0 ? <TrendingUp className="w-3.5 h-3.5" /> : 
                       colab.pontuacao < 0 ? <TrendingDown className="w-3.5 h-3.5" /> : null}
                      {colab.pontuacao} pts
                    </div>
                  </div>
                )) : (
                  <div className="p-8 text-center text-slate-400 text-sm">
                    Apenas os top 3 possuem pontuação no momento.
                  </div>
                )}
              </div>
            </div>
          </div>
          
        </div>
      )}
    </div>
  );
}
