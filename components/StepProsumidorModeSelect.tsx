import React from 'react';
import { ProsumidorMode } from '../types';
import { Zap, Factory } from 'lucide-react';
import Footer from './Footer';

interface Props {
  onSelect: (mode: ProsumidorMode) => void;
  onBack: () => void;
  onShowStats?: () => void;
}

const StepProsumidorModeSelect: React.FC<Props> = ({ onSelect, onBack, onShowStats }) => {
  return (
    <div className="flex flex-col min-h-full">
    <div className="flex flex-col gap-8 items-center py-6 animate-fade-in flex-grow">
      <h2 className="text-xl font-bold text-gray-800">Seleccione su tipo de consumo</h2>
      
      <div className="flex flex-col md:flex-row gap-6 w-full justify-center">
        <button
          onClick={() => onSelect('STANDARD')}
          className="group relative flex flex-col items-center justify-center w-full md:w-72 h-72 bg-white border-2 border-gray-200 rounded-2xl shadow-sm hover:border-violet-500 hover:shadow-lg transition-all duration-300"
        >
          <div className="bg-violet-100 p-5 rounded-full mb-4 group-hover:bg-violet-200 transition-colors">
            <Zap className="w-12 h-12 text-violet-600" />
          </div>
          <span className="text-xl font-bold text-gray-800 px-4 text-center">Pequeña demanda</span>
          <span className="text-sm text-gray-500 mt-2">Usuario Residencial, Comercial, Industrial y Asociaciones</span>
        </button>
 
        <button
          onClick={() => onSelect('GRAN_DEMANDA')}
          className="group relative flex flex-col items-center justify-center w-full md:w-72 h-72 bg-white border-2 border-gray-200 rounded-2xl shadow-sm hover:border-violet-500 hover:shadow-lg transition-all duration-300"
        >
          <div className="bg-violet-100 p-5 rounded-full mb-4 group-hover:bg-violet-200 transition-colors">
            <Factory className="w-12 h-12 text-violet-600" />
          </div>
          <span className="text-xl font-bold text-gray-800 px-4 text-center">Gran Demanda</span>
        </button>
      </div>
 
      <button
        onClick={onBack}
        className="mt-4 text-gray-500 hover:text-gray-700 font-medium underline"
      >
        Volver atrás
      </button>
    </div>
    <Footer onShowStats={onShowStats} />
    </div>
  );
};

export default StepProsumidorModeSelect;