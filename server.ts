import express, { type Request, type Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Shared Gemini Client
const getAiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY no está configurada en las variables de entorno del servidor.');
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

// API Endpoint to extract Prosumidor Invoice Data
app.post('/api/extract-prosumidor-invoice', async (req: Request, res: Response) => {
  try {
    const { imageBase64, mimeType } = req.body;

    if (!imageBase64 || !mimeType) {
      return res.status(400).json({ error: 'Se requiere imageBase64 y mimeType.' });
    }

    const ai = getAiClient();

    const promptText = `
Analiza minuciosamente esta factura de energía eléctrica de la EPE (Empresa Provincial de la Energía de Santa Fe) perteneciente a un usuario Prosumidor (Pequeña Demanda: Residencial, Comercial, Industrial o Asociaciones).

Extrae los siguientes campos con la máxima exactitud numérica:
1. "eg": Energía Generada (EG) en kWh. En la factura, en el apartado "Información de medición y lectura", este valor se corresponde con el PRIMER valor que aparece en la columna "Consumo" (medición de generación solar).
2. "ee": Energía Entregada (EE) en kWh. En la factura, en el apartado "Información de medición y lectura", este valor se corresponde con el SEGUNDO valor que aparece en la columna "Consumo" (energía provista por la red EPE).
3. "er": Energía Recibida / Inyectada (ER) en kWh. En la factura, en el apartado "Información de medición y lectura", este valor se corresponde con el TERCER valor que aparece en la columna "Consumo" (energía inyectada a la red).
4. "serviceQuota": Cuota de servicio o cargo fijo final en pesos ($).
5. "bands": Lista de bloques o bandas de consumo de energía activa.
   - Cada banda debe tener "energy" (consumo en kWh de esa banda) y "amount" (importe en pesos $ correspondiente a esa banda).
   - Si en la factura figura por ejemplo "Primeros 300 kWh a $X", esa es una banda. Si solo hay un importe general de energía activa, ponlo como una sola banda.
6. "reconEPE": Reconocimiento EPE ($), compensación o crédito facturado por la EPE por la energía inyectada.
7. "reconGSF": Reconocimiento del Gobierno de la Provincia de Santa Fe ($) o incentivo provincial Prosumidores.
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
        eg: { type: Type.NUMBER, description: 'Energía Generada (kWh) - 1° valor de Consumo en Información de medición y lectura' },
        ee: { type: Type.NUMBER, description: 'Energía Entregada (kWh) - 2° valor de Consumo en Información de medición y lectura' },
        er: { type: Type.NUMBER, description: 'Energía Recibida (kWh) - 3° valor de Consumo en Información de medición y lectura' },
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
        reconGSF: { type: Type.NUMBER, description: 'Reconocimiento del Gobierno ($)' },
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

    // Use fast, reliable gemini-3.1-flash-lite with fallback to gemini-3.8-flash
    const candidateModels = ['gemini-3.1-flash-lite', 'gemini-3.8-flash'];
    let rawText = '';
    let lastError: any = null;

    for (const model of candidateModels) {
      try {
        console.log(`[InvoiceScanner] Intentando extracción con modelo: ${model}...`);
        const response = await ai.models.generateContent({
          model,
          contents: {
            parts: [
              {
                inlineData: {
                  data: imageBase64,
                  mimeType: mimeType,
                },
              },
              {
                text: promptText,
              },
            ],
          },
          config: {
            responseMimeType: 'application/json',
            responseSchema: schemaConfig,
          },
        });

        rawText = response.text || '';
        if (rawText) {
          console.log(`[InvoiceScanner] Extracción exitosa con modelo: ${model}`);
          break;
        }
      } catch (err: any) {
        console.warn(`[InvoiceScanner] Error con modelo ${model}:`, err?.message || err);
        lastError = err;
      }
    }

    if (!rawText) {
      throw lastError || new Error('No se pudo procesar la factura con los modelos de IA disponibles.');
    }

    // Clean potential markdown blocks
    let cleanJson = rawText.trim();
    if (cleanJson.startsWith('```')) {
      cleanJson = cleanJson.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
    }

    const parsedData = JSON.parse(cleanJson);
    const ley7797Amount = typeof parsedData.ley7797 === 'number' ? parsedData.ley7797 : 0;
    parsedData.aplicaLey7797 = ley7797Amount > 0;
    return res.json({ success: true, data: parsedData });
  } catch (error: any) {
    console.error('Error al extraer datos de la factura con Gemini:', error);
    let errorMessage = 'Error al procesar la factura con inteligencia artificial.';
    if (error?.message) {
      try {
        const parsedErr = JSON.parse(error.message);
        if (parsedErr?.error?.message) {
          errorMessage = parsedErr.error.message;
        } else {
          errorMessage = error.message;
        }
      } catch {
        errorMessage = error.message;
      }
    }
    return res.status(500).json({
      error: errorMessage,
    });
  }
});

// API Endpoint to extract Prosumidor GD Invoice Data
app.post('/api/extract-prosumidor-gd-invoice', async (req: Request, res: Response) => {
  try {
    const { imageBase64, mimeType, files } = req.body;

    const fileList: Array<{ imageBase64: string; mimeType: string }> = [];
    if (files && Array.isArray(files) && files.length > 0) {
      fileList.push(...files);
    } else if (imageBase64 && mimeType) {
      fileList.push({ imageBase64, mimeType });
    }

    if (fileList.length === 0) {
      return res.status(400).json({ error: 'Se requiere al menos un archivo (imageBase64 o files).' });
    }

    const ai = getAiClient();

    const promptText = `
Analiza minuciosamente esta factura de energía eléctrica de la EPE (Empresa Provincial de la Energía de Santa Fe) perteneciente a un usuario Prosumidor de GRAN DEMANDA (Grandes Demandas / Tarifa 2).
En las facturas de Gran Demanda, los datos suelen distribuirse en 2 páginas o secciones (Hoja 1: Resumen y conceptos generales; Hoja 2: Detalle de componentes del importe básico y tabla de mediciones).

Extrae los siguientes campos con la máxima precisión numérica:
1. "program": '4.0' si corresponde a Prosumidores 4.0 o tiene "Cancela. Fact. PROSUMIDOR MAX", o 'anterior' si indica programas previos (ERA, Prosumidores 2).
2. "capGD": Cuota de Alumbrado Público (CAP) en pesos ($).
3. "leyGD": Fondo de Energías Renovables Ley 12692 en pesos ($).
4. "reconGSF_GD": "Cancela. Fact. PROSUMIDOR MAX" o reconocimiento del Gobierno de Santa Fe ($). IMPORTANTE: Debe ser SIEMPRE un número POSITIVO (mayor o igual a 0). Aunque en la factura figure con signo menos (-) o a la derecha, debes extraerlo siempre como número POSITIVO (valor absoluto).
5. "resolucion976": Importe facturado por "Resolución 976" o "Res. 976" en pesos ($) si figura en la factura. Si no figura, pon 0.
6. "ley7797": Importe en pesos ($) correspondiente a la Ley N° 7797 (o "Ley 7797") que figure en el Detalle de Facturación o liquidación. Si no aparece el detalle de la misma o su monto es cero, pon 0.
7. "isRosario": true si el suministro o localidad es de la ciudad de Rosario; false en caso contrario.
8. "taxStatus": Condición fiscal del cliente ante el IVA. Debe coincidir exactamente con una de estas opciones:
   - 'Responsable Inscripto'
   - 'Responsable Inscripto Agente de Retención'
   - 'Exento'
9. Componentes del importe básico (última columna / importes en pesos $):
   - "cargoComercial": Cargo Comercial ($).
   - "cargoCapSumPico": Cargo Capacidad de Suministro Pico ($).
   - "cargoCapSumFPico": Cargo Capacidad de Suministro Fuera de Pico ($).
   - "cargoPotenciaPico": Cargo Potencia Adquirida Pico ($).
   - "eaConsPico": Energía Activa Consumida en Horario Pico ($ importe facturado).
   - "precioUnitarioPico": Precio unitario en horario pico ($/kWh).
   - "eaConsResto": Energía Activa Consumida en Horario Resto ($ importe facturado).
   - "precioUnitarioResto": Precio unitario en horario resto ($/kWh).
   - "eaConsValle": Energía Activa Consumida en Horario Valle ($ importe facturado).
   - "precioUnitarioValle": Precio unitario en horario valle ($/kWh).
   - "recargoBonifFP": Recargo o Bonificación por Factor de Potencia (FP o Cos fi) ($). REGLA OBLIGATORIA: Este valor puede ser positivo o negativo. En las facturas de la EPE, cuando es una bonificación se identifica con un signo menos (-) a la DERECHA del número (por ejemplo: "1234.56-" o "1.234,56-"). Si el número tiene el signo menos (-) a la derecha o a la izquierda, debes devolverlo como número NEGATIVO (por ejemplo: -1234.56). Si NO tiene signo menos, debes devolverlo como número POSITIVO (por ejemplo: 1234.56).
10. Subtotales y Total de la Factura:
   - "subtotalConsumoEnergia": Subtotal Consumo de Energía ($).
   - "subtotalGeneral": Subtotal General ($).
   - "totalPagar": Importe TOTAL A PAGAR de la factura en pesos ($).
11. Información Complementaria / Mediciones de medidor en kWh:
   - Entregada por la red EPE:
     - "entPico": Energía Activa Entregada Horario Pico (kWh).
     - "entResto": Energía Activa Entregada Horario Resto (kWh).
     - "entValle": Energía Activa Entregada Horario Valle (kWh).
   - Recibida / Inyectada a la red EPE:
     - "recPico": Energía Activa Recibida Horario Pico (kWh).
     - "recResto": Energía Activa Recibida Horario Resto (kWh).
     - "recValle": Energía Activa Recibida Horario Valle (kWh).
   - Generada por el sistema solar:
     - "genPico": Energía Activa Generada Horario Pico (kWh).
     - "genResto": Energía Activa Generada Horario Resto (kWh).
     - "genValle": Energía Activa Generada Horario Valle (kWh).

Si algún valor monetario o energético no aparece o no aplica en la factura, asígnale 0.
`;

    const gdSchemaConfig = {
      type: Type.OBJECT,
      properties: {
        program: { type: Type.STRING, description: "'4.0' o 'anterior'" },
        capGD: { type: Type.NUMBER, description: 'Cuota de Alumbrado Público ($)' },
        leyGD: { type: Type.NUMBER, description: 'Ley 12692 ($)' },
        ley7797: { type: Type.NUMBER, description: 'Importe Ley 7797 ($). 0 si no figura o es 0.' },
        reconGSF_GD: { type: Type.NUMBER, description: 'Cancela. Fact. PROSUMIDOR MAX ($)' },
        resolucion976: { type: Type.NUMBER, description: 'Resolución 976 ($)' },
        isRosario: { type: Type.BOOLEAN, description: 'Si el suministro está en Rosario' },
        taxStatus: { type: Type.STRING, description: 'Condición fiscal ante el IVA' },
        cargoComercial: { type: Type.NUMBER, description: 'Cargo Comercial ($)' },
        cargoCapSumPico: { type: Type.NUMBER, description: 'Cargo Cap. Sum. Pico ($)' },
        cargoCapSumFPico: { type: Type.NUMBER, description: 'Cargo Cap. Sum. F. Pico ($)' },
        cargoPotenciaPico: { type: Type.NUMBER, description: 'Cargo Pot. Adq. Pico ($)' },
        eaConsPico: { type: Type.NUMBER, description: 'E. Activa Cons. Pico ($)' },
        precioUnitarioPico: { type: Type.NUMBER, description: 'Precio unitario pico ($/kWh)' },
        eaConsResto: { type: Type.NUMBER, description: 'E. Activa Cons. Resto ($)' },
        precioUnitarioResto: { type: Type.NUMBER, description: 'Precio unitario resto ($/kWh)' },
        eaConsValle: { type: Type.NUMBER, description: 'E. Activa Cons. Valle ($)' },
        precioUnitarioValle: { type: Type.NUMBER, description: 'Precio unitario valle ($/kWh)' },
        recargoBonifFP: { type: Type.NUMBER, description: 'Recargo o Bonificación por Factor de Potencia ($). Negativo si en la factura tiene signo menos (-) a la derecha o izquierda, positivo en caso contrario.' },
        subtotalConsumoEnergia: { type: Type.NUMBER, description: 'SUBTOTAL CONSUMO ENERGÍA ($)' },
        subtotalGeneral: { type: Type.NUMBER, description: 'SUBTOTAL GENERAL ($)' },
        totalPagar: { type: Type.NUMBER, description: 'TOTAL A PAGAR ($)' },
        entPico: { type: Type.NUMBER, description: 'Energía Entregada Horario Pico (kWh)' },
        entResto: { type: Type.NUMBER, description: 'Energía Entregada Horario Resto (kWh)' },
        entValle: { type: Type.NUMBER, description: 'Energía Entregada Horario Valle (kWh)' },
        recPico: { type: Type.NUMBER, description: 'Energía Recibida Horario Pico (kWh)' },
        recResto: { type: Type.NUMBER, description: 'Energía Recibida Horario Resto (kWh)' },
        recValle: { type: Type.NUMBER, description: 'Energía Recibida Horario Valle (kWh)' },
        genPico: { type: Type.NUMBER, description: 'Energía Generada Horario Pico (kWh)' },
        genResto: { type: Type.NUMBER, description: 'Energía Generada Horario Resto (kWh)' },
        genValle: { type: Type.NUMBER, description: 'Energía Generada Horario Valle (kWh)' },
      },
      required: [
        'program',
        'capGD',
        'leyGD',
        'ley7797',
        'reconGSF_GD',
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

    const candidateModels = ['gemini-3.1-flash-lite', 'gemini-3.8-flash'];
    let rawText = '';
    let lastError: any = null;

    for (const model of candidateModels) {
      try {
        console.log(`[InvoiceScannerGD] Intentando extracción con modelo: ${model}...`);
        const response = await ai.models.generateContent({
          model,
          contents: {
            parts,
          },
          config: {
            responseMimeType: 'application/json',
            responseSchema: gdSchemaConfig,
          },
        });

        rawText = response.text || '';
        if (rawText) {
          console.log(`[InvoiceScannerGD] Extracción exitosa con modelo: ${model}`);
          break;
        }
      } catch (err: any) {
        console.warn(`[InvoiceScannerGD] Error con modelo ${model}:`, err?.message || err);
        lastError = err;
      }
    }

    if (!rawText) {
      throw lastError || new Error('No se pudo procesar la factura GD con los modelos de IA disponibles.');
    }

    let cleanJson = rawText.trim();
    if (cleanJson.startsWith('```')) {
      cleanJson = cleanJson.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
    }

    const parsedData = JSON.parse(cleanJson);
    const ley7797Amount = typeof parsedData.ley7797 === 'number' ? parsedData.ley7797 : 0;
    parsedData.aplicaLey7797 = ley7797Amount > 0;
    return res.json({ success: true, data: parsedData });
  } catch (error: any) {
    console.error('Error al extraer datos de factura GD con Gemini:', error);
    let errorMessage = 'Error al procesar la factura con inteligencia artificial.';
    if (error?.message) {
      try {
        const parsedErr = JSON.parse(error.message);
        if (parsedErr?.error?.message) {
          errorMessage = parsedErr.error.message;
        } else {
          errorMessage = error.message;
        }
      } catch {
        errorMessage = error.message;
      }
    }
    return res.status(500).json({
      error: errorMessage,
    });
  }
});

// API Endpoint to extract No Prosumidor (Pequeña Demanda) Invoice Data
app.post('/api/extract-no-prosumidor-invoice', async (req: Request, res: Response) => {
  try {
    const { imageBase64, mimeType, files } = req.body;

    const fileList: Array<{ imageBase64: string; mimeType: string }> = [];
    if (files && Array.isArray(files) && files.length > 0) {
      fileList.push(...files);
    } else if (imageBase64 && mimeType) {
      fileList.push({ imageBase64, mimeType });
    }

    if (fileList.length === 0) {
      return res.status(400).json({ error: 'Se requiere al menos un archivo (imageBase64 o files).' });
    }

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

    const candidateModels = ['gemini-3.1-flash-lite', 'gemini-3.8-flash'];
    let rawText = '';
    let lastError: any = null;

    for (const model of candidateModels) {
      try {
        console.log(`[InvoiceScannerNoPros] Intentando extracción con modelo: ${model}...`);
        const response = await ai.models.generateContent({
          model,
          contents: {
            parts,
          },
          config: {
            responseMimeType: 'application/json',
            responseSchema: noProsSchemaConfig,
          },
        });

        rawText = response.text || '';
        if (rawText) {
          console.log(`[InvoiceScannerNoPros] Extracción exitosa con modelo: ${model}`);
          break;
        }
      } catch (err: any) {
        console.warn(`[InvoiceScannerNoPros] Error con modelo ${model}:`, err?.message || err);
        lastError = err;
      }
    }

    if (!rawText) {
      throw lastError || new Error('No se pudo procesar la factura con los modelos disponibles.');
    }

    let cleanJson = rawText.trim();
    if (cleanJson.startsWith('```')) {
      cleanJson = cleanJson.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
    }

    const parsedData = JSON.parse(cleanJson);
    const ley7797Amount = typeof parsedData.ley7797 === 'number' ? parsedData.ley7797 : 0;
    parsedData.aplicaLey7797 = ley7797Amount > 0;
    return res.json({ success: true, data: parsedData });
  } catch (error: any) {
    console.error('Error al extraer datos de factura No Prosumidor con Gemini:', error);
    let errorMessage = 'Error al procesar la factura con el servicio.';
    if (error?.message) {
      try {
        const parsedErr = JSON.parse(error.message);
        if (parsedErr?.error?.message) {
          errorMessage = parsedErr.error.message;
        } else {
          errorMessage = error.message;
        }
      } catch {
        errorMessage = error.message;
      }
    }
    return res.status(500).json({
      error: errorMessage,
    });
  }
});

// API Endpoint to extract No Prosumidor GD Invoice Data
app.post('/api/extract-no-prosumidor-gd-invoice', async (req: Request, res: Response) => {
  try {
    const { imageBase64, mimeType, files } = req.body;

    const fileList: Array<{ imageBase64: string; mimeType: string }> = [];
    if (files && Array.isArray(files) && files.length > 0) {
      fileList.push(...files);
    } else if (imageBase64 && mimeType) {
      fileList.push({ imageBase64, mimeType });
    }

    if (fileList.length === 0) {
      return res.status(400).json({ error: 'Se requiere al menos un archivo (imageBase64 o files).' });
    }

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

    const candidateModels = ['gemini-3.1-flash-lite', 'gemini-3.8-flash'];
    let rawText = '';
    let lastError: any = null;

    for (const model of candidateModels) {
      try {
        console.log(`[InvoiceScannerNoProsGD] Intentando extracción con modelo: ${model}...`);
        const response = await ai.models.generateContent({
          model,
          contents: {
            parts,
          },
          config: {
            responseMimeType: 'application/json',
            responseSchema: noProsGdSchemaConfig,
          },
        });

        rawText = response.text || '';
        if (rawText) {
          console.log(`[InvoiceScannerNoProsGD] Extracción exitosa con modelo: ${model}`);
          break;
        }
      } catch (err: any) {
        console.warn(`[InvoiceScannerNoProsGD] Error con modelo ${model}:`, err?.message || err);
        lastError = err;
      }
    }

    if (!rawText) {
      throw lastError || new Error('No se pudo procesar la factura GD con los modelos disponibles.');
    }

    let cleanJson = rawText.trim();
    if (cleanJson.startsWith('```')) {
      cleanJson = cleanJson.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
    }

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
    return res.json({ success: true, data: parsedData });
  } catch (error: any) {
    console.error('Error al extraer datos de factura No Prosumidor GD con Gemini:', error);
    let errorMessage = 'Error al procesar la factura con el servicio.';
    if (error?.message) {
      try {
        const parsedErr = JSON.parse(error.message);
        if (parsedErr?.error?.message) {
          errorMessage = parsedErr.error.message;
        } else {
          errorMessage = error.message;
        }
      } catch {
        errorMessage = error.message;
      }
    }
    return res.status(500).json({
      error: errorMessage,
    });
  }
});

// Setup Vite or static serving
const setupServer = async () => {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.use((_req: Request, res: Response) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
  });
};

setupServer();
