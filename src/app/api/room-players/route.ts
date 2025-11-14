// /api/room-players/route.ts

import { NextRequest, NextResponse } from "next/server";
import { addPlayerToRoom, ApiError } from "@/lib/roomService"; // Import new function
// ... Your other imports ...

// ... Your GET function remains unchanged ...

// POST /api/room-players - Join a room
export async function POST(request: NextRequest) {
  try {
    const { room_id, user_id } = await request.json();

    if (!room_id || !user_id) {
      return NextResponse.json(
        { error: "Room ID and User ID are required" },
        { status: 400 }
      );
    }
    
    // --- Remove all old validations (check room, check user, check existing player) ---
    // --- Remove all INSERT and sendRoomUpdate code ---

    // Only thing to do: call your core logic function
    const newPlayer = await addPlayerToRoom(room_id, user_id);

    // Success!
    return NextResponse.json(newPlayer, { status: 201 });

  } catch (error) {
    console.error("Join room error:", error);
    
    // Catch our custom ApiError and return correct status code
    if (error instanceof ApiError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }

    // Catch all other unknown errors
    return NextResponse.json(
      { error: "Failed to join room" },
      { status: 500 }
    );
  }
}