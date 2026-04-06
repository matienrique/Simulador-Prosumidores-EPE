
import React from 'react';
import { UserType } from '../types';
import { Building2, ArrowRight, Info } from 'lucide-react';
import Footer from './Footer';

interface Props {
  onSelect: (type: UserType) => void;
  onShowStats?: () => void;
}

const StepUserType: React.FC<Props> = ({ onSelect, onShowStats }) => {
  return (
    <div className="flex flex-col min-h-full">
      <div className="flex flex-col items-center py-10 flex-grow animate-fade-in">
        <h2 className="text-2xl font-bold text-gray-800 mb-8">Seleccioná la opción correspondiente a tu situación</h2>
        
        <div className="w-full max-w-2xl px-4">
          <div className="bg-white rounded-2xl shadow-xl border-t-4 border-violet-600 overflow-hidden">
            <div className="p-8">
              <div className="flex items-center gap-4 mb-6">
                <div className="p-3 bg-violet-100 rounded-full text-violet-600">
                  <Building2 size={32} />
                </div>
                <div>
                  <h3 className="text-2xl font-extrabold text-gray-800">Simulación para Usuarios de EPESF</h3>
                  <p className="text-sm text-gray-500"></p>
                </div>
              </div>
              <p className="text-gray-600 mb-4 leading-relaxed">
                Mediante el siguiente simulador podrás estimar los ahorros económicos en tu factura eléctrica o calcular qué potencia de energía renovable podés instalar por formar parte del Programa Prosumidores 4.0
              </p>
              <p className="text-sm text-violet-700 mb-8 font-medium">
                Podés consultar el manual de usuario cliqueando <a href="https://docs.google.com/document/d/1w2bWxg6J2fYoaCvwZxkTuyHLcnjo52FcAU8H5cdSDz8/edit?tab=t.0" target="_blank" rel="noopener noreferrer" className="underline hover:text-violet-900 transition-colors">aquí</a>
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                  onClick={() => onSelect(UserType.PROSUMIDOR)}
                  className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-xl font-bold transition-all shadow-md transform hover:-translate-y-0.5 group"
                >
                  <span>Soy Prosumidor</span>
                  <ArrowRight className="w-5 h-5 transform group-hover:translate-x-1 transition-transform" />
                </button>
                
                <button
                  onClick={() => onSelect(UserType.NO_PROSUMIDOR)}
                  className="flex items-center justify-between px-6 py-4 bg-white border-2 border-orange-500 text-orange-600 hover:bg-orange-50 rounded-xl font-bold transition-all shadow-md transform hover:-translate-y-0.5 group"
                >
                  <span>No soy Prosumidor</span>
                  <ArrowRight className="w-5 h-5 transform group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </div>
            <div className="bg-violet-50 px-8 py-3 flex items-center gap-2 text-xs text-violet-700 font-semibold border-t border-violet-100">
            </div>
          </div>
        </div>
      </div>
      <Footer onShowStats={onShowStats} />
    </div>
  );
};

export default StepUserType;
