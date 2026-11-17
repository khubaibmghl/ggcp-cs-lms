import { PDFParse } from 'pdf-parse';
import mammoth from 'mammoth';

/**
 * Extracts raw plain text from a document payload (base64 dataUrl or remote URL)
 * Supports PDF (.pdf), Microsoft Word (.docx), and plain text/code files.
 */
export async function extractDocumentText(file: {
  name: string;
  dataUrl?: string;
  url?: string;
  type?: string;
}): Promise<string> {
  const fileName = (file.name || '').toLowerCase();

  try {
    let buffer: Buffer | null = null;

    // 1. If base64 dataUrl is provided
    if (file.dataUrl && file.dataUrl.includes('base64,')) {
      const base64Part = file.dataUrl.split('base64,')[1];
      if (base64Part) {
        buffer = Buffer.from(base64Part, 'base64');
      }
    }

    // 2. If remote URL is provided and no local buffer
    if (!buffer && file.url) {
      let fetchUrl = file.url;
      // Cloudinary raw/image handling
      if (fetchUrl.includes('cloudinary.com') && fetchUrl.includes('/image/upload/') && (fileName.endsWith('.pdf') || fileName.endsWith('.docx'))) {
        fetchUrl = fetchUrl.replace('/image/upload/', '/raw/upload/');
      }
      const response = await fetch(fetchUrl);
      if (response.ok) {
        const arrayBuf = await response.arrayBuffer();
        buffer = Buffer.from(arrayBuf);
      }
    }

    if (!buffer) {
      return '';
    }

    // --- PARSE PDF ---
    if (fileName.endsWith('.pdf') || file.type === 'application/pdf') {
      try {
        const parser = new PDFParse({ data: buffer });
        const res = await parser.getText();
        return (res?.text || '').trim();
      } catch (err) {
        console.error('Error parsing PDF with PDFParse:', err);
        return '';
      }
    }

    // --- PARSE WORD DOCX ---
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
