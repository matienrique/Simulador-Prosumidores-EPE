import React, { useState, useRef, useEffect } from 'react';
import { Upload, Sparkles, Loader2, CheckCircle2, AlertCircle, FileText, X, RefreshCw } from 'lucide-react';

interface ExtractedProsumidorData {
  eg?: number;
  ee?: number;
  er?: number;
  serviceQuota?: number;
  bands?: Array<{ energy: number; amount: number }>;
  reconEPE?: number;
  reconGSF?: number;
  cap?: number;
  ley12692?: number;
  ley7797?: number;
  aplicaLey7797?: boolean;
  totalBill?: number;
  isRosario?: boolean;
  taxStatus?: string;
  program?: '4.0' | 'anterior';
}

interface Props {
  onDataExtracted: (data: ExtractedProsumidorData) => void;
}

// Client-side image compressor: scales down camera photos to max 1920px at 0.85 quality
// This reduces 10MB+ camera shots down to ~400KB while preserving sharp text readability.
const compressImageIfNeeded = (file: File): Promise<{ base64: string; mimeType: string }> => {
  return new Promise((resolve, reject) => {
    // If it's a PDF, don't attempt canvas processing, read directly
    if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
      const reader = new FileReader();
      reader.onload = () => {
        const res = reader.result as string;
        const base64 = res.split(',')[1];
        resolve({ base64, mimeType: 'application/pdf' });
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
      return;
    }

    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const maxDim = 1920;
      let width = img.width;
      let height = img.height;

      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        // Fallback to normal read
        const reader = new FileReader();
        reader.onload = () => {
          const res = reader.result as string;
          resolve({ base64: res.split(',')[1], mimeType: file.type || 'image/jpeg' });
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
        return;
      }

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);

      const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.88);
      const base64 = compressedDataUrl.split(',')[1];
      resolve({ base64, mimeType: 'image/jpeg' });
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      // Fallback
      const reader = new FileReader();
      reader.onload = () => {
        const res = reader.result as string;
        resolve({ base64: res.split(',')[1], mimeType: file.type || 'image/jpeg' });
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    };

    img.src = objectUrl;
  });
};

export const InvoiceScanner: React.FC<Props> = ({ onDataExtracted }) => {
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

    setFileName(file.name);
    setIsProcessing(true);
    setProcessingStep('Optimizando documento para lectura...');

    try {
      // 1. Compress / Prepare Base64
      const { base64, mimeType } = await compressImageIfNeeded(file);

      // 2. Call backend
      setProcessingStep('Analizando factura');

      const response = await fetch('/api/extract-prosumidor-invoice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageBase64: base64,
          mimeType: mimeType,
        }),
      });

      setProcessingStep('Interpretando lecturas y conceptos...');

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'No se pudieron extraer los datos de la factura.');
      }

      onDataExtracted(result.data);
      setSuccessMessage('¡Datos leídos exitosamente! Recordá comprobar tus datos y ajustarlos si es necesario.');

      // Scroll smoothly to the form fields so the user sees the filled data
      setTimeout(() => {
        const formElem = document.querySelector('form');
        if (formElem) {
          const rect = formElem.getBoundingClientRect();
          window.scrollBy({ top: rect.top - 80, behavior: 'smooth' });
        }
      }, 300);

    } catch (err: any) {
      console.error('Error al escanear factura:', err);
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
          ? 'bg-violet-100 border-violet-500 scale-[1.01]'
          : 'bg-gradient-to-br from-violet-50 via-white to-fuchsia-50 border-violet-200/90'
      }`}
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-violet-600 text-white rounded-xl shadow-md flex-shrink-0">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h3 className="text-lg font-extrabold text-violet-950">
              Autocompletar con tu Factura EPE
            </h3>
            <p className="text-xs text-violet-700/90 font-medium mt-0.5">
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
          className="w-full flex items-center justify-center gap-2.5 p-3.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-bold shadow-md transition-all transform active:scale-95 disabled:opacity-50"
        >
          <Upload className="w-5 h-5" />
          <span>Subí tu factura en PDF descargada de la Oficina Virtual de EPE</span>
        </button>
      </div>

      {/* Loading state with step message */}
      {isProcessing && (
        <div className="p-5 bg-white/95 rounded-xl border border-violet-200 flex flex-col sm:flex-row items-center gap-4 animate-fade-in shadow-inner">
          <Loader2 className="w-8 h-8 text-violet-600 animate-spin flex-shrink-0" />
          <div className="text-center sm:text-left flex-1">
            <p className="font-bold text-violet-900 text-sm">
              {processingStep || 'Procesando factura...'}
            </p>
            <p className="text-xs text-violet-700 mt-0.5">
              Identificando lecturas EG, EE, ER, cuota de servicio, bandas de energía e impuestos...
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
        <div className="mt-3 pt-3 border-t border-violet-100 flex items-center justify-between text-xs text-violet-800">
          <div className="flex items-center gap-2 truncate">
            <FileText className="w-4 h-4 text-violet-500 flex-shrink-0" />
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

export default InvoiceScanner;
