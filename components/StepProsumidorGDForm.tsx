
import React, { useState, useEffect } from 'react';
import { ProsumidorGDData, TaxStatus } from '../types';
import { Info, AlertCircle } from 'lucide-react';
import Footer from './Footer';

interface Props {
  initialData: ProsumidorGDData;
  onSubmit: (data: ProsumidorGDData) => void;
  onBack: () => void;
  onShowStats?: () => void;
}

const StepProsumidorGDForm: React.FC<Props> = ({ initialData, onSubmit, onBack, onShowStats }) => {
  const [formData, setFormData] = useState<ProsumidorGDData>(initialData);

  // Styles
  const labelStyle = "block text-base font-bold text-violet-900 mb-2 bg-gradient-to-r from-violet-100 to-white/0 p-1.5 pl-3 rounded-l border-l-4 border-violet-500 shadow-sm";

  const handleChange = (field: keyof ProsumidorGDData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleNumberChange = (field: keyof ProsumidorGDData, valueStr: string) => {
    const val = valueStr === '' ? 0 : parseFloat(valueStr);
    handleChange(field, val);
  };

  // Auto-calculate "E. Activa Cons. Total"
  useEffect(() => {
    const sum = (formData.cargoComercial || 0) + 
                (formData.cargoCapSumPico || 0) + 
                (formData.cargoCapSumFPico || 0) + 
                (formData.cargoPotenciaPico || 0) + 
                (formData.eaConsPico || 0) + 
                (formData.eaConsResto || 0) + 
                (formData.eaConsValle || 0);
    
    setFormData(prev => ({ ...prev, eaConsTotal: sum }));
  }, [
    formData.cargoComercial, 
    formData.cargoCapSumPico, 
    formData.cargoCapSumFPico, 
    formData.cargoPotenciaPico, 
    formData.eaConsPico, 
    formData.eaConsResto, 
    formData.eaConsValle
  ]);

  const isFormValid = () => {
    return formData.totalPagar > 0 && !!formData.taxStatus && formData.taxStatus !== ('' as TaxStatus);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isFormValid()) {
      onSubmit(formData);
    }
  };

  const getIvaInfo = (status: TaxStatus) => {
    if (!status) return { text: '' };
    switch (status) {
      case TaxStatus.RESPONSABLE_INSCRIPTO:
        return { text: 'IVA aplicable: 27% + percepción: 3%' };
      case TaxStatus.RESPONSABLE_INSCRIPTO_AGENTE:
        return { text: 'IVA aplicable: 27%' };
      case TaxStatus.EXENTO:
        return { text: 'IVA aplicable: 21%' };
      default:
        return { text: '' };
    }
  };

  return (
    <div className="flex flex-col min-h-full">
    <form onSubmit={handleSubmit} className="space-y-8 animate-fade-in text-gray-800 flex-grow">
      
      {/* 2.1 Detalle de Facturación */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h3 className="text-lg font-semibold text-violet-800 mb-4 border-b pb-2 border-violet-100">Detalle de Facturación</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div>
            <label className={labelStyle}>Cuota de Alumbrado Público ($)</label>
            <input
              type="number" step="0.01" min="0"
              value={formData.capGD || ''} onChange={(e) => handleNumberChange('capGD', e.target.value)}
              className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-violet-500 outline-none"
            />
          </div>
          <div>
            <label className={labelStyle}>Ley 12692 ($)</label>
            <input
              type="number" step="0.01" min="0"
              value={formData.leyGD || ''} onChange={(e) => handleNumberChange('leyGD', e.target.value)}
              className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-violet-500 outline-none"
            />
          </div>
          <div>
            <label className={labelStyle}>Cancela. Fact. PROSUMIDOR MAX</label>
            <input
              type="number" step="0.01" min="0"
              value={formData.reconGSF_GD || ''} onChange={(e) => handleNumberChange('reconGSF_GD', e.target.value)}
              className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-violet-500 outline-none"
            />
          </div>
        </div>

        <div className="mb-2">
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
                  En los impuestos se aplicaran un cargo del 1.8% y 0.60% provenientes de las ordenes municipales 1592/62 y 1618/62 respectivamente
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
            <option value={TaxStatus.RESPONSABLE_INSCRIPTO_AGENTE}>{TaxStatus.RESPONSABLE_INSCRIPTO_AGENTE}</option>
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
      </div>

      {/* 2.2 Información de Importes Básico */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h3 className="text-lg font-semibold text-violet-800 mb-4 border-b pb-2 border-violet-100">Información de lecturas, consumos y componentes del importe básico</h3>
        <p className="text-xs text-gray-500 mb-4">el usuario debe completar con los importes de la ultima columna que figura en la hoja 2 de la factura</p>
        
        <div className="flex flex-col gap-6 max-w-2xl mx-auto md:mx-0">
            <div>
              <label className={labelStyle}>Cargo Comercial</label>
              <input type="number" step="0.01" value={formData.cargoComercial || ''} onChange={(e) => handleNumberChange('cargoComercial', e.target.value)} className="w-full p-2 border border-gray-300 rounded focus:ring-1 focus:ring-violet-500 outline-none"/>
            </div>
            <div>
              <label className={labelStyle}>Cargo Cap. Sum. Pico</label>
              <input type="number" step="0.01" value={formData.cargoCapSumPico || ''} onChange={(e) => handleNumberChange('cargoCapSumPico', e.target.value)} className="w-full p-2 border border-gray-300 rounded focus:ring-1 focus:ring-violet-500 outline-none"/>
            </div>
            <div>
              <label className={labelStyle}>Cargo Cap. Sum. F. Pico</label>
              <input type="number" step="0.01" value={formData.cargoCapSumFPico || ''} onChange={(e) => handleNumberChange('cargoCapSumFPico', e.target.value)} className="w-full p-2 border border-gray-300 rounded focus:ring-1 focus:ring-violet-500 outline-none"/>
            </div>
            <div>
              <label className={labelStyle}>Cargo Pot. Adq. Pico</label>
              <input type="number" step="0.01" value={formData.cargoPotenciaPico || ''} onChange={(e) => handleNumberChange('cargoPotenciaPico', e.target.value)} className="w-full p-2 border border-gray-300 rounded focus:ring-1 focus:ring-violet-500 outline-none"/>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelStyle}>E. Activa Cons. Pico ($)</label>
                <input type="number" step="0.01" value={formData.eaConsPico || ''} onChange={(e) => handleNumberChange('eaConsPico', e.target.value)} className="w-full p-2 border border-gray-300 rounded focus:ring-1 focus:ring-violet-500 outline-none"/>
              </div>
              <div>
                <label className={labelStyle}>Precio unitario pico</label>
                <input type="number" step="0.000001" value={formData.precioUnitarioPico || ''} onChange={(e) => handleNumberChange('precioUnitarioPico', e.target.value)} className="w-full p-2 border border-gray-300 rounded focus:ring-1 focus:ring-violet-500 outline-none"/>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelStyle}>E. Activa Cons. Resto ($)</label>
                <input type="number" step="0.01" value={formData.eaConsResto || ''} onChange={(e) => handleNumberChange('eaConsResto', e.target.value)} className="w-full p-2 border border-gray-300 rounded focus:ring-1 focus:ring-violet-500 outline-none"/>
              </div>
              <div>
                <label className={labelStyle}>Precio unitario resto</label>
                <input type="number" step="0.000001" value={formData.precioUnitarioResto || ''} onChange={(e) => handleNumberChange('precioUnitarioResto', e.target.value)} className="w-full p-2 border border-gray-300 rounded focus:ring-1 focus:ring-violet-500 outline-none"/>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelStyle}>E. Activa Cons. Valle ($)</label>
                <input type="number" step="0.01" value={formData.eaConsValle || ''} onChange={(e) => handleNumberChange('eaConsValle', e.target.value)} className="w-full p-2 border border-gray-300 rounded focus:ring-1 focus:ring-violet-500 outline-none"/>
              </div>
              <div>
                <label className={labelStyle}>Precio unitario valle</label>
                <input type="number" step="0.000001" value={formData.precioUnitarioValle || ''} onChange={(e) => handleNumberChange('precioUnitarioValle', e.target.value)} className="w-full p-2 border border-gray-300 rounded focus:ring-1 focus:ring-violet-500 outline-none"/>
              </div>
            </div>
            <div>
             <label className={labelStyle}>Recargo/Bonif FP ($)</label>
             <input type="number" step="0.01" value={formData.recargoBonifFP || ''} onChange={(e) => handleNumberChange('recargoBonifFP', e.target.value)} className="w-full p-2 border border-gray-300 rounded focus:ring-1 focus:ring-violet-500 outline-none"/>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mt-2">
               <label className="block text-sm font-bold text-gray-700 mb-1">E. Activa Cons. Total ($)</label>
               <input 
                 type="number" 
                 step="0.01" 
                 value={formData.eaConsTotal || 0} 
                 readOnly 
                 className="w-full p-2 bg-gray-100 border border-gray-300 rounded focus:outline-none text-gray-600 font-semibold"
               />
               <p className="text-[10px] text-gray-400 mt-1">Calculado automáticamente</p>
            </div>
        </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6 bg-violet-50 p-6 rounded-lg border border-violet-100">
             <div>
                <label className="block text-xs font-bold text-violet-800 mb-1">SUBTOTAL CONSUMO ENERGÍA</label>
                <input type="number" step="0.01" value={formData.subtotalConsumoEnergia || ''} onChange={(e) => handleNumberChange('subtotalConsumoEnergia', e.target.value)} className="w-full p-2 border border-violet-300 rounded focus:ring-1 focus:ring-violet-500 outline-none"/>
             </div>
             <div>
                <label className="block text-xs font-bold text-violet-800 mb-1">SUBTOTAL GENERAL</label>
                <input type="number" step="0.01" value={formData.subtotalGeneral || ''} onChange={(e) => handleNumberChange('subtotalGeneral', e.target.value)} className="w-full p-2 border border-violet-300 rounded focus:ring-1 focus:ring-violet-500 outline-none"/>
             </div>
             <div>
                <label className="block text-xs font-bold text-violet-800 mb-1">TOTAL A PAGAR</label>
                <input type="number" step="0.01" required value={formData.totalPagar || ''} onChange={(e) => handleNumberChange('totalPagar', e.target.value)} className="w-full p-2 border-2 border-violet-500 rounded focus:ring-1 focus:ring-violet-500 outline-none font-bold text-lg"/>
                {!isFormValid() && formData.totalPagar > 0 && (
                   <div className="mt-2 flex items-center gap-1 text-red-600 font-bold text-[10px] animate-pulse">
                      <AlertCircle size={12} />
                      <span>Seleccione condición fiscal</span>
                   </div>
                )}
             </div>
          </div>
      </div>

      {/* 2.3 Información Complementaria (Tabla kWh) */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h3 className="text-lg font-semibold text-violet-800 mb-4 border-b pb-2 border-violet-100">Información Complementaria (kWh)</h3>
        
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
               <tr>
                 <th className="px-4 py-2 text-left font-semibold text-gray-600">Concepto</th>
                 <th className="px-4 py-2 text-right font-semibold text-gray-600">Cantidad (kWh)</th>
               </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
               {/* ENTREGADA */}
               <tr className="bg-gray-50/50"><td colSpan={2} className="px-4 py-2 text-lg font-bold text-gray-700 uppercase">Entregada</td></tr>
               <tr>
                 <td className="px-4 py-2">Energía Activa Horario Pico</td>
                 <td className="px-4 py-1"><input type="number" className="w-full text-right p-1 border rounded" value={formData.entPico || ''} onChange={(e) => handleNumberChange('entPico', e.target.value)} /></td>
               </tr>
               <tr>
                 <td className="px-4 py-2">Energía Activa Horario Resto</td>
                 <td className="px-4 py-1"><input type="number" className="w-full text-right p-1 border rounded" value={formData.entResto || ''} onChange={(e) => handleNumberChange('entResto', e.target.value)} /></td>
               </tr>
               <tr>
                 <td className="px-4 py-2">Energía Activa Horario Valle</td>
                 <td className="px-4 py-1"><input type="number" className="w-full text-right p-1 border rounded" value={formData.entValle || ''} onChange={(e) => handleNumberChange('entValle', e.target.value)} /></td>
               </tr>

               {/* RECIBIDA */}
               <tr className="bg-gray-50/50"><td colSpan={2} className="px-4 py-2 text-lg font-bold text-gray-700 uppercase">Recibida</td></tr>
               <tr>
                 <td className="px-4 py-2">Energía Activa Horario Pico</td>
                 <td className="px-4 py-1"><input type="number" className="w-full text-right p-1 border rounded" value={formData.recPico || ''} onChange={(e) => handleNumberChange('recPico', e.target.value)} /></td>
               </tr>
               <tr>
                 <td className="px-4 py-2">Energía Activa Horario Resto</td>
                 <td className="px-4 py-1"><input type="number" className="w-full text-right p-1 border rounded" value={formData.recResto || ''} onChange={(e) => handleNumberChange('recResto', e.target.value)} /></td>
               </tr>
               <tr>
                 <td className="px-4 py-2">Energía Activa Horario Valle</td>
                 <td className="px-4 py-1"><input type="number" className="w-full text-right p-1 border rounded" value={formData.recValle || ''} onChange={(e) => handleNumberChange('recValle', e.target.value)} /></td>
               </tr>

               {/* GENERADA */}
               <tr className="bg-gray-50/50"><td colSpan={2} className="px-4 py-2 text-lg font-bold text-gray-700 uppercase">Generada</td></tr>
               <tr>
                 <td className="px-4 py-2">Energía Activa Horario Pico</td>
                 <td className="px-4 py-1"><input type="number" className="w-full text-right p-1 border rounded" value={formData.genPico || ''} onChange={(e) => handleNumberChange('genPico', e.target.value)} /></td>
               </tr>
               <tr>
                 <td className="px-4 py-2">Energía Activa Horario Resto</td>
                 <td className="px-4 py-1"><input type="number" className="w-full text-right p-1 border rounded" value={formData.genResto || ''} onChange={(e) => handleNumberChange('genResto', e.target.value)} /></td>
               </tr>
               <tr>
                 <td className="px-4 py-2">Energía Activa Horario Valle</td>
                 <td className="px-4 py-1"><input type="number" className="w-full text-right p-1 border rounded" value={formData.genValle || ''} onChange={(e) => handleNumberChange('genValle', e.target.value)} /></td>
               </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex flex-col-reverse md:flex-row gap-4 justify-between pt-4">
        <button
          type="button"
          onClick={onBack}
          className="px-6 py-3 text-gray-600 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg font-medium transition-colors"
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
          Calcular Simulación GD
        </button>
      </div>
 
    </form>
    <Footer onShowStats={onShowStats} />
    </div>
  );
};

export default StepProsumidorGDForm;
