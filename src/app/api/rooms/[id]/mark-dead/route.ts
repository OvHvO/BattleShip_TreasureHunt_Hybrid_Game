import { NextRequest, NextResponse } from "next/server"
import { query, execute } from "@/lib/db"

// POST /api/rooms/[id]/mark-dead - Mark player as dead and check for winner
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const roomId = parseInt(id)
    // 1. Get user_id from body (it's a string)
    const { user_id: userIdString } = await request.json()

    // Validate input
    if (isNaN(roomId)) {
      return NextResponse.json(
        { error: "Invalid room ID" },
        { status: 400 }
      )
    }

    // 2. Convert the user_id string to a number
    const user_id = parseInt(userIdString, 10);

    if (isNaN(user_id)) {
      return NextResponse.json(
        { error: "Invalid user ID format" },
        { status: 400 }
      )
    }

    // Check if it's the user's turn
    const roomData = await query(
      "SELECT current_turn_user_id, status FROM rooms WHERE room_id = ?",
      [roomId]
    )

    if (roomData.length === 0) {
      return NextResponse.json(
        { error: "Room not found" },
        { status: 404 }
      )
    }

    const room = roomData[0]

    if (room.status !== 'playing') {
      return NextResponse.json(
        { error: "Game is not in playing state" },
        { status: 400 }
      )
    }

    // 3. Now this comparison works! (number === number)
    if (room.current_turn_user_id !== user_id) {
      console.error(`Turn Check Failed: DB Turn (${typeof room.current_turn_user_id}) ${room.current_turn_user_id} !== Request User (${typeof user_id}) ${user_id}`);
      return NextResponse.json(
        { error: "It's not your turn" },
        { status: 403 }
      )
    }

    // Mark player as dead
    await execute(
      "UPDATE room_players SET status = 'dead' WHERE room_id = ? AND user_id = ?",
      [roomId, user_id]
    )

    // Check how many active players remain
    const activePlayers = await query(
      `SELECT user_id 
       FROM room_players 
       WHERE room_id = ? AND status = 'active'
       ORDER BY joined_at ASC`,
      [roomId]
    )

    // If only 1 active player remains, they win
    if (activePlayers.length === 1) {
      const winnerId = activePlayers[0].user_id

      await execute(
        "UPDATE rooms SET status = 'finished', winner_id = ?, current_turn_user_id = NULL WHERE room_id = ?",
        [winnerId, roomId]
      )

      // Update game results
      await execute(
        "UPDATE game_results SET result = 'win' WHERE room_id = ? AND user_id = ?",
        [roomId, winnerId]
      )

      await execute(
        "UPDATE game_results SET result = 'lose' WHERE room_id = ? AND user_id != ?",
        [roomId, winnerId]
      )

      return NextResponse.json({
        message: "Player marked as dead. Game over!",
        game_won: true,
        winner_id: winnerId,
        remaining_players: 1
      })
    }

    // Game continues - find next active player
    // Since the current player is now dead, they are not in `activePlayers`.
    // We just find the next player based on the original turn order.
    const allPlayersInTurnOrder = await query(
      `SELECT user_id FROM room_players WHERE room_id = ? ORDER BY joined_at ASC`,
      [roomId]
    )
    
    const currentIndex = allPlayersInTurnOrder.findIndex((p: any) => p.user_id === user_id)
    
    let nextPlayerId = -1;
    let nextIndex = (currentIndex + 1) % allPlayersInTurnOrder.length;

    // Loop until we find an active player
    for (let i = 0; i < allPlayersInTurnOrder.length; i++) {
      const potentialNextPlayerId = allPlayersInTurnOrder[nextIndex].user_id;
      const isActive = activePlayers.some((p: any) => p.user_id === potentialNextPlayerId);
      
      if (isActive) {
        nextPlayerId = potentialNextPlayerId;
        break;
      }
      nextIndex = (nextIndex + 1) % allPlayersInTurnOrder.length;
    }

    if (nextPlayerId === -1) {
       // This shouldn't happen if activePlayers.length >= 1, but as a fallback
       nextPlayerId = activePlayers[0].user_id;
    }

    // Update room with next player's turn
    await execute(
      "UPDATE rooms SET current_turn_user_id = ? WHERE room_id = ?",
      [nextPlayerId, roomId]
    )

    return NextResponse.json({
      message: "Player marked as dead successfully",
      game_won: false,
      next_turn_user_id: nextPlayerId,
      remaining_players: activePlayers.length
    })
  } catch (error) {
    console.error("Mark dead error:", error)
    return NextResponse.json(
      { error: "Failed to mark player as dead" },
      { status: 500 }
    )
  }
}