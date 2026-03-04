import React, { useState, useEffect } from 'react';
import { CalculationResult, UserType } from '../types';
import { formatCurrency, formatNumber, formatPercent } from '../utils/format';
import { ArrowLeft, RefreshCw, Leaf, Trees, Banknote, AlertCircle, Download, PieChart as PieIcon, ChevronDown, ChevronUp } from 'lucide-react';
import Footer from './Footer';
// @ts-ignore
import html2pdf from 'html2pdf.js';

interface Props {
  results: CalculationResult;
  userType: UserType;
  onBack: () => void;
  onReset: () => void;
}

interface PieData {
  value: number;
  color: string;
  label: string;
}

const InteractivePieChart: React.FC<{ data: PieData[] }> = ({ data }) => {
  const [animated, setAnimated] = useState(false);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const total = data.reduce((acc, d) => acc + d.value, 0);
  let cumulativePercent = 0;

  useEffect(() => {
    const timer = setTimeout(() => setAnimated(true), 100);
    return () => clearTimeout(timer);
  }, []);

  if (total === 0) return <div className="w-48 h-48 rounded-full bg-gray-100 flex items-center justify-center text-gray-400">Sin datos</div>;

  return (
    <div className="relative w-64 h-64 flex items-center justify-center">
      <div className="absolute inset-0 flex flex-col items-center justify-center z-10 pointer-events-none">
        {hoveredIndex !== null ? (
          <div className="text-center animate-fade-in bg-white/90 p-2 rounded-lg shadow-sm backdrop-blur-sm">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">{data[hoveredIndex].label}</p>
            <p className="text-xl font-extrabold text-gray-800">{formatPercent((data[hoveredIndex].value / total) * 100)}</p>
            <p className="text-xs text-gray-600 font-medium">{formatCurrency(data[hoveredIndex].value)}</p>
          </div>
        ) : (
          <div className="text-center text-gray-400">
            <PieIcon className="w-8 h-8 mx-auto mb-1 opacity-50" />
            <span className="text-xs">Pasar mouse</span>
          </div>
        )}
      </div>
      <svg viewBox="0 0 100 100" className="transform -rotate-90 w-full h-full drop-shadow-xl">
        {data.map((slice, i) => {
          const percent = slice.value / total;
          const strokeDasharray = `${percent * 100} 100`;
          const strokeDashoffset = -cumulativePercent * 100;
          cumulativePercent += percent;
          const isHovered = i === hoveredIndex;
          return (
            <circle key={i} cx="50" cy="50" r="15.9155" fill="transparent" stroke={slice.color} strokeWidth={isHovered ? "34" : "32"} strokeDasharray={strokeDasharray} strokeDashoffset={strokeDashoffset} className={`transition-all duration-500 ease-out cursor-pointer ${isHovered ? 'opacity-100' : 'opacity-90 hover:opacity-100'}`} style={{ strokeDasharray: animated ? strokeDasharray : `0 100` }} onMouseEnter={() => setHoveredIndex(i)} onMouseLeave={() => setHoveredIndex(null)} />
          );
        })}
      </svg>
    </div>
  );
};

const StepResults: React.FC<Props> = ({ results, userType, onBack, onReset }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const isProsumidor = userType === UserType.PROSUMIDOR;
  const isGD = results.type === 'GD';
  
  const [showDetails, setShowDetails] = useState(false);

  const handleDownloadPDF = () => {
    setIsGenerating(true);
    const element = document.getElementById('results-content');
    const opt = {
      margin: 10,
      filename: `Informe_Prosumidores_${new Date().toLocaleDateString()}.pdf`,
      image: { type: 'jpeg' as const, quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, logging: false },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const }
    };

    html2pdf().set(opt).from(element).save().then(() => {
      setIsGenerating(false);
    });
  };

  const pieData: PieData[] = [
    { value: Math.max(0, results.savingsConsumption), color: '#8b5cf6', label: 'Autoconsumo' },
    { value: Math.max(0, results.savingsTax), color: '#f97316', label: 'Impuestos' },
  ];
  if (results.savingsRecon && results.savingsRecon > 0) {
    pieData.push({ value: Math.max(0, results.savingsRecon), color: '#ec4899', label: 'Reconocimientos' });
  }

  return (
    <div className="flex flex-col min-h-full">
      <div id="results-content" className="animate-fade-in space-y-8 flex-grow p-4">
        <div className="flex justify-between items-center border-b border-gray-200 pb-4">
          <h2 className="text-2xl font-bold text-gray-800">Resultados del Análisis EPE {isGD ? '(Usuario Gran Demanda)' : ''}</h2>
          <button 
            onClick={handleDownloadPDF} 
            disabled={isGenerating}
            className="no-print flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-900 transition-colors shadow-sm disabled:opacity-50"
          >
            <Download size={18} /><span>{isGenerating ? 'Generando...' : 'Guardar PDF'}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 print-break-inside">
          <div className={`p-6 rounded-2xl shadow-md border-t-4 ${isProsumidor ? 'bg-violet-50 border-violet-500' : 'bg-orange-50 border-orange-500'}`}>
            <h3 className="text-sm font-semibold text-gray-500 mb-1 uppercase tracking-wider">{isProsumidor ? 'Tu Factura Actual' : 'Factura Estimada (Prosumidor)'}</h3>
            <p className="text-4xl font-extrabold text-gray-900 my-2">{formatCurrency(results.billWithProsumers)}</p>
            <span className="inline-block px-3 py-1 bg-white text-xs font-bold rounded-full shadow-sm text-gray-600 border border-gray-100">Con Prosumidores 4.0</span>
            {!isProsumidor && results.billWithProsumers < 0 && (
              <div className="mt-4 bg-white p-3 rounded-lg border-l-4 border-violet-500 flex items-start gap-3 shadow-sm">
                <AlertCircle className="w-5 h-5 text-violet-600 mt-0.5" />
                <p className="text-sm text-gray-700 font-medium">En tu próxima factura se acreditará un reintegro monetario igual al valor observado.</p>
              </div>
            )}
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-md border-t-4 border-gray-300">
            <h3 className="text-sm font-semibold text-gray-500 mb-1 uppercase tracking-wider">{isProsumidor ? 'Factura sin Prosumidores (Estimada)' : 'Tu Factura Actual'}</h3>
            <p className="text-4xl font-extrabold text-gray-900 my-2">{formatCurrency(results.billWithoutProsumers)}</p>
            <span className="inline-block px-3 py-1 bg-gray-100 text-xs font-bold rounded-full text-gray-500">Sin Prosumidores 4.0</span>
          </div>
        </div>

        <div className="print-break-inside bg-gradient-to-r from-violet-600 to-fuchsia-600 rounded-2xl p-8 text-white shadow-xl flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            <h2 className="text-lg font-medium opacity-90 uppercase tracking-widest">Ahorro Total Estimado</h2>
            <div className="flex items-baseline gap-4 mt-2">
              <span className="text-5xl font-extrabold">{formatCurrency(results.totalSavings)}</span>
              <span className="text-2xl font-bold bg-white/20 px-3 py-1 rounded-lg border border-white/30">{formatPercent(results.totalSavingsPercent)}</span>
            </div>
          </div>
          <Banknote className="w-20 h-20 opacity-20" />
        </div>

        <div className="print-break-inside bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="bg-gray-50 px-6 py-4 border-b border-gray-200"><h3 className="font-bold text-gray-700 flex items-center gap-2"><PieIcon size={20} className="text-violet-600"/> Composición del Ahorro</h3></div>
          <div className="p-8 flex flex-col md:flex-row items-center justify-around gap-12">
            <div className="flex-shrink-0 drop-shadow-2xl"><InteractivePieChart data={pieData} /></div>
            <div className="flex flex-col gap-6 w-full max-w-md">
              <div className="flex items-center justify-between border-b border-gray-100 pb-2"><div className="flex items-center gap-3"><div className="w-4 h-4 rounded-full bg-violet-500"></div><p className="text-sm font-semibold text-gray-600 uppercase">Por Autoconsumo</p></div><p className="text-lg font-bold text-gray-800">{formatCurrency(results.savingsConsumption)}</p></div>
              <div className="flex items-center justify-between border-b border-gray-100 pb-2"><div className="flex items-center gap-3"><div className="w-4 h-4 rounded-full bg-orange-500"></div><p className="text-sm font-semibold text-gray-600 uppercase">Por Impuestos</p></div><p className="text-lg font-bold text-gray-800">{formatCurrency(results.savingsTax)}</p></div>
              {results.savingsRecon !== undefined && results.savingsRecon > 0 && (<div className="flex items-center justify-between border-b border-gray-100 pb-2"><div className="flex items-center gap-3"><div className="w-4 h-4 rounded-full bg-pink-500"></div><p className="text-sm font-semibold text-gray-600 uppercase">Por Reconocimientos</p></div><p className="text-lg font-bold text-gray-800">{formatCurrency(results.savingsRecon)}</p></div>)}
            </div>
          </div>
        </div>

        <div className="print-break-inside bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-orange-50 to-orange-100 px-6 py-4 border-b border-orange-200"><h3 className="font-bold text-orange-800">Eficiencia Energética</h3></div>
          <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-10">
            <div><div className="flex justify-between items-end mb-2"><p className="text-xs text-gray-500 font-bold uppercase tracking-wide">Porcentaje de autoconsumo</p><span className="text-2xl font-extrabold text-violet-600">{results.autoconsumoPercent !== undefined ? formatNumber(results.autoconsumoPercent, 1) : 0}%</span></div><div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden"><div className="bg-violet-600 h-4 rounded-full" style={{ width: `${Math.min(100, Math.max(0, results.autoconsumoPercent || 0))}%` }}></div></div></div>
            {results.injectionPercent !== undefined && (<div><div className="flex justify-between items-end mb-2"><p className="text-xs text-gray-500 font-bold uppercase tracking-wide">Porcentaje de generación con respecto al consumo</p><span className="text-2xl font-extrabold text-orange-500">{formatNumber(results.injectionPercent, 1)}%</span></div><div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden"><div className="bg-orange-500 h-4 rounded-full" style={{ width: `${Math.min(100, Math.max(0, results.injectionPercent || 0))}%` }}></div></div></div>)}
          </div>
        </div>

        <div className="print-break-inside bg-gradient-to-br from-teal-800 to-emerald-900 text-white rounded-xl p-8 shadow-xl">
          <h3 className="text-xl font-bold mb-6 flex items-center gap-2 border-b border-emerald-700 pb-3"><Leaf className="w-6 h-6 text-emerald-300" /> Impacto Ambiental Positivo</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 text-center">
            <div className="bg-white/10 p-4 rounded-lg"><p className="text-emerald-300 text-xs font-bold uppercase tracking-widest mb-1">Energía Generada</p><p className="text-3xl font-bold">{formatNumber(results.details?.["Energía Generada Total (kWh)"] as number || results.details?.["Generación Estimada (kWh)"] as number || results.details?.["Energía Generada (kWh)"] as number || ((results.details?.["Generada Pico (kWh)"] as number || 0) + (results.details?.["Generada Resto (kWh)"] as number || 0) + (results.details?.["Generada Valle (kWh)"] as number || 0)), 1)} <span className="text-lg font-medium">kWh</span></p></div>
            <div className="bg-white/10 p-4 rounded-lg"><p className="text-emerald-300 text-xs font-bold uppercase tracking-widest mb-1">CO₂ Evitado</p><p className="text-3xl font-bold">{formatNumber(results.co2Avoided, 2)} <span className="text-lg font-medium">kg</span></p></div>
            <div className="bg-white/10 p-4 rounded-lg"><p className="text-emerald-300 text-xs font-bold uppercase tracking-widest mb-1">Árboles Equiv.</p><div className="flex items-center justify-center gap-2"><Trees className="w-8 h-8 text-emerald-300" /><p className="text-3xl font-bold">{results.treesEquivalent}</p></div></div>
          </div>
        </div>

        {results.details && Object.keys(results.details).length > 0 && (
          <div className="print-break-inside bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
            <button 
              onClick={() => setShowDetails(!showDetails)}
              className="w-full flex items-center justify-between px-6 py-4 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
            >
              <h3 className="font-bold text-gray-700">Detalle de Cálculos</h3>
              {showDetails ? <ChevronUp className="text-gray-500" /> : <ChevronDown className="text-gray-500" />}
            </button>
            
            {showDetails && (
              <div className="p-0 overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-50 text-gray-500 uppercase font-bold text-xs">
                    <tr>
                      <th className="px-6 py-3">Concepto</th>
                      <th className="px-6 py-3 text-right">Valor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {Object.entries(results.details).map(([key, value]) => (
                      <tr key={key} className="hover:bg-gray-50">
                        <td className="px-6 py-3 font-medium text-gray-700">{key}</td>
                        <td className="px-6 py-3 text-right text-gray-900 font-mono">
                          {typeof value === 'number' 
                            ? (key.includes('kWh') || key.includes('kW') || key.includes('Porcentaje') || key.includes('Factor') || key.includes('Coeficiente') 
                                ? formatNumber(value, 2) 
                                : formatCurrency(value))
                            : value}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        <div className="no-print flex flex-col md:flex-row gap-4 justify-between pt-6">
          <button onClick={onReset} className="flex items-center justify-center gap-2 px-6 py-3 text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg font-bold shadow-sm transition-colors"><RefreshCw size={18} /> Reiniciar</button>
          <button onClick={onBack} className="flex items-center justify-center gap-2 px-8 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg font-bold shadow-lg transform hover:-translate-y-0.5 transition-all"><ArrowLeft size={18} /> Volver a editar</button>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default StepResults;
