import { extractText } from 'unpdf';
import mammoth from 'mammoth';

/**
 * Extracts raw plain text from a document payload (base64 dataUrl or remote URL)
 * Supports PDF (.pdf), Microsoft Word (.docx), and plain text/code files.
 * Zero native binary dependencies, runs 100% reliably on Vercel Serverless.
 */
export async function extractDocumentText(file: {
  name: string;
  dataUrl?: string;
  url?: string;
  type?: string;
}): Promise<string> {
  const fileName = (file.name || '').toLowerCase();

  try {
    let uint8Data: Uint8Array | null = null;
    let buffer: Buffer | null = null;

    // 1. If base64 dataUrl is provided
    if (file.dataUrl && file.dataUrl.includes('base64,')) {
      const base64Part = file.dataUrl.split('base64,')[1];
      if (base64Part) {
        buffer = Buffer.from(base64Part, 'base64');
        uint8Data = new Uint8Array(buffer);
      }
    }

    // 2. If remote URL is provided and no local buffer
    if (!uint8Data && file.url) {
      let fetchUrl = file.url;
      let response = await fetch(fetchUrl);

      // If failed (e.g. 404) and on Cloudinary, try the alternate resource type (image <-> raw)
      if (!response.ok && fetchUrl.includes('cloudinary.com')) {
        const altUrl = fetchUrl.includes('/image/upload/')
          ? fetchUrl.replace('/image/upload/', '/raw/upload/')
          : fetchUrl.replace('/raw/upload/', '/image/upload/');
        const altRes = await fetch(altUrl);
        if (altRes.ok) {
          response = altRes;
        }
      }

      if (response.ok) {
        const arrayBuf = await response.arrayBuffer();
        uint8Data = new Uint8Array(arrayBuf);
        buffer = Buffer.from(arrayBuf);
      }
    }

    if (!uint8Data || !buffer) {
      return '';
    }

    // --- PARSE PDF VIA UNPDF (Pure JS, zero native binaries, zero canvas) ---
    if (fileName.endsWith('.pdf') || file.type === 'application/pdf') {
      try {
        const { text } = await extractText(uint8Data);
        if (Array.isArray(text)) {
          return text.join('\n\n').trim();
        }
        return String(text || '').trim();
      } catch (err) {
        console.error('Error parsing PDF with unpdf:', err);
        return '';
      }
    }

    // --- PARSE WORD DOCX VIA MAMMOTH ---
    if (
      fileName.endsWith('.docx') ||
      fileName.endsWith('.doc') ||
      file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ) {
      try {
        const result = await mammoth.extractRawText({ buffer });
        return (result?.value || '').trim();
      } catch (err) {
        console.error('Error parsing Word document with mammoth:', err);
        return '';
      }
    }

    // --- PARSE TEXT / SOURCE CODE ---
    return buffer.toString('utf-8').trim();
  } catch (error) {
    console.error('extractDocumentText fatal error:', error);
    return '';
  }
}
