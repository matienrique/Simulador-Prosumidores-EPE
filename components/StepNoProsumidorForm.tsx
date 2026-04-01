
import React, { useState, useEffect } from 'react';
import { NoProsumidorData, Band, NoProsumidorCategory, NoProsumidorGDInput, ConsumptionRow, TaxStatus } from '../types';
import { Plus, Trash2, Info, Factory, Calendar, AlertCircle, Construction } from 'lucide-react';
import { formatPercent, formatCurrency } from '../utils/format';
import { CALCULATOR_CONSTANTS } from '../utils/calc_v2';
import Footer from './Footer';

interface Props {
  initialData: NoProsumidorData;
  onSubmit: (data: NoProsumidorData) => void;
  onBack: () => void;
}

const StepNoProsumidorForm: React.FC<Props> = ({ initialData, onSubmit, onBack }) => {
  const [formData, setFormData] = useState<NoProsumidorData>(initialData);
  
  // GD Specific State initialization
  const initialGDRow: ConsumptionRow = { period: '', pico: 0, resto: 0, valle: 0 };
  
  const [gdData, setGdData] = useState<NoProsumidorGDInput>(initialData.gdData || {
    contractedPower: 0,
    knowsAnnualConsumption: false,
    annualConsumption: 0,
    // Initialize with 6 rows as requested (previously 7)
    consumptionTable: Array(6).fill(null).map(() => ({ ...initialGDRow })),
    cargoComercial: 0,
    cargoCapSumPico: 0,
    cargoCapSumFPico: 0,
    cargoPotAdqPico: 0,
    eaConsPicoAmount: 0,
    eaConsRestoAmount: 0,
    eaConsValleAmount: 0,
    energiaReactivaAmount: 0,
    subtotalEnergiaAmount: 0,
    eaConsPicoPrice: 0,
    eaConsRestoPrice: 0,
    eaConsVallePrice: 0,
    cap: 0,
    ley12692: 0,
    taxStatus: '' as TaxStatus,
    totalToPay: 0
  });

  const isGranDemanda = formData.category === NoProsumidorCategory.GRAN_DEMANDA;
  const isResidencial = formData.category === NoProsumidorCategory.RESIDENCIAL;
  const isComercial = formData.category === NoProsumidorCategory.COMERCIAL;
  const isIndustrial = formData.category === NoProsumidorCategory.INDUSTRIAL;

  // STYLES
  const labelStyleViolet = "block text-base font-bold text-violet-900 mb-2 bg-gradient-to-r from-violet-100 to-white/0 p-1.5 pl-3 rounded-l border-l-4 border-violet-500 shadow-sm";
  const labelStyleOrange = "block text-base font-bold text-orange-900 mb-2 bg-gradient-to-r from-orange-100 to-white/0 p-1.5 pl-3 rounded-l border-l-4 border-orange-500 shadow-sm";
  const labelStyle = isGranDemanda ? labelStyleViolet : labelStyleOrange;

  // --- GD UTILS ---
  const incrementMonth = (period: string): string => {
    if (!period || !period.includes('/')) return '';
    const [monthStr, yearStr] = period.split('/');
    let month = parseInt(monthStr, 10);
    let year = parseInt(yearStr, 10);
    
    if (isNaN(month) || isNaN(year)) return '';

    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
    
    return `${month.toString().padStart(2, '0')}/${year}`;
  };

  const handleTablePeriodChange = (val: string) => {
    const newTable = [...gdData.consumptionTable];
    newTable[0].period = val;
    
    // Auto-fill subsequent rows
    let currentPeriod = val;
    for (let i = 1; i < newTable.length; i++) {
      currentPeriod = incrementMonth(currentPeriod);
      newTable[i].period = currentPeriod;
    }
    setGdData(prev => ({ ...prev, consumptionTable: newTable }));
  };

  const handleTableValueChange = (rowIdx: number, field: keyof ConsumptionRow, val: string) => {
    const numVal = val === '' ? 0 : parseFloat(val);
    const newTable = [...gdData.consumptionTable];
    // @ts-ignore
    newTable[rowIdx][field] = Math.max(0, numVal);
    setGdData(prev => ({ ...prev, consumptionTable: newTable }));
  };

  const handleGdNumberChange = (field: keyof NoProsumidorGDInput, val: string) => {
    const num = val === '' ? 0 : parseFloat(val);
    setGdData(prev => ({ ...prev, [field]: Math.max(0, num) }));
  };

  const getTaxInfoGD = (status: string) => {
    if (!status) return null;
    switch (status) {
      case 'Responsable Inscripto': 
        return "IVA aplicable: 27% y percepción: 3%";
      case 'Responsable Inscripto Agente Percepción': 
        return "IVA aplicable: 27%";
      case 'Exento': 
        return "IVA aplicable: 21%";
      default: return null;
    }
  };

  // --- STANDARD FORM HANDLERS ---

  const handleChange = (field: keyof NoProsumidorData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleNumberChange = (field: keyof NoProsumidorData, valueStr: string) => {
    const val = valueStr === '' ? 0 : parseFloat(valueStr);
    handleChange(field, Math.max(0, val));
  };

  const handleConsumptionHistoryChange = (index: number, valueStr: string) => {
    const val = valueStr === '' ? 0 : parseFloat(valueStr);
    const newHistory = [...formData.consumptionHistory];
    newHistory[index] = Math.max(0, val);
    setFormData(prev => ({ ...prev, consumptionHistory: newHistory }));
  };

  const addBand = () => {
    const newBand: Band = { id: crypto.randomUUID(), name: `Banda`, energy: 0, amount: 0 };
    const currentBands = [...formData.bands];
    const lastBand = currentBands.pop(); 
    if (lastBand) setFormData(prev => ({ ...prev, bands: [...currentBands, newBand, lastBand] }));
  };

  const removeBand = (index: number) => {
    const newBands = [...formData.bands];
    newBands.splice(index, 1);
    setFormData(prev => ({ ...prev, bands: newBands }));
  };

  const updateBand = (index: number, field: keyof Band, value: number) => {
    const newBands = [...formData.bands];
    newBands[index] = { ...newBands[index], [field]: value };
    setFormData(prev => ({ ...prev, bands: newBands }));
  };

  // --- RESIDENCIAL SPECIFIC HANDLERS ---
  const getTaxInfoResidencial = (status: string) => {
    switch (status) {
      case TaxStatus.RESPONSABLE_INSCRIPTO: return "IVA aplicable: 27% | Percepción: 3%";
      case TaxStatus.CONSUMIDOR_FINAL: return "IVA aplicable: 21% | Percepción: 0%";
      case TaxStatus.MONOTRIBUTO: return "IVA aplicable: 27% | Percepción: 0%";
      case TaxStatus.SUJETO_NO_CATEGORIZADO: return "IVA aplicable: 27% | Percepción: 13,5%";
      case TaxStatus.EXENTO: return "IVA aplicable: 21% | Percepción: 0%";
      default: return null;
    }
  };

  // --- COMERCIAL SPECIFIC HANDLERS ---
  const getTaxInfoComercial = (status: string) => {
    switch (status) {
      case TaxStatus.RESPONSABLE_INSCRIPTO: return "IVA aplicable: 27% | Percepción: 3%";
      case TaxStatus.CONSUMIDOR_FINAL: return "IVA aplicable: 21% | Percepción: 0%";
      case TaxStatus.MONOTRIBUTO: return "IVA aplicable: 27% | Percepción: 0%";
      case TaxStatus.SUJETO_NO_CATEGORIZADO: return "IVA aplicable: 27% | Percepción: 13,5%";
      case TaxStatus.EXENTO: return "IVA aplicable: 21% | Percepción: 0%";
      default: return null;
    }
  };

  // --- INDUSTRIAL SPECIFIC HANDLERS ---
  const getTaxInfoIndustrial = (status: string) => {
    switch (status) {
      case TaxStatus.RESPONSABLE_INSCRIPTO: return "IVA aplicable: 27% | Percepción: 3%";
      case TaxStatus.CONSUMIDOR_FINAL: return "IVA aplicable: 21% | Percepción: 0%";
      case TaxStatus.MONOTRIBUTO: return "IVA aplicable: 27% | Percepción: 0%";
      case TaxStatus.SUJETO_NO_CATEGORIZADO: return "IVA aplicable: 27% | Percepción: 13,5%";
      case TaxStatus.EXENTO: return "IVA aplicable: 21% | Percepción: 0%";
      default: return null;
    }
  };

  // --- VALIDATION & SUBMIT ---

  const isFormValid = () => {
    if (isGranDemanda) {
      return (
        gdData.contractedPower > 0 &&
        gdData.taxStatus !== '' &&
        gdData.totalToPay > 0
      );
    }
    if (isResidencial) {
      return (
        !!formData.taxStatus && 
        formData.taxStatus !== ('' as TaxStatus) && 
        formData.totalBill > 0
      );
    }
    if (isComercial) {
      return (
        !!formData.taxStatus && 
        formData.taxStatus !== ('' as TaxStatus) && 
        formData.totalBill > 0
      );
    }
    if (isIndustrial) {
      return (
        !!formData.taxStatus && 
        formData.taxStatus !== ('' as TaxStatus) && 
        formData.totalBill > 0
      );
    }
    
    return false;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isFormValid()) {
      const payload = isGranDemanda ? { ...formData, gdData } : formData;
      onSubmit(payload);
    }
  };

  const getBandLabel = (index: number, total: number) => {
    if (index === total - 1) return "Últimos";
    const ordinals = ["Primeros", "Segundos", "Terceros", "Cuartos", "Quintos", "Sextos", "Séptimos", "Octavos", "Novenos", "Décimos"];
    return ordinals[index] || `Banda ${index + 1}`;
  };

  const getIvaInfoStandard = (status: TaxStatus) => {
    if (!status) return { text: '' };
    switch (status) {
      case TaxStatus.RESPONSABLE_INSCRIPTO:
        return { text: 'IVA aplicable: 27% + 3%' };
      case TaxStatus.CONSUMIDOR_FINAL:
        return { text: 'IVA aplicable: 21%' };
      case TaxStatus.MONOTRIBUTO:
        return { text: 'IVA aplicable: 27%' };
      case TaxStatus.SUJETO_NO_CATEGORIZADO:
        return { text: 'IVA + Percepción aplicable: 27% + 13.50%' };
      case TaxStatus.EXENTO:
        return { text: 'IVA aplicable: 21%' };
      default:
        return { text: '' };
    }
  };

  return (
    <div className="flex flex-col min-h-full">
    <form onSubmit={handleSubmit} className="space-y-8 animate-fade-in flex-grow">
      
      {/* 1. Category Selection */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h3 className={`text-lg font-semibold mb-4 border-b pb-2 ${isGranDemanda ? 'text-violet-800 border-violet-100' : 'text-gray-800 border-orange-100'}`}>Perfil de Usuario</h3>
        
        <div className="mb-6">
          <label className={labelStyle}>Categoría</label>
          <select
            value={formData.category}
            onChange={(e) => handleChange('category', e.target.value as NoProsumidorCategory)}
            className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-orange-500 outline-none"
          >
            {Object.values(NoProsumidorCategory).map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        {/* Mostrar constantes solo si NO es Gran Demanda y NO es Comercial y NO es Industrial */}
        {!isGranDemanda && !isResidencial && !isComercial && !isIndustrial && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-orange-50 p-4 rounded-lg text-sm text-orange-800">
            <div>
              <span className="block font-semibold">Autoconsumo Estimado</span>
              {formatPercent(CALCULATOR_CONSTANTS[formData.category].autoconsumo * 100)}
            </div>
            <div>
              <span className="block font-semibold">Reconocimiento Unit.</span>
              {formatCurrency(CALCULATOR_CONSTANTS[formData.category].reconUnit)}
            </div>
            <div>
              <span className="block font-semibold">GSF Unitario</span>
              {formatCurrency(CALCULATOR_CONSTANTS[formData.category].gsfUnit)}
            </div>
          </div>
        )}
      </div>

      {/* 2. FORM BODY - CONDITIONAL */}
      
      {isComercial ? (
        // --- COMERCIAL FORM ---
        <>
          {/* A.0 Bloque inicial (Read only) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-orange-50 p-4 rounded-lg text-sm text-orange-800 mb-6 border border-orange-100 shadow-sm">
            <div>
              <span className="block font-semibold opacity-75">Autoconsumo (solo lectura)</span>
              <span className="text-lg font-bold">{formatPercent(CALCULATOR_CONSTANTS[NoProsumidorCategory.COMERCIAL].autoconsumo * 100)}</span>
            </div>
            <div>
              <span className="block font-semibold opacity-75">Reconocimiento Unitario</span>
              <span className="text-lg font-bold">{formatCurrency(CALCULATOR_CONSTANTS[NoProsumidorCategory.COMERCIAL].reconUnit)}</span>
            </div>
            <div>
              <span className="block font-semibold opacity-75">Importe GSF Unitario</span>
              <span className="text-lg font-bold">{formatCurrency(CALCULATOR_CONSTANTS[NoProsumidorCategory.COMERCIAL].gsfUnit)}</span>
            </div>
          </div>

          {/* A.1 Información de medición */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2 border-orange-100">Información de medición</h3>
            
            <div className="mb-6">
              <label className={labelStyle}>Consumo total (kWh)</label>
              <input
                type="number" min="0" step="any"
                value={formData.totalConsumption || ''}
                onChange={(e) => handleNumberChange('totalConsumption', e.target.value)}
                className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-orange-500 outline-none"
              />
            </div>

            <div className="mb-2">
              <label className="block text-sm font-bold text-gray-700 mb-2">Consumos bimestrales (kWh)</label>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                {formData.consumptionHistory.map((val, idx) => (
                  <div key={idx}>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">BIM{idx + 1}</label>
                    <input
                      type="number" min="0"
                      value={val || ''}
                      onChange={(e) => handleConsumptionHistoryChange(idx, e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded focus:ring-1 focus:ring-orange-500 outline-none text-center"
                    />
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-2 italic flex items-center gap-1">
                <Info size={12} /> Recomendación: completá los 6 bimestres con los consumos históricos de tu factura para estimar la potencia máxima.
              </p>
            </div>
          </div>

          {/* A.2 Detalle de facturación */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2 border-orange-100">Detalle de facturación</h3>
            
            {/* Rosario Checkbox */}
            <div className="flex items-center gap-3 mb-6 p-3 bg-slate-50 rounded-lg border border-slate-200 shadow-sm">
              <input
                type="checkbox"
                id="isRosarioComercial"
                checked={formData.isRosario || false}
                onChange={(e) => handleChange('isRosario', e.target.checked)}
                className="w-5 h-5 text-orange-600 focus:ring-orange-500 border-gray-300 rounded cursor-pointer"
              />
              <label htmlFor="isRosarioComercial" className="text-sm font-bold text-slate-700 cursor-pointer select-none">
                Resido en la ciudad de Rosario
              </label>
            </div>

            {formData.isRosario && (
              <div className="mb-6 flex items-start gap-3 bg-blue-50 p-3 rounded-lg border border-blue-100 shadow-sm animate-fade-in">
                <Info className="text-blue-600 w-5 h-5 flex-shrink-0 mt-0.5" />
                <span className="text-sm text-blue-800">
                  En los impuestos se aplicarán un cargo del 1,80% y 0,60% provenientes de las ordenanzas municipales 1592/62 y 1618/62 respectivamente.
                </span>
              </div>
            )}

            {/* A.2.1 Condición fiscal */}
            <div className="mb-6">
              <label className={labelStyle}>¿Cuál es tu condición fiscal? <span className="text-red-500">*</span></label>
              <select
                value={formData.taxStatus || ''}
                onChange={(e) => handleChange('taxStatus', e.target.value as TaxStatus)}
                className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-orange-500 outline-none font-medium"
                required
              >
                <option value="">Seleccione una opción...</option>
                <option value={TaxStatus.RESPONSABLE_INSCRIPTO}>Responsable Inscripto</option>
                <option value={TaxStatus.CONSUMIDOR_FINAL}>Consumidor Final</option>
                <option value={TaxStatus.MONOTRIBUTO}>Monotributo</option>
                <option value={TaxStatus.SUJETO_NO_CATEGORIZADO}>Sujeto no Categorizado</option>
                <option value={TaxStatus.EXENTO}>Exento</option>
              </select>
              
              {formData.taxStatus && (
                <div className="mt-3 flex items-center gap-3 bg-orange-50 p-3 rounded-lg border border-orange-100 shadow-sm animate-fade-in">
                  <Info className="text-orange-600 w-5 h-5 flex-shrink-0" />
                  <span className="text-sm font-bold text-orange-800">
                    {getTaxInfoComercial(formData.taxStatus)}
                  </span>
                </div>
              )}
            </div>

            {/* A.2.2 Cuota de servicio */}
            <div className="mb-4">
              <label className={labelStyle}>Cuota de servicio (Importe final en pesos)</label>
              <input
                type="number" min="0" step="0.01"
                value={formData.serviceQuota || ''}
                onChange={(e) => handleNumberChange('serviceQuota', e.target.value)}
                className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-orange-500 outline-none"
              />
            </div>
          </div>

          {/* A.3 Bandas dinámicas */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex justify-between items-center mb-4 border-b pb-2 border-orange-100">
              <h3 className="text-lg font-semibold text-gray-800">Bandas dinámicas (No Prosumidor)</h3>
              <button
                type="button"
                onClick={addBand}
                className="text-xs flex items-center gap-1 bg-orange-50 text-orange-700 px-2 py-1 rounded hover:bg-orange-100 transition-colors"
              >
                <Plus size={14} /> Agregar
              </button>
            </div>
            
            <div className="space-y-3">
              {formData.bands.map((band, index) => {
                const isLast = index === formData.bands.length - 1;
                return (
                  <div key={band.id} className="flex gap-2 items-end bg-gray-50 p-3 rounded-lg border border-gray-100">
                    <div className="flex-1">
                      <label className="text-sm font-bold text-gray-700 mb-1 block">
                        {getBandLabel(index, formData.bands.length)}
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className={labelStyle}>Energía correspondiente a la banda (kWh)</label>
                          <input
                            type="number" placeholder="Energía (kWh)" min="0" step="any"
                            value={band.energy || ''}
                            onChange={(e) => updateBand(index, 'energy', parseFloat(e.target.value) || 0)}
                            className="w-full p-2 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-orange-500 outline-none"
                          />
                        </div>
                        <div>
                          <label className={labelStyle}>Importe correspondiente a la banda</label>
                          <input
                            type="number" placeholder="Importe facturado ($)" min="0" step="0.01"
                            value={band.amount || ''}
                            onChange={(e) => updateBand(index, 'amount', parseFloat(e.target.value) || 0)}
                            className="w-full p-2 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-orange-500 outline-none text-right"
                          />
                        </div>
                      </div>
                    </div>
                    {!isLast && (
                      <button type="button" onClick={() => removeBand(index)} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded">
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* A.4 Importes adicionales */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2 border-orange-100">Importes adicionales</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <label className={labelStyle}>CAP ($)</label>
                <input
                  type="number" min="0" step="0.01"
                  value={formData.cap || ''}
                  onChange={(e) => handleNumberChange('cap', e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-orange-500 outline-none"
                />
              </div>
              <div>
                <label className={labelStyle}>Ley 12692 ($)</label>
                <input
                  type="number" min="0" step="0.01"
                  value={formData.ley12692 || ''}
                  onChange={(e) => handleNumberChange('ley12692', e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-orange-500 outline-none"
                />
              </div>
            </div>
            
            <div className="bg-gradient-to-r from-orange-50 to-white p-6 rounded-lg border border-orange-200 shadow-sm">
              <label className="block text-lg font-extrabold text-orange-800 mb-2">
                Importe total factura ($) <span className="text-red-500">*</span>
              </label>
              <input
                type="number" min="0" step="0.01" required
                value={formData.totalBill || ''}
                onChange={(e) => handleNumberChange('totalBill', e.target.value)}
                className="w-full p-4 text-2xl font-bold border border-orange-300 rounded focus:ring-2 focus:ring-orange-500 outline-none text-right shadow-inner"
                placeholder="0.00"
              />
              {!isFormValid() && (
                <div className="mt-2 flex items-center gap-2 text-red-600 font-semibold text-xs bg-red-50 p-2 rounded border border-red-100">
                  <AlertCircle size={14} />
                  <span>Debes completar el total y seleccionar tu condición fiscal para continuar.</span>
                </div>
              )}
            </div>
          </div>
        </>
      ) : isGranDemanda ? (
        // --- GRAN DEMANDA FORM ---
        <>
          {/* A.1 Datos de Contrato */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-semibold text-violet-800 mb-4 border-b pb-2 border-violet-100">Datos de Contrato</h3>
            
            <div className="mb-6">
              <label className={labelStyle}>Potencia contratada pico / fuera de pico [kW] <span className="text-red-500">*</span></label>
              <input
                type="number" min="0" step="any"
                value={gdData.contractedPower || ''}
                onChange={(e) => handleGdNumberChange('contractedPower', e.target.value)}
                className="w-full md:w-1/2 p-2 border border-gray-300 rounded focus:ring-2 focus:ring-violet-500 outline-none"
              />
              <div className="mt-2 flex items-start gap-2 text-blue-700 text-xs bg-blue-50 p-3 rounded-lg border border-blue-100 max-w-md">
                <Info size={16} className="mt-0.5 flex-shrink-0" />
                <span>El usuario debe completar con el valor más grande entre estas dos opciones que figura en la factura.</span>
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-bold text-gray-700 mb-2">¿Conoce su consumo anual de kWh? <span className="text-red-500">*</span></label>
              <div className="flex gap-4 mb-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="radio" 
                    checked={gdData.knowsAnnualConsumption === true} 
                    onChange={() => setGdData(p => ({...p, knowsAnnualConsumption: true}))}
                    className="w-4 h-4 text-violet-600 focus:ring-violet-500"
                  />
                  <span>Si</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="radio" 
                    checked={gdData.knowsAnnualConsumption === false} 
                    onChange={() => setGdData(p => ({...p, knowsAnnualConsumption: false}))}
                    className="w-4 h-4 text-violet-600 focus:ring-violet-500"
                  />
                  <span>No</span>
                </label>
              </div>

              {gdData.knowsAnnualConsumption && (
                <div>
                  <label className={labelStyle}>Consumo anual [kWh]</label>
                  <input
                    type="number" min="0" step="any"
                    value={gdData.annualConsumption || ''}
                    onChange={(e) => handleGdNumberChange('annualConsumption', e.target.value)}
                    className="w-full md:w-1/2 p-2 border border-gray-300 rounded focus:ring-2 focus:ring-violet-500 outline-none"
                  />
                </div>
              )}
            </div>
          </div>

          {/* A.2 Historia de Consumo */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-semibold text-violet-800 mb-4 border-b pb-2 border-violet-100">Historia de Consumo</h3>
            
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm text-center border-collapse">
                <thead>
                  <tr className="bg-gray-50 text-gray-700 font-bold">
                    <th className="p-3 border border-gray-200">Periodo</th>
                    <th className="p-3 border border-gray-200">kWh Pico</th>
                    <th className="p-3 border border-gray-200">kWh Resto</th>
                    <th className="p-3 border border-gray-200">kWh Valle</th>
                  </tr>
                </thead>
                <tbody>
                  {gdData.consumptionTable.map((row, idx) => (
                    <tr key={idx}>
                      <td className="p-2 border border-gray-200">
                        {idx === 0 ? (
                          <input 
                            type="text" 
                            placeholder="MM/YYYY"
                            value={row.period}
                            onChange={(e) => handleTablePeriodChange(e.target.value)}
                            className="w-full text-center p-1 border rounded focus:ring-1 focus:ring-violet-500 bg-white"
                          />
                        ) : (
                          <span className="text-gray-600 bg-gray-50 px-2 py-1 rounded block">{row.period}</span>
                        )}
                      </td>
                      <td className="p-2 border border-gray-200">
                        <input
                          type="number" min="0"
                          value={row.pico || ''}
                          onChange={(e) => handleTableValueChange(idx, 'pico', e.target.value)}
                          className="w-full text-center outline-none bg-transparent"
                          placeholder="0"
                        />
                      </td>
                      <td className="p-2 border border-gray-200">
                        <input
                          type="number" min="0"
                          value={row.resto || ''}
                          onChange={(e) => handleTableValueChange(idx, 'resto', e.target.value)}
                          className="w-full text-center outline-none bg-transparent"
                          placeholder="0"
                        />
                      </td>
                      <td className="p-2 border border-gray-200">
                        <input
                          type="number" min="0"
                          value={row.valle || ''}
                          onChange={(e) => handleTableValueChange(idx, 'valle', e.target.value)}
                          className="w-full text-center outline-none bg-transparent"
                          placeholder="0"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* A.3 Información de lecturas y componentes */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-semibold text-violet-800 mb-4 border-b pb-2 border-violet-100">Información de lecturas, consumos y componentes del importe básico</h3>
            <p className="text-xs text-gray-500 mb-4">el usuario debe completar con los importes de la ultima columna que figura en la hoja 2 de la factura</p>
            
            <div className="flex flex-col gap-4">
              {[
                { k: 'cargoComercial', l: 'Cargo comercial' },
                { k: 'cargoCapSumPico', l: 'Cargo Cap. Sum. Pico' },
                { k: 'cargoCapSumFPico', l: 'Cargo Cap. Sum. F. Pico' },
                { k: 'cargoPotAdqPico', l: 'Cargo por Potencia Adquirida Pico' },
              ].map(f => (
                <div key={f.k}>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">{f.l} (Importe $)</label>
                  <input
                    type="number" min="0" step="0.01"
                    value={gdData[f.k as keyof NoProsumidorGDInput] as number || ''}
                    onChange={(e) => handleGdNumberChange(f.k as keyof NoProsumidorGDInput, e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded focus:ring-1 focus:ring-violet-500 outline-none"
                  />
                </div>
              ))}

              {/* Energy with Unit Prices */}
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1">Energía Activa Consumida Pico ($)</label>
                    <input type="number" min="0" step="0.01" value={gdData.eaConsPicoAmount || ''} onChange={(e) => handleGdNumberChange('eaConsPicoAmount', e.target.value)} className="w-full p-2 border border-gray-300 rounded focus:ring-1 focus:ring-violet-500"/>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-violet-600 mb-1">Precio unitario [$]</label>
                    <input type="number" min="0" step="0.0001" value={gdData.eaConsPicoPrice || ''} onChange={(e) => handleGdNumberChange('eaConsPicoPrice', e.target.value)} className="w-full p-2 border border-violet-300 rounded focus:ring-1 focus:ring-violet-500 bg-white"/>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1">Energía Activa Consumida Resto ($)</label>
                    <input type="number" min="0" step="0.01" value={gdData.eaConsRestoAmount || ''} onChange={(e) => handleGdNumberChange('eaConsRestoAmount', e.target.value)} className="w-full p-2 border border-gray-300 rounded focus:ring-1 focus:ring-violet-500"/>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-violet-600 mb-1">Precio unitario [$]</label>
                    <input type="number" min="0" step="0.0001" value={gdData.eaConsRestoPrice || ''} onChange={(e) => handleGdNumberChange('eaConsRestoPrice', e.target.value)} className="w-full p-2 border border-violet-300 rounded focus:ring-1 focus:ring-violet-500 bg-white"/>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1">Energía Activa Consumida Valle ($)</label>
                    <input type="number" min="0" step="0.01" value={gdData.eaConsValleAmount || ''} onChange={(e) => handleGdNumberChange('eaConsValleAmount', e.target.value)} className="w-full p-2 border border-gray-300 rounded focus:ring-1 focus:ring-violet-500"/>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-violet-600 mb-1">Precio unitario [$]</label>
                    <input type="number" min="0" step="0.0001" value={gdData.eaConsVallePrice || ''} onChange={(e) => handleGdNumberChange('eaConsVallePrice', e.target.value)} className="w-full p-2 border border-violet-300 rounded focus:ring-1 focus:ring-violet-500 bg-white"/>
                  </div>
                </div>
              </div>

              {[
                { k: 'energiaReactivaAmount', l: 'Energía Reactiva' },
                { k: 'subtotalEnergiaAmount', l: 'SUBTOTAL CONSUMO DE ENERGÍA' },
              ].map(f => (
                <div key={f.k}>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">{f.l} (Importe $)</label>
                  <input
                    type="number" min="0" step="0.01"
                    value={gdData[f.k as keyof NoProsumidorGDInput] as number || ''}
                    onChange={(e) => handleGdNumberChange(f.k as keyof NoProsumidorGDInput, e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded focus:ring-1 focus:ring-violet-500 outline-none"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* A.4 Detalle de Facturación */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-semibold text-violet-800 mb-4 border-b pb-2 border-violet-100">Detalle de Facturación</h3>
            
            <div className="mb-6">
              <label className={labelStyle}>¿Cuál es tu condición fiscal? <span className="text-red-500">*</span></label>
              <select
                value={gdData.taxStatus}
                onChange={(e) => setGdData(p => ({ ...p, taxStatus: e.target.value as TaxStatus }))}
                className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-violet-500 outline-none font-medium"
                required
              >
                <option value="">Seleccione...</option>
                <option value="Responsable Inscripto">Responsable inscripto</option>
                <option value="Responsable Inscripto Agente Percepción">Responsable inscripto Agente de percepción</option>
                <option value="Exento">Exento</option>
              </select>
              {gdData.taxStatus && (
                <div className="mt-2 bg-violet-50 text-violet-800 p-2 rounded text-sm font-semibold flex items-center gap-2">
                  <Info size={14} />
                  {getTaxInfoGD(gdData.taxStatus)}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className={labelStyle}>Cuota de alumbrado público ($)</label>
                <input
                  type="number" min="0" step="0.01"
                  value={gdData.cap || ''}
                  onChange={(e) => handleGdNumberChange('cap', e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-violet-500 outline-none"
                />
              </div>
              <div>
                <label className={labelStyle}>Ley 12692 ($)</label>
                <input
                  type="number" min="0" step="0.01"
                  value={gdData.ley12692 || ''}
                  onChange={(e) => handleGdNumberChange('ley12692', e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-violet-500 outline-none"
                />
              </div>
            </div>

            <div className="bg-gradient-to-r from-violet-50 to-white p-6 rounded-lg border border-violet-200 shadow-sm">
              <label className="block text-lg font-extrabold text-violet-800 mb-2">
                Total a pagar Vencimiento ($) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                required
                value={gdData.totalToPay || ''}
                onChange={(e) => handleGdNumberChange('totalToPay', e.target.value)}
                className="w-full p-4 text-2xl font-bold border border-violet-300 rounded focus:ring-2 focus:ring-violet-500 outline-none text-right shadow-inner"
                placeholder="0.00"
              />
            </div>
          </div>
        </>
      ) : isResidencial ? (
        // --- RESIDENCIAL FORM ---
        <>
          {/* A.0 Bloque inicial (Read only) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-orange-50 p-4 rounded-lg text-sm text-orange-800 mb-6 border border-orange-100 shadow-sm">
            <div>
              <span className="block font-semibold opacity-75">Autoconsumo (solo lectura)</span>
              <span className="text-lg font-bold">{formatPercent(CALCULATOR_CONSTANTS[NoProsumidorCategory.RESIDENCIAL].autoconsumo * 100)}</span>
            </div>
            <div>
              <span className="block font-semibold opacity-75">Reconocimiento Unitario</span>
              <span className="text-lg font-bold">{formatCurrency(CALCULATOR_CONSTANTS[NoProsumidorCategory.RESIDENCIAL].reconUnit)}</span>
            </div>
            <div>
              <span className="block font-semibold opacity-75">Importe GSF Unitario</span>
              <span className="text-lg font-bold">{formatCurrency(CALCULATOR_CONSTANTS[NoProsumidorCategory.RESIDENCIAL].gsfUnit)}</span>
            </div>
          </div>

          {/* A.1 Información de medición */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2 border-orange-100">Información de medición</h3>
            
            <div className="mb-6">
              <label className={labelStyle}>Consumo total (kWh)</label>
              <input
                type="number" min="0" step="any"
                value={formData.totalConsumption || ''}
                onChange={(e) => handleNumberChange('totalConsumption', e.target.value)}
                className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-orange-500 outline-none"
              />
            </div>

            <div className="mb-2">
              <label className="block text-sm font-bold text-gray-700 mb-2">Consumos bimestrales (kWh)</label>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                {formData.consumptionHistory.map((val, idx) => (
                  <div key={idx}>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">BIM{idx + 1}</label>
                    <input
                      type="number" min="0"
                      value={val || ''}
                      onChange={(e) => handleConsumptionHistoryChange(idx, e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded focus:ring-1 focus:ring-orange-500 outline-none text-center"
                    />
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-2 italic flex items-center gap-1">
                <Info size={12} /> Recomendación: completá los 6 bimestres con los consumos históricos de tu factura para estimar la potencia máxima.
              </p>
            </div>
          </div>

          {/* A.2 Detalle de facturación */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2 border-orange-100">Detalle de facturación</h3>
            
            {/* Rosario Checkbox */}
            <div className="flex items-center gap-3 mb-6 p-3 bg-slate-50 rounded-lg border border-slate-200 shadow-sm">
              <input
                type="checkbox"
                id="isRosario"
                checked={formData.isRosario || false}
                onChange={(e) => handleChange('isRosario', e.target.checked)}
                className="w-5 h-5 text-orange-600 focus:ring-orange-500 border-gray-300 rounded cursor-pointer"
              />
              <label htmlFor="isRosario" className="text-sm font-bold text-slate-700 cursor-pointer select-none">
                Resido en la ciudad de Rosario
              </label>
            </div>

            {formData.isRosario && (
              <div className="mb-6 flex items-start gap-3 bg-blue-50 p-3 rounded-lg border border-blue-100 shadow-sm animate-fade-in">
                <Info className="text-blue-600 w-5 h-5 flex-shrink-0 mt-0.5" />
                <span className="text-sm text-blue-800">
                  En los impuestos se aplicarán un cargo del 1,80% y 0,60% provenientes de las ordenanzas municipales 1592/62 y 1618/62 respectivamente.
                </span>
              </div>
            )}

            {/* A.2.1 Condición fiscal */}
            <div className="mb-6">
              <label className={labelStyle}>¿Cuál es tu condición fiscal? <span className="text-red-500">*</span></label>
              <select
                value={formData.taxStatus || ''}
                onChange={(e) => handleChange('taxStatus', e.target.value as TaxStatus)}
                className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-orange-500 outline-none font-medium"
                required
              >
                <option value="">Seleccione una opción...</option>
                <option value={TaxStatus.RESPONSABLE_INSCRIPTO}>Responsable Inscripto</option>
                <option value={TaxStatus.CONSUMIDOR_FINAL}>Consumidor Final</option>
                <option value={TaxStatus.MONOTRIBUTO}>Monotributo</option>
                <option value={TaxStatus.SUJETO_NO_CATEGORIZADO}>Sujeto no Categorizado</option>
                <option value={TaxStatus.EXENTO}>Exento</option>
              </select>
              
              {formData.taxStatus && (
                <div className="mt-3 flex items-center gap-3 bg-orange-50 p-3 rounded-lg border border-orange-100 shadow-sm animate-fade-in">
                  <Info className="text-orange-600 w-5 h-5 flex-shrink-0" />
                  <span className="text-sm font-bold text-orange-800">
                    {getTaxInfoResidencial(formData.taxStatus)}
                  </span>
                </div>
              )}
            </div>

            {/* A.2.2 Cuota de servicio */}
            <div className="mb-4">
              <label className={labelStyle}>Cuota de servicio (Importe final en pesos)</label>
              <input
                type="number" min="0" step="0.01"
                value={formData.serviceQuota || ''}
                onChange={(e) => handleNumberChange('serviceQuota', e.target.value)}
                className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-orange-500 outline-none"
              />
            </div>
          </div>

          {/* A.3 Bandas dinámicas */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex justify-between items-center mb-4 border-b pb-2 border-orange-100">
              <h3 className="text-lg font-semibold text-gray-800">Bandas dinámicas (No Prosumidor)</h3>
              <button
                type="button"
                onClick={addBand}
                className="text-xs flex items-center gap-1 bg-orange-50 text-orange-700 px-2 py-1 rounded hover:bg-orange-100 transition-colors"
              >
                <Plus size={14} /> Agregar
              </button>
            </div>
            
            <div className="space-y-3">
              {formData.bands.map((band, index) => {
                const isLast = index === formData.bands.length - 1;
                return (
                  <div key={band.id} className="flex gap-2 items-end bg-gray-50 p-3 rounded-lg border border-gray-100">
                    <div className="flex-1">
                      <label className="text-sm font-bold text-gray-700 mb-1 block">
                        {getBandLabel(index, formData.bands.length)}
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className={labelStyle}>Energía correspondiente a la banda (kWh)</label>
                          <input
                            type="number" placeholder="Energía (kWh)" min="0" step="any"
                            value={band.energy || ''}
                            onChange={(e) => updateBand(index, 'energy', parseFloat(e.target.value) || 0)}
                            className="w-full p-2 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-orange-500 outline-none"
                          />
                        </div>
                        <div>
                          <label className={labelStyle}>Importe correspondiente a la banda</label>
                          <input
                            type="number" placeholder="Importe facturado ($)" min="0" step="0.01"
                            value={band.amount || ''}
                            onChange={(e) => updateBand(index, 'amount', parseFloat(e.target.value) || 0)}
                            className="w-full p-2 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-orange-500 outline-none text-right"
                          />
                        </div>
                      </div>
                    </div>
                    {!isLast && (
                      <button type="button" onClick={() => removeBand(index)} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded">
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* A.4 Importes adicionales */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2 border-orange-100">Importes adicionales</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <label className={labelStyle}>CAP ($)</label>
                <input
                  type="number" min="0" step="0.01"
                  value={formData.cap || ''}
                  onChange={(e) => handleNumberChange('cap', e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-orange-500 outline-none"
                />
              </div>
              <div>
                <label className={labelStyle}>Ley 12692 ($)</label>
                <input
                  type="number" min="0" step="0.01"
                  value={formData.ley12692 || ''}
                  onChange={(e) => handleNumberChange('ley12692', e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-orange-500 outline-none"
                />
              </div>
            </div>
            
            <div className="bg-gradient-to-r from-orange-50 to-white p-6 rounded-lg border border-orange-200 shadow-sm">
              <label className="block text-lg font-extrabold text-orange-800 mb-2">
                Importe total factura ($) <span className="text-red-500">*</span>
              </label>
              <input
                type="number" min="0" step="0.01" required
                value={formData.totalBill || ''}
                onChange={(e) => handleNumberChange('totalBill', e.target.value)}
                className="w-full p-4 text-2xl font-bold border border-orange-300 rounded focus:ring-2 focus:ring-orange-500 outline-none text-right shadow-inner"
                placeholder="0.00"
              />
              {!isFormValid() && (
                <div className="mt-2 flex items-center gap-2 text-red-600 font-semibold text-xs bg-red-50 p-2 rounded border border-red-100">
                  <AlertCircle size={14} />
                  <span>Debes completar el total y seleccionar tu condición fiscal para continuar.</span>
                </div>
              )}
            </div>
          </div>
        </>
      ) : isIndustrial ? (
        // --- INDUSTRIAL FORM ---
        <>
          {/* A.0 Bloque inicial (Read only) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-orange-50 p-4 rounded-lg text-sm text-orange-800 mb-6 border border-orange-100 shadow-sm">
            <div>
              <span className="block font-semibold opacity-75">Autoconsumo (solo lectura)</span>
              <span className="text-lg font-bold">{formatPercent(CALCULATOR_CONSTANTS[NoProsumidorCategory.INDUSTRIAL].autoconsumo * 100)}</span>
            </div>
            <div>
              <span className="block font-semibold opacity-75">Reconocimiento Unitario</span>
              <span className="text-lg font-bold">{formatCurrency(CALCULATOR_CONSTANTS[NoProsumidorCategory.INDUSTRIAL].reconUnit)}</span>
            </div>
            <div>
              <span className="block font-semibold opacity-75">Importe GSF Unitario</span>
              <span className="text-lg font-bold">{formatCurrency(CALCULATOR_CONSTANTS[NoProsumidorCategory.INDUSTRIAL].gsfUnit)}</span>
            </div>
          </div>

          {/* A.1 Información de medición */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2 border-orange-100">Información de medición</h3>
            
            <div className="mb-6">
              <label className={labelStyle}>Consumo total (kWh)</label>
              <input
                type="number" min="0" step="any"
                value={formData.totalConsumption || ''}
                onChange={(e) => handleNumberChange('totalConsumption', e.target.value)}
                className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-orange-500 outline-none"
              />
            </div>

            <div className="mb-2">
              <label className="block text-sm font-bold text-gray-700 mb-2">Consumos bimestrales (kWh)</label>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                {formData.consumptionHistory.map((val, idx) => (
                  <div key={idx}>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">BIM{idx + 1}</label>
                    <input
                      type="number" min="0"
                      value={val || ''}
                      onChange={(e) => handleConsumptionHistoryChange(idx, e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded focus:ring-1 focus:ring-orange-500 outline-none text-center"
                    />
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-2 italic flex items-center gap-1">
                <Info size={12} /> Recomendación: completá los 6 bimestres con los consumos históricos de tu factura para estimar la potencia máxima.
              </p>
            </div>
          </div>

          {/* A.2 Detalle de facturación */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2 border-orange-100">Detalle de facturación</h3>
            
            {/* Rosario Checkbox */}
            <div className="flex items-center gap-3 mb-6 p-3 bg-slate-50 rounded-lg border border-slate-200 shadow-sm">
              <input
                type="checkbox"
                id="isRosarioIndustrial"
                checked={formData.isRosario || false}
                onChange={(e) => handleChange('isRosario', e.target.checked)}
                className="w-5 h-5 text-orange-600 focus:ring-orange-500 border-gray-300 rounded cursor-pointer"
              />
              <label htmlFor="isRosarioIndustrial" className="text-sm font-bold text-slate-700 cursor-pointer select-none">
                Resido en la ciudad de Rosario
              </label>
            </div>

            {formData.isRosario && (
              <div className="mb-6 flex items-start gap-3 bg-blue-50 p-3 rounded-lg border border-blue-100 shadow-sm animate-fade-in">
                <Info className="text-blue-600 w-5 h-5 flex-shrink-0 mt-0.5" />
                <span className="text-sm text-blue-800">
                  En los impuestos se aplicarán un cargo del 1,80% y 0,60% provenientes de las ordenanzas municipales 1592/62 y 1618/62 respectivamente.
                </span>
              </div>
            )}

            {/* A.2.1 Condición fiscal */}
            <div className="mb-6">
              <label className={labelStyle}>¿Cuál es tu condición fiscal? <span className="text-red-500">*</span></label>
              <select
                value={formData.taxStatus || ''}
                onChange={(e) => handleChange('taxStatus', e.target.value as TaxStatus)}
                className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-orange-500 outline-none font-medium"
                required
              >
                <option value="">Seleccione una opción...</option>
                <option value={TaxStatus.RESPONSABLE_INSCRIPTO}>Responsable Inscripto</option>
                <option value={TaxStatus.CONSUMIDOR_FINAL}>Consumidor Final</option>
                <option value={TaxStatus.MONOTRIBUTO}>Monotributo</option>
                <option value={TaxStatus.SUJETO_NO_CATEGORIZADO}>Sujeto no Categorizado</option>
                <option value={TaxStatus.EXENTO}>Exento</option>
              </select>
              
              {formData.taxStatus && (
                <div className="mt-3 flex items-center gap-3 bg-orange-50 p-3 rounded-lg border border-orange-100 shadow-sm animate-fade-in">
                  <Info className="text-orange-600 w-5 h-5 flex-shrink-0" />
                  <span className="text-sm font-bold text-orange-800">
                    {getTaxInfoIndustrial(formData.taxStatus)}
                  </span>
                </div>
              )}
            </div>

            {/* A.2.2 Cuota de servicio */}
            <div className="mb-4">
              <label className={labelStyle}>Cuota de servicio (Importe final en pesos)</label>
              <input
                type="number" min="0" step="0.01"
                value={formData.serviceQuota || ''}
                onChange={(e) => handleNumberChange('serviceQuota', e.target.value)}
                className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-orange-500 outline-none"
              />
            </div>
          </div>

          {/* A.3 Bandas dinámicas */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex justify-between items-center mb-4 border-b pb-2 border-orange-100">
              <h3 className="text-lg font-semibold text-gray-800">Bandas dinámicas (No Prosumidor)</h3>
              <button
                type="button"
                onClick={addBand}
                className="text-xs flex items-center gap-1 bg-orange-50 text-orange-700 px-2 py-1 rounded hover:bg-orange-100 transition-colors"
              >
                <Plus size={14} /> Agregar
              </button>
            </div>
            
            <div className="space-y-3">
              {formData.bands.map((band, index) => {
                const isLast = index === formData.bands.length - 1;
                return (
                  <div key={band.id} className="flex gap-2 items-end bg-gray-50 p-3 rounded-lg border border-gray-100">
                    <div className="flex-1">
                      <label className="text-sm font-bold text-gray-700 mb-1 block">
                        {getBandLabel(index, formData.bands.length)}
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className={labelStyle}>Energía correspondiente a la banda (kWh)</label>
                          <input
                            type="number" placeholder="Energía (kWh)" min="0" step="any"
                            value={band.energy || ''}
                            onChange={(e) => updateBand(index, 'energy', parseFloat(e.target.value) || 0)}
                            className="w-full p-2 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-orange-500 outline-none"
                          />
                        </div>
                        <div>
                          <label className={labelStyle}>Importe correspondiente a la banda</label>
                          <input
                            type="number" placeholder="Importe facturado ($)" min="0" step="0.01"
                            value={band.amount || ''}
                            onChange={(e) => updateBand(index, 'amount', parseFloat(e.target.value) || 0)}
                            className="w-full p-2 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-orange-500 outline-none text-right"
                          />
                        </div>
                      </div>
                    </div>
                    {!isLast && (
                      <button type="button" onClick={() => removeBand(index)} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded">
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* A.4 Importes adicionales */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2 border-orange-100">Importes adicionales</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <label className={labelStyle}>CAP ($)</label>
                <input
                  type="number" min="0" step="0.01"
                  value={formData.cap || ''}
                  onChange={(e) => handleNumberChange('cap', e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-orange-500 outline-none"
                />
              </div>
              <div>
                <label className={labelStyle}>Ley 12692 ($)</label>
                <input
                  type="number" min="0" step="0.01"
                  value={formData.ley12692 || ''}
                  onChange={(e) => handleNumberChange('ley12692', e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-orange-500 outline-none"
                />
              </div>
            </div>
            
            <div className="bg-gradient-to-r from-orange-50 to-white p-6 rounded-lg border border-orange-200 shadow-sm">
              <label className="block text-lg font-extrabold text-orange-800 mb-2">
                Importe total factura ($) <span className="text-red-500">*</span>
              </label>
              <input
                type="number" min="0" step="0.01" required
                value={formData.totalBill || ''}
                onChange={(e) => handleNumberChange('totalBill', e.target.value)}
                className="w-full p-4 text-2xl font-bold border border-orange-300 rounded focus:ring-2 focus:ring-orange-500 outline-none text-right shadow-inner"
                placeholder="0.00"
              />
              {!isFormValid() && (
                <div className="mt-2 flex items-center gap-2 text-red-600 font-semibold text-xs bg-red-50 p-2 rounded border border-red-100">
                  <AlertCircle size={14} />
                  <span>Debes completar el total y seleccionar tu condición fiscal para continuar.</span>
                </div>
              )}
            </div>
          </div>
        </>
      ) : null}

      {/* FOOTER ACTIONS */}
      <div className="flex flex-col-reverse md:flex-row gap-4 justify-between pt-4">
        <button
          type="button"
          onClick={onBack}
          className="px-6 py-3 text-gray-600 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg font-medium transition-colors shadow-sm"
        >
          Volver
        </button>
        
        {/* Disable button if standard validation fails */}
        <button
          type="submit"
          disabled={!isFormValid()}
          className={`px-8 py-3 rounded-lg font-bold text-white transition-all shadow-md ${
            isFormValid()
              ? (isGranDemanda ? 'bg-gradient-to-r from-violet-500 to-violet-600 hover:from-violet-600 hover:to-violet-700' : 'bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700') + ' hover:shadow-lg transform hover:-translate-y-0.5' 
              : (isGranDemanda ? 'bg-violet-300' : 'bg-orange-300') + ' cursor-not-allowed'
          }`}
        >
          {isGranDemanda ? 'Calcular Simulación GD' : 'Calcular Simulación'}
        </button>
      </div>
    </form>
    <Footer />
    </div>
  );
};

export default StepNoProsumidorForm;
