import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { studentId, loginId, rollNumber, semester, section } = body;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({
        success: true,
        message: 'Supabase credentials not configured on server; local purge will take effect.',
      });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Delete associated submissions to avoid Foreign Key constraint errors
    if (studentId) {
      await supabase.from('submissions').delete().eq('student_id', studentId);
    }
    if (rollNumber != null && semester != null && section) {
      await supabase
        .from('submissions')
        .delete()
        .eq('student_roll_number', Number(rollNumber))
        .eq('student_semester', Number(semester))
        .eq('student_section', String(section));
    }

    // 2. Delete user by ID, Login ID, and (semester, section, roll_number) triple
    if (studentId) {
      await supabase.from('users').delete().eq('id', studentId);
    }
    if (loginId) {
      await supabase.from('users').delete().eq('login_id', loginId);
    }
    if (rollNumber != null && semester != null && section) {
      await supabase
        .from('users')
        .delete()
        .eq('role', 'student')
        .eq('roll_number', Number(rollNumber))
        .eq('semester', Number(semester))
        .eq('section', String(section));
    }

    return NextResponse.json({
      success: true,
      message: 'Student record and submissions purged successfully from cloud database.',
    });
  } catch (error: any) {
    console.error('Error in /api/admin/delete-student:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to delete student record' },
      { status: 500 }
    );
  }
}
