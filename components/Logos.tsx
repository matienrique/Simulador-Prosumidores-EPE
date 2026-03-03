import React from 'react';

export const LogoSantaFe: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 300 80" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M40 10C40 10 20 10 20 40C20 70 40 70 40 70" stroke="currentColor" strokeWidth="4" strokeLinecap="round"/>
    <path d="M20 40H35" stroke="currentColor" strokeWidth="4" strokeLinecap="round"/>
    <text x="60" y="50" fontFamily="Arial, sans-serif" fontWeight="bold" fontSize="32" fill="currentColor">SANTA FE</text>
    <text x="60" y="70" fontFamily="Arial, sans-serif" fontSize="14" letterSpacing="2" fill="currentColor">PROVINCIA</text>
    {/* Escudo simplificado */}
    <path d="M15 20L15 60" stroke="currentColor" strokeWidth="2"/>
    <circle cx="15" cy="40" r="15" stroke="currentColor" strokeWidth="2"/>
  </svg>
);

export const LogoProsumidores: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 300 80" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Ícono de energía/hoja */}
    <path d="M30 60C30 60 10 50 10 30C10 10 30 10 30 10C30 10 50 20 50 40C50 60 30 60 30 60Z" stroke="currentColor" strokeWidth="3" fill="none"/>
    <path d="M30 60V20" stroke="currentColor" strokeWidth="2"/>
    <path d="M30 40L45 25" stroke="currentColor" strokeWidth="2"/>
    <path d="M30 30L15 20" stroke="currentColor" strokeWidth="2"/>
    
    <text x="60" y="45" fontFamily="Arial, sans-serif" fontWeight="bold" fontSize="28" fill="currentColor">PROSUMIDORES</text>
    <text x="60" y="65" fontFamily="Arial, sans-serif" fontSize="12" letterSpacing="1" fill="currentColor">ENERGÍA RENOVABLE</text>
  </svg>
);

// Intentar usar logos más fieles si es posible con paths SVG
// Logo Santa Fe real aproximado (Escudo ovalado con laureles)
export const LogoSantaFeOfficial: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 200 60" className={className} xmlns="http://www.w3.org/2000/svg">
    <g fill="currentColor">
      <path d="M37.6,16.8c-1.6-0.4-3.2-0.7-4.9-0.7c-4.6,0-7.9,2.4-7.9,6.7c0,3.9,2.6,5.8,6.8,6.7l1.8,0.4 c2.8,0.6,3.9,1.5,3.9,3.4c0,2.1-1.7,3.5-4.8,3.5c-2.3,0-4.8-0.8-6.8-2.1l-1.6,3.6c2.2,1.4,5.3,2.3,8.3,2.3c5.3,0,9-2.7,9-7.5 c0-4.2-2.8-6.2-7.1-7.1l-1.8-0.4c-2.4-0.5-3.6-1.4-3.6-3.1c0-1.8,1.5-3,4.1-3c1.8,0,3.6,0.5,5.1,1.2L37.6,16.8z"/>
      <path d="M54.4,30.3l-1.8,10h-4.3l4.9-24h4.6l5,24h-4.5l-1.7-10H54.4z M59.9,26.9l-1.4-8.2h-0.1l-1.5,8.2H59.9z"/>
      <path d="M86.1,16.3v24h-4.1l-6.8-12.8h-0.1v12.8h-4.1v-24h4.3l6.6,12.4h0.1v-12.4H86.1z"/>
      <path d="M99.6,20.1h-5.8v20.2h-4.2V20.1h-5.8v-3.7h15.8V20.1z"/>
      <path d="M114.7,30.3l-1.8,10h-4.3l4.9-24h4.6l5,24h-4.5l-1.7-10H114.7z M120.2,26.9l-1.4-8.2h-0.1l-1.5,8.2H120.2z"/>
      <path d="M136.1,20.1v7.6h7.9v3.7h-7.9v8.9h-4.2v-24h13.2v3.7H136.1z"/>
      <path d="M157.4,20.1v7.6h7.9v3.7h-7.9v5.2h8.8v3.7h-13v-24h13v3.7H157.4z"/>
      
      <text x="30" y="55" fontFamily="Arial" fontSize="9" letterSpacing="3">PROVINCIA</text>
    </g>
    {/* Escudo simplificado a la izquierda */}
    <path d="M15,10 C20,10 24,15 24,25 C24,35 20,40 15,40 C10,40 6,35 6,25 C6,15 10,10 15,10 Z" fill="none" stroke="currentColor" strokeWidth="2"/>
    <path d="M15,15 L15,35 M10,25 L20,25" stroke="currentColor" strokeWidth="1.5"/>
  </svg>
);

export const LogoProsumidoresOfficial: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 250 60" className={className} xmlns="http://www.w3.org/2000/svg">
    <g fill="currentColor">
      {/* Icono circular con hoja/rayo */}
      <circle cx="30" cy="30" r="22" fill="none" stroke="currentColor" strokeWidth="2"/>
      <path d="M30 15 L30 45 M15 30 L45 30" stroke="currentColor" strokeWidth="1" opacity="0.3"/>
      <path d="M30 52 C42.15 52 52 42.15 52 30 C52 17.85 42.15 8 30 8 C17.85 8 8 17.85 8 30 C8 42.15 17.85 52 30 52 Z" fill="none" stroke="currentColor" strokeWidth="2"/>
      <path d="M30 18 L36 28 H32 L34 38 L26 28 H30 L28 18 Z" fill="currentColor"/>
      
      <text x="65" y="38" fontFamily="Arial, sans-serif" fontWeight="800" fontSize="24" letterSpacing="-0.5">PROSUMIDORES</text>
      <text x="65" y="52" fontFamily="Arial, sans-serif" fontSize="10" letterSpacing="2" fontWeight="bold" opacity="0.8">SANTA FE</text>
    </g>
  </svg>
);
