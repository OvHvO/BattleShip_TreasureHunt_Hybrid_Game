import { NextRequest, NextResponse } from 'next/server'
import { query, execute } from '@/lib/db'

// Used to check "existing result" (existingResult)
type ExistingResult = {
  result_id: number;
  score: number;
}

// Used to get "all player scores" (allPlayerScores)
type PlayerScore = {
  user_id: number;
  score: number;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: roomId } = await params
    
    // 1. Convert IDs
    const { user_id: userIdString, score_increment } = await request.json()
    
    const user_id = parseInt(userIdString, 10);
    const roomIdNum = parseInt(roomId, 10);

    if (isNaN(user_id) || isNaN(roomIdNum) || !score_increment) {
        return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }

    console.log(`🎯 Updating score for user ${user_id} in room ${roomIdNum}, increment: ${score_increment}`)

    // Check game_results record
    const existingResult = await query<ExistingResult>(`
      SELECT result_id, score FROM game_results 
      WHERE room_id = ? AND user_id = ?
    `, [roomIdNum, user_id])

    // 2. Declare variables
    let newScore: number;
    let game_won: boolean = false;

    if (existingResult.length > 0) {
      // Update existing score
      
      // --- 👇 [Fix 1 is here!] ---
      // Must use [0] to access the first element of the array!
      newScore = existingResult[0].score + score_increment
      
      await execute(`
        UPDATE game_results 
        SET score = ?, finished_at = CURRENT_TIMESTAMP 
        WHERE room_id = ? AND user_id = ?
      `, [newScore, roomIdNum, user_id])
      
      console.log(`✅ Updated score to ${newScore} for user ${user_id}`)
    } else {
      // Create new game result record
      newScore = score_increment; 
      
      const resultOnInsert = newScore >= 10 ? 'win' : 'lose';
      
      await execute(`
        INSERT INTO game_results (room_id, user_id, score, result, finished_at)
        VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
      `, [roomIdNum, user_id, newScore, resultOnInsert])
      
      console.log(`✅ Created new game result with score ${newScore} for user ${user_id}`)
    }

    // 3. Check winning condition
    if (newScore >= 10) { 
      game_won = true;
      console.log(`🎉 User ${user_id} has won the game in room ${roomIdNum}!`)
      
      // 4. Update rooms table
      await execute(`
        UPDATE rooms 
        SET status = 'finished', winner_id = ?
        WHERE room_id = ?
      `, [user_id, roomIdNum])

      // 5. Ensure winner's 'result' is 'win'
      await execute(`
        UPDATE game_results
        SET result = 'win'
        WHERE room_id = ? AND user_id = ?
      `, [roomIdNum, user_id])

      // --- 👇 [New logic: Update USER_STATS] ---
      console.log(`📈 Updating user_stats for all players in room ${roomIdNum}...`)

      // 6. Get all player scores
      const allPlayerScores = await query<PlayerScore>(`
        SELECT user_id, score FROM game_results WHERE room_id = ?
      `, [roomIdNum])

      // 7. Iterate through all players
      
      // --- 👇 [Fix 2 is here!] ---
      // Ensure 'for...of' loop on 'allPlayerScores' does *not* have extra square brackets []
      for (const player of allPlayerScores) {
        
        // (This way 'player' is PlayerScore type, not PlayerScore[])
        const isWinner = (player.user_id === user_id);
        const winsIncrement = isWinner ? 1 : 0;
        const finalScore = player.score; 

        // Insert or update user_stats table
        await execute(`
          INSERT INTO user_stats (user_id, total_games_played, total_wins, total_score)
          VALUES (?, 1, ?, ?)
          ON DUPLICATE KEY UPDATE
            total_games_played = total_games_played + 1,
            total_wins = total_wins + ?,
            total_score = total_score + ?
        `, [player.user_id, winsIncrement, finalScore, winsIncrement, finalScore])
      }
      
      console.log(`✅ Finished updating user_stats.`)
      // --- [New logic ends] ---
    }

    // 8. Return to frontend
    return NextResponse.json({ 
      success: true, 
      message: 'Score updated successfully',
      new_score: newScore,
      game_won: game_won
    })

  } catch (error) {
    console.error('❌ Error updating score:', error)
    return NextResponse.json(
      { error: 'Failed to update score' },
      { status: 500 }
    )
  }
}