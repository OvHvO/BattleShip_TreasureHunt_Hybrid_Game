"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Users, ArrowLeft, Play, RefreshCw, Wifi, WifiOff } from "lucide-react"
import { ProtectedRoute } from "@/components/protected-route"
import { useAuth } from "@/lib/auth-context"
import { useRoomWebSocket } from "@/hooks/useRoomWebSocket"

interface Room {
  room_id: number
  room_code: string
  status: string
  created_at: string
  owner_id: number
  owner_username: string
  player_count: number
}

interface RoomPlayer {
  user_id: number
  username: string
  joined_at: string
}

export default function GameRoomPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  
  const roomId = params?.id as string
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null)
  const [authError, setAuthError] = useState<string | null>(null)

  // Check room access authorization with retry mechanism
  useEffect(() => {
    const checkRoomAccess = async (retryCount = 0) => {
      if (!user?.id || !roomId) return

      console.log(`Checking room access for user ${user.id} in room ${roomId} (attempt ${retryCount + 1})`)

      try {
        const response = await fetch(`/api/rooms/${roomId}/membership?user_id=${user.id}`)
        const data = await response.json()
        
        console.log('Room access response:', data)
        
        if (data.authorized) {
          console.log('User authorized for room access')
          setIsAuthorized(true)
        } else {
          // If not authorized and this is the first attempt, try once more after a delay
          // This handles potential race conditions during room creation
          if (retryCount === 0) {
            console.log('First authorization failed, retrying in 500ms...')
            setTimeout(() => checkRoomAccess(1), 500)
            return
          }
          
          console.log('User NOT authorized for room access:', data.message)
          setIsAuthorized(false)
          setAuthError(data.message || 'You are not authorized to access this room')
        }
      } catch (error) {
        console.error('Error checking room access:', error)
        
        // Retry once on network error
        if (retryCount === 0) {
          setTimeout(() => checkRoomAccess(1), 500)
          return
        }
        
        setIsAuthorized(false)
        setAuthError('Failed to verify room access')
      }
    }

    // Only check authorization if user is loaded
    if (user) {
      checkRoomAccess()
    }
  }, [user, roomId])

  // Early return if no room ID
  if (!roomId) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-background flex items-center justify-center">
          <Card className="max-w-md mx-auto">
            <CardHeader>
              <CardTitle className="text-center text-destructive">Error</CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <p className="text-muted-foreground">Invalid room ID</p>
              <Button onClick={() => router.push('/dashboard')}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Dashboard
              </Button>
            </CardContent>
          </Card>
        </div>
      </ProtectedRoute>
    )
  }
  
  // Use WebSocket for real-time updates
  const { 
    room, 
    players, 
    isConnected, 
    isConnecting,
    isPolling,
    error: wsError, 
    reconnect,
    disconnect
  } = useRoomWebSocket(roomId)
  
  const [leaving, setLeaving] = useState(false)
  const [startingGame, setStartingGame] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [gameIsStarting, setGameIsStarting] = useState(false)

  // Detect when game status changes to 'playing' - show transition UI
  useEffect(() => {
    if (room?.status === 'playing' && !gameIsStarting) {
      console.log('🎮 Game status detected as playing - showing transition UI')
      setGameIsStarting(true)
    }
  }, [room?.status, gameIsStarting])

  useEffect(() => {
    // Check if status becomes 'closed' (set by leave.ts)
    if (room?.status === 'closed') {
      console.log('🚪 Owner has left the room. Redirecting to dashboard.');
      
      // Immediately stop WebSocket/polling
      disconnect(); 
      
      // Notify user
      alert('The room owner has left. You will be redirected to the dashboard.');
      
      // Redirect to dashboard
      router.push('/dashboard');
    }
  }, [room?.status, router, disconnect]);

  // Handle WebSocket errors (but not polling mode)
  useEffect(() => {
    if (wsError && !isPolling) {
      setError(wsError)
    } else {
      setError(null)
    }
  }, [wsError, isPolling])

  const handleLeaveRoom = async () => {
    if (!user?.id) return
    
    setLeaving(true)
    
    // Stop polling/websocket immediately before leaving
    console.log('🛑 User leaving room - disconnecting polling/WebSocket')
    disconnect()
    
    try {
      const response = await fetch(`/api/room/${roomId}/leave`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: user.id
        })
      })
      
      if (response.ok) {
        const result = await response.json()
        
        // If room was deleted or user successfully left, go back to dashboard
        if (result.room_deleted || result.message.includes('Successfully left')) {
          router.push('/dashboard')
        }
      } else {
        const errorData = await response.json()
        alert(errorData.error || 'Failed to leave room')
      }
    } catch (error) {
      console.error('Failed to leave room:', error)
      alert('Failed to leave room. Please try again.')
    } finally {
      setLeaving(false)
    }
  }

  const handleStartGame = async () => {
    if (!user?.id || !room?.room_id) return
    
    setStartingGame(true)
    console.log(`🎮 Owner ${user.id} starting game for room ${roomId}`)
    
    try {
      // Use dedicated start game endpoint for synchronized game start
      const response = await fetch(`/api/rooms/${roomId}/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          owner_id: user.id
        })
      })
      
      if (response.ok) {
        const result = await response.json()
        console.log('✅ Game started successfully, redirecting all players...')
        
        // The owner redirects immediately
        // Other players will be redirected via polling when they detect status change
        router.push(`/game/${roomId}`)
      } else {
        const errorData = await response.json()
        console.error('❌ Failed to start game - Status:', response.status, 'Error:', errorData)
        alert(`Failed to start game: ${errorData.error || 'Unknown error'}`)
        setStartingGame(false)
      }
    } catch (error) {
      console.error('Failed to start game:', error)
      alert('Failed to start game. Please try again.')
      setStartingGame(false)
    }
    // Note: Don't set setStartingGame(false) on success - let the redirect happen
  }

  // Show loading while checking authorization or connecting
  if (isAuthorized === null || isConnecting || (!room && !error && !wsError && isAuthorized)) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">
              {isAuthorized === null 
                ? 'Verifying room access...' 
                : isConnecting 
                  ? 'Connecting to room...' 
                  : 'Loading room...'
              }
            </p>
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  // Show unauthorized access error
  if (isAuthorized === false) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-background flex items-center justify-center">
          <Card className="max-w-md mx-auto">
            <CardHeader>
              <CardTitle className="text-center text-destructive">Access Denied</CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <p className="text-muted-foreground">
                {authError || 'You do not have permission to access this room'}
              </p>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  You can only access rooms that you have joined.
                </p>
                <Button onClick={() => router.push('/dashboard')} className="w-full">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Dashboard
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </ProtectedRoute>
    )
  }

  if (error) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-background flex items-center justify-center">
          <Card className="max-w-md mx-auto">
            <CardHeader>
              <CardTitle className="text-center text-destructive">Error</CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <p className="text-muted-foreground">{error}</p>
              <Button onClick={() => router.push('/dashboard')}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Dashboard
              </Button>
            </CardContent>
          </Card>
        </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background relative">
        {/* Game Starting Overlay - Shown to all players when game starts */}
        {gameIsStarting && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center">
            <Card className="max-w-md mx-4 border-2 border-primary animate-pulse">
              <CardContent className="pt-6 text-center space-y-4">
                <div className="w-16 h-16 mx-auto border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                <h2 className="text-2xl font-bold text-primary">🎮 Game Starting!</h2>
                <p className="text-muted-foreground">
                  All players are being redirected to the game...
                </p>
                <p className="text-sm text-muted-foreground">
                  Please wait while we set everything up
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="container mx-auto px-4 py-4 sm:py-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6 sm:mb-8">
            <Button
              variant="outline"
              onClick={() => router.push('/dashboard')}
              className="w-full sm:w-auto"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Button>
            
            <div className="text-center flex-1">
              <h1 className="text-xl sm:text-2xl font-bold">Room {room?.room_code}</h1>
              <div className="flex items-center justify-center gap-2">
                <Badge variant={room?.status == 'waiting' ? 'default' : 'secondary'}>
                  {room?.status === 'waiting' ? 'Waiting' : 'Active'}
                </Badge>
                <div className="flex items-center gap-1">
                  {isConnected ? (
                    <Wifi className="h-3 w-3 text-green-500" />
                  ) : (
                    <WifiOff className="h-3 w-3 text-red-500" />
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={reconnect}
                    disabled={isConnecting}
                    className="h-6 w-6 p-0"
                  >
                    <RefreshCw className={`h-3 w-3 ${isConnecting ? 'animate-spin' : ''}`} />
                  </Button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {isConnected 
                  ? (isPolling
                      ? '🟡 Real-time updates via polling' 
                      : '🟢 Real-time updates via WebSocket')
                  : '🔴 Reconnecting...'
                }
              </p>
            </div>
            
            <Button
              variant="destructive"
              onClick={handleLeaveRoom}
              disabled={leaving}
              className="w-full sm:w-auto"
            >
              {leaving ? 'Leaving...' : 'Leave Room'}
            </Button>
          </div>

          <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
            <Card className="flex-1 lg:max-w-md">
              <CardHeader>
                <CardTitle className="flex items-center text-base sm:text-lg">
                  <Users className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                  Room Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Room Code</label>
                  <p className="text-xl sm:text-2xl font-mono font-bold">{room?.room_code}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Owner</label>
                  <p className="font-medium">{room?.owner_username}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Status</label>
                  <p className="font-medium capitalize">{room?.status}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Players</label>
                  <p className="font-medium">{players.length}/4 joined</p>
                  {players.length >= 4 && (
                    <Badge variant="secondary" className="mt-1">Room Full</Badge>
                  )}
                </div>
                
                {/* DEBUG: Show ownership and status info */}
                <div className="pt-4 border-t bg-muted/20 p-3 rounded-lg">
                  <p className="text-xs text-muted-foreground">
                    DEBUG - User ID: {user?.id}, Owner ID: {room?.owner_id}, Room Status: {room?.status}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Is Owner: {user?.id == room?.owner_id ? 'YES' : 'NO'}, Is Waiting: {room?.status == 'waiting' ? 'YES' : 'NO'}
                  </p>
                </div>

                {/* Start Game Button - Only visible to room owner */}
                {user?.id == room?.owner_id && room?.status == 'waiting' && (
                  <div className="pt-4 border-t space-y-3">
                    <Button
                      onClick={handleStartGame}
                      disabled={startingGame || players.length < 2}
                      className={`w-full text-sm sm:text-base ${players.length >= 2 ? 'bg-green-600 hover:bg-green-700 text-white animate-pulse' : ''}`}
                      size="lg"
                      variant={players.length >= 4 ? "default" : "secondary"}
                    >
                      <Play className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                      <span className="text-center">
                        {startingGame 
                          ? 'Starting Game - All Players Will Be Redirected...' 
                          : players.length < 4 
                            ? `Need 4 players to start (${players.length}/4)` 
                            : `🎮 START GAME NOW! (${players.length} players ready)`
                        }
                      </span>
                    </Button>
                    
                    {players.length < 4 && (
                      <div className="bg-muted/30 p-3 rounded-lg">
                        <p className="text-xs text-muted-foreground text-center">
                          ⚠️ Need exactly 4 players to start the game
                        </p>
                        <p className="text-xs text-muted-foreground text-center mt-1">
                          Share the room code <strong>{room?.room_code}</strong> with your friends!
                        </p>
                        <p className="text-xs text-muted-foreground text-center mt-1">
                          {4 - players.length} more player(s) needed
                        </p>
                      </div>
                    )}
                    
                    {players.length == 4 && (
                      <div className="bg-green-100 dark:bg-green-900/30 p-3 rounded-lg border border-green-300 dark:border-green-700">
                        <p className="text-sm font-medium text-green-800 dark:text-green-200 text-center">
                          🎉 Ready to start! Room is full with 4 players!
                        </p>
                        <p className="text-xs text-green-700 dark:text-green-300 text-center mt-1">
                          Click "START GAME NOW!" to begin - all players will be automatically redirected to the game!
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Show message when start button conditions aren't met */}
                {!(user?.id == room?.owner_id && room?.status == 'waiting') && (
                  <div className="pt-4 border-t">
                    <div className="bg-yellow-100 dark:bg-yellow-900/30 p-3 rounded-lg border border-yellow-300 dark:border-yellow-700">
                      <p className="text-sm text-yellow-800 dark:text-yellow-200 font-medium text-center">
                        {user?.id !== room?.owner_id 
                          ? "Only the room owner can start the game"
                          : room?.status !== 'waiting'
                            ? `Room status is "${room?.status}" - can only start when "waiting"`
                            : "Start button conditions not met"
                        }
                      </p>
                    </div>
                  </div>
                )}
                
                {/* Status message for non-owners */}
                {user?.id !== room?.owner_id && room?.status === 'waiting' && (
                  <div className="pt-4 border-t">
                    <div className={`p-3 rounded-lg text-center ${
                      players.length >= 4 
                        ? 'bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-700' 
                        : 'bg-muted/30'
                    }`}>
                      <p className={`text-sm ${
                        players.length >= 4 
                          ? 'text-green-800 dark:text-green-200 font-medium' 
                          : 'text-muted-foreground'
                      }`}>
                        {players.length >= 4
                          ? `🎮 Room is full! Waiting for ${room?.owner_username} to start the game...`
                          : `Waiting for ${room?.owner_username} to start the game...`
                        }
                      </p>
                      {players.length < 4 && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Need 4 players to start ({players.length}/4)
                        </p>
                      )}
                      {players.length >= 4 && (
                        <p className="text-xs text-green-700 dark:text-green-300 mt-1">
                          You'll be automatically redirected when the game starts!
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="flex-1">
              <CardHeader>
                <CardTitle className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                  <span className="text-base sm:text-lg">Players ({players.length}/4)</span>
                  {players.length === 4 && (
                    <Badge variant="default" className="bg-green-500 text-xs sm:text-sm">
                      Full Room!
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {players.map((player) => (
                    <div 
                      key={player.user_id}
                      className="flex items-center justify-between p-2 sm:p-3 rounded-lg border transition-all duration-200 hover:bg-muted/50"
                    >
                      <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-1">
                        <div className="w-6 h-6 sm:w-8 sm:h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground text-xs sm:text-sm font-bold flex-shrink-0">
                          {player.username.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-medium text-sm sm:text-base truncate">{player.username}</span>
                      </div>
                      {player.user_id === room?.owner_id && (
                        <Badge variant="secondary" className="text-xs flex-shrink-0">Owner</Badge>
                      )}
                    </div>
                  ))}
                  
                  {/* Empty slots visualization */}
                  {Array.from({ length: 4 - players.length }).map((_, index) => (
                    <div 
                      key={`empty-${index}`}
                      className="flex items-center justify-between p-2 sm:p-3 rounded-lg border border-dashed border-muted-foreground/30 bg-muted/20"
                    >
                      <div className="flex items-center space-x-2 sm:space-x-3">
                        <div className="w-6 h-6 sm:w-8 sm:h-8 bg-muted rounded-full flex items-center justify-center text-muted-foreground text-xs sm:text-sm flex-shrink-0">
                          ?
                        </div>
                        <span className="text-muted-foreground text-sm sm:text-base">Waiting for player...</span>
                      </div>
                    </div>
                  ))}
                  
                  {players.length === 0 && (
                    <p className="text-center text-muted-foreground py-8">
                      No players in this room yet
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
}
