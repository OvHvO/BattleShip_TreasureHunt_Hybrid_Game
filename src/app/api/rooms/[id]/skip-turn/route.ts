import { NextRequest, NextResponse } from "next/server"
import { query, execute } from "@/lib/db"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const roomId = parseInt(id)
    const { user_id: userIdString } = await request.json() // 1. Rename to userIdString

    // Validate input
    if (isNaN(roomId)) {
      return NextResponse.json(
        { error: "Invalid room ID" },
        { status: 400 }
      )
    }

    if (!userIdString) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      )
    }

    // 2. Convert user_id to number
    const user_id = parseInt(userIdString, 10)
    if (isNaN(user_id)) {
      return NextResponse.json(
        { error: "Invalid user ID" },
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

    // 3. Now the comparison is number === number (e.g., 123 === 123)
    if (room.current_turn_user_id !== user_id) {
      return NextResponse.json(
        { error: "It's not your turn" },
        { status: 403 }
      )
    }

    // Get all active players in turn order
    const activePlayers = await query(
      `SELECT rp.user_id 
       FROM room_players rp
       WHERE rp.room_id = ? AND rp.status = 'active'
       ORDER BY rp.joined_at ASC`,
      [roomId]
    )

    if (activePlayers.length === 0) {
      return NextResponse.json(
        { error: "No active players found" },
        { status: 400 }
      )
    }

    // 4. The comparison here is now also correct (number === number)
    const currentIndex = activePlayers.findIndex((p: any) => p.user_id === user_id)
    const nextIndex = (currentIndex + 1) % activePlayers.length
    const nextPlayerId = activePlayers[nextIndex].user_id

    // Update room with next player's turn
    await execute(
      "UPDATE rooms SET current_turn_user_id = ? WHERE room_id = ?",
      [nextPlayerId, roomId]
    )

    return NextResponse.json({
      message: "Turn skipped successfully",
      next_turn_user_id: nextPlayerId
    })
  } catch (error) {
    console.error("Skip turn error:", error)
    return NextResponse.json(
      { error: "Failed to skip turn" },
      { status: 500 }
    )
  }
}