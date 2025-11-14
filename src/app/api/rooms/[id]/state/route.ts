// src/app/api/rooms/[id]/state/route.ts
import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db"; // Assuming your db lib is here

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const roomId = parseInt(id);
    if (isNaN(roomId)) {
      return NextResponse.json({ error: "Invalid room ID" }, { status: 400 });
    }

    // 1. Get room information in one query
    const roomResult = await query(
      `
      SELECT 
        r.room_id, r.room_code, r.status, r.created_at, r.owner_id, 
        u.username as owner_username
      FROM rooms r 
      JOIN users u ON r.owner_id = u.user_id 
      WHERE r.room_id = ?
      `,
      [roomId]
    );

    if (roomResult.length === 0) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    // 2. Get player list in another query
    const playersResult = await query(
      `
      SELECT rp.user_id, u.username, rp.joined_at 
      FROM room_players rp 
      JOIN users u ON rp.user_id = u.user_id 
      WHERE rp.room_id = ? 
      ORDER BY rp.joined_at ASC
      `,
      [roomId]
    );

    // 3. Merge and return in one response
    return NextResponse.json({
      room: { ...roomResult[0], player_count: playersResult.length }, // Dynamically calculate player_count
      players: playersResult,
    });

  } catch (error) {
    console.error("Get room state error:", error);
    return NextResponse.json(
      { error: "Failed to fetch room state" },
      { status: 500 }
    );
  }
}