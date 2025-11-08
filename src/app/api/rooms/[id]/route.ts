import { NextRequest, NextResponse } from "next/server";
import { query, execute } from "@/lib/db";
import { sendRoomUpdate, broadcastGameStart } from "../../../../../pages/api/websocket";

type Room = {
  room_id: number;
  room_code: string;
  status: 'waiting' | 'playing' | 'finished';
  created_at: string;
  owner_id: number;
  current_turn_user_id: number | null;
  winner_id: number | null;
};

// GET /api/rooms/[id] - Get room by ID with players
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const roomId = parseInt(id);
    
    // Debug: Log who's making the request
    const userAgent = request.headers.get('user-agent')
    const referer = request.headers.get('referer')
    console.log(`🔍 Room ${roomId} requested by: ${userAgent?.slice(0, 50)}... from: ${referer}`)

    if (isNaN(roomId)) {
      return NextResponse.json(
        { error: "Invalid room ID" },
        { status: 400 }
      );
    }

    // Get room details with owner info
    const rooms = await query<Room & {owner_username: string}>(
      `
      SELECT 
        r.room_id, 
        r.room_code, 
        r.status, 
        r.created_at, 
        r.owner_id,
        r.current_turn_user_id,
        r.winner_id,
        u.username as owner_username
      FROM rooms r
      JOIN users u ON r.owner_id = u.user_id
      WHERE r.room_id = ?
      `,
      [roomId]
    );

    if (rooms.length === 0) {
      return NextResponse.json(
        { error: "Room not found" },
        { status: 404 }
      );
    }

    const room = rooms[0];

    // Get all players in the room
    const players = await query<{user_id: number; username: string; joined_at: string}>(
      `
      SELECT rp.user_id, u.username, rp.joined_at
      FROM room_players rp
      JOIN users u ON rp.user_id = u.user_id
      WHERE rp.room_id = ?
      ORDER BY rp.joined_at ASC
      `,
      [roomId]
    );

    return NextResponse.json({
      room: {
        ...room,
        players,
        player_count: players.length
      }
    });
  } catch (error) {
    console.error("Get room error:", error);
    return NextResponse.json(
      { error: "Failed to fetch room" },
      { status: 500 }
    );
  }
}

// PUT /api/rooms/[id] - Update room status
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const roomId = parseInt(id);
    const { status, owner_id } = await request.json();

    if (isNaN(roomId)) {
      return NextResponse.json(
        { error: "Invalid room ID" },
        { status: 400 }
      );
    }

    if (!status || !['waiting', 'playing', 'finished'].includes(status)) {
      return NextResponse.json(
        { error: "Valid status is required (waiting, playing, finished)" },
        { status: 400 }
      );
    }

    // Check if room exists and verify ownership
    const rooms = await query<Room>(
      "SELECT * FROM rooms WHERE room_id = ?",
      [roomId]
    );

    if (rooms.length === 0) {
      return NextResponse.json(
        { error: "Room not found" },
        { status: 404 }
      );
    }

    const room = rooms[0];

    // Only room owner can update room status
    if (owner_id && room.owner_id != owner_id) {
      return NextResponse.json(
        { error: "Only room owner can update room status" },
        { status: 403 }
      );
    }

    // Update room status
    await execute(
      "UPDATE rooms SET status = ? WHERE room_id = ?",
      [status, roomId]
    );

    // Send WebSocket updates
    if (status === 'playing') {
      // Broadcast game start to all players in the room
      await broadcastGameStart(roomId.toString());
    } else {
      // Send regular room update
      await sendRoomUpdate(roomId.toString());
    }

    return NextResponse.json({
      message: "Room status updated successfully",
      room: {
        ...room,
        status
      }
    });
  } catch (error) {
    console.error("Update room error:", error);
    return NextResponse.json(
      { error: "Failed to update room" },
      { status: 500 }
    );
  }
}

// DELETE /api/rooms/[id] - Delete room
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const roomId = parseInt(id);
    const { searchParams } = new URL(request.url);
    const ownerId = parseInt(searchParams.get('owner_id') || '0');

    if (isNaN(roomId)) {
      return NextResponse.json(
        { error: "Invalid room ID" },
        { status: 400 }
      );
    }

    // Check if room exists and verify ownership
    const rooms = await query<Room>(
      "SELECT * FROM rooms WHERE room_id = ?",
      [roomId]
    );

    if (rooms.length === 0) {
      return NextResponse.json(
        { error: "Room not found" },
        { status: 404 }
      );
    }

    const room = rooms[0];

    // Only room owner can delete room
    if (ownerId && room.owner_id !== ownerId) {
      return NextResponse.json(
        { error: "Only room owner can delete room" },
        { status: 403 }
      );
    }

    // Delete room (this should cascade delete room_players and game_results if foreign keys are set up)
    await execute("DELETE FROM rooms WHERE room_id = ?", [roomId]);

    return NextResponse.json({ message: "Room deleted successfully" });
  } catch (error) {
    console.error("Delete room error:", error);
    return NextResponse.json(
      { error: "Failed to delete room" },
      { status: 500 }
    );
  }
}