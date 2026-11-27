import { NextRequest, NextResponse } from 'next/server';

/**
 * Universal Inline PDF Proxy Route for GGCP LMS
 * 
 * Fetches remote PDF documents (Cloudinary, Supabase, external URLs)
 * and streams them with explicit `Content-Type: application/pdf` and `Content-Disposition: inline`.
 * 
 * Benefits:
 * 1. Prevents Chrome/Edge from triggering unwanted automatic file downloads on iframe load.
 * 2. Allows Chrome's native PDF reader (with scrollbar, zoom, and pagination) to render inline reliably.
 * 3. Bypasses third-party viewer restrictions (Google Docs Viewer rate-limits / blank white screens).
 */
export async function GET(req: NextRequest) {
  const urlParam = req.nextUrl.searchParams.get('url');

  if (!urlParam) {
    return new NextResponse('Missing "url" query parameter', { status: 400 });
  }

  try {
    let fetchUrl = decodeURIComponent(urlParam);

    // If Cloudinary URL was stored as raw/upload or image/upload, attempt fetch
    let response = await fetch(fetchUrl, {
      headers: {
        'Accept': 'application/pdf,application/octet-stream,*/*',
        'User-Agent': 'GGCP-LMS-Inline-Viewer/1.0',
      },
    });

    // Cloudinary fallback: If 404, try flipping resource type between raw and image
    if (!response.ok && fetchUrl.includes('cloudinary.com')) {
      const altUrl = fetchUrl.includes('/raw/upload/')
        ? fetchUrl.replace('/raw/upload/', '/image/upload/')
        : fetchUrl.replace('/image/upload/', '/raw/upload/');
      const altRes = await fetch(altUrl, {
        headers: { 'Accept': 'application/pdf,application/octet-stream,*/*' },
      });
      if (altRes.ok) {
        response = altRes;
      }
    }

    if (!response.ok) {
      return new NextResponse(`Failed to fetch document: HTTP ${response.status}`, {
        status: response.status,
      });
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Detect MIME type (default to application/pdf)
    let contentType = 'application/pdf';
    const isPdfHeader = buffer.length >= 4 && buffer.toString('utf-8', 0, 4) === '%PDF';
    if (!isPdfHeader && (fetchUrl.includes('.docx') || fetchUrl.includes('word'))) {
      contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    } else if (!isPdfHeader && (fetchUrl.includes('.png') || fetchUrl.includes('image/png'))) {
      contentType = 'image/png';
    } else if (!isPdfHeader && (fetchUrl.includes('.jpg') || fetchUrl.includes('.jpeg'))) {
      contentType = 'image/jpeg';
    }

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': 'inline; filename="Student_Submission.pdf"',
        'Content-Length': buffer.length.toString(),
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
        'Access-Control-Allow-Origin': '*',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error: any) {
    console.error('[/api/pdf-proxy] Error:', error);
    return new NextResponse(`Error proxying document: ${error?.message || 'Unknown error'}`, {
      status: 500,
    });
  }
}
