/**
 * Utility to safely send invoice extraction requests to the backend,
 * handling file size limits, timeouts, and non-JSON (HTML/gateway) responses gracefully.
 */

export const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024; // 20 MB

export interface ScanApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export async function sendOcrRequest<T>(
  endpoint: string,
  bodyData: any,
  timeoutMs = 75000
): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(bodyData),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const contentType = response.headers.get('content-type') || '';
    let result: ScanApiResponse<T> | null = null;

    let responseText = '';
    if (contentType.includes('application/json')) {
      try {
        responseText = await response.text();
        result = JSON.parse(responseText);
      } catch (parseErr) {
        console.warn('No se pudo interpretar el cuerpo JSON de la respuesta:', parseErr);
      }
    } else {
      // Received HTML or plain text (e.g. 504 Gateway Timeout or Cloud Run error page)
      responseText = await response.text();
      console.warn(`Respuesta no-JSON recibida (${response.status}):`, responseText.slice(0, 150));
    }

    if (!response.ok || !result || !result.success) {
      const errMsg = result?.error || '';
      const errMsgLower = (errMsg + ' ' + responseText).toLowerCase();

      if (
        errMsgLower.includes('high demand') ||
        errMsgLower.includes('503') ||
        errMsgLower.includes('unavailable') ||
        errMsgLower.includes('spikes in demand')
      ) {
        throw new Error('El servicio está experimentando alta demanda momentánea. Por favor reintentá en unos segundos.');
      }

      if (errMsg) {
        throw new Error(errMsg);
      }

      if (response.status === 504 || response.status === 408) {
        throw new Error('El análisis de la factura tardó más de lo esperado (tiempo de espera agotado). Por favor intentá nuevamente.');
      } else if (response.status === 502 || response.status === 503) {
        throw new Error('El servicio de lectura está momentáneamente ocupado. Por favor reintentá en unos segundos.');
      } else if (response.status === 413) {
        throw new Error('El documento es demasiado pesado para ser procesado. Por favor asegurate de que pese menos de 20 MB.');
      }

      if (
        responseText.toLowerCase().includes('<!doctype') ||
        responseText.toLowerCase().includes('<html') ||
        response.status === 404
      ) {
        throw new Error(
          'El endpoint del servidor no respondió correctamente (código ' +
            response.status +
            '). Si desplegaste en Vercel, asegurate de configurar GEMINI_API_KEY en Settings > Environment Variables y hacer push a GitHub.'
        );
      }

      throw new Error('No se pudieron extraer los datos de la factura. Por favor verificá que el archivo sea legible o intentá de nuevo.');
    }

    if (!result.data) {
      throw new Error('La respuesta del servidor no incluyó los datos extraídos.');
    }

    return result.data;
  } catch (err: any) {
    clearTimeout(timeoutId);

    if (err.name === 'AbortError') {
      throw new Error('El análisis de la factura superó el tiempo límite de espera. Por favor reintentá subir el documento.');
    }

    const msg = err.message || '';
    if (
      msg.includes('is not valid JSON') ||
      msg.includes('Unexpected token') ||
      msg.includes('The page c') ||
      msg.includes('Failed to fetch') ||
      msg.includes('NetworkError')
    ) {
      throw new Error('El servidor tardó en responder o la conexión fue interrumpida. Por favor volvé a intentar cargar el documento.');
    }

    throw err;
  }
}
