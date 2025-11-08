import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db' // Make sure you import from db.ts

// Define the data type we expect to get from the user_stats table
type UserStats = {
  user_id: number;
  total_games_played: number;
  total_wins: number;
  total_score: number;
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

    // Key point: we use <UserStats> here, not <UserStats[]>
    // because we know that query() in db.ts returns T[]
    const statsResult = await query<UserStats>(
      `SELECT * FROM user_stats WHERE user_id = ?`,
      [userId]
    );

    if (statsResult.length === 0) {
      // If the user doesn't have any statistics yet (e.g., new user)
      // we return a default empty data to prevent frontend errors
      return NextResponse.json({
        user_id: userId,
        total_games_played: 0,
        total_wins: 0,
        total_score: 0,
      });
    }

    // statsResult is [ { ... } ], we return the first element
    return NextResponse.json(statsResult[0]);

  } catch (error) {
    console.error('Error fetching user stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user stats' },
      { status: 500 }
    )
  }
}