import { NextRequest, NextResponse } from 'next/server';
import { extractDocumentText } from '@/lib/serverDocumentParser';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { file } = body;

    if (!file) {
      return NextResponse.json({ success: false, error: 'No file provided' }, { status: 400 });
    }

    const text = await extractDocumentText(file);
    return NextResponse.json({
      success: true,
      text,
      length: text.length,
      sample: text.slice(0, 300),
    });
  } catch (error: any) {
    console.error('Error in /api/extract-text:', error);
    return NextResponse.json({ success: false, error: error?.message || 'Text extraction failed' }, { status: 500 });
  }
}
