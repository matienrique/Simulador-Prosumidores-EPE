import express, { type Request, type Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  extractProsumidorInvoice,
  extractProsumidorGDInvoice,
  extractNoProsumidorInvoice,
  extractNoProsumidorGDInvoice,
} from './utils/ocrServices.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Shared error handler helper
const formatError = (error: any) => {
  let errorMessage = error?.message || 'Error al procesar la factura.';
  try {
    const parsedErr = JSON.parse(errorMessage);
    if (parsedErr?.error?.message) {
      errorMessage = parsedErr.error.message;
    }
  } catch {
    // not json
  }
  return errorMessage;
};

// 1. Prosumidor Pequeña Demanda
app.post(['/api/extract-prosumidor-invoice', '/extract-prosumidor-invoice'], async (req: Request, res: Response) => {
  try {
    const { imageBase64, mimeType } = req.body;
    if (!imageBase64 || !mimeType) {
      return res.status(400).json({ error: 'Se requiere imageBase64 y mimeType.' });
    }
    const data = await extractProsumidorInvoice(imageBase64, mimeType);
    return res.json({ success: true, data });
  } catch (error: any) {
    console.error('Error al extraer datos de factura con Gemini:', error);
    return res.status(500).json({ error: formatError(error) });
  }
});

// 2. Prosumidor Gran Demanda (GD)
app.post(['/api/extract-prosumidor-gd-invoice', '/extract-prosumidor-gd-invoice'], async (req: Request, res: Response) => {
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
    const data = await extractProsumidorGDInvoice(fileList);
    return res.json({ success: true, data });
  } catch (error: any) {
    console.error('Error al extraer datos de factura GD con Gemini:', error);
    return res.status(500).json({ error: formatError(error) });
  }
});

// 3. No Prosumidor Pequeña Demanda
app.post(['/api/extract-no-prosumidor-invoice', '/extract-no-prosumidor-invoice'], async (req: Request, res: Response) => {
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
    const data = await extractNoProsumidorInvoice(fileList);
    return res.json({ success: true, data });
  } catch (error: any) {
    console.error('Error al extraer datos de factura No Prosumidor con Gemini:', error);
    return res.status(500).json({ error: formatError(error) });
  }
});

// 4. No Prosumidor Gran Demanda (GD)
app.post(['/api/extract-no-prosumidor-gd-invoice', '/extract-no-prosumidor-gd-invoice'], async (req: Request, res: Response) => {
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
    const data = await extractNoProsumidorGDInvoice(fileList);
    return res.json({ success: true, data });
  } catch (error: any) {
    console.error('Error al extraer datos de factura No Prosumidor GD con Gemini:', error);
    return res.status(500).json({ error: formatError(error) });
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

if (!process.env.VERCEL) {
  setupServer();
}

export default app;
