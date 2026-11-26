import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * GET /api/submissions?assignmentId=asg-xxx
 *
 * Server-side route that queries Supabase directly using server environment
 * variables (always available on Vercel, even when NEXT_PUBLIC_ vars are
 * missing from the client bundle built in development).
 *
 * This solves the critical bug where the teacher portal client-side code
 * called supabaseService.fetchSubmissions() which returned null because
 * isSupabaseConfigured = false (NEXT_PUBLIC_ vars not in client bundle).
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const assignmentId = searchParams.get('assignmentId');

  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    '';

  // Return diagnostics in the response so we can see exactly what's wrong in the browser
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json(
      {
        success: false,
        error: 'Supabase not configured on server',
        diagnostic: {
          hasUrl: !!supabaseUrl,
          hasKey: !!supabaseKey,
          urlPrefix: supabaseUrl ? supabaseUrl.slice(0, 30) : 'MISSING',
        },
        submissions: [],
      },
      { status: 503 }
    );
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // Select specific lightweight columns ONLY — deliberately skip the heavy `files` JSONB
    // column which may contain legacy multi-MB base64 strings causing statement timeouts.
    // File URLs are still available via the `file_url` column and the sanitized `files` metadata.
    const selectColumns = [
      'id',
      'assignment_id',
      'student_id',
      'student_name',
      'student_roll_number',
      'student_semester',
      'student_section',
      'submitted_at',
      'status',
      'marks',
      'feedback',
      'text_submission',
      'integrity_report',
      'file_url',
      'ai_suggested_score',
      'test_cases_passed',
      'test_cases_total',
    ].join(', ');
    let query = supabase
      .from('submissions')
      .select(selectColumns)
      .order('submitted_at', { ascending: false });

    // Filter by specific assignment if provided
    if (assignmentId) {
      query = query.eq('assignment_id', assignmentId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[/api/submissions] Supabase error:', error);
      return NextResponse.json(
        { success: false, error: error.message, errorCode: error.code, hint: error.hint, submissions: [] },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      count: data?.length ?? 0,
      assignmentId: assignmentId || 'all',
      submissions: data || [],
    });
  } catch (err: any) {
    console.error('[/api/submissions] Exception:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Unknown error', submissions: [] },
      { status: 500 }
    );
  }
}
