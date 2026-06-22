import React, { useState, useRef } from 'react';
import { Upload, X, FileSpreadsheet, Download, FileText, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface ImportModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function ImportModal({ onClose, onSuccess }: ImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorsList, setErrorsList] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { token } = useAuth();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
      setErrorMsg(null);
      setErrorsList([]);
      setSuccessMsg(null);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handleDownloadTemplate = async (format: 'csv' | 'xlsx') => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const res = await fetch(`/api/importacao/template?format=${format}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!res.ok) throw new Error("Erro ao baixar");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `modelo_acordos.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setErrorMsg("Erro ao tentar baixar o modelo.");
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setErrorMsg("Selecione um arquivo primeiro.");
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setErrorsList([]);
    setSuccessMsg(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/importacao/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });
      const data = await res.json();

      if (data.success) {
        setSuccessMsg(data.message);
        if (data.erros && data.erros.length > 0) {
          setErrorsList(data.erros);
        } else {
          setTimeout(() => {
            onSuccess();
          }, 2000);
        }
      } else {
        setErrorMsg(data.error || "Erro ao importar planilha.");
      }
    } catch (err) {
      setErrorMsg("Erro de rede ao conectar com o servidor.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="bg-indigo-600 p-4 border-b flex items-center justify-between">
          <div className="flex items-center gap-2 text-white">
            <Upload className="h-5 w-5" />
            <h3 className="font-bold text-base">Importação em Lote</h3>
          </div>
          <button onClick={onClose} className="hover:bg-indigo-700 p-1 rounded-lg text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6">
          <p className="text-sm text-slate-600 mb-6">
            Importe múltiplos acordos de uma só vez utilizando nossa planilha padrão. O sistema irá gerar os contratos em PDF e enviá-los via WhatsApp automaticamente.
          </p>

          <div className="grid grid-cols-2 gap-4 mb-8">
            <button onClick={() => handleDownloadTemplate('xlsx')} className="flex items-center justify-center gap-2 bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 px-4 py-3 rounded-xl transition-colors font-medium text-sm">
              <FileSpreadsheet className="h-5 w-5" />
              Baixar Modelo Excel (.xlsx)
            </button>
            <button onClick={() => handleDownloadTemplate('csv')} className="flex items-center justify-center gap-2 bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100 px-4 py-3 rounded-xl transition-colors font-medium text-sm">
              <FileText className="h-5 w-5" />
              Baixar Modelo CSV (.csv)
            </button>
          </div>

          <div 
            className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer ${file ? 'border-indigo-400 bg-indigo-50/30' : 'border-slate-300 hover:border-indigo-400 bg-slate-50 hover:bg-slate-50/50'}`}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx, .csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, text/csv" onChange={handleFileChange} />
            
            {file ? (
              <div className="flex flex-col items-center gap-2">
                <FileSpreadsheet className="h-10 w-10 text-indigo-500" />
                <span className="font-semibold text-slate-700">{file.name}</span>
                <span className="text-xs text-slate-400">{(file.size / 1024).toFixed(1)} KB</span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <Upload className="h-10 w-10 text-slate-400" />
                <span className="font-semibold text-slate-700">Clique para selecionar ou arraste sua planilha aqui</span>
                <span className="text-xs text-slate-500">Formatos suportados: .xlsx, .csv</span>
              </div>
            )}
          </div>

          {errorMsg && (
            <div className="mt-4 bg-rose-50 border-l-4 border-rose-500 p-3 rounded flex gap-2 items-center text-sm text-rose-700">
              <AlertCircle className="h-5 w-5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="mt-4 bg-emerald-50 border-l-4 border-emerald-500 p-3 rounded flex gap-2 items-center text-sm text-emerald-700">
              <CheckCircle className="h-5 w-5" />
              <span>{successMsg}</span>
            </div>
          )}

          {errorsList.length > 0 && (
            <div className="mt-4 bg-amber-50 border border-amber-200 rounded p-3 text-sm">
              <p className="font-semibold text-amber-800 mb-2 flex items-center gap-1"><AlertCircle className="h-4 w-4"/> Atenção para as seguintes linhas:</p>
              <ul className="list-disc pl-5 text-amber-700 space-y-1 max-h-32 overflow-y-auto text-xs">
                {errorsList.map((err, i) => <li key={i}>{err}</li>)}
              </ul>
            </div>
          )}
        </div>

        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
          <button onClick={onClose} className="px-5 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors">
            Cancelar
          </button>
          <button 
            onClick={handleUpload} 
            disabled={!file || loading}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white px-6 py-2 rounded-xl text-sm font-semibold shadow-md transition-all active:scale-95"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {loading ? 'Processando...' : 'Importar Acordos'}
          </button>
        </div>
      </div>
    </div>
  );
}
