

import React, { useState } from 'react';
import { LOGO_PROSUMIDORES, LOGO_SANTAFE } from './assets';
import { UserType, ProsumidorMode, ProsumidorData, ProsumidorGDData, NoProsumidorData, NoProsumidorCategory, CalculationResult } from './types';
import StepUserType from './components/StepUserType';
import StepProsumidorModeSelect from './components/StepProsumidorModeSelect';
import StepProsumidorForm from './components/StepProsumidorForm';
import StepProsumidorGDForm from './components/StepProsumidorGDForm';
import StepNoProsumidorForm from './components/StepNoProsumidorForm';
import StepResults from './components/StepResults_v2';
import StepEpeNoProsumidorSelect from './components/StepEpeNoProsumidorSelect';
import { calculateProsumidor, calculateNoProsumidor, calculateProsumidorGD } from './utils/calc_v2';

const initialBand = { id: '1', name: 'Última Banda', energy: 0, amount: 0 };

const initialProsumidorData: ProsumidorData = {
  tariffCode: '',
  isLargeDemand: false,
  eg: 0,
  ee: 0,
  er: 0,
  serviceQuota: 0,
  bands: [initialBand],
  reconEPE: 0,
  cap: 0,
  ley12692: 0,
  reconGSF: 0,
  taxStatus: undefined,
  totalBill: 0,
  isRosario: false
};

const initialProsumidorGDData: ProsumidorGDData = {
  capGD: 0, leyGD: 0, reconGSF_GD: 0,
  cargoComercial: 0, cargoCapSumPico: 0, cargoCapSumFPico: 0, cargoPotenciaPico: 0,
  eaConsPico: 0, eaConsResto: 0, eaConsValle: 0,
  recargoBonifFP: 0, eaConsTotal: 0, 
  subtotalConsumoEnergia: 0, subtotalGeneral: 0, totalPagar: 0,
  entPico: 0, entResto: 0, entValle: 0,
  recPico: 0, recResto: 0, recValle: 0,
  genPico: 0, genResto: 0, genValle: 0,
  precioUnitarioPico: 0, precioUnitarioResto: 0, precioUnitarioValle: 0
};

const initialNoProsumidorData: NoProsumidorData = {
  category: NoProsumidorCategory.RESIDENCIAL,
  consumptionHistory: [0, 0, 0, 0, 0, 0],
  totalConsumption: 0,
  serviceQuota: 0,
  bands: [initialBand],
  cap: 0,
  ley12692: 0,
  totalBill: 0,
  isRosario: false
};

const App: React.FC = () => {
  const [step, setStep] = useState<number>(1);
  const [userType, setUserType] = useState<UserType | null>(null);
  const [prosumidorMode, setProsumidorMode] = useState<ProsumidorMode | null>(null);

  const [prosumidorData, setProsumidorData] = useState<ProsumidorData>(initialProsumidorData);
  const [prosumidorGDData, setProsumidorGDData] = useState<ProsumidorGDData>(initialProsumidorGDData);
  const [noProsumidorData, setNoProsumidorData] = useState<NoProsumidorData>(initialNoProsumidorData);
  
  const [results, setResults] = useState<CalculationResult | null>(null);

  const handleUserSelect = (type: UserType) => {
    setUserType(type);
    setStep(2);
    if (type !== UserType.PROSUMIDOR) setProsumidorMode(null);
  };

  const handleEpeNoProsumidorCategorySelect = (type: UserType) => {
    let category = NoProsumidorCategory.RESIDENCIAL;
    if (type === UserType.EPE_NO_PROSUMIDOR_COMERCIAL) category = NoProsumidorCategory.COMERCIAL;
    if (type === UserType.EPE_NO_PROSUMIDOR_INDUSTRIAL) category = NoProsumidorCategory.INDUSTRIAL;
    if (type === UserType.EPE_NO_PROSUMIDOR_GD) category = NoProsumidorCategory.GRAN_DEMANDA;
    setNoProsumidorData(prev => ({ ...prev, category }));
    setUserType(type);
  };

  const handleProsumidorModeSelect = (mode: ProsumidorMode) => setProsumidorMode(mode);

  const handleProsumidorSubmit = (data: ProsumidorData) => {
    setProsumidorData(data);
    setResults(calculateProsumidor(data));
    setStep(3);
  };

  const handleProsumidorGDSubmit = (data: ProsumidorGDData) => {
    setProsumidorGDData(data);
    setResults(calculateProsumidorGD(data));
    setStep(3);
  };

  const handleNoProsumidorSubmit = (data: NoProsumidorData) => {
    setNoProsumidorData(data);
    setResults(calculateNoProsumidor(data));
    setStep(3);
  };

  const handleReset = () => {
    setStep(1);
    setUserType(null);
    setProsumidorMode(null);
    setResults(null);
    setProsumidorData(initialProsumidorData);
    setProsumidorGDData(initialProsumidorGDData);
    setNoProsumidorData(initialNoProsumidorData);
  };

  const isEpeNoProsumidorGranular = (type: UserType | null) => 
    type && [UserType.EPE_NO_PROSUMIDOR_RESIDENCIAL, UserType.EPE_NO_PROSUMIDOR_COMERCIAL, UserType.EPE_NO_PROSUMIDOR_INDUSTRIAL, UserType.EPE_NO_PROSUMIDOR_GD].includes(type);

  return (
    <div className="min-h-screen bg-white text-gray-800 pb-20 font-sans">
      <header className="bg-epe-gradient shadow-lg sticky top-0 z-20 border-b border-white/20 no-print">
        <div className="max-w-6xl mx-auto px-4 py-4 flex flex-col items-center justify-center">
          <div className="flex flex-row items-center justify-center gap-4 md:gap-8 w-full">
            <div className="h-10 md:h-14 flex items-center justify-center">
               <img src={LOGO_PROSUMIDORES} alt="Prosumidores" className="max-h-full object-contain brightness-0 invert" />
            </div>
            
            <div className="flex flex-col items-center">
              <h1 className="text-xl md:text-3xl font-black tracking-tight text-white text-center drop-shadow-md">
                Calculadora Prosumidores EPE
              </h1>
              <div className="mt-2 text-xs font-bold text-white bg-white/20 backdrop-blur-sm px-4 py-1 rounded-full border border-white/30">
                {step === 1 ? 'Paso 1: Selección' : step === 2 ? 'Paso 2: Datos' : 'Paso 3: Resultados'}
              </div>
            </div>

            <div className="h-14 md:h-20 flex items-center justify-center">
               <img src={LOGO_SANTAFE} alt="Santa Fe" className="max-h-full object-contain brightness-0 invert" />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {step === 1 && <StepUserType onSelect={handleUserSelect} />}
        {step === 2 && userType === UserType.PROSUMIDOR && !prosumidorMode && <StepProsumidorModeSelect onSelect={handleProsumidorModeSelect} onBack={() => { setUserType(null); setStep(1); }} />}
        {step === 2 && userType === UserType.PROSUMIDOR && prosumidorMode === 'STANDARD' && <StepProsumidorForm initialData={prosumidorData} onSubmit={handleProsumidorSubmit} onBack={() => setProsumidorMode(null)} />}
        {step === 2 && userType === UserType.PROSUMIDOR && prosumidorMode === 'GRAN_DEMANDA' && <StepProsumidorGDForm initialData={prosumidorGDData} onSubmit={handleProsumidorGDSubmit} onBack={() => setProsumidorMode(null)} />}
        {step === 2 && userType === UserType.NO_PROSUMIDOR && <StepEpeNoProsumidorSelect onSelect={handleEpeNoProsumidorCategorySelect} onBack={() => { setUserType(null); setStep(1); }} />}
        {step === 2 && isEpeNoProsumidorGranular(userType) && <StepNoProsumidorForm initialData={noProsumidorData} onSubmit={handleNoProsumidorSubmit} onBack={() => setUserType(UserType.NO_PROSUMIDOR)} />}
        {step === 3 && results && userType && <StepResults results={results} userType={userType} onBack={() => setStep(2)} onReset={handleReset} />}
      </main>
    </div>
  );
};

export default App;