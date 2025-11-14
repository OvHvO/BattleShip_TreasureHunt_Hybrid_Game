// /api/rooms/[id]/join/route.ts

import { NextRequest, NextResponse } from "next/server";
import { addPlayerToRoom, ApiError } from "@/lib/roomService"; // Import new function

// ... Your GET function remains unchanged ...

// POST /api/rooms/[id]/join - Join room by room ID
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const roomId = parseInt(id);
    const { user_id } = await request.json(); // Assuming user_id comes from body

    if (isNaN(roomId)) {
      return NextResponse.json(
        { error: "Invalid room ID" },
        { status: 400 }
      );
    }

    if (!user_id) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    // --- Remove all old validations (check room capacity, check existing player) ---
    // --- Remove all fetch code ---

    // Only thing to do: call your core logic function
    const newPlayer = await addPlayerToRoom(roomId, user_id);

    // Success!
    return NextResponse.json(newPlayer, { status: 201 });

  } catch (error) {
    console.error("Join room by ID error:", error);

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