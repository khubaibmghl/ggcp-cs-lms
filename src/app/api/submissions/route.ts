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

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json(
      { success: false, error: 'Supabase not configured on server', submissions: [] },
      { status: 503 }
    );
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    let query = supabase
      .from('submissions')
      .select('*')
      .order('submitted_at', { ascending: false });

    // Filter by specific assignment if provided
    if (assignmentId) {
      query = query.eq('assignment_id', assignmentId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[/api/submissions] Supabase error:', error);
      return NextResponse.json(
        { success: false, error: error.message, submissions: [] },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, submissions: data || [] });
  } catch (err: any) {
    console.error('[/api/submissions] Exception:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Unknown error', submissions: [] },
      { status: 500 }
    );
  }
}
