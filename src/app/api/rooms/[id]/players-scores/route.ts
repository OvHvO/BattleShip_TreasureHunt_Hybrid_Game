import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: roomId } = await params

    console.log(`📊 Fetching players with scores for room ${roomId}`)

    // Get all players in the room with their scores from game_results
    const playersWithScores = await query(`
      SELECT 
        u.user_id as id,
        u.username,
        COALESCE(gr.score, 0) as score,
        rp.status
      FROM room_players rp
      JOIN users u ON rp.user_id = u.user_id
      LEFT JOIN game_results gr ON gr.room_id = rp.room_id AND gr.user_id = u.user_id
      WHERE rp.room_id = ?
      ORDER BY COALESCE(gr.score, 0) DESC
    `, [roomId])

    console.log(`✅ Found ${playersWithScores.length} players with scores`)

    return NextResponse.json(playersWithScores)
  } catch (error) {
    console.error('❌ Error fetching players with scores:', error)
    return NextResponse.json(
      { error: 'Failed to fetch players with scores' },
      { status: 500 }
    )
  }
}