import { extractNoProsumidorInvoice } from '../utils/ocrServices.js';

export const config = {
  maxDuration: 60,
  api: {
    bodyParser: {
      sizeLimit: '15mb',
    },
  },
};

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido. Se requiere POST.' });
  }

  try {
    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch {
        // ignore
      }
    }

    const { imageBase64, mimeType, files } = body || {};
    const fileList: Array<{ imageBase64: string; mimeType: string }> = [];
    if (files && Array.isArray(files) && files.length > 0) {
      fileList.push(...files);
    } else if (imageBase64 && mimeType) {
      fileList.push({ imageBase64, mimeType });
    }

    if (fileList.length === 0) {
      return res.status(400).json({ error: 'Se requiere al menos un archivo (imageBase64 o files).' });
    }

    const data = await extractNoProsumidorInvoice(fileList);
    return res.status(200).json({ success: true, data });
  } catch (error: any) {
    console.error('Error en Vercel Serverless Function (extract-no-prosumidor-invoice):', error);
    let errorMessage = error?.message || 'Error al procesar la factura con inteligencia artificial.';
    try {
      const parsedErr = JSON.parse(errorMessage);
      if (parsedErr?.error?.message) {
        errorMessage = parsedErr.error.message;
      }
    } catch {
      // ignore
    }
    return res.status(500).json({ error: errorMessage });
  }
}
