import React from 'react';
import { Phone, Mail, MapPin, Lock } from 'lucide-react';

interface Props {
  onStatsClick?: () => void;
}

const Footer: React.FC<Props> = ({ onStatsClick }) => {
  return (
    <footer className="mt-12 bg-epe-gradient py-10 no-print text-white shadow-inner border-t border-white/20">
      <div className="max-w-5xl mx-auto px-6 grid grid-cols-1 md:grid-cols-2 gap-8 text-sm">
        
        <div className="space-y-4">
          <h4 className="font-black text-white uppercase tracking-wider mb-2 drop-shadow-sm">Contacto</h4>
          
          <div className="flex items-start gap-3">
            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
              <MapPin className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-medium">Secretaría de Energía </p>
              <p className="font-medium">Francisco Miguens 260. Torre 2. Piso 4.</p>
              <p className="opacity-90">Ciudad de Santa Fe</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
              <MapPin className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-medium">Secretaría de Energía </p>
              <p className="font-medium">San Lorenzo 1949. Piso 2. Oficina 228.</p>
              <p className="opacity-90">Ciudad de Rosario</p>
            </div>
          </div>
        </div>

        <div className="space-y-4 md:text-right">
          <div className="flex items-center gap-3 md:justify-end">
            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
              <Phone className="w-5 h-5 text-white" />
            </div>
            <p className="font-medium">Cel: (0342) 4505882 <span className="opacity-50 mx-1">|</span> Interno 1303</p>
          </div>

          <div className="flex items-center gap-3 md:justify-end">
            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
              <Phone className="w-5 h-5 text-white" />
            </div>
            <p className="font-medium">Cel: (0342) 6400825</p>
          </div>
          
          <div className="flex items-center gap-3 md:justify-end">
            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
              <Mail className="w-5 h-5 text-white" />
            </div>
            <a href="mailto:secretariaenergia@santafe.gov.ar" className="font-bold hover:underline text-white">
              secretariaenergia@santafe.gov.ar
            </a>
          </div>
        </div>

      </div>
      
      <div className="max-w-5xl mx-auto px-6 mt-10 pt-6 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="text-xs opacity-70">
          &copy; {new Date().getFullYear()} Gobierno de Santa Fe
        </div>
        
        {onStatsClick && (
          <button 
            onClick={onStatsClick}
            className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl transition-all text-xs font-black uppercase tracking-widest border border-white/10 backdrop-blur-sm"
          >
            <Lock size={14} />
            Estadísticas
          </button>
        )}
      </div>
    </footer>
  );
};

export default Footer;