import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { assignmentId } = body;

    if (!assignmentId) {
      return NextResponse.json(
        { success: false, error: 'Assignment ID is required' },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({
        success: true,
        message: 'Supabase credentials not configured on server; local purge will take effect.',
      });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Delete associated submissions first to satisfy PostgreSQL foreign key constraints
    const { error: subErr } = await supabase
      .from('submissions')
      .delete()
      .eq('assignment_id', assignmentId);

    if (subErr) {
      console.warn('[Server Delete Assignment] Submissions delete warning:', subErr);
    }

    // 2. Delete the assignment record
    const { error: asgErr } = await supabase
      .from('assignments')
      .delete()
      .eq('id', assignmentId);

    if (asgErr) {
      console.warn('[Server Delete Assignment] Assignment delete warning:', asgErr);
      return NextResponse.json(
        { success: false, error: asgErr.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Assignment and all linked submissions permanently deleted from cloud database.',
    });
  } catch (error: any) {
    console.error('Error in /api/teacher/delete-assignment:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to delete assignment' },
      { status: 500 }
    );
  }
}
