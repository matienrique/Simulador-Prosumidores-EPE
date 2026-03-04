import { CalculationResult, ProsumidorData, NoProsumidorData, NoProsumidorCategory, ProsumidorGDData, TaxStatus, Band } from '../types';

export const CALCULATOR_CONSTANTS = {
  [NoProsumidorCategory.RESIDENCIAL]: { autoconsumo: 0.40, reconUnit: 109.91, gsfUnit: 20.93 },
  [NoProsumidorCategory.COMERCIAL]: { autoconsumo: 0.75, reconUnit: 98.43, gsfUnit: 34.93 },
  [NoProsumidorCategory.INDUSTRIAL]: { autoconsumo: 0.90, reconUnit: 98.43, gsfUnit: 34.93 },
  [NoProsumidorCategory.GRAN_DEMANDA]: { autoconsumo: 0.80, reconUnit: 98.43, gsfUnit: 34.93 },
};

const safeDiv = (num: number, den: number): number => {
  if (den === 0 || isNaN(den)) return 0;
  return num / den;
};

export const calculateProsumidor = (data: ProsumidorData): CalculationResult => {
  const { eg, ee, er, serviceQuota, bands, reconEPE, cap, ley12692, reconGSF, taxStatus, totalBill, isRosario } = data;

  let ivaCorrespondiente = 0.21;
  let percepcion = 0;
  
  if (taxStatus === TaxStatus.RESPONSABLE_INSCRIPTO) {
    ivaCorrespondiente = 0.3;
  } else if (taxStatus === TaxStatus.CONSUMIDOR_FINAL) {
    ivaCorrespondiente = 0.21;
  } else if (taxStatus === TaxStatus.MONOTRIBUTO) {
    ivaCorrespondiente = 0.27;
  } else if (taxStatus === TaxStatus.SUJETO_NO_CATEGORIZADO) {
    ivaCorrespondiente = 0.27;
    percepcion = 0.135;
  } else if (taxStatus === TaxStatus.EXENTO) {
    ivaCorrespondiente = 0.21;
  }

  const lastBand = bands[bands.length - 1];
  const prevBands = bands.slice(0, bands.length - 1);
  const sumPrevEnergy = prevBands.reduce((sum, b) => sum + b.energy, 0);
  
  const autoconsumo = Math.max(0, eg - er); 
  const consumoUltimaBanda = (ee + autoconsumo) - sumPrevEnergy;

  const sumPrevAmount = prevBands.reduce((sum, b) => sum + b.amount, 0);
  const lastBandPriceRatio = safeDiv(lastBand.amount, lastBand.energy);
  
  const subtotalSinProsumidores = serviceQuota + sumPrevAmount + (lastBandPriceRatio * consumoUltimaBanda);
  const subtotalConProsumidores = serviceQuota + bands.reduce((sum, b) => sum + b.amount, 0);

  const importeConPros = totalBill;
  let importeSinPros = 0;
  let impuestosSinPros = 0;
  
  if (taxStatus === TaxStatus.SUJETO_NO_CATEGORIZADO) {
    const baseImponibleSinProsumidores = subtotalSinProsumidores;
    const Impuesto_percepcion = ((baseImponibleSinProsumidores + cap) * (1 + ivaCorrespondiente)) * percepcion;
    impuestosSinPros = (baseImponibleSinProsumidores * (ivaCorrespondiente + 0.06 + 0.015)) + (cap * (1 + ivaCorrespondiente)) + ley12692 + Impuesto_percepcion;
    importeSinPros = baseImponibleSinProsumidores + impuestosSinPros;
  } else {
    const calculatedTaxA = (ivaCorrespondiente + 0.06 + 0.015) * subtotalSinProsumidores;
    const calculatedTaxB = cap * (1 + ivaCorrespondiente);
    impuestosSinPros = calculatedTaxA + calculatedTaxB + ley12692;
    importeSinPros = subtotalSinProsumidores + impuestosSinPros;
  }

  const ahorroConsumo = subtotalSinProsumidores - subtotalConProsumidores;
  
  const baseTaxCon = subtotalConProsumidores - reconEPE;
  let finalImpuestosConPros = 0;
  
  if (taxStatus === TaxStatus.SUJETO_NO_CATEGORIZADO) {
      const baseImp = subtotalConProsumidores - reconEPE;
      const ImpPer = ((baseImp + cap) * (1 + ivaCorrespondiente)) * percepcion;
      finalImpuestosConPros = (baseImp * (ivaCorrespondiente + 0.015 + 0.06)) + (cap * (1 + ivaCorrespondiente)) + ley12692 + ImpPer;
  } else {
      finalImpuestosConPros = (baseTaxCon * (ivaCorrespondiente + 0.06 + 0.015)) + (cap * (1 + ivaCorrespondiente)) + ley12692;
  }

  const Orden_Mun_1592_62 = isRosario ? 0.006 : 0;
  const Orden_Mun_1618_62 = isRosario ? 0.018 : 0;
  const totalRosarioRate = Orden_Mun_1592_62 + Orden_Mun_1618_62;

  const Imp_ros_sin = subtotalSinProsumidores * totalRosarioRate;
  impuestosSinPros += Imp_ros_sin;
  importeSinPros += Imp_ros_sin;

  const Imp_ros_con = baseTaxCon * totalRosarioRate;
  finalImpuestosConPros += Imp_ros_con;

  const savingsRecon = reconEPE + reconGSF;
  const ahorroTotal = importeSinPros - importeConPros;
  const ahorroImpuestos = impuestosSinPros - finalImpuestosConPros;

  const ahorroTotalPercent = safeDiv(ahorroTotal, importeSinPros) * 100;
  const autoconsumoPercent = safeDiv(autoconsumo, eg) * 100;
  
  const totalConsumoReal = eg + ee - er;
  const injectionPercent = safeDiv(eg, totalConsumoReal) * 100;

  const co2 = 0.2306 * eg;
  const arboles = Math.round(safeDiv(co2, (10 / 6)));

  return {
    type: 'STANDARD',
    billWithProsumers: importeConPros,
    billWithoutProsumers: importeSinPros,
    totalSavings: ahorroTotal,
    totalSavingsPercent: ahorroTotalPercent,
    savingsConsumption: ahorroConsumo,
    savingsTax: ahorroImpuestos,
    savingsRecon: savingsRecon,
    autoconsumoKwh: autoconsumo,
    autoconsumoPercent,
    injectionPercent,
    co2Avoided: co2,
    treesEquivalent: arboles,
    details: {
      "Energía Generada (kWh)": eg,
      "Energía Autoconsumida (kWh)": autoconsumo,
      "Energía Recibida/Inyectada (kWh)": er,
      "Energía Entregada (kWh)": ee,
      "Subtotal Básico (Sin Pros)": subtotalSinProsumidores,
      "Impuestos (Sin Pros)": impuestosSinPros,
      "Total Factura (Sin Pros)": importeSinPros,
      "Subtotal Básico (Con Pros)": subtotalConProsumidores,
      "Base Imponible (Con Pros)": baseTaxCon,
      "Impuestos (Con Pros)": finalImpuestosConPros,
      "Reconocimiento EPE": reconEPE,
      "Reconocimiento GSF": reconGSF,
      "Total Factura (Con Pros)": importeConPros,
      "Ahorro Consumo ($)": ahorroConsumo,
      "Ahorro Impuestos (calc) ($)": ahorroImpuestos,
      "Ahorro Reconocimientos ($)": savingsRecon,
      "Condición Fiscal": taxStatus || "No seleccionada",
      "Alícuota IVA": `${(ivaCorrespondiente * 100).toFixed(1)}%`,
      ...(isRosario ? { "Tasa Mun. Rosario (0.6% + 1.8%)": "Aplicada" } : {})
    }
  };
};

export const calculateProsumidorGD = (data: ProsumidorGDData): CalculationResult => {
  const { 
    capGD, leyGD, reconGSF_GD, taxStatus, 
    cargoComercial, cargoCapSumPico, cargoCapSumFPico, cargoPotenciaPico, 
    eaConsPico, eaConsResto, eaConsValle, 
    recargoBonifFP, totalPagar, 
    entPico, entResto, entValle, 
    recPico, recResto, recValle, 
    genPico, genResto, genValle, 
    subtotalGeneral, subtotalConsumoEnergia,
    precioUnitarioPico, precioUnitarioResto, precioUnitarioValle 
  } = data;

  let ivaCorrespondiente = 0.27;
  let percepcionCorrespondiente = 0.03;
  
  if (taxStatus === TaxStatus.RESPONSABLE_INSCRIPTO) {
    ivaCorrespondiente = 0.27;
    percepcionCorrespondiente = 0.03;
  } else if (taxStatus === TaxStatus.RESPONSABLE_INSCRIPTO_AGENTE) {
    ivaCorrespondiente = 0.27;
    percepcionCorrespondiente = 0.0;
  } else if (taxStatus === TaxStatus.EXENTO) {
    ivaCorrespondiente = 0.21;
    percepcionCorrespondiente = 0.0;
  }

  const energiaPicoSinPros = entPico - recPico + genPico;
  const energiaRestoSinPros = entResto - recResto + genResto;
  const energiaValleSinPros = entValle - recValle + genValle;
  
  const energiaNetaPico = entPico - recPico;
  const energiaNetaResto = entResto - recResto;
  const energiaNetaValle = entValle - recValle;
  
  // PRECIO SIN PROSUMIDOR (Always the input values)
  const pSinProsPico = precioUnitarioPico;
  const pSinProsResto = precioUnitarioResto;
  const pSinProsValle = precioUnitarioValle;
  
  // PRECIO CON PROSUMIDOR
  const sumEnergiaNeta = energiaNetaPico + energiaNetaResto + energiaNetaValle;
  let pConProsPico, pConProsResto, pConProsValle;
  
  if (sumEnergiaNeta < 0) {
    pConProsPico = 0;
    pConProsResto = 0;
    pConProsValle = 0;
  } else {
    pConProsPico = pSinProsPico;
    pConProsResto = pSinProsResto;
    pConProsValle = pSinProsValle;
  }

  // IMPORTES CON PROSUMIDOR (Recalculated)
  const eaConsPicoConPros = pConProsPico * energiaNetaPico;
  const eaConsRestoConPros = pConProsResto * energiaNetaResto;
  const eaConsValleConPros = pConProsValle * energiaNetaValle;

  // IMPORTES SIN PROSUMIDOR
  const eaConsPicoSinPros = pSinProsPico * energiaPicoSinPros;
  const eaConsRestoSinPros = pSinProsResto * energiaRestoSinPros;
  const eaConsValleSinPros = pSinProsValle * energiaValleSinPros;
  
  const eaConsTotalSinPros = (cargoComercial + cargoCapSumPico + cargoCapSumFPico + cargoPotenciaPico) + eaConsPicoSinPros + eaConsRestoSinPros + eaConsValleSinPros;
  const subtotalConsumoEnergiaSinPros = eaConsTotalSinPros - recargoBonifFP; 
  
  // Rosario Tax Logic
  const Orden_Mun_1592_62 = data.isRosario ? 0.006 : 0;
  const Orden_Mun_1618_62 = data.isRosario ? 0.018 : 0;
  
  const Imp_ros_sin_gd = subtotalConsumoEnergiaSinPros * (Orden_Mun_1592_62 + Orden_Mun_1618_62);

  let totalImpuestosSinPros = (subtotalConsumoEnergiaSinPros * (ivaCorrespondiente + 0.06 + 0.015 + percepcionCorrespondiente)) + leyGD + (capGD * (1 + ivaCorrespondiente + percepcionCorrespondiente));
  totalImpuestosSinPros += Imp_ros_sin_gd;

  const subtotalGeneralSinPros = subtotalConsumoEnergiaSinPros + totalImpuestosSinPros;
  const totalPagarSinProsReal = subtotalGeneralSinPros; 

  // RECALCULO ESCENARIO CON PROSUMIDOR
  const eaConsTotalConPros = (cargoComercial + cargoCapSumPico + cargoCapSumFPico + cargoPotenciaPico) + eaConsPicoConPros + eaConsRestoConPros + eaConsValleConPros;
  const subtotalConsumoEnergiaConPros = eaConsTotalConPros - recargoBonifFP;
  
  const Imp_ros_con_gd = subtotalConsumoEnergiaConPros * (Orden_Mun_1592_62 + Orden_Mun_1618_62);

  let taxesPaidConPros = (subtotalConsumoEnergiaConPros * (ivaCorrespondiente + 0.06 + 0.015 + percepcionCorrespondiente)) + leyGD + (capGD * (1 + ivaCorrespondiente + percepcionCorrespondiente));
  taxesPaidConPros += Imp_ros_con_gd;

  const totalPagarConPros = subtotalConsumoEnergiaConPros + taxesPaidConPros - reconGSF_GD;

  const savingsTax = totalImpuestosSinPros - taxesPaidConPros;
  const savingsConsumption = subtotalConsumoEnergiaSinPros - subtotalConsumoEnergiaConPros;
  const savingsRecon = reconGSF_GD; 
  
  const termCO2 = (genResto + genValle + genPico) ;
  const co2 = 0.2306 * termCO2;
  const arboles = Math.round(safeDiv(co2, (10 / 12)));
  
  const totalSavings = totalPagarSinProsReal - totalPagarConPros;
  const totalSavingsPercent = safeDiv(totalSavings, totalPagarSinProsReal) * 100;
  
  const autoconsumoKwh = termCO2; 
  const totalGen = genPico + genResto + genValle;
  const autoconsumoPercent = safeDiv(autoconsumoKwh, totalGen) * 100;
  
  const totalEntregada = entPico + entResto + entValle;
  const totalInyectada = recPico + recResto + recValle;
  const totalConsumoReal = totalGen + totalEntregada - totalInyectada;
  const injectionPercent = safeDiv(totalGen, totalConsumoReal) * 100;
  const totalSinPros = totalPagar + savingsTax + savingsConsumption + savingsRecon

  return {
    type: 'GD', 
    billWithProsumers: totalPagar,
    billWithoutProsumers: totalSinPros,
    totalSavings: totalSavings,
    totalSavingsPercent: totalSavingsPercent,
    savingsConsumption: savingsConsumption,
    savingsTax: savingsTax,
    savingsRecon: savingsRecon,
    autoconsumoKwh: autoconsumoKwh,
    autoconsumoPercent: autoconsumoPercent,
    injectionPercent: injectionPercent,
    co2Avoided: co2,
    treesEquivalent: arboles,
    details: {
      "Precio Unitario Pico ($)": pSinProsPico,
      "Precio Unitario Resto ($)": pSinProsResto,
      "Precio Unitario Valle ($)": pSinProsValle,
      "Energía Pico Sin Pros (kWh)": energiaPicoSinPros,
      "Energía Resto Sin Pros (kWh)": energiaRestoSinPros,
      "Energía Valle Sin Pros (kWh)": energiaValleSinPros,
      "E. Activa Cons. Total Sin Pros ($)": eaConsTotalSinPros,
      "Subtotal Energía Sin Pros ($)": subtotalConsumoEnergiaSinPros,
      "Total Impuestos Sin Pros ($)": totalImpuestosSinPros,
      "Total a Pagar Sin Pros ($)": totalPagarSinProsReal,
      "Subtotal Energía Con Pros ($)": subtotalConsumoEnergiaConPros,
      "Total Impuestos Con Pros ($)": taxesPaidConPros,
      "Total a Pagar Con Pros ($)": totalPagarConPros,
      "Ahorro Consumo ($)": savingsConsumption,
      "Ahorro Impuestos ($)": savingsTax,
      "Ahorro Reconocimientos ($)": savingsRecon,
      "Energía Generada Total (kWh)": totalGen,
      "Autoconsumo Calculado (kWh)": autoconsumoKwh,
      "IVA Aplicado": `${(ivaCorrespondiente * 100).toFixed(1)}%`,
      "Percepción Aplicada": `${(percepcionCorrespondiente * 100).toFixed(1)}%`,
      ...(data.isRosario ? { "Tasa Mun. Rosario (0.6% + 1.8%)": "Aplicada" } : {})
    }
  };
};

export const calculateNoProsumidor = (data: NoProsumidorData): CalculationResult => {
  if (data.category === NoProsumidorCategory.GRAN_DEMANDA) {
    const gd = data.gdData;
    if (!gd) throw new Error("GD Data missing");
    
    const generacionPromedio = (gd.contractedPower * 1629.1) / 12;
    const lastRow = gd.consumptionTable[5] || { pico: 0, resto: 0, valle: 0 };
    const consumoTotalRealPico = lastRow.pico;
    const consumoTotalRealResto = lastRow.resto;
    const consumoTotalRealValle = lastRow.valle;
    const consumoTotalReal = consumoTotalRealPico + consumoTotalRealResto + consumoTotalRealValle;
    
    const energiaGeneradaPico = Math.ceil(generacionPromedio) * 0.08;
    const energiaGeneradaResto = Math.ceil(generacionPromedio) * 0.92;
    const energiaGeneradaValle = Math.ceil(generacionPromedio) * 0.0;
    
    const autoconsumoEstimado = 0.80;
    
    const energiaRecibidaParaPico = Math.ceil(energiaGeneradaPico * (1 - autoconsumoEstimado));
    const energiaRecibidaParaResto = Math.ceil(energiaGeneradaResto * (1 - autoconsumoEstimado));
    const energiaRecibidaParaValle = Math.ceil(energiaGeneradaValle * (1 - autoconsumoEstimado));
    const energiaRecibidaTotal = energiaRecibidaParaPico + energiaRecibidaParaResto + energiaRecibidaParaValle;
    
    let energiaEntregadaPico = consumoTotalRealPico + energiaRecibidaParaPico - energiaGeneradaPico;
    let energiaEntregadaResto = consumoTotalRealResto + energiaRecibidaParaResto - energiaGeneradaResto;
    let energiaEntregadaValle = consumoTotalRealValle + energiaRecibidaParaValle - energiaGeneradaValle;
    
    if (energiaEntregadaPico < 0) { energiaEntregadaResto += Math.abs(energiaEntregadaPico); energiaEntregadaPico = 0; }
    if (energiaEntregadaValle < 0) { energiaEntregadaResto += Math.abs(energiaEntregadaValle); energiaEntregadaValle = 0; }
    if (energiaEntregadaResto < 0) { energiaEntregadaResto = 0; }
    
    const eaConsPicoCPGD = energiaEntregadaPico * gd.eaConsPicoPrice;
    const eaConsRestoCPGD = energiaEntregadaResto * gd.eaConsRestoPrice;
    const eaConsValleCPGD = energiaEntregadaValle * gd.eaConsVallePrice;
    
    const sumCargosFijos = gd.cargoComercial + gd.cargoCapSumPico + gd.cargoCapSumFPico + gd.cargoPotAdqPico;
    const subtotalConsumoEnergiaCPGD = (eaConsPicoCPGD + eaConsRestoCPGD + eaConsValleCPGD) + sumCargosFijos - gd.energiaReactivaAmount;
    
    const reconEPESF_CPGD = energiaRecibidaTotal * gd.eaConsRestoPrice;
    const baseImpuestosCPGD = subtotalConsumoEnergiaCPGD - reconEPESF_CPGD;
    
    let ivaRate = 0.27; let percepcionRate = 0.03;
    if (gd.taxStatus === 'Responsable Inscripto') { ivaRate = 0.27; percepcionRate = 0.03; }
    else if (gd.taxStatus === 'Responsable Inscripto Agente Percepción') { ivaRate = 0.27; percepcionRate = 0.0; }
    else if (gd.taxStatus === 'Exento') { ivaRate = 0.21; percepcionRate = 0.0; }
    
    const totalImpuestosCPGD = (ivaRate + 0.06 + 0.015 + percepcionRate) * baseImpuestosCPGD + (gd.cap * (1 + ivaRate + percepcionRate)) + gd.ley12692;
    const reconGSF = (energiaGeneradaResto + energiaGeneradaPico + energiaGeneradaValle) * 34.93;
    const totalPagarCPGD = baseImpuestosCPGD + totalImpuestosCPGD - reconGSF;
    
    const ahorroReconEPE = reconEPESF_CPGD;
    const ahorroReconGSF = reconGSF;
    const ahorroAutoconsumo = gd.subtotalEnergiaAmount - subtotalConsumoEnergiaCPGD; 
    const ahorroImpuestos = (gd.totalToPay - gd.subtotalEnergiaAmount) - totalImpuestosCPGD;
    const ahorroTotal = ahorroReconEPE + ahorroReconGSF + ahorroAutoconsumo + ahorroImpuestos;
    
    const co2 = 0.2306 * (energiaGeneradaResto + energiaGeneradaValle + energiaGeneradaPico);
    const energiaGen = energiaGeneradaResto + energiaGeneradaValle + energiaGeneradaPico;

    const autoconsumoKwh = energiaGen - energiaRecibidaTotal;
    const autoconsumoPercent = safeDiv(autoconsumoKwh, energiaGen) * 100;
    
    const totalEntregada = energiaEntregadaPico + energiaEntregadaResto + energiaEntregadaValle;
    const totalInyectada = energiaRecibidaTotal;
    const totalConsumoReal = energiaGen + totalEntregada - totalInyectada;
    const injectionPercent = safeDiv(energiaGen, totalConsumoReal) * 100;

    return {
      type: 'GD',
      billWithProsumers: totalPagarCPGD,
      billWithoutProsumers: gd.totalToPay,
      totalSavings: ahorroTotal,
      totalSavingsPercent: safeDiv(ahorroTotal, gd.totalToPay) * 100,
      savingsConsumption: ahorroAutoconsumo,
      savingsTax: ahorroImpuestos,
      savingsRecon: ahorroReconEPE + ahorroReconGSF,
      autoconsumoKwh: autoconsumoKwh,
      autoconsumoPercent: autoconsumoPercent,
      injectionPercent: injectionPercent,
      co2Avoided: co2,
      treesEquivalent: Math.round(co2 / (10/12)),
      details: { 
        "Potencia Contratada (kW)": gd.contractedPower,
        "Generación Promedio (kWh)": generacionPromedio,
        "Generada Pico (kWh)": energiaGeneradaPico,
        "Generada Resto (kWh)": energiaGeneradaResto,
        "Generada Valle (kWh)": energiaGeneradaValle,
        "Recibida Total (kWh)": energiaRecibidaTotal,
        "Entregada Pico (kWh)": energiaEntregadaPico,
        "Entregada Resto (kWh)": energiaEntregadaResto,
        "Entregada Valle (kWh)": energiaEntregadaValle,
        "Subtotal Energía Simulado ($)": subtotalConsumoEnergiaCPGD,
        "Reconocimiento EPE ($)": reconEPESF_CPGD,
        "Base Imponible Simulada ($)": baseImpuestosCPGD,
        "Impuestos Simulados ($)": totalImpuestosCPGD,
        "Reconocimiento GSF ($)": reconGSF,
        "Factura Simulada ($)": totalPagarCPGD,
        "Factura Actual ($)": gd.totalToPay,
        "Ahorro Recon EPE ($)": ahorroReconEPE,
        "Ahorro Recon GSF ($)": ahorroReconGSF,
        "Ahorro Autoconsumo ($)": ahorroAutoconsumo,
        "Ahorro Impuestos ($)": ahorroImpuestos
      }
    };
  }

  const { category, consumptionHistory, totalConsumption, serviceQuota, bands, cap, ley12692, taxStatus, totalBill } = data;
  const config = CALCULATOR_CONSTANTS[category];
  const AUTO_CONST = config.autoconsumo;
  const RECON_UNIT = config.reconUnit;
  const GSF_UNIT = config.gsfUnit;

  let IVA_correspondiente = 0.21;
  let Percepcion_correspondiente = 0;
  switch (taxStatus) {
    case TaxStatus.RESPONSABLE_INSCRIPTO: IVA_correspondiente = 0.3; break;
    case TaxStatus.CONSUMIDOR_FINAL: IVA_correspondiente = 0.21; break;
    case TaxStatus.MONOTRIBUTO: IVA_correspondiente = 0.27; break;
    case TaxStatus.SUJETO_NO_CATEGORIZADO: IVA_correspondiente = 0.27; Percepcion_correspondiente = 0.135; break;
    case TaxStatus.EXENTO: IVA_correspondiente = 0.21; break;
  }

  const subtotalBasicoSinPros = bands.reduce((sum, b) => sum + b.amount, 0) + serviceQuota;
  const importeFacturaSinPros = totalBill;
  const impuestosSinPros = importeFacturaSinPros - subtotalBasicoSinPros;
  const sumHistory = consumptionHistory.reduce((a, b) => a + b, 0);
  const estimacionPotenciaMax = sumHistory / 1629;
  const generacionPromedio = estimacionPotenciaMax * (1629 / 6);
  const energiaGenerada = Math.ceil(generacionPromedio);
  const energiaRecibida = energiaGenerada * (1 - AUTO_CONST);
  const autoconsumo2 = energiaGenerada - energiaRecibida;

  let precioUnitario = 0; let iteraciones = 0; let energiasUtilizadas = 0;
  const reversedBands = [...bands].reverse();
  let found = false; let currentAccEnergy = 0;
  for (let i = 0; i < reversedBands.length; i++) {
    currentAccEnergy += reversedBands[i].energy;
    if ((currentAccEnergy - autoconsumo2) > 0) { precioUnitario = safeDiv(reversedBands[i].amount, reversedBands[i].energy); iteraciones = i + 1; energiasUtilizadas = currentAccEnergy; found = true; break; }
  }
  if (!found && reversedBands.length > 0) { precioUnitario = safeDiv(reversedBands[0].amount, reversedBands[0].energy); iteraciones = reversedBands.length; energiasUtilizadas = reversedBands[0].energy; }

  const energiaUltimaBandaConPros = energiasUtilizadas - autoconsumo2;
  const limitIndex = Math.max(0, (bands.length - iteraciones + 1) - 1);
  const subtotalBasicoConProsumidores = serviceQuota + bands.slice(0, limitIndex).reduce((sum, b) => sum + b.amount, 0) + (precioUnitario * energiaUltimaBandaConPros);
  
  const reconocimientoEPE = RECON_UNIT * energiaRecibida;
  const baseImponible = subtotalBasicoConProsumidores - reconocimientoEPE;
  
  const isRosarioApplicable = data.isRosario && (category === NoProsumidorCategory.RESIDENCIAL || category === NoProsumidorCategory.COMERCIAL || category === NoProsumidorCategory.INDUSTRIAL);
  const Orden_Mun_1592_62 = isRosarioApplicable ? 0.006 : 0;
  const Orden_Mun_1618_62 = isRosarioApplicable ? 0.018 : 0;
  const Imp_ros_con = (baseImponible && !isNaN(baseImponible)) ? baseImponible * (Orden_Mun_1592_62 + Orden_Mun_1618_62) : 0;

  let impuestosConPros = (baseImponible * (IVA_correspondiente + 0.06 + 0.015)) + (cap * (1 + IVA_correspondiente)) + ley12692 + Percepcion_correspondiente;
  
  impuestosConPros = impuestosConPros + Imp_ros_con;

  const reconocimientoGSF = GSF_UNIT * energiaRecibida;
  const facturaConPros = (baseImponible + impuestosConPros - reconocimientoGSF) * (1 + Percepcion_correspondiente);
  const ahorroTotal = importeFacturaSinPros - facturaConPros;
  const co2 = energiaGenerada * 0.2306;

  const autoconsumoPercent = safeDiv(autoconsumo2, energiaGenerada) * 100;
  
  const totalConsumoReal = bands.reduce((sum, b) => sum + b.energy, 0);
  const injectionPercent = safeDiv(energiaGenerada, totalConsumoReal) * 100;

  return {
    type: 'NO_PROSUMIDOR',
    billWithProsumers: facturaConPros,
    billWithoutProsumers: importeFacturaSinPros,
    totalSavings: ahorroTotal,
    totalSavingsPercent: safeDiv(ahorroTotal, importeFacturaSinPros) * 100,
    savingsConsumption: subtotalBasicoSinPros - subtotalBasicoConProsumidores,
    savingsTax: ahorroTotal - (subtotalBasicoSinPros - subtotalBasicoConProsumidores) - (reconocimientoEPE + reconocimientoGSF),
    savingsRecon: reconocimientoEPE + reconocimientoGSF,
    autoconsumoKwh: autoconsumo2,
    autoconsumoPercent: autoconsumoPercent,
    injectionPercent: injectionPercent,
    co2Avoided: co2,
    treesEquivalent: Math.round(co2 / (10/12)),
    details: { 
      "Potencia Estimada (kW)": estimacionPotenciaMax,
      "Generación Estimada (kWh)": energiaGenerada,
      "Autoconsumo Estimado (kWh)": autoconsumo2,
      "Energía Recibida Estimada (kWh)": energiaRecibida,
      "Subtotal Básico Actual ($)": subtotalBasicoSinPros,
      "Impuestos Actuales ($)": impuestosSinPros,
      "Factura Actual ($)": importeFacturaSinPros,
      "Subtotal Básico Simulado ($)": subtotalBasicoConProsumidores,
      "Reconocimiento EPE ($)": reconocimientoEPE,
      "Base Imponible Simulada ($)": baseImponible,
      "Impuestos Simulados ($)": impuestosConPros,
      "Reconocimiento GSF ($)": reconocimientoGSF,
      "Factura Simulada ($)": facturaConPros,
      "Ahorro Autoconsumo ($)": subtotalBasicoSinPros - subtotalBasicoConProsumidores,
      "Ahorro Impuestos ($)": impuestosSinPros - impuestosConPros,
      "Ahorro Reconocimientos ($)": reconocimientoEPE + reconocimientoGSF,
      ...(data.isRosario && (category === NoProsumidorCategory.RESIDENCIAL || category === NoProsumidorCategory.COMERCIAL || category === NoProsumidorCategory.INDUSTRIAL) ? { "Tasa Mun. Rosario (0.6% + 1.8%)": "Aplicada" } : {})
    }
  };
};
