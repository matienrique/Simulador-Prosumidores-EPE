import React, { useState, useRef } from 'react';
import { Upload, Sparkles, Loader2, CheckCircle2, AlertCircle, FileText, X, RefreshCw } from 'lucide-react';
import { sendOcrRequest, MAX_FILE_SIZE_BYTES } from '../utils/scannerApi';

interface Props {
  onDataExtracted: (data: any) => void;
}

export const InvoiceScannerNoPros: React.FC<Props> = ({ onDataExtracted }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [lastFile, setLastFile] = useState<File | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = async (file: File) => {
    setError(null);
    setSuccessMessage(null);
    setLastFile(file);

    const ext = file.name.split('.').pop()?.toLowerCase();
    const isPdf = file.type === 'application/pdf' || ext === 'pdf';

    if (!isPdf) {
      setError('Formato no compatible. Por favor sube un archivo PDF de tu factura.');
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setError('El archivo seleccionado supera el límite de 20 MB. Por favor subí un documento más liviano.');
      return;
    }

    setFileName(file.name);
    setIsProcessing(true);
    setProcessingStep('Optimizando documento para lectura...');

    try {
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const res = reader.result as string;
          const base64 = res.split(',')[1];
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      setProcessingStep('Analizando factura...');

      const extractedData = await sendOcrRequest<any>(
        '/api/extract-no-prosumidor-invoice',
        {
          imageBase64: base64Data,
          mimeType: 'application/pdf',
        }
      );

      setProcessingStep('Completando campos...');
      onDataExtracted(extractedData);
      setSuccessMessage('¡Datos leídos exitosamente! Recordá comprobar tus datos y ajustarlos si es necesario.');

      setTimeout(() => {
        const formElem = document.querySelector('form');
        if (formElem) {
          const rect = formElem.getBoundingClientRect();
          window.scrollBy({ top: rect.top - 80, behavior: 'smooth' });
        }
      }, 300);

    } catch (err: any) {
      console.error('Error al escanear factura No Prosumidor:', err);
      let userMsg = err.message || 'Ocurrió un problema al procesar la factura.';
      if (userMsg.includes('high demand') || userMsg.includes('503') || userMsg.includes('UNAVAILABLE')) {
        userMsg = 'El servicio está experimentando alta demanda momentánea. Por favor reintentá en unos minutos.';
      }
      setError(userMsg);
    } finally {
      setIsProcessing(false);
      setProcessingStep('');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
    e.target.value = '';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const clearState = () => {
    setFileName(null);
    setLastFile(null);
    setError(null);
    setSuccessMessage(null);
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`p-6 rounded-2xl border-2 transition-all shadow-md ${
        isDragging
          ? 'bg-orange-100 border-orange-500 scale-[1.01]'
          : 'bg-gradient-to-br from-orange-50 via-white to-amber-50 border-orange-200/90'
      }`}
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-orange-600 text-white rounded-xl shadow-md flex-shrink-0">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h3 className="text-lg font-extrabold text-orange-950">
              Autocompletar Factura EPE
            </h3>
            <p className="text-xs text-orange-700/90 font-medium mt-0.5">
              Utilizá tu última factura para simular tus ahorros
            </p>
          </div>
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf,.pdf"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Action Button */}
      <div className="mb-4">
        <button
          type="button"
          disabled={isProcessing}
          onClick={() => fileInputRef.current?.click()}
          className="w-full flex items-center justify-center gap-2.5 p-3.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-bold shadow-md transition-all transform active:scale-95 disabled:opacity-50"
        >
          <Upload className="w-5 h-5" />
          <span>Subí tu factura en PDF descargada de la Oficina Virtual de EPE</span>
        </button>
      </div>

      {/* Loading state with step message */}
      {isProcessing && (
        <div className="p-5 bg-white/95 rounded-xl border border-orange-200 flex flex-col sm:flex-row items-center gap-4 animate-fade-in shadow-inner">
          <Loader2 className="w-8 h-8 text-orange-600 animate-spin flex-shrink-0" />
          <div className="text-center sm:text-left flex-1">
            <p className="font-bold text-orange-900 text-sm">
              {processingStep || 'Procesando factura...'}
            </p>
            <p className="text-xs text-orange-700 mt-0.5">
              Identificando consumos bimestrales, cuota de servicio, bandas de energía e impuestos...
            </p>
          </div>
        </div>
      )}

      {/* Success banner */}
      {successMessage && (
        <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 flex items-start gap-3 animate-fade-in shadow-sm">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1 text-sm text-emerald-900 font-medium">
            {successMessage}
          </div>
          <button
            type="button"
            onClick={() => setSuccessMessage(null)}
            className="text-emerald-700 hover:text-emerald-900 p-0.5"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Error banner with Retry option */}
      {error && (
        <div className="p-4 bg-red-50 rounded-xl border border-red-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-fade-in shadow-sm">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-red-900 font-medium">
              {error}
            </div>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-center">
            {lastFile && (
              <button
                type="button"
                onClick={() => processFile(lastFile)}
                className="px-3 py-1.5 bg-red-600 text-white text-xs font-bold rounded-lg hover:bg-red-700 flex items-center gap-1.5 transition-colors shadow-sm"
              >
                <RefreshCw size={13} />
                <span>Reintentar</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setError(null)}
              className="text-red-700 hover:text-red-900 p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* File status tag */}
      {fileName && !isProcessing && (
        <div className="mt-3 pt-3 border-t border-orange-100 flex items-center justify-between text-xs text-orange-800">
          <div className="flex items-center gap-2 truncate">
            <FileText className="w-4 h-4 text-orange-500 flex-shrink-0" />
            <span className="font-semibold truncate">Documento: {fileName}</span>
          </div>
          <button
            type="button"
            onClick={clearState}
            className="text-gray-400 hover:text-gray-600 ml-2 font-bold underline"
          >
            Quitar
          </button>
        </div>
      )}
    </div>
  );
};

export default InvoiceScannerNoPros;
