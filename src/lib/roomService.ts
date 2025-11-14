// src/lib/roomService.ts

import { query, execute } from "@/lib/db";
import { sendRoomUpdate } from "../../pages/api/websocket"; // Adjust this import path

const MAX_PLAYERS = 4;

/**
 * Custom error class for catching and returning correct HTTP status codes in API routes
 */
export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
    this.name = "ApiError";
  }
}

/**
 * Core business logic: Add a player to a room
 * This function contains all validations
 */
export async function addPlayerToRoom(roomId: number, userId: number) {
  // Check if room exists, status is correct, and if it's full
  // We can complete most checks in a single query
  const roomCheck = await query(
    `
    SELECT 
      r.room_id,
      r.status,
      COUNT(rp.user_id) as current_players
    FROM rooms r
    LEFT JOIN room_players rp ON r.room_id = rp.room_id
    WHERE r.room_id = ?
    GROUP BY r.room_id, r.status
    `,
    [roomId]
  );

  if (roomCheck.length === 0) {
    throw new ApiError("Room not found", 404);
  }

  const room = roomCheck[0];

  if (room.status !== 'waiting') {
    throw new ApiError("Room is not accepting new players", 400); // 400 Bad Request or 403 Forbidden
  }

  if (room.current_players >= MAX_PLAYERS) {
    throw new ApiError(`Room is full (maximum ${MAX_PLAYERS} players)`, 400); // 400 Bad Request
  }

  // Check if user exists (if your database foreign key doesn't handle it automatically)
  const users = await query(
    "SELECT user_id FROM users WHERE user_id = ?",
    [userId]
  );

  if (users.length === 0) {
    throw new ApiError("User not found", 404);
  }

  // Check if user is already in the room
  const existingRoomPlayer = await query(
    "SELECT id FROM room_players WHERE room_id = ? AND user_id = ?",
    [roomId, userId]
  );

  if (existingRoomPlayer.length > 0) {
    // This situation is not a real "error", but more like a "conflict"
    throw new ApiError("User is already in this room", 409); // 409 Conflict
  }

  // All checks passed: Add user to room
  const result = await execute(
    "INSERT INTO room_players (room_id, user_id) VALUES (?, ?)",
    [roomId, userId]
  );

  const roomPlayerId = (result as any).insertId;

  // Send WebSocket update
  await sendRoomUpdate(roomId.toString());

  // Return successfully created player object
  const newPlayer = {
    id: roomPlayerId,
    room_id: roomId,
    user_id: userId,
    joined_at: new Date().toISOString()
  };

  return newPlayer;
}