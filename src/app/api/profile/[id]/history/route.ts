import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'

// Define the data type returned by the JOIN query
type GameHistoryRow = {
  result_id: number;
  score: number;
  result: 'win' | 'lose' | 'draw';
  finished_at: string; // (Date will be converted to string)
  room_name: string;   // (Joined from rooms table)
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userId = parseInt(id, 10);
    if (isNaN(userId)) {
      return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });
    }

    // Key point: use <GameHistoryRow>, not <GameHistoryRow[]>
    const historyResult = await query<GameHistoryRow>(`
      SELECT 
        gr.result_id, 
        gr.score, 
        gr.result, 
        gr.finished_at,
        r.room_code AS room_name 
      FROM game_results gr
      JOIN rooms r ON gr.room_id = r.room_id
      WHERE gr.user_id = ?
      ORDER BY gr.finished_at DESC
      LIMIT 20 
    `, [userId]); // (For example, only show the most recent 20 games)

    // Here historyResult is already the T[] we want (i.e., GameHistoryRow[])
    return NextResponse.json(historyResult);

  } catch (error) {
    console.error('Error fetching game history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch game history' },
      { status: 500 }
    )
  }
}