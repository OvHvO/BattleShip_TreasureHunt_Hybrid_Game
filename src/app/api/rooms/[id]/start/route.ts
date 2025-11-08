import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: roomId } = await context.params
    const body = await request.json()
    const { owner_id } = body

    console.log(`🎮 Starting game for room ${roomId} by owner ${owner_id}`)

    // Verify the requester is the room owner
    const roomCheck = await query(
      'SELECT owner_id, status FROM rooms WHERE room_id = ?',
      [roomId]
    )

    if (!Array.isArray(roomCheck) || roomCheck.length === 0) {
      return NextResponse.json(
        { error: 'Room not found' },
        { status: 404 }
      )
    }

    const room = roomCheck[0] as { owner_id: number; status: string }

    console.log(`🔍 Authorization check - Room owner: ${room.owner_id} (${typeof room.owner_id}), Requester: ${owner_id} (${typeof owner_id})`)

    // Use == for loose comparison to handle string vs number
    if (room.owner_id != owner_id) {
      console.error(`❌ Authorization failed - ${owner_id} is not the owner (${room.owner_id})`)
      return NextResponse.json(
        { error: 'Only the room owner can start the game' },
        { status: 403 }
      )
    }

    if (room.status === 'playing') {
      return NextResponse.json(
        { error: 'Game has already started' },
        { status: 400 }
      )
    }

    // Get the first player (by joined_at) to set as the starting turn
    const firstPlayer = await query(
      'SELECT user_id FROM room_players WHERE room_id = ? ORDER BY joined_at ASC LIMIT 1',
      [roomId]
    )

    if (!Array.isArray(firstPlayer) || firstPlayer.length === 0) {
      return NextResponse.json(
        { error: 'No players found in room' },
        { status: 400 }
      )
    }

    const firstPlayerId = firstPlayer[0].user_id

    // Update room status to 'playing' and set first player's turn
    await query(
      'UPDATE rooms SET status = ?, current_turn_user_id = ? WHERE room_id = ?',
      ['playing', firstPlayerId, roomId]
    )

    console.log(`✅ Room ${roomId} status updated to 'playing', first turn: player ${firstPlayerId}`)

    // Return success - clients will detect the status change via polling
    return NextResponse.json({
      success: true,
      message: 'Game started successfully',
      roomId,
      redirectTo: `/game/${roomId}`
    })

  } catch (error) {
    console.error('Error starting game:', error)
    return NextResponse.json(
      { error: 'Failed to start game' },
      { status: 500 }
    )
  }
}
