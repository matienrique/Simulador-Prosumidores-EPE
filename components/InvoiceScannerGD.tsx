import React, { useState, useRef } from 'react';
import { Upload, Sparkles, Loader2, CheckCircle2, AlertCircle, FileText, X, RefreshCw, Layers } from 'lucide-react';
import { ProsumidorGDData, TaxStatus } from '../types';
import { sendOcrRequest, MAX_FILE_SIZE_BYTES } from '../utils/scannerApi';

interface Props {
  onDataExtracted: (data: Partial<ProsumidorGDData>) => void;
}

const compressImageIfNeeded = (file: File): Promise<{ base64: string; mimeType: string }> => {
  return new Promise((resolve, reject) => {
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

export const InvoiceScannerGD: React.FC<Props> = ({ onDataExtracted }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [fileNames, setFileNames] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [lastFiles, setLastFiles] = useState<File[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFiles = async (files: File[]) => {
    if (!files || files.length === 0) return;

    setError(null);
    setSuccessMessage(null);
    setLastFiles(files);

    const validFiles: File[] = [];
    for (const f of files) {
      const ext = f.name.split('.').pop()?.toLowerCase();
      const isPdf = f.type === 'application/pdf' || ext === 'pdf';
      if (isPdf) {
        validFiles.push(f);
      }
    }

    if (validFiles.length === 0) {
      setError('Formato no compatible. Por favor sube un archivo PDF de tu factura.');
      return;
    }

    const totalBytes = validFiles.reduce((acc, f) => acc + f.size, 0);
    if (totalBytes > MAX_FILE_SIZE_BYTES) {
      setError('Los documentos seleccionados superan el límite permitido (20 MB en total). Por favor subí archivos más livianos.');
      return;
    }

    setFileNames(validFiles.map(f => f.name));
    setIsProcessing(true);
    setProcessingStep('Optimizando documento(s) para lectura...');

    try {
      // 1. Process files into base64
      const processedList: Array<{ imageBase64: string; mimeType: string }> = [];
      for (const f of validFiles) {
        const { base64, mimeType } = await compressImageIfNeeded(f);
        processedList.push({ imageBase64: base64, mimeType });
      }

      // 2. Call backend safely
      setProcessingStep('Analizando factura de Gran Demanda con IA...');

      const extractedData = await sendOcrRequest<Partial<ProsumidorGDData>>(
        '/api/extract-prosumidor-gd-invoice',
        {
          files: processedList,
        }
      );

      setProcessingStep('Completando campos...');
      onDataExtracted(extractedData);
      setSuccessMessage('¡Datos leídos exitosamente! Recordá comprobar tus datos y ajustarlos si es necesario.');

      // Smooth scroll to form fields
      setTimeout(() => {
        const formElem = document.querySelector('form');
        if (formElem) {
          const rect = formElem.getBoundingClientRect();
          window.scrollBy({ top: rect.top - 80, behavior: 'smooth' });
        }
      }, 300);

    } catch (err: any) {
      console.error('Error al escanear factura GD:', err);
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
    const files = e.target.files ? (Array.from(e.target.files) as File[]) : [];
    if (files.length > 0) {
      processFiles(files);
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
    const files = e.dataTransfer.files ? (Array.from(e.dataTransfer.files) as File[]) : [];
    if (files.length > 0) {
      processFiles(files);
    }
  };

  const clearState = () => {
    setFileNames([]);
    setLastFiles([]);
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
              Autocompletar Factura EPE (Gran Demanda)
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
        multiple
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
              {processingStep || 'Procesando factura GD...'}
            </p>
            <p className="text-xs text-violet-700 mt-0.5">
              Leyendo potencias, cargos comerciales, franjas horarias (Pico, Resto, Valle) y tablas de medición...
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
            {lastFiles.length > 0 && (
              <button
                type="button"
                onClick={() => processFiles(lastFiles)}
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
      {fileNames.length > 0 && !isProcessing && (
        <div className="mt-3 pt-3 border-t border-violet-100 flex items-center justify-between text-xs text-violet-800">
          <div className="flex items-center gap-2 truncate">
            {fileNames.length > 1 ? (
              <Layers className="w-4 h-4 text-violet-500 flex-shrink-0" />
            ) : (
              <FileText className="w-4 h-4 text-violet-500 flex-shrink-0" />
            )}
            <span className="font-semibold truncate">
              {fileNames.length > 1
                ? `${fileNames.length} archivos procesados: ${fileNames.join(', ')}`
                : `Archivo procesado: ${fileNames[0]}`}
            </span>
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

export default InvoiceScannerGD;
