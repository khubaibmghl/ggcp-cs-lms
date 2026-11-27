import { NextRequest, NextResponse } from 'next/server';

/**
 * Clean Document Downloader for GGCP LMS
 * 
 * Fetches the document and serves it with:
 * 1. An explicit sanitized filename containing student roll number, name, and subject.
 * 2. Guaranteed file extension (.pdf or .docx) so Windows and macOS recognize it immediately.
 * 3. Proper `Content-Disposition: attachment; filename="..."` header.
 */
export async function GET(req: NextRequest) {
  const urlParam = req.nextUrl.searchParams.get('url');
  const fileNameParam = req.nextUrl.searchParams.get('name') || 'Student_Submission.pdf';

  if (!urlParam) {
    return new NextResponse('Missing "url" query parameter', { status: 400 });
  }

  try {
    let fetchUrl = decodeURIComponent(urlParam);

    let response = await fetch(fetchUrl, {
      headers: { 'Accept': '*/*' },
    });

    if (!response.ok && fetchUrl.includes('cloudinary.com')) {
      const altUrl = fetchUrl.includes('/raw/upload/')
        ? fetchUrl.replace('/raw/upload/', '/image/upload/')
        : fetchUrl.replace('/image/upload/', '/raw/upload/');
      const altRes = await fetch(altUrl);
      if (altRes.ok) response = altRes;
    }

    if (!response.ok) {
      return new NextResponse(`Download failed: HTTP ${response.status}`, { status: response.status });
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Sanitize safe filename
    let safeFileName = fileNameParam.replace(/[/\\?%*:|"<>]/g, '_').trim();
    const isWord = safeFileName.endsWith('.docx') || safeFileName.endsWith('.doc') || fetchUrl.includes('word');
    if (!safeFileName.includes('.')) {
      safeFileName += isWord ? '.docx' : '.pdf';
    } else if (isWord && safeFileName.toLowerCase().endsWith('.pdf')) {
      safeFileName = safeFileName.replace(/\.pdf$/i, '.docx');
    }

    const contentType = isWord
      ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      : 'application/pdf';

    const encodedFileName = encodeURIComponent(safeFileName);

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${safeFileName}"; filename*=UTF-8''${encodedFileName}`,
        'Content-Length': buffer.length.toString(),
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (err: any) {
    console.error('[/api/download-submission] Error:', err);
    return new NextResponse(`Download error: ${err?.message || 'Server error'}`, { status: 500 });
  }
}
