

import React, { useState } from 'react';
import { ProsumidorData, Band, TaxStatus } from '../types';
import { Plus, Trash2, Info, AlertCircle } from 'lucide-react';
import Footer from './Footer';

interface Props {
  initialData: ProsumidorData;
  onSubmit: (data: ProsumidorData) => void;
  onBack: () => void;
  onShowStats?: () => void;
}

const StepProsumidorForm: React.FC<Props> = ({ initialData, onSubmit, onBack, onShowStats }) => {
  const [formData, setFormData] = useState<ProsumidorData>(initialData);
  const [program, setProgram] = useState<'4.0' | 'anterior' | null>(formData.program || null);

  // Styles
  const labelStyle = "block text-base font-bold text-violet-900 mb-2 bg-gradient-to-r from-violet-100 to-white/0 p-1.5 pl-3 rounded-l border-l-4 border-violet-500 shadow-sm";

  const handleProgramSelect = (prog: '4.0' | 'anterior') => {
    setProgram(prog);
    setFormData(prev => ({ 
      ...prev, 
      program: prog,
      reconGSF: prog === 'anterior' ? 0 : prev.reconGSF 
    }));
  };

  // Handlers for basic inputs
  const handleChange = (field: keyof ProsumidorData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleNumberChange = (field: keyof ProsumidorData, valueStr: string) => {
    const val = valueStr === '' ? 0 : parseFloat(valueStr);
    handleChange(field, Math.max(0, val));
  };

  // Band handlers
  const addBand = () => {
    const newBand: Band = {
      id: crypto.randomUUID(),
      name: `Banda`, // Placeholder, render logic handles the name
      energy: 0,
      amount: 0
    };
    // Insert before the last one
    const currentBands = [...formData.bands];
    const lastBand = currentBands.pop(); 
    if (lastBand) {
      setFormData(prev => ({
        ...prev,
        bands: [...currentBands, newBand, lastBand]
      }));
    }
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

  const isFormValid = () => {
    return !!program && formData.totalBill > 0 && !!formData.taxStatus && formData.taxStatus !== ('' as TaxStatus);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isFormValid()) {
      onSubmit(formData);
    }
  };

  const getBandLabel = (index: number, total: number) => {
    if (index === total - 1) return "Últimos";
    const ordinals = ["Primeros", "Segundos", "Terceros", "Cuartos", "Quintos", "Sextos", "Séptimos", "Octavos", "Novenos", "Décimos"];
    return ordinals[index] || `Banda ${index + 1}`;
  };

  const getIvaInfo = (status: TaxStatus) => {
    if (!status) return { text: '' };
    switch (status) {
      case TaxStatus.RESPONSABLE_INSCRIPTO:
        return { text: 'IVA aplicable: 27% + percepción 3%' };
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
      
      {/* Program Selection - MUST be first */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2 border-violet-100">Selección de Programa</h3>
        <div className="flex flex-col sm:flex-row gap-4">
          <button
            type="button"
            onClick={() => handleProgramSelect('4.0')}
            className={`flex-1 p-3.5 rounded-xl border-2 transition-all flex flex-col items-center justify-center gap-2 ${
              program === '4.0' 
                ? 'border-violet-600 bg-violet-50 text-violet-800 shadow-md scale-[1.02]' 
                : 'border-gray-200 hover:border-violet-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            <span className="font-bold text-base">Soy Prosumidor 4.0</span>
          </button>
          <button
            type="button"
            onClick={() => handleProgramSelect('anterior')}
            className={`flex-1 p-3.5 rounded-xl border-2 transition-all flex flex-col items-center justify-center gap-1 ${
              program === 'anterior' 
                ? 'border-violet-600 bg-violet-50 text-violet-800 shadow-md scale-[1.02]' 
                : 'border-gray-200 hover:border-violet-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            <span className="font-bold text-base">Pertenezco a un programa anterior</span>
            <span className="text-xs text-gray-500 font-medium text-center">Programa ERA, Prosumidores 2</span>
          </button>
        </div>
      </div>

      {!program ? (
        <div className="flex justify-start pt-4">
          <button
            type="button"
            onClick={onBack}
            className="px-6 py-3 text-gray-600 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg font-medium transition-colors shadow-sm"
          >
            Volver
          </button>
        </div>
      ) : (
        <>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2 border-violet-100">Información de medición y lectura</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className={labelStyle}>Energía Generada (EG)</label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={formData.eg || ''}
                  onChange={(e) => handleNumberChange('eg', e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-violet-500 outline-none"
                />
              </div>
              <div>
                <label className={labelStyle}>Energía Entregada (EE)</label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={formData.ee || ''}
                  onChange={(e) => handleNumberChange('ee', e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-violet-500 outline-none"
                />
              </div>
              <div>
                <label className={labelStyle}>Energía Recibida (ER)</label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={formData.er || ''}
                  onChange={(e) => handleNumberChange('er', e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-violet-500 outline-none"
                />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2 border-violet-100">Detalle de Facturación</h3>
            
            <div className="mb-6">
              <label className={labelStyle}>Cuota de servicio (Importe final en pesos)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formData.serviceQuota || ''}
                onChange={(e) => handleNumberChange('serviceQuota', e.target.value)}
                className="w-full md:w-1/3 p-2 border border-gray-300 rounded focus:ring-2 focus:ring-violet-500 outline-none"
              />
            </div>

            <div className="mb-4">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h4 className="text-md font-medium text-gray-700">Bandas de Consumo</h4>
                  <p className="text-xs text-gray-500 mt-1">El usuario debe completar la cantidad de bandas (kWh) según lo informado en la factura y el importe total facturado correspondiente a cada una.</p>
                </div>
                <button
                  type="button"
                  onClick={addBand}
                  className="text-xs flex items-center gap-1 bg-violet-50 text-violet-700 px-2 py-1 rounded hover:bg-violet-100 transition-colors"
                >
                  <Plus size={14} /> Agregar Banda
                </button>
              </div>
              
              <div className="space-y-3">
                {formData.bands.map((band, index) => {
                  const isLast = index === formData.bands.length - 1;
                  const label = getBandLabel(index, formData.bands.length);

                  return (
                    <div key={band.id} className="flex gap-2 items-end bg-gray-50 p-3 rounded-lg border border-gray-100">
                      <div className="flex-1">
                        <label className="text-sm font-bold text-gray-700 mb-1 block">
                          {label}
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className={labelStyle}>Energía correspondiente a la banda (kWh)</label>
                            <input
                              type="number"
                              placeholder="Energía (kWh)"
                              min="0"
                              step="any"
                              value={band.energy || ''}
                              onChange={(e) => updateBand(index, 'energy', parseFloat(e.target.value) || 0)}
                              className="w-full p-2 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-violet-500 outline-none"
                            />
                          </div>
                          <div>
                            <label className={labelStyle}>Importe correspondiente a la banda</label>
                            <input
                              type="number"
                              placeholder="Importe facturado ($)"
                              min="0"
                              step="0.01"
                              value={band.amount || ''}
                              onChange={(e) => updateBand(index, 'amount', parseFloat(e.target.value) || 0)}
                              className="w-full p-2 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-violet-500 outline-none text-right"
                            />
                          </div>
                        </div>
                      </div>
                      {!isLast && (
                        <button
                          type="button"
                          onClick={() => removeBand(index)}
                          className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2 border-violet-100">Importes Adicionales y Total</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className={labelStyle}>Reconocimiento EPE ($)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.reconEPE || ''}
                  onChange={(e) => handleNumberChange('reconEPE', e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-violet-500 outline-none"
                />
              </div>
              <div>
                <label className={labelStyle}>Cuota Alumbrado Público (CAP) ($)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.cap || ''}
                  onChange={(e) => handleNumberChange('cap', e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-violet-500 outline-none"
                />
              </div>
              <div>
                <label className={labelStyle}>Ley 12692 ($)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.ley12692 || ''}
                  onChange={(e) => handleNumberChange('ley12692', e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-violet-500 outline-none"
                />
              </div>
              {program === '4.0' && (
                <div>
                  <label className={labelStyle}>Reconocimiento del Gobierno ($)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.reconGSF || ''}
                    onChange={(e) => handleNumberChange('reconGSF', e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-violet-500 outline-none"
                  />
                </div>
              )}
            </div>

            <div className="mb-6">
              <div className="mb-4 flex flex-col gap-2 animate-fade-in">
                <label className="flex items-center gap-3 cursor-pointer p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                  <input
                    type="checkbox"
                    checked={formData.isRosario || false}
                    onChange={(e) => handleChange('isRosario', e.target.checked)}
                    className="w-5 h-5 text-violet-600 focus:ring-violet-500 border-gray-300 rounded"
                  />
                  <span className="text-gray-700 font-medium">Resido en la ciudad de Rosario</span>
                </label>
                
                {formData.isRosario && (
                  <div className="flex items-start gap-2 bg-blue-50 text-blue-700 p-3 rounded-lg text-sm border border-blue-100">
                    <Info size={16} className="mt-0.5 flex-shrink-0" />
                    <p>
                      En los impuestos se aplicarán un cargo del 1,80% y 0,60% provenientes de las ordenanzas municipales 1592/62 y 1618/62 respectivamente.
                    </p>
                  </div>
                )}
              </div>

              <label className={labelStyle}>¿Cuál es tu condición fiscal? <span className="text-red-500">*</span></label>
              <select
                value={formData.taxStatus || ''}
                onChange={(e) => handleChange('taxStatus', e.target.value as TaxStatus)}
                className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-violet-500 outline-none font-medium"
                required
              >
                <option value="">Seleccione una opción...</option>
                <option value={TaxStatus.RESPONSABLE_INSCRIPTO}>{TaxStatus.RESPONSABLE_INSCRIPTO}</option>
                <option value={TaxStatus.CONSUMIDOR_FINAL}>{TaxStatus.CONSUMIDOR_FINAL}</option>
                <option value={TaxStatus.MONOTRIBUTO}>{TaxStatus.MONOTRIBUTO}</option>
                <option value={TaxStatus.SUJETO_NO_CATEGORIZADO}>{TaxStatus.SUJETO_NO_CATEGORIZADO}</option>
                <option value={TaxStatus.EXENTO}>{TaxStatus.EXENTO}</option>
              </select>
              
              {formData.taxStatus && (
                <div className="mt-3 flex items-center gap-3 bg-violet-50 p-3 rounded-lg border border-violet-100 shadow-sm animate-fade-in">
                  <Info className="text-violet-600 w-5 h-5 flex-shrink-0" />
                  <span className="text-sm font-bold text-violet-800">
                    {getIvaInfo(formData.taxStatus as TaxStatus).text}
                  </span>
                </div>
              )}
            </div>
            
            <div className="bg-gradient-to-r from-violet-50 to-white p-6 rounded-lg border border-violet-200 shadow-sm">
              <label className="block text-lg font-extrabold text-violet-800 mb-2">
                Importe Total de la Factura ($) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                required
                value={formData.totalBill || ''}
                onChange={(e) => handleNumberChange('totalBill', e.target.value)}
                className="w-full p-4 text-2xl font-bold border border-violet-300 rounded focus:ring-2 focus:ring-violet-500 outline-none text-right shadow-inner"
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

          <div className="flex flex-col-reverse md:flex-row gap-4 justify-between pt-4">
            <button
              type="button"
              onClick={onBack}
              className="px-6 py-3 text-gray-600 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg font-medium transition-colors shadow-sm"
            >
              Volver
            </button>
            <button
              type="submit"
              disabled={!isFormValid()}
              className={`px-8 py-3 rounded-lg font-bold text-white transition-all shadow-md ${
                isFormValid() 
                  ? 'bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 hover:shadow-lg transform hover:-translate-y-0.5' 
                  : 'bg-orange-300 cursor-not-allowed'
              }`}
            >
              Calcular Ahorro
            </button>
          </div>
        </>
      )}
    </form>
    <Footer onShowStats={onShowStats} />
    </div>
  );
};

export default StepProsumidorForm;