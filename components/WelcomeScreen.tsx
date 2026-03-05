import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface WelcomeScreenProps {
  onContinue: () => void;
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onContinue }) => {
  return (
    <div className="max-w-3xl mx-auto mt-8 px-4">
      <div className="bg-white rounded-2xl shadow-xl border border-amber-100 overflow-hidden">
        <div className="bg-amber-50 px-6 py-4 border-b border-amber-100 flex items-center gap-3">
          <AlertTriangle className="text-amber-600 w-6 h-6" />
          <h2 className="text-amber-800 font-bold text-lg uppercase tracking-wider">
            Información Importante
          </h2>
        </div>
        
        <div className="p-8 space-y-6 text-gray-700 leading-relaxed">
          <p className="font-medium text-lg text-gray-900">
            Este Simulador de Facturas para Prosumidores es una herramienta pensada para ayudarte a visualizar los ahorros obtenidos por medio de tu sistema de generación renovable conectado a la red. Los resultados deben interpretarse como una estimación orientativa, útil para visualizar posibles ahorros y beneficios, pero no como una factura definitiva.
          </p>
          
          <p>
            Los montos calculados pueden presentar variaciones respecto de la facturación efectiva, debido a posibles actualizaciones tarifarias, modificaciones en los esquemas de incentivos, variaciones en impuestos y cargos aplicables, en relación al período de facturación simulado. 
          </p>
          
          <p className="text-sm bg-gray-50 p-4 rounded-xl border border-gray-100 italic">
            La información proporcionada por el simulador tiene carácter informativo y no reviste condición de liquidación oficial ni genera derecho adquirido alguno, debiendo considerarse como una herramienta de apoyo para la toma de decisiones.
          </p>
          
          <div className="pt-6 flex justify-center">
            <button
              onClick={onContinue}
              className="px-12 py-4 bg-epe-gradient text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all hover:scale-105 active:scale-95"
            >
              Continuar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WelcomeScreen;
