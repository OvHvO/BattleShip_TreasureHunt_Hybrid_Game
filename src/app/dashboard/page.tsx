"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Search, Users, Clock, Play } from "lucide-react"
import { ProtectedRoute } from "@/components/protected-route"
import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import { ThemeToggle } from "@/components/theme-toggle"



export default function DashboardPage() {
  const { user, logout } = useAuth()
  const router = useRouter()

  const [searchTerm, setSearchTerm] = useState("")
  const [showCreateRoom, setShowCreateRoom] = useState(false)
  const [roomName, setRoomName] = useState("")
  const [isCreating, setIsCreating] = useState(false)
  const [showInputForm, setShowInputForm] = useState(false)

  const handleCreateRoom = async () => {
    setIsCreating(true)
    
    try {
      console.log("Creating new room...")
      
      // Call API to create room
      const response = await fetch('/api/rooms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          owner_id: user?.id
        })
      })
      
      if (!response.ok) {
        throw new Error('Failed to create room')
      }
      
      const data = await response.json()
      
      setRoomName("")
      setShowInputForm(false) 
      setIsCreating(false) 

      // Add a small delay to ensure database transaction is committed
      // This helps prevent race conditions with authorization checks
      setTimeout(() => {
        console.log(`Navigating to room: ${data.room.room_id}`)
        router.push(`/room/${data.room.room_id}`)
      }, 200)
    } catch (error) {
      console.error('Error creating room:', error)
      setIsCreating(false)
      // You might want to show an error message to the user here
      alert('Failed to create room. Please try again.')
    }
  }

  const handleJoinRoom = async (roomCode: string) => {
    if (roomCode.trim()) {
      setIsCreating(true)
      
      try {
        console.log("Joining room with code:", roomCode)
        
        // First, find the room by code
        const findRoomResponse = await fetch(`/api/rooms/code/${roomCode}`)
        
        if (!findRoomResponse.ok) {
          throw new Error('Room not found')
        }
        
        const roomData = await findRoomResponse.json()
        const roomId = roomData.room.room_id
        
        // Then join the room
        const joinResponse = await fetch(`/api/rooms/${roomId}/join`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            user_id: user?.id
          })
        })
        
        if (!joinResponse.ok) {
          const errorData = await joinResponse.json()
          throw new Error(errorData.error || 'Failed to join room')
        }
        
        setRoomName("")
        setShowInputForm(false) 
        setIsCreating(false)
        
        // Navigate to the room
        router.push(`/room/${roomId}`)
      } catch (error) {
        console.error('Error joining room:', error)
        setIsCreating(false)
        // Show error message to user
        alert(error instanceof Error ? error.message : 'Failed to join room. Please check the room code and try again.')
      }
    }
  }

  // const handleCreateRoom = () => {
  //   if (roomName.trim()) {
  //     // TODO: Implement room creation logic
  //     console.log("Creating room:", roomName)
  //     setRoomName("")
  //     setShowCreateRoom(false)
  //     // Navigate to the created room
  //     router.push("/room/new-room-id")
  //   }
  // }

  // const handleJoinRoom = (roomId: number) => {
  //   // TODO: Implement join room logic
  //   console.log("Joining room:", roomId)
  //   router.push(`/room/${roomId}`)
  // }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background relative overflow-hidden">
        <div className="fixed inset-0 pointer-events-none">
          {/* Background waves */}
          <svg className="absolute bottom-0 left-0 w-full h-64" viewBox="0 0 1200 300" preserveAspectRatio="none">
            <defs>
              <linearGradient id="wave1" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#1C2321" stopOpacity="0.3" />
                <stop offset="50%" stopColor="#5E6572" stopOpacity="0.2" />
                <stop offset="100%" stopColor="#1C2321" stopOpacity="0.3" />
              </linearGradient>
              <linearGradient id="wave2" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#5E6572" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#E6E49F" stopOpacity="0.3" />
              </linearGradient>
              <linearGradient id="wave3" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#E6E49F" stopOpacity="0.5" />
                <stop offset="100%" stopColor="#1C2321" stopOpacity="0.4" />
              </linearGradient>
            </defs>

            {/* Wave layers */}
            <path d="M0,200 C300,150 600,250 1200,180 L1200,300 L0,300 Z" fill="url(#wave1)" />
            <path d="M0,220 C400,170 800,270 1200,200 L1200,300 L0,300 Z" fill="url(#wave2)" />
            <path d="M0,240 C200,190 1000,290 1200,220 L1200,300 L0,300 Z" fill="url(#wave3)" />
          </svg>
        </div>

        {/* Header */}
        <header className="border-b border-border bg-card/80 backdrop-blur-sm relative z-10">
          <div className="container mx-auto px-4 py-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-foreground">GameHub Dashboard</h1>
                <p className="text-sm sm:text-base text-muted-foreground">Welcome back, {user?.username}!</p>
              </div>
              <div className="flex items-center gap-2 sm:gap-4">
                <ThemeToggle />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push("/profile")}
                  className="text-xs sm:text-sm bg-transparent"
                >
                  Profile
                </Button>
                <Button variant="outline" size="sm" onClick={logout} className="text-xs sm:text-sm bg-transparent">
                  Logout
                </Button>
              </div>
            </div>
          </div>
        </header>

        <div className="container mx-auto px-4 py-0 relative z-10">
          {/* Centered Quick Actions */}
          <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)]">
            <div className="w-full max-w-md mx-auto space-y-6">
              {/* Main Actions Card */}
              <Card className="transform hover:scale-[1.02] transition-transform duration-200">
                <CardHeader className="text-center">
                  <CardTitle className="text-xl sm:text-2xl">Quick Actions</CardTitle>
                  <CardDescription className="text-sm sm:text-base">Start your gaming session</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                {/* Initial State: Show main options */}
                {!showInputForm ? (
                    <>
                        <Button
                            // Changed onClick: Should trigger the JOIN BY CODE flow
                            onClick={() => {
                                // We'll use this state to show the input form
                                setShowInputForm(true)
                                // We'll use a new state (e.g., isCreating) to track the mode
                                setIsCreating(false) // Not creating, so we are joining
                            }}
                            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground text-sm sm:text-base hover:scale-105 transition-all duration-200"
                            size="lg"
                        >
                            <Play className="mr-2 h-4 w-4" />
                            Join Room by Code
                        </Button>
                        <Button 
                            // Changed onClick: Should trigger the CREATE ROOM flow
                            onClick={handleCreateRoom} //Directly create room on click
                            variant="outline" 
                            className="flex-1 text-sm sm:text-base hover:scale-105 transition-all duration-200 w-full bg-transparent" 
                            size="lg"
                            disabled={isCreating}
                        >
                            <Users className="mr-2 h-4 w-4" />
                            {isCreating ? "Creating..." : "Create New Room"}
                        </Button>
                    </>
                // State when an action (Create or Join) is selected: Show Input form
                ) : (
                        <div className="space-y-3">
                            <Input
                                placeholder="Enter room code to join..."
                                value={roomName}
                                onChange={(e) => setRoomName(e.target.value)}
                                onKeyPress={(e) => e.key === "Enter" && handleJoinRoom(roomName)}
                                className="text-sm sm:text-base"
                            />
                            <div className="flex gap-2">
                                <Button
                                    onClick={() => handleJoinRoom(roomName)}
                                    className="flex-1 bg-primary hover:bg-primary/90 text-sm sm:text-base"
                                    disabled={!roomName.trim() || isCreating}
                                >
                                    {isCreating ? "Joining..." : "Join"}
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        setShowInputForm(false)
                                        setRoomName("")
                                    }}
                                    className="flex-1 text-sm sm:text-base"
                                >
                                    Cancel
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
              </Card>

              {/* Player Stats Card
              <Card className="transform hover:scale-[1.02] transition-transform duration-200">
                <CardHeader className="text-center">
                  <CardTitle className="text-lg sm:text-xl">Your Stats</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-6 text-center">
                    <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
                      <div className="text-2xl sm:text-3xl font-bold text-primary">{user?.stats.gamesWon || 0}</div>
                      <div className="text-xs sm:text-sm text-muted-foreground mt-1">Games Won</div>
                    </div>
                    <div className="p-4 rounded-lg bg-secondary/10 border border-secondary/20">
                      <div className="text-2xl sm:text-3xl font-bold text-secondary">{user?.stats.totalScore || 0}</div>
                      <div className="text-xs sm:text-sm text-muted-foreground mt-1">Total Score</div>
                    </div>
                  </div>
                </CardContent>
              </Card> */}
            </div>
          </div>


        </div>
      </div>
    </ProtectedRoute>
  )
}
