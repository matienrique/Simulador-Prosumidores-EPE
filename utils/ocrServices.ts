import { GoogleGenAI, Type } from '@google/genai';

export const getAiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      'GEMINI_API_KEY no está configurada en las variables de entorno. Si estás en Vercel, por favor agregala en Settings > Environment Variables.'
    );
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
};

const candidateModels = [
  'gemini-3.5-flash',
  'gemini-3.5-flash-lite',
  'gemini-3.6-flash',
  'gemini-flash-lite-latest',
];

async function generateWithFallback(
  ai: GoogleGenAI,
  parts: any[],
  schemaConfig: any,
  logPrefix: string
): Promise<string> {
  let rawText = '';
  let lastError: any = null;

  for (const model of candidateModels) {
    try {
      console.log(`[${logPrefix}] Intentando extracción con modelo: ${model}...`);
      const response = await ai.models.generateContent({
        model,
        contents: { parts },
        config: {
          responseMimeType: 'application/json',
          responseSchema: schemaConfig,
        },
      });

      rawText = response.text || '';
      if (rawText) {
        console.log(`[${logPrefix}] Extracción exitosa con modelo: ${model}`);
        break;
      }
    } catch (err: any) {
      console.warn(`[${logPrefix}] Error con modelo ${model}:`, err?.message || err);
      lastError = err;
    }
  }

  if (!rawText) {
    throw lastError || new Error('No se pudo procesar la factura con los modelos de IA disponibles.');
  }

  let cleanJson = rawText.trim();
  if (cleanJson.startsWith('```')) {
    cleanJson = cleanJson.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
  }

  return cleanJson;
}

// 1. Prosumidor (Pequeña Demanda)
export async function extractProsumidorInvoice(imageBase64: string, mimeType: string) {
  const ai = getAiClient();

  const promptText = `
Analiza minuciosamente esta factura de energía eléctrica de la EPE (Empresa Provincial de la Energía de Santa Fe) perteneciente a un usuario Prosumidor (Pequeña Demanda: Residencial, Comercial, Industrial o Asociaciones).

Extrae los siguientes campos con la máxima exactitud numérica:
1. "eg": Energía Generada (EG) en kWh. En la factura, en el apartado "Información de medición y lectura", este valor se corresponde con el PRIMER valor que aparece en la columna "Consumo" (medición de generación solar). REGLA FUNDAMENTAL: Es un valor REDONDO Y ENTERO, NUNCA decimal. En las facturas de la EPE, el punto (.) se utiliza como separador de miles (por ejemplo "15.000" representa quince mil kWh, es decir 15000, y NUNCA 15 o 15,000; "1.250" representa 1250 kWh). Debes devolver siempre el número entero sin puntos de miles (ej: 15000, 1250, 480).
2. "ee": Energía Entregada (EE) en kWh. En la factura, en el apartado "Información de medición y lectura", este valor se corresponde con el SEGUNDO valor que aparece en la columna "Consumo" (energía provista por la red EPE). REGLA FUNDAMENTAL: Es un valor REDONDO Y ENTERO, NUNCA decimal. El punto (.) es separador de miles ("15.000" es 15000). Debes devolver siempre el número entero sin puntos de miles.
3. "er": Energía Recibida / Inyectada (ER) en kWh. En la factura, en el apartado "Información de medición y lectura", este valor se corresponde con el TERCER valor que aparece en la columna "Consumo" (energía inyectada a la red). REGLA FUNDAMENTAL: Es un valor REDONDO Y ENTERO, NUNCA decimal. El punto (.) es separador de miles ("15.000" es 15000). Debes devolver siempre el número entero sin puntos de miles.
4. "serviceQuota": Cuota de servicio o cargo fijo final en pesos ($).
5. "bands": Lista de bloques o bandas de consumo de energía activa.
   - Cada banda debe tener "energy" (consumo en kWh de esa banda) y "amount" (importe en pesos $ correspondiente a esa banda).
   - Si en la factura figura por ejemplo "Primeros 300 kWh a $X", esa es una banda. Si solo hay un importe general de energía activa, ponlo como una sola banda.
6. "reconEPE": Reconocimiento EPE ($), compensación o crédito facturado por la EPE por la energía inyectada.
7. "reconGSF": Reconocimiento del Gobierno de la Provincia de Santa Fe ($) (Incentivo Provincial Prosumidores 4.0).
   UBICACIÓN FUNDAMENTAL: En la factura de Prosumidores (Pequeña Demanda), este valor se encuentra DEBAJO DE TODO (al final) en la sección "Detalle de Facturación". Puede figurar como "Reconocimiento G.S.F.", "Recon. Gobierno de Santa Fe", "Reconocimiento Gob. Santa Fe", "Incentivo Provincial Prosumidores", "Cancela. Fact. PROSUMIDOR", etc.
   Extrae con precisión el importe numérico que aparece a su costado en esa línea final del Detalle de Facturación.
   Si en la factura figura como un crédito con signo negativo (por ejemplo "-1234.56" o "1234.56-"), debes devolver siempre el valor como un número POSITIVO (absoluto, ej: 1234.56). Si no figura o es cero, pon 0.
8. "cap": Cuota de Alumbrado Público (CAP) en pesos ($).
9. "ley12692": Fondo de Energías Renovables Ley 12692 en pesos ($).
10. "ley7797": Importe en pesos ($) correspondiente a la Ley N° 7797 (o "Ley 7797", "Cuota Alumbrado Público Ley 7797", etc.) que figure en el Detalle de Facturación. Si no aparece el detalle de la misma o su monto es cero, pon 0.
11. "totalBill": Importe total a pagar de la factura en pesos ($).
12. "isRosario": true si el suministro, domicilio o localidad es de la ciudad de Rosario; false en caso contrario.
13. "taxStatus": Condición fiscal del cliente ante el IVA. Debe coincidir exactamente con una de estas opciones:
    - 'Consumidor final'
    - 'Responsable Inscripto'
    - 'Monotributo'
    - 'Sujeto NO categorizado'
    - 'Exento'
14. "program": '4.0' si corresponde a Prosumidores 4.0 (o si tiene Reconocimiento GSF), o 'anterior' si indica programas previos (ERA, Prosumidores 2).

Si algún valor monetario o energético no aparece o no aplica en la factura, asígnale 0.
`;

  const schemaConfig = {
    type: Type.OBJECT,
    properties: {
      eg: { type: Type.INTEGER, description: 'Energía Generada (kWh) - Número ENTERO redondo sin decimales (15.000 = 15000)' },
      ee: { type: Type.INTEGER, description: 'Energía Entregada (kWh) - Número ENTERO redondo sin decimales (15.000 = 15000)' },
      er: { type: Type.INTEGER, description: 'Energía Recibida (kWh) - Número ENTERO redondo sin decimales (15.000 = 15000)' },
      serviceQuota: { type: Type.NUMBER, description: 'Cuota de servicio o cargo fijo ($)' },
      bands: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            energy: { type: Type.NUMBER, description: 'Energía en kWh' },
            amount: { type: Type.NUMBER, description: 'Importe en pesos ($)' },
          },
          required: ['energy', 'amount'],
        },
        description: 'Bandas de consumo de energía activa',
      },
      reconEPE: { type: Type.NUMBER, description: 'Reconocimiento EPE ($)' },
      reconGSF: { type: Type.NUMBER, description: 'Reconocimiento del Gobierno ($). Se encuentra debajo de todo en la sección Detalle de Facturación. Devolver número positivo.' },
      cap: { type: Type.NUMBER, description: 'Cuota Alumbrado Público CAP ($)' },
      ley12692: { type: Type.NUMBER, description: 'Ley 12692 ($)' },
      ley7797: { type: Type.NUMBER, description: 'Importe Ley 7797 ($). 0 si no figura o es 0.' },
      totalBill: { type: Type.NUMBER, description: 'Total a Pagar de la Factura ($)' },
      isRosario: { type: Type.BOOLEAN, description: 'Si el suministro está en Rosario' },
      taxStatus: { type: Type.STRING, description: 'Condición fiscal ante el IVA' },
      program: { type: Type.STRING, description: "'4.0' o 'anterior'" },
    },
    required: [
      'eg',
      'ee',
      'er',
      'serviceQuota',
      'bands',
      'reconEPE',
      'reconGSF',
      'cap',
      'ley12692',
      'ley7797',
      'totalBill',
      'isRosario',
      'taxStatus',
      'program',
    ],
  };

  const parts = [
    {
      inlineData: {
        data: imageBase64,
        mimeType: mimeType,
      },
    },
    { text: promptText },
  ];

  const cleanJson = await generateWithFallback(ai, parts, schemaConfig, 'InvoiceScanner');
  const parsedData = JSON.parse(cleanJson);
  const ley7797Amount = typeof parsedData.ley7797 === 'number' ? parsedData.ley7797 : 0;
  parsedData.aplicaLey7797 = ley7797Amount > 0;

  // Garantizar valores enteros y redondos para eg, ee y er (consumo sin decimales)
  const cleanInteger = (val: any) => {
    if (typeof val === 'number') {
      return Math.round(val);
    }
    if (typeof val === 'string') {
      const cleaned = val.replace(/\./g, '').replace(/,/g, '.');
      const num = parseFloat(cleaned);
      return isNaN(num) ? 0 : Math.round(num);
    }
    return 0;
  };

  parsedData.eg = cleanInteger(parsedData.eg);
  parsedData.ee = cleanInteger(parsedData.ee);
  parsedData.er = cleanInteger(parsedData.er);

  // Normalizar reconGSF como valor positivo (Incentivo Gobierno de Santa Fe)
  if (typeof parsedData.reconGSF === 'number') {
    parsedData.reconGSF = Math.abs(parsedData.reconGSF);
  } else if (typeof (parsedData as any).reconGSF === 'string') {
    const cleaned = (parsedData as any).reconGSF.replace(/\./g, '').replace(/,/g, '.').replace(/-/g, '');
    const num = parseFloat(cleaned);
    parsedData.reconGSF = isNaN(num) ? 0 : Math.abs(num);
  }
  if (parsedData.reconGSF > 0) {
    parsedData.program = '4.0';
  }

  return parsedData;
}

// 2. Prosumidor Gran Demanda (GD)
export async function extractProsumidorGDInvoice(fileList: Array<{ imageBase64: string; mimeType: string }>) {
  const ai = getAiClient();

  const promptText = `
Analiza minuciosamente esta factura de energía eléctrica de la EPE (Empresa Provincial de la Energía de Santa Fe) perteneciente a un usuario PROSUMIDOR de GRAN DEMANDA (Grandes Demandas / Tarifa 2).
En las facturas de Gran Demanda Prosumidor, los datos suelen distribuirse en 2 páginas o secciones (Hoja 1: Resumen, conceptos Prosumidores y Detalle de Facturación; Hoja 2: Detalle de componentes del importe básico y mediciones).

Extrae los siguientes campos con la máxima precisión numérica:
1. "contractedPower": Potencia contratada en kW (si figuran dos valores de potencia contratada, extrae el mayor de ambos).
2. Componentes del importe básico / Cargos por potencia y energía activa:
   - "cargoComercial": Cargo Comercial ($).
   - "subtotalCargoComercial": Subtotal Cargo Comercial ($) si figura, o el mismo que cargoComercial.
   - "cargoCapSumPico": Cargo Capacidad de Suministro Pico ($).
   - "cargoCapSumFPico": Cargo Capacidad de Suministro Fuera de Pico ($).
   - "cargoPotenciaPico": Cargo por Potencia Adquirida Pico o Cargo por Potencia Pico ($).
   - "eaConsPico": Consumo activo facturado en Horario Pico en kWh.
   - "precioUnitarioPico": Precio unitario en horario pico ($/kWh).
   - "eaConsResto": Consumo activo facturado en Horario Resto en kWh.
   - "precioUnitarioResto": Precio unitario en horario resto ($/kWh).
   - "eaConsValle": Consumo activo facturado en Horario Valle en kWh.
   - "precioUnitarioValle": Precio unitario en horario valle ($/kWh).
   - "recargoBonifFP": Recargo o Bonificación por Factor de Potencia (Energía Reactiva) en pesos ($). Si figura como bonificación (con signo negativo o menos al final), devuelve un número negativo. Si es recargo, positivo.
   - "subtotalConsumoEnergia": Subtotal consumo de energía activa ($).
   - "subtotalGeneral": Subtotal general / Importe básico ($).
3. Conceptos Prosumidores y "Detalle de Facturación" (REGLA FUNDAMENTAL):
   En el apartado "Detalle de Facturación" de la factura de Gran Demanda Prosumidor, extrae exactamente el importe que aparece a su costado para los siguientes conceptos:
   - "capGD": "Cuota de alumbrado publico ($)" (o "Cuota de Alumbrado Público", "C.A.P."). Extrae el importe que aparece a su costado en pesos ($). Si no figura, pon 0.
   - "leyGD": "Ley 12692" (o Fondo Renovables Ley 12692). Extrae el importe que aparece a su costado en pesos ($). Si no figura, pon 0.
   - "reconGSF_GD": "Cancela. Fact. PROSUMIDOR MAX". En el "Detalle de Facturación" aparece con ese nombre exacto ("Cancela. Fact. PROSUMIDOR MAX"). Extrae el importe numérico que figura a su costado en pesos ($) como valor positivo. Si no figura o no aplica, pon 0.
   - "resolucion976": "Resolución 976" (o "Resolucion 976"). En el "Detalle de Facturación" aparece con ese nombre. Extrae el importe que figura a su costado en pesos ($). Si no figura, pon 0.
   - "reconEPE_GD": Reconocimiento EPE ($). Si en la factura figura como crédito/descuento por energía inyectada, extrae el monto como número positivo.
4. Mediciones de Energía en Bloque Horario (Información de medición y lectura):
   - Entregada / Consumida de la red (kWh): "entPico", "entResto", "entValle".
   - Recibida / Inyectada a la red (kWh): "recPico", "recResto", "recValle".
   - Generada (solar/propia) (kWh): "genPico", "genResto", "genValle". Si no figura desagregado por bloque, pon 0 en los que falten.
5. Otros cargos e impuestos:
   - "ley7797": Importe en pesos ($) correspondiente a la Ley N° 7797 (o "Ley 7797") que figure en el Detalle de Facturación. Si no aparece el detalle de la misma o su monto es cero, pon 0.
   - "totalPagar": Total a Pagar Vencimiento ($ importe final total a pagar de la factura).
   - "program": '4.0' si figura "Cancela. Fact. PROSUMIDOR MAX" o Prosumidores 4.0; 'anterior' si indica programa previo (ERA, Prosumidores 2).
6. "isRosario": true si el suministro, domicilio o localidad es de Rosario; false en caso contrario.
7. "taxStatus": Condición fiscal del cliente ante el IVA ('Responsable Inscripto', 'Responsable Inscripto Agente Percepción', 'Exento').

Si algún valor monetario o energético no aparece o no aplica en la factura, asígnale 0.
`;

  const gdSchemaConfig = {
    type: Type.OBJECT,
    properties: {
      contractedPower: { type: Type.NUMBER, description: 'Potencia contratada en kW' },
      subtotalCargoComercial: { type: Type.NUMBER, description: 'Subtotal Cargo Comercial ($)' },
      cargoCapSumPico: { type: Type.NUMBER, description: 'Cargo Capacidad Suministro Pico ($)' },
      cargoCapSumFPico: { type: Type.NUMBER, description: 'Cargo Capacidad Suministro F. Pico ($)' },
      cargoPotenciaPico: { type: Type.NUMBER, description: 'Cargo Potencia Pico ($)' },
      eaConsPico: { type: Type.NUMBER, description: 'Consumo kWh Pico facturado' },
      precioUnitarioPico: { type: Type.NUMBER, description: 'Precio unitario $/kWh Pico' },
      eaConsResto: { type: Type.NUMBER, description: 'Consumo kWh Resto facturado' },
      precioUnitarioResto: { type: Type.NUMBER, description: 'Precio unitario $/kWh Resto' },
      eaConsValle: { type: Type.NUMBER, description: 'Consumo kWh Valle facturado' },
      precioUnitarioValle: { type: Type.NUMBER, description: 'Precio unitario $/kWh Valle' },
      recargoBonifFP: { type: Type.NUMBER, description: 'Recargo / Bonif FP ($)' },
      subtotalConsumoEnergia: { type: Type.NUMBER, description: 'Subtotal consumo energía activa ($)' },
      subtotalGeneral: { type: Type.NUMBER, description: 'Subtotal general ($)' },
      reconEPE_GD: { type: Type.NUMBER, description: 'Reconocimiento EPE ($)' },
      reconGSF_GD: { type: Type.NUMBER, description: 'Cancela. Fact. PROSUMIDOR MAX ($) en Detalle de Facturación' },
      capGD: { type: Type.NUMBER, description: 'Cuota de alumbrado publico ($) en Detalle de Facturación' },
      leyGD: { type: Type.NUMBER, description: 'Ley 12692 ($) en Detalle de Facturación' },
      resolucion976: { type: Type.NUMBER, description: 'Resolución 976 ($) en Detalle de Facturación' },
      ley7797: { type: Type.NUMBER, description: 'Importe Ley 7797 ($). 0 si no figura o es 0.' },
      totalPagar: { type: Type.NUMBER, description: 'Total a pagar de la factura ($)' },
      program: { type: Type.STRING, description: "'4.0' o 'anterior'" },
      isRosario: { type: Type.BOOLEAN, description: 'Si el suministro está en Rosario' },
      taxStatus: { type: Type.STRING, description: 'Condición fiscal ante el IVA' },
      cargoComercial: { type: Type.NUMBER, description: 'Cargo Comercial ($)' },
      entPico: { type: Type.NUMBER, description: 'Energía Entregada Pico (kWh)' },
      entResto: { type: Type.NUMBER, description: 'Energía Entregada Resto (kWh)' },
      entValle: { type: Type.NUMBER, description: 'Energía Entregada Valle (kWh)' },
      recPico: { type: Type.NUMBER, description: 'Energía Recibida/Inyectada Pico (kWh)' },
      recResto: { type: Type.NUMBER, description: 'Energía Recibida/Inyectada Resto (kWh)' },
      recValle: { type: Type.NUMBER, description: 'Energía Recibida/Inyectada Valle (kWh)' },
      genPico: { type: Type.NUMBER, description: 'Energía Generada Pico (kWh)' },
      genResto: { type: Type.NUMBER, description: 'Energía Generada Resto (kWh)' },
      genValle: { type: Type.NUMBER, description: 'Energía Generada Valle (kWh)' },
    },
    required: [
      'contractedPower',
      'reconEPE_GD',
      'reconGSF_GD',
      'capGD',
      'leyGD',
      'resolucion976',
      'isRosario',
      'taxStatus',
      'cargoComercial',
      'cargoCapSumPico',
      'cargoCapSumFPico',
      'cargoPotenciaPico',
      'eaConsPico',
      'precioUnitarioPico',
      'eaConsResto',
      'precioUnitarioResto',
      'eaConsValle',
      'precioUnitarioValle',
      'recargoBonifFP',
      'subtotalConsumoEnergia',
      'subtotalGeneral',
      'totalPagar',
      'entPico',
      'entResto',
      'entValle',
      'recPico',
      'recResto',
      'recValle',
      'genPico',
      'genResto',
      'genValle',
    ],
  };

  const parts: any[] = fileList.map((f) => ({
    inlineData: {
      data: f.imageBase64,
      mimeType: f.mimeType,
    },
  }));
  parts.push({ text: promptText });

  const cleanJson = await generateWithFallback(ai, parts, gdSchemaConfig, 'InvoiceScannerGD');
  const parsedData = JSON.parse(cleanJson);
  const ley7797Amount = typeof parsedData.ley7797 === 'number' ? parsedData.ley7797 : 0;
  parsedData.aplicaLey7797 = ley7797Amount > 0;

  // Normalizations for Detalle de Facturación fields
  if (typeof parsedData.reconGSF_GD === 'number') {
    parsedData.reconGSF_GD = Math.abs(parsedData.reconGSF_GD);
  }
  if (typeof (parsedData as any).cap === 'number' && typeof parsedData.capGD !== 'number') {
    parsedData.capGD = (parsedData as any).cap;
  }
  if (typeof (parsedData as any).ley12692 === 'number' && typeof parsedData.leyGD !== 'number') {
    parsedData.leyGD = (parsedData as any).ley12692;
  }
  if (typeof (parsedData as any).cancelaFactProsumidorMax === 'number' && typeof parsedData.reconGSF_GD !== 'number') {
    parsedData.reconGSF_GD = Math.abs((parsedData as any).cancelaFactProsumidorMax);
  }

  return parsedData;
}

// 3. No Prosumidor (Pequeña Demanda)
export async function extractNoProsumidorInvoice(fileList: Array<{ imageBase64: string; mimeType: string }>) {
  const ai = getAiClient();

  const promptText = `
Analiza minuciosamente esta factura de energía eléctrica de la EPE (Empresa Provincial de la Energía de Santa Fe) perteneciente a un usuario NO Prosumidor (Pequeña Demanda: Residencial, Comercial, Industrial o Asociaciones).

Extrae los siguientes campos con la máxima precisión numérica:
1. "totalConsumption": Consumo total de energía activa en kWh del período facturado.
2. "consumptionHistory": Lista de exactamente 6 números con los consumos históricos en kWh de los últimos 6 bimestres que figuran en el gráfico o historial de consumos de la factura (ordenados cronológicamente desde el más antiguo al más reciente, o los 6 bimestres que aparezcan). Si hay menos de 6, completa con 0s hasta tener 6 números.
3. "serviceQuota": Cuota de servicio o cargo fijo final en pesos ($).
4. "bands": Lista de bloques o bandas de consumo de energía activa.
   - Cada banda debe tener "energy" (consumo en kWh de esa banda) y "amount" (importe en pesos $ correspondiente a esa banda).
   - Si en la factura figura por ejemplo "Primeros 300 kWh a $X", esa es una banda. Si solo hay un importe general de energía activa, ponlo como una sola banda.
5. "cap": Cuota de Alumbrado Público (CAP) en pesos ($).
6. "ley12692": Fondo de Energías Renovables Ley 12692 en pesos ($).
7. "ley7797": Importe en pesos ($) correspondiente a la Ley N° 7797 (o "Ley 7797", "Cuota Alumbrado Público Ley 7797", etc.) que figure en el Detalle de Facturación. Si no aparece el detalle de la misma o su monto es cero, pon 0.
8. "totalBill": Importe total a pagar de la factura en pesos ($).
9. "isRosario": true si el suministro, domicilio o localidad es de la ciudad de Rosario; false en caso contrario.
10. "taxStatus": Condición fiscal del cliente ante el IVA. Debe coincidir exactamente con una de estas opciones:
   - 'Consumidor final'
   - 'Responsable Inscripto'
   - 'Monotributo'
   - 'Sujeto NO categorizado'
   - 'Exento'

Si algún valor monetario o energético no aparece o no aplica en la factura, asígnale 0.
`;

  const noProsSchemaConfig = {
    type: Type.OBJECT,
    properties: {
      totalConsumption: { type: Type.NUMBER, description: 'Consumo total (kWh)' },
      consumptionHistory: {
        type: Type.ARRAY,
        items: { type: Type.NUMBER },
        description: 'Historial de consumos de los 6 bimestres (kWh)',
      },
      serviceQuota: { type: Type.NUMBER, description: 'Cuota de servicio ($)' },
      bands: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            energy: { type: Type.NUMBER, description: 'Energía en kWh' },
            amount: { type: Type.NUMBER, description: 'Importe en pesos ($)' },
          },
          required: ['energy', 'amount'],
        },
        description: 'Bandas de consumo de energía activa',
      },
      cap: { type: Type.NUMBER, description: 'Cuota Alumbrado Público CAP ($)' },
      ley12692: { type: Type.NUMBER, description: 'Ley 12692 ($)' },
      ley7797: { type: Type.NUMBER, description: 'Importe Ley 7797 ($). 0 si no figura o es 0.' },
      totalBill: { type: Type.NUMBER, description: 'Total a Pagar de la Factura ($)' },
      isRosario: { type: Type.BOOLEAN, description: 'Si el suministro está en Rosario' },
      taxStatus: { type: Type.STRING, description: 'Condición fiscal ante el IVA' },
    },
    required: [
      'totalConsumption',
      'consumptionHistory',
      'serviceQuota',
      'bands',
      'cap',
      'ley12692',
      'ley7797',
      'totalBill',
      'isRosario',
      'taxStatus',
    ],
  };

  const parts: any[] = fileList.map((f) => ({
    inlineData: {
      data: f.imageBase64,
      mimeType: f.mimeType,
    },
  }));
  parts.push({ text: promptText });

  const cleanJson = await generateWithFallback(ai, parts, noProsSchemaConfig, 'InvoiceScannerNoPros');
  const parsedData = JSON.parse(cleanJson);
  const ley7797Amount = typeof parsedData.ley7797 === 'number' ? parsedData.ley7797 : 0;
  parsedData.aplicaLey7797 = ley7797Amount > 0;
  return parsedData;
}

// 4. No Prosumidor Gran Demanda (GD)
export async function extractNoProsumidorGDInvoice(fileList: Array<{ imageBase64: string; mimeType: string }>) {
  const ai = getAiClient();

  const promptText = `
Analiza minuciosamente esta factura de energía eléctrica de la EPE (Empresa Provincial de la Energía de Santa Fe) perteneciente a un usuario NO Prosumidor de GRAN DEMANDA (Grandes Demandas / Tarifa 2).
En las facturas de Gran Demanda, los datos suelen distribuirse en 2 páginas o secciones (Hoja 1: Resumen y conceptos generales; Hoja 2: Detalle de componentes del importe básico y tabla de historia de consumo).

Extrae los siguientes campos con la máxima precisión numérica:
1. "contractedPower": Potencia contratada pico / fuera de pico en kW (si figuran dos valores de potencia contratada, extrae el mayor de ambos).
2. "consumptionTable": Lista de hasta 6 filas de la tabla de historia de consumos en kWh que figura en la factura. Cada fila debe tener:
   - "period": Período en formato "MM/YYYY" (ej: "01/2026").
   - "pico": Consumo en kWh en horario pico.
   - "resto": Consumo en kWh en horario resto.
   - "valle": Consumo en kWh en horario valle.
3. Componentes del importe básico (última columna / importes en pesos $):
   - "cargoComercial": Cargo Comercial ($).
   - "cargoCapSumPico": Cargo Capacidad de Suministro Pico ($).
   - "cargoCapSumFPico": Cargo Capacidad de Suministro Fuera de Pico ($).
   - "cargoPotAdqPico": Cargo por Potencia Adquirida Pico ($).
   - "facturadoPico": Consumo activo facturado en Horario Pico en kWh.
   - "eaConsPicoPrice": Precio unitario en horario pico ($/kWh).
   - "facturadoResto": Consumo activo facturado en Horario Resto en kWh.
   - "eaConsRestoPrice": Precio unitario en horario resto ($/kWh).
   - "facturadoValle": Consumo activo facturado en Horario Valle en kWh.
   - "eaConsVallePrice": Precio unitario en horario valle ($/kWh).
   - "energiaReactivaAmount": Energía Reactiva o Recargo/Bonificación por Factor de Potencia ($). REGLA OBLIGATORIA: Este valor puede ser positivo o negativo. En las facturas de la EPE, cuando es una bonificación se identifica con un signo menos (-) a la DERECHA del número (por ejemplo: "1234.56-" o "1.234,56-"). Si el número tiene el signo menos (-) a la derecha o a la izquierda, debes devolverlo como número NEGATIVO (por ejemplo: -1234.56). Si NO tiene signo menos, debes devolverlo como número POSITIVO (por ejemplo: 1234.56).
   - "subtotalEnergiaAmount": SUBTOTAL CONSUMO DE ENERGÍA ($).
4. Otros cargos e impuestos:
   - "resolucion976": Importe facturado por Resolución 976 ($). Si no figura en la factura, poner 0.
   - "ley7797": Importe en pesos ($) correspondiente a la Ley N° 7797 (o "Ley 7797") que figure en el Detalle de Facturación. Si no aparece el detalle de la misma o su monto es cero, pon 0.
   - "cap": Cuota de Alumbrado Público (C.A.P.) ($).
   - "ley12692": Fondo de Energías Renovables Ley 12692 ($).
   - "taxStatus": Condición fiscal del cliente ante el IVA. Debe coincidir exactamente con una de estas opciones:
     - 'Responsable Inscripto'
     - 'Responsable Inscripto Agente Percepción'
     - 'Exento'
   - "totalToPay": Total a pagar Vencimiento ($ importe total a pagar de la factura).

Si algún valor monetario o energético no aparece o no aplica en la factura, asígnale 0.
`;

  const noProsGdSchemaConfig = {
    type: Type.OBJECT,
    properties: {
      contractedPower: { type: Type.NUMBER, description: 'Potencia contratada (kW)' },
      consumptionTable: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            period: { type: Type.STRING, description: 'Periodo MM/YYYY' },
            pico: { type: Type.NUMBER, description: 'Consumo kWh pico' },
            resto: { type: Type.NUMBER, description: 'Consumo kWh resto' },
            valle: { type: Type.NUMBER, description: 'Consumo kWh valle' },
          },
          required: ['period', 'pico', 'resto', 'valle'],
        },
        description: 'Tabla de historia de consumos (hasta 6 periodos)',
      },
      cargoComercial: { type: Type.NUMBER, description: 'Cargo Comercial ($)' },
      cargoCapSumPico: { type: Type.NUMBER, description: 'Cargo Cap. Sum. Pico ($)' },
      cargoCapSumFPico: { type: Type.NUMBER, description: 'Cargo Cap. Sum. F. Pico ($)' },
      cargoPotAdqPico: { type: Type.NUMBER, description: 'Cargo Pot. Adq. Pico ($)' },
      facturadoPico: { type: Type.NUMBER, description: 'Facturado Pico (kWh)' },
      eaConsPicoPrice: { type: Type.NUMBER, description: 'Precio unitario pico ($/kWh)' },
      facturadoResto: { type: Type.NUMBER, description: 'Facturado Resto (kWh)' },
      eaConsRestoPrice: { type: Type.NUMBER, description: 'Precio unitario resto ($/kWh)' },
      facturadoValle: { type: Type.NUMBER, description: 'Facturado Valle (kWh)' },
      eaConsVallePrice: { type: Type.NUMBER, description: 'Precio unitario valle ($/kWh)' },
      energiaReactivaAmount: {
        type: Type.NUMBER,
        description: 'Energía Reactiva ($). Negativo si en la factura tiene signo menos (-) a la derecha o izquierda, positivo en caso contrario.',
      },
      subtotalEnergiaAmount: { type: Type.NUMBER, description: 'SUBTOTAL CONSUMO DE ENERGÍA ($)' },
      resolucion976: { type: Type.NUMBER, description: 'Resolución 976 ($). Si no figura, 0.' },
      cap: { type: Type.NUMBER, description: 'Cuota Alumbrado Público ($)' },
      ley12692: { type: Type.NUMBER, description: 'Ley 12692 ($)' },
      ley7797: { type: Type.NUMBER, description: 'Importe Ley 7797 ($). 0 si no figura o es 0.' },
      taxStatus: { type: Type.STRING, description: 'Condición fiscal ante el IVA' },
      totalToPay: { type: Type.NUMBER, description: 'Total a pagar Vencimiento ($)' },
    },
    required: [
      'contractedPower',
      'consumptionTable',
      'cargoComercial',
      'cargoCapSumPico',
      'cargoCapSumFPico',
      'cargoPotAdqPico',
      'facturadoPico',
      'eaConsPicoPrice',
      'facturadoResto',
      'eaConsRestoPrice',
      'facturadoValle',
      'eaConsVallePrice',
      'energiaReactivaAmount',
      'subtotalEnergiaAmount',
      'cap',
      'ley12692',
      'ley7797',
      'taxStatus',
      'totalToPay',
    ],
  };

  const parts: any[] = fileList.map((f) => ({
    inlineData: {
      data: f.imageBase64,
      mimeType: f.mimeType,
    },
  }));
  parts.push({ text: promptText });

  const cleanJson = await generateWithFallback(ai, parts, noProsGdSchemaConfig, 'InvoiceScannerNoProsGD');
  const parsedData = JSON.parse(cleanJson);
  if (parsedData) {
    const ley7797Amount = typeof parsedData.ley7797 === 'number' ? parsedData.ley7797 : 0;
    parsedData.aplicaLey7797 = ley7797Amount > 0;
    const truncate4 = (v: any) => {
      if (typeof v === 'number') {
        const s = v.toString().split('.');
        if (s[1] && s[1].length > 4) {
          return parseFloat(`${s[0]}.${s[1].slice(0, 4)}`);
        }
      }
      return v;
    };
    if (typeof parsedData.eaConsPicoPrice === 'number') parsedData.eaConsPicoPrice = truncate4(parsedData.eaConsPicoPrice);
    if (typeof parsedData.eaConsRestoPrice === 'number') parsedData.eaConsRestoPrice = truncate4(parsedData.eaConsRestoPrice);
    if (typeof parsedData.eaConsVallePrice === 'number') parsedData.eaConsVallePrice = truncate4(parsedData.eaConsVallePrice);
  }
  return parsedData;
}
