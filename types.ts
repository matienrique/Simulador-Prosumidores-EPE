

export enum UserType {
  PROSUMIDOR = 'PROSUMIDOR',
  NO_PROSUMIDOR = 'NO_PROSUMIDOR',
  EPE_NO_PROSUMIDOR_RESIDENCIAL = 'EPE_NO_PROSUMIDOR_RESIDENCIAL',
  EPE_NO_PROSUMIDOR_COMERCIAL = 'EPE_NO_PROSUMIDOR_COMERCIAL',
  EPE_NO_PROSUMIDOR_INDUSTRIAL = 'EPE_NO_PROSUMIDOR_INDUSTRIAL',
  EPE_NO_PROSUMIDOR_GD = 'EPE_NO_PROSUMIDOR_GD',
  EPE_NO_PROSUMIDOR_ASOCIACIONES = 'EPE_NO_PROSUMIDOR_ASOCIACIONES',
  // Cooperativa UserTypes added to resolve errors in selection components
  COOPERATIVA_PROSUMIDOR_RESIDENCIAL = 'COOPERATIVA_PROSUMIDOR_RESIDENCIAL',
  COOPERATIVA_PROSUMIDOR_COMERCIAL = 'COOPERATIVA_PROSUMIDOR_COMERCIAL',
  COOPERATIVA_PROSUMIDOR_INDUSTRIAL = 'COOPERATIVA_PROSUMIDOR_INDUSTRIAL',
  COOPERATIVA_PROSUMIDOR_GD = 'COOPERATIVA_PROSUMIDOR_GD',
  COOPERATIVA_NO_PROSUMIDOR_RESIDENCIAL = 'COOPERATIVA_NO_PROSUMIDOR_RESIDENCIAL',
  COOPERATIVA_NO_PROSUMIDOR_COMERCIAL = 'COOPERATIVA_NO_PROSUMIDOR_COMERCIAL',
  COOPERATIVA_NO_PROSUMIDOR_INDUSTRIAL = 'COOPERATIVA_NO_PROSUMIDOR_INDUSTRIAL',
  COOPERATIVA_NO_PROSUMIDOR_GD = 'COOPERATIVA_NO_PROSUMIDOR_GD'
}

export type ProsumidorMode = 'STANDARD' | 'GRAN_DEMANDA';

export enum NoProsumidorCategory {
  RESIDENCIAL = 'Residencial',
  COMERCIAL = 'Comercial',
  INDUSTRIAL = 'Industrial',
  GRAN_DEMANDA = 'Gran demanda',
  ASOCIACIONES = 'Asociaciones'
}

export enum TaxStatus {
  RESPONSABLE_INSCRIPTO = 'Responsable Inscripto',
  RESPONSABLE_INSCRIPTO_AGENTE = 'Responsable Inscripto Agente Percepción',
  CONSUMIDOR_FINAL = 'Consumidor final',
  MONOTRIBUTO = 'Monotributo',
  SUJETO_NO_CATEGORIZADO = 'Sujeto NO categorizado',
  EXENTO = 'Exento'
}

// Added to resolve errors in StepCoopNoProsumidorForm
export enum CoopUserCategory {
  RESIDENCIAL = 'Residencial',
  COMERCIAL = 'Comercial',
  INDUSTRIAL = 'Industrial'
}

export interface Band {
  id: string;
  name: string;
  energy: number; // kWh
  amount: number; // ARS
}

export interface ConsumptionRow {
  period: string; // MM/YYYY
  pico: number;
  resto: number;
  valle: number;
}

export interface NoProsumidorGDInput {
  contractedPower: number;
  knowsAnnualConsumption: boolean;
  annualConsumption: number;
  consumptionTable: ConsumptionRow[];
  cargoComercial: number;
  cargoCapSumPico: number;
  cargoCapSumFPico: number;
  cargoPotAdqPico: number;
  eaConsPicoAmount: number;
  eaConsRestoAmount: number;
  eaConsValleAmount: number;
  eaConsPicoPrice: number;
  eaConsRestoPrice: number;
  eaConsVallePrice: number;
  energiaReactivaAmount: number;
  subtotalEnergiaAmount: number;
  cap: number;
  ley12692: number;
  taxStatus: TaxStatus | '';
  totalToPay: number;
}

export interface ProsumidorData {
  tariffCode: string;
  isLargeDemand: boolean;
  eg: number;
  ee: number;
  er: number;
  serviceQuota: number;
  bands: Band[];
  reconEPE: number;
  cap: number;
  ley12692: number;
  reconGSF: number;
  taxStatus?: TaxStatus;
  totalBill: number;
  isRosario?: boolean;
}

export interface ProsumidorGDData {
  capGD: number;
  leyGD: number;
  reconGSF_GD: number;
  taxStatus?: TaxStatus;
  isRosario?: boolean;
  cargoComercial: number;
  cargoCapSumPico: number;
  cargoCapSumFPico: number;
  cargoPotenciaPico: number;
  eaConsPico: number;
  eaConsResto: number;
  eaConsValle: number;
  recargoBonifFP: number;
  eaConsTotal: number;
  subtotalConsumoEnergia: number;
  subtotalGeneral: number;
  totalPagar: number;
  entPico: number;
  entResto: number;
  entValle: number;
  recPico: number;
  recResto: number;
  recValle: number;
  genPico: number;
  genResto: number;
  genValle: number;
  precioUnitarioPico: number;
  precioUnitarioResto: number;
  precioUnitarioValle: number;
}

export interface NoProsumidorData {
  category: NoProsumidorCategory;
  consumptionHistory: number[];
  totalConsumption: number;
  serviceQuota: number;
  bands: Band[];
  cap: number;
  ley12692: number;
  taxStatus?: TaxStatus;
  totalBill: number;
  isRosario?: boolean;
  gdData?: NoProsumidorGDInput;
}

export interface CalculationResult {
  type: 'STANDARD' | 'GD' | 'NO_PROSUMIDOR';
  billWithProsumers: number;
  billWithoutProsumers: number;
  totalSavings: number;
  totalSavingsPercent: number;
  savingsConsumption: number;
  savingsTax: number;
  savingsRecon?: number; 
  autoconsumoKwh: number;
  autoconsumoPercent?: number; 
  injectionPercent?: number; 
  co2Avoided: number;
  treesEquivalent: number;
  details?: Record<string, number | string>;
}

// Cooperativa specific data interfaces added to resolve "missing export" errors
export interface CoopResidencialData {
  energiaGenerada: number;
  energiaInyectada: number;
  energiaEntregada: number;
  cargosFijos: number[];
  reconocimientoAmbiental: number;
  bands: Band[];
  subtotalEnergia: number;
  totalPagar: number;
  subtotalImpuestos: number;
}

export type CoopComercialData = CoopResidencialData;
export type CoopIndustrialData = CoopResidencialData;

export interface CoopNoProsumidorData {
  userCategory: CoopUserCategory | '';
  autoconsumoEstimado: number;
  knowsContractedPower: boolean;
  contractedPower: number;
  knowsAverageConsumption: boolean;
  averageConsumption: number;
  monthlyConsumptionTable: number[];
  consumoTotalReal: number;
  taxStatus: TaxStatus | '';
  cargosFijos: number[];
  bands: Band[];
  subtotalEnergiaElectrica: number;
  subtotalImpuestos: number;
  totalPagar: number;
}

export interface CoopProsumidorGDData {
  taxStatus: TaxStatus | '';
  cuotaServicio: number;
  cargoCapPico: number;
  cargoCapFueraPico: number;
  cargoCapPotAdquirida: number;
  tarifaPico: number;
  tarifaResto: number;
  tarifaValle: number;
  bonificacionFactorPotencia: number;
  reconCoopEnergiaRecibida: number;
  subtotalBasico: number;
  subtotalGeneral: number;
  reconGSFEnergiaGenerada: number;
  totalPagar: number;
  entregadaPico: number;
  entregadaResto: number;
  entregadaValle: number;
  generadaPico: number;
  generadaResto: number;
  generadaValle: number;
  recibidaPico: number;
  recibidaResto: number;
  recibidaValle: number;
}

export interface CoopNoProsumidorGDData {
  taxStatus: string;
  totalInput: number;
  potenciaPV: number;
  cargoComercial: number;
  cargoCapSumPico: number;
  cargoCapSumFueraPico: number;
  cargoCapPotAdquirida: number;
  tarifaPico: number;
  tarifaRestoSin: number;
  precioUnitarioResto: number;
  tarifaValle: number;
  recargoFactorPotencia: number;
  capInput: number;
  subtotalGeneralInput: number;
  consumoPico: number;
  consumoResto: number;
  consumoValle: number;
}