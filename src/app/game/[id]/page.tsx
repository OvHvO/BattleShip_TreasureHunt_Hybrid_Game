"use client"

import type React from "react"
import { useState, useEffect, useRef, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
// import { Html5QrcodeScanner } from "html5-qrcode" // 👈 No longer needed
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

import {
  Users,
  Trophy,
  ArrowLeft,
  QrCode,
  X,
} from "lucide-react"
import { ProtectedRoute } from "@/components/protected-route"
import { useAuth } from "@/lib/auth-context"
// 👇 Import our newly created component
import { QrScanner } from "@/components/ui/qr-scanner" // (Please ensure the path is correct)

export default function GameInterfacePage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const [gameData, setGameData] = useState<{
    id: string
    name: string
    gameMode: string
    status: string
    current_turn_user_id: number | null
    winner_id: number | null
  } | null>(null)
  const [players, setPlayers] = useState<{
    id: string
    username: string
    score: number
    status: 'active' | 'dead'
  }[]>([])
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null)
  const [authError, setAuthError] = useState<string | null>(null)
  const [hasLeftGame, setHasLeftGame] = useState(false)
  const [isLeaving, setIsLeaving] = useState(false);
  const [isScannerVisible, setIsScannerVisible] = useState(false)
  const [scannedData, setScannedData] = useState<string | null>(null)
  const [question, setQuestion] = useState<{
    question_id: string
    question: string
    options: { A: string; B: string; C: string; D: string }
    correct_answer: string
  } | null>(null)
  const [showQuestionModal, setShowQuestionModal] = useState(false)
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null)
  const [isSkipping, setIsSkipping] = useState(false)
  const [isMarkingDead, setIsMarkingDead] = useState(false)
  
  // 👇 No longer needed
  // const scannerContainerRef = useRef<HTMLDivElement>(null)
  // const html5QrcodeScannerRef = useRef<Html5QrcodeScanner | null>(null)

  const gameId = params?.id as string

  // (Modified) Wrap fetchGameData with useCallback
  const fetchGameData = useCallback(async () => {
    if (!gameId) return; // Add protection
    try {
      // Fetch room data
      const roomResponse = await fetch(`/api/rooms/${gameId}`)
      if (roomResponse.ok) {
        const responseData = await roomResponse.json() 
        const roomData = responseData.room           

        if (roomData) {
          setGameData({
            id: roomData.room_id, 
            name: roomData.room_name,
            gameMode: 'Quiz Battle',
            status: roomData.status,
            current_turn_user_id: roomData.current_turn_user_id,
            winner_id: roomData.winner_id
          })
        }
      }

      // Fetch players with scores from game_results
      const playersResponse = await fetch(`/api/rooms/${gameId}/players-scores`)
      if (playersResponse.ok) {
        const playersData = await playersResponse.json()
        setPlayers(playersData)
      }
    } catch (error) {
      console.error('Error fetching game data:', error)
    }
  }, [gameId]) // Depends on gameId

  // ... (Your checkGameAccess useEffect remains unchanged) ...
  useEffect(() => {
    // Skip authorization check if user has explicitly left
    if (hasLeftGame) {
      console.log('⏭️  Skipping authorization check - user has left game')
      return
    }

    const checkGameAccess = async () => {
      if (!user?.id || !gameId) return

      console.log(`🔍 Checking game access for user ${user.id} in game ${gameId}`)

      try {
        const response = await fetch(`/api/games/${gameId}/access?user_id=${user.id}`)
        const data = await response.json()
        
        if (data.authorized) {
          console.log('✅ User authorized for game access')
          setIsAuthorized(true)
          // Fetch game data
          await fetchGameData()
        } else {
          console.log('❌ User not authorized:', data.message)
          setIsAuthorized(false)
          setAuthError(data.message || 'You are not authorized to access this game')
        }
      } catch (error) {
        console.error('Error checking game access:', error)
        setIsAuthorized(false)
        setAuthError('Failed to verify game access')
      }
    }

    // Only check authorization if user is loaded and hasn't left
    if (user && !hasLeftGame) {
      checkGameAccess()
    }
  }, [user, gameId, hasLeftGame, fetchGameData])

  // ... (Your polling useEffect remains unchanged) ...
  useEffect(() => {
    // Only start polling after initial authorization succeeds
    if (isAuthorized !== true || !gameId || !user?.id) return;

    console.log('Starting game access poll check (every 5 seconds)');

    const intervalId = setInterval(async () => {
      try {
        // Re-call the access API
        const response = await fetch(`/api/games/${gameId}/access?user_id=${user.id}`);
        
        if (!response.ok) {
          // If API fails (e.g., 404), it means the room is gone
          throw new Error('Room not found or access denied');
        }

        const data = await response.json();
        
        if (!data.authorized) {
          // If API returns "not authorized", it means the room is gone
          throw new Error('Access revoked');
        }
        
        console.log('Poll: Fetching game data...');
        await fetchGameData();

        // If everything is normal, do nothing and continue the game
        console.log('Poll check: Still authorized');
        
      } catch (error) {
        // Catch any errors (room deleted, permissions revoked)
        console.error('Poll check failed (room likely closed):', error);
        
        // Stop polling
        clearInterval(intervalId);
        
        // Notify and kick out player
        alert('The game room has been closed by the owner. You will be redirected to the dashboard.');
        router.push('/dashboard');
      }
    }, 5000); // Check every 5 seconds

    // Cleanup interval
    return () => clearInterval(intervalId);

  }, [isAuthorized, gameId, user, router, fetchGameData]);
  
  const currentUser = user?.username || ""
  const sortedPlayers = [...players].sort((a, b) => b.score - a.score)
  
  // Check if it's current user's turn (using consistent string comparison)
  const currentTurnId = gameData?.current_turn_user_id
  const userId = user?.id
  console.log(`🔄 Checking turn - Current turn user ID: ${currentTurnId} (${typeof currentTurnId}), Logged-in user ID: ${userId} (${typeof userId})`)

  const isMyTurn = (
    typeof userId !== 'undefined' && userId !== null &&
    typeof currentTurnId !== 'undefined' && currentTurnId !== null &&
    userId.toString() === currentTurnId.toString()
  )


  
  // Check if current user is dead
  const currentPlayerStatus = players.find(p => p.id === user?.id?.toString())?.status
  const isPlayerDead = currentPlayerStatus === 'dead'
  
  // Check if game is finished
  const isGameFinished = gameData?.status === 'finished'

  // ... (Your handleLeaveGame remains unchanged) ...
  const handleLeaveGame = async () => {
    if (isLeaving || !user?.id || !gameId) return
    setIsLeaving(true);

    console.log(`🚪 User ${user.id} leaving game/room ${gameId}`)
    console.log(`📍 Current URL: ${window.location.href}`)

    // Mark that user has left to prevent authorization checks
    setHasLeftGame(true)
    
    // Navigate away immediately to prevent any re-checks
    console.log('🔀 Navigating to dashboard...')
    router.push('/dashboard')

    try {
      // Leave the room in the background (which removes player from room_players table)
      console.log(`📤 Sending leave request for room ${gameId}`)
      const response = await fetch(`/api/room/${gameId}/leave`, {
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
        console.log('✅ Successfully left game/room:', result)
      } else {
        const errorData = await response.json()
        console.error('❌ Failed to leave game:', errorData)
        // Even if API fails, user is already on dashboard
      }
    } catch (error) {
      console.error('💥 Error leaving game:', error)
      // Even if API fails, user is already on dashboard
    }
  }


  // --- (Modified) Scanner logic is now very simple ---

  // 1. Open scanner
  const handleScanQRCode = () => {
    setIsScannerVisible(true);
  }

  // 2. Close scanner
  const handleCloseScanner = () => {
    setIsScannerVisible(false);
  }

  // 3. Scan success callback
  const handleScanSuccess = (decodedText: string) => {
    console.log('✅ QR Code scanned raw:', decodedText);
    
    let questionId = decodedText; // Default to the raw text
    
    // Attempt to parse the decoded text as JSON
    try {
      const parsedData = JSON.parse(decodedText);
      // If parsing is successful AND it has a question_id property
      if (parsedData && typeof parsedData.question_id === 'string') {
        questionId = parsedData.question_id; // Extract the actual ID
        console.log('Extracted question ID:', questionId);
      } else {
         console.warn('Scanned data is JSON but lacks question_id:', parsedData);
      }
    } catch (e) {
      // If parsing fails, assume the decodedText is already the plain ID
      console.log('Scanned data is not JSON, using raw text as ID.');
    }

    setScannedData(decodedText); // Keep original scanned data for display if needed
    setIsScannerVisible(false); // Close scanner
    fetchQuestion(questionId); // Get question (using the potentially extracted ID)
  }

  // 4. Get question logic
  const fetchQuestion = useCallback(async (questionId: string) => {
    try {
      const response = await fetch(`/api/questions/${questionId}`)
      if (response.ok) {
        const questionData = await response.json()
        setQuestion(questionData)
        setShowQuestionModal(true) // Open question modal
      } else {
        console.error('Question not found')
        alert('Invalid QR code - question not found')
      }
    } catch (error) {
      console.error('Error fetching question:', error)
      alert('Error loading question')
    }
  }, []); // Remove handleCloseScanner dependency

  // Handle skip turn
  const handleSkipTurn = async () => {
    if (isSkipping || !user?.id || !gameId) return
    setIsSkipping(true)

    try {
      const response = await fetch(`/api/rooms/${gameId}/skip-turn`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: user.id
        })
      })

      if (response.ok) {
        await fetchGameData()
        console.log('✅ Turn skipped successfully')
      } else {
        const errorData = await response.json()
        alert(errorData.error || 'Failed to skip turn')
      }
    } catch (error) {
      console.error('Error skipping turn:', error)
      alert('Failed to skip turn')
    } finally {
      setIsSkipping(false)
    }
  }

  // Handle player death
  const handleMarkDead = async () => {
    if (isMarkingDead || !user?.id || !gameId) return
    
    const confirmed = confirm('Are you sure you want to mark yourself as dead? You will not participate in future rounds.')
    if (!confirmed) return

    setIsMarkingDead(true)

    try {
      const response = await fetch(`/api/rooms/${gameId}/mark-dead`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: user.id
        })
      })

      if (response.ok) {
        await fetchGameData()
        console.log('✅ Marked as dead successfully')
      } else {
        const errorData = await response.json()
        alert(errorData.error || 'Failed to mark as dead')
      }
    } catch (error) {
      console.error('Error marking as dead:', error)
      alert('Failed to mark as dead')
    } finally {
      setIsMarkingDead(false)
    }
  }
  
  // 👇 Scanner useEffect has been completely removed
  
  // ... (Your handleAnswerSubmit remains unchanged) ...
  const handleAnswerSubmit = async () => {
    if (!selectedAnswer || !question || !user?.id) return

    try {
      const isCorrect = selectedAnswer === question.correct_answer
      
      if (isCorrect) {
        // Update score in database
        const response = await fetch(`/api/rooms/${gameId}/update-score`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            user_id: user.id,
            score_increment: 1
          })
        })

        if (response.ok) {
          const result = await response.json()
          
          // Check if player won by reaching 10 points
          if (result.game_won) {
            alert(`🎉 Congratulations! You've won the game with ${result.new_score} points!`)
          } else {
            alert(`Correct! +1 point (${result.new_score}/10)`)
          }
          
          // Refresh game data
          await fetchGameData()
        }
      } else {
        alert(`Wrong answer! The correct answer was ${question.correct_answer}`)
        
        // Still need to advance turn even if wrong
        await fetch(`/api/rooms/${gameId}/skip-turn`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            user_id: user.id
          })
        })
        
        await fetchGameData()
      }
      
      // Close modal and reset
      setShowQuestionModal(false)
      setQuestion(null)
      setSelectedAnswer(null)
      setScannedData(null)
    } catch (error) {
      console.error('Error submitting answer:', error)
      alert('Error submitting answer')
    }
  }

  // ... (Your Loading/Error JSX remains unchanged) ...
  if (isAuthorized === null) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Verifying game access...</p>
          </div>
        </div>
      </ProtectedRoute>
    )
  }

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
                {authError || 'You do not have permission to access this game'}
              </p>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  You can only access games that you are participating in.
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


  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/5 via-background to-background flex flex-col">
        
        {/* --- (Modified) Scanner rendering --- */}
        {/* 1. No longer ugly <Card> Modal */}
        {/* 2. Only render our new component when isScannerVisible is true */}
        {isScannerVisible && (
          <QrScanner
            onScanSuccess={handleScanSuccess}
            onClose={handleCloseScanner}
          />
        )}
        
        {/* --- (Removed) Old QR Code Scanner <Card> JSX has been completely deleted --- */}


        {/* --- Your Question Modal (remains unchanged) --- */}
        {showQuestionModal && question && (
          <div className="fixed inset-0 bg-black/98 backdrop-blur-lg z-50 flex items-center justify-center transition-all duration-500">
            <div className="w-full max-w-2xl mx-4 transform transition-all duration-500">
              <Card className="border-none shadow-2xl bg-card/95 backdrop-blur-xl overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-purple-500/10 pointer-events-none"></div>
                
                <CardHeader className="relative border-b border-border/50 pb-6">
                  <CardTitle className="text-2xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
                    Quiz Question
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">Choose the correct answer to earn points</p>
                </CardHeader>
                
                {/* (Responsive) p-4 sm:p-8 */}
                <CardContent className="relative p-4 sm:p-8 space-y-6">
                  {/* Question */}
                  <div className="bg-gradient-to-r from-muted/50 to-muted/30 rounded-2xl p-6 border-2 border-primary/20">
                    <h3 className="text-lg font-semibold text-foreground mb-2">{question.question_id}</h3>
                    <p className="text-base text-foreground">{question.question}</p>
                  </div>
                  
                  {/* Answer Options */}
                  <div className="grid grid-cols-1 gap-3">
                    {Object.entries(question.options).map(([key, value]) => (
                      <button
                        key={key}
                        onClick={() => setSelectedAnswer(key)}
                        className={`text-left p-4 rounded-xl border-2 transition-all duration-300 ${
                          selectedAnswer === key
                            ? 'bg-gradient-to-r from-primary/25 to-purple-500/25 border-primary text-primary font-semibold'
                            : 'bg-muted/50 border-muted hover:border-primary/50 hover:bg-muted/70'
                        }`}
                      >
                        <span className="font-bold mr-3">{key}.</span>
                        <span>{value}</span>
                      </button>
                    ))}
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="flex gap-4 pt-4">
                    <Button 
                      onClick={() => {
                        setShowQuestionModal(false)
                        setQuestion(null)
                        setSelectedAnswer(null)
                        setScannedData(null)
                      }}
                      variant="outline"
                      className="flex-1 h-12"
                    >
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleAnswerSubmit}
                      disabled={!selectedAnswer}
                      className="flex-1 h-12 bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-500"
                    >
                      Submit Answer
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* ... (All your Game Header, Main Content, and Footer JSX remain unchanged) ... */}
        {/* Game Header */}
        <header className="bg-card/60 backdrop-blur-xl border-b border-border/50 shadow-lg sticky top-0 z-40">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-purple-500/5 pointer-events-none"></div>
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-5">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                {/* (Responsive) Add disabled and loading text */}
                <Button 
                  variant="outline" 
                  onClick={handleLeaveGame} 
                  disabled={isLeaving}
                  className="group border-2 hover:border-destructive hover:bg-destructive/10 hover:text-destructive transition-all duration-300 font-semibold shadow-sm hover:shadow-md"
                >
                  <ArrowLeft className="h-4 w-4 mr-2 group-hover:-translate-x-1 transition-transform" />
                  {isLeaving ? 'Leaving...' : 'Leave Game'}
                </Button>
                <div>
                  <h1 className="font-bold text-foreground text-xl sm:text-2xl tracking-tight">
                    {gameData?.name || 'Battle Quiz Game'}
                  </h1>
                  <Badge className="mt-2 bg-gradient-to-r from-primary/20 to-purple-500/20 text-primary border border-primary/30 hover:from-primary/30 hover:to-purple-500/30 transition-all">
                    {gameData?.gameMode || 'Quiz Battle'}
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-auto pb-24">
          <div className="h-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
              
              {/* Scoreboard Section */}
              <Card id="scoreboard" className="group relative border-2 border-border/50 hover:border-primary/30 shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden bg-card/80 backdrop-blur-sm">
                {/* ... (omitted) ... */}
                <CardHeader className="relative bg-gradient-to-r from-yellow-500/10 via-orange-500/10 to-red-500/10 border-b-2 border-border/50 pb-5">
                  <CardTitle className="flex items-center gap-4">
                    {/* ... (omitted) ... */}
                    <div className="flex-1">
                      <div className="text-2xl font-bold text-foreground">Scoreboard</div>
                      <p className="text-sm text-muted-foreground font-normal mt-1">Top 5 players leading the game</p>
                    </div>
                  </CardTitle>
                </CardHeader>
                
                {/* (Responsive) p-4 sm:p-6 */}
                <CardContent className="relative p-4 sm:p-6 space-y-4 max-h-[600px] overflow-y-auto">
                  {sortedPlayers.slice(0, 5).map((player, index) => (
                    <div
                      key={player.id}
                      // (Responsive) p-4 sm:p-5
                      className={`group/item relative flex items-center gap-4 p-4 sm:p-5 rounded-2xl transition-all duration-300 ${
                        player.username === currentUser 
                          ? "bg-gradient-to-r from-primary/25 via-primary/15 to-purple-500/25 border-2 border-primary/50 shadow-lg shadow-primary/20 scale-[1.02]" 
                          : "bg-gradient-to-r from-muted/80 to-muted/40 hover:from-muted hover:to-muted/60 border-2 border-transparent hover:border-primary/20 hover:scale-[1.01] shadow-md hover:shadow-lg"
                      }`}
                    >
                      {/* ... (omitted) ... */}
                      <div className="absolute -left-3 -top-3 w-12 h-12 ...">
                        {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                      </div>
                      
                      <div className="flex items-center gap-4 flex-1 ml-6">
                        {/* (Responsive) h-12 w-12 sm:h-14 sm:w-14 */}
                        <Avatar className="h-12 w-12 sm:h-14 sm:w-14 border-4 border-background shadow-xl ring-2 ring-primary/20">
                          <AvatarFallback className="text-base font-black bg-gradient-to-br from-primary/30 to-purple-500/30 text-primary">
                            {player.username.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        {/* ... (omitted) ... */}
                      </div>
                      
                      <div className="text-right">
                        {/* (Responsive) text-2xl sm:text-3xl */}
                        <div className="text-2xl sm:text-3xl font-black bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
                          {player.score}
                        </div>
                        <div className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">points</div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Players List Section */}
              <Card id="player-list" className="group relative border-2 border-border/50 hover:border-primary/30 shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden bg-card/80 backdrop-blur-sm">
                {/* ... (omitted) ... */}
                <CardHeader className="relative bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10 border-b-2 border-border/50 pb-5">
                  <CardTitle className="flex items-center gap-4">
                    {/* ... (omitted) ... */}
                  </CardTitle>
                </CardHeader>
                
                {/* (Responsive) p-4 sm:p-6 */}
                <CardContent className="relative p-4 sm:p-6 space-y-3 max-h-[600px] overflow-y-auto">
                  {sortedPlayers.map((player, index) => (
                    <div
                      key={player.id}
                      // (Responsive) p-3 sm:p-4
                      className={`group/item flex items-center gap-4 p-3 sm:p-4 rounded-2xl transition-all duration-300 ${
                        player.username === currentUser 
                          ? "bg-gradient-to-r from-primary/25 via-primary/15 to-purple-500/25 border-2 border-primary/50 shadow-lg shadow-primary/20" 
                          : player.status === 'dead'
                            ? "bg-gradient-to-r from-red-500/10 to-red-600/10 border-2 border-red-500/30 opacity-60"
                            : "bg-gradient-to-r from-muted/80 to-muted/40 hover:from-muted hover:to-muted/60 border-2 border-transparent hover:border-primary/20 hover:scale-[1.01] shadow-md hover:shadow-lg"
                      }`}
                    >
                      <div className="relative flex-shrink-0">
                        {/* (Responsive) h-12 w-12 sm:h-14 sm:w-14 */}
                        <Avatar className="h-12 w-12 sm:h-14 sm:w-14 border-4 border-background shadow-lg ring-2 ring-primary/20">
                          <AvatarFallback className={`text-base font-black bg-gradient-to-br ${
                            player.status === 'dead'
                              ? 'from-red-500/30 to-red-600/30 text-red-500'
                              : 'from-primary/30 to-purple-500/30 text-primary'
                          }`}>
                            {player.status === 'dead' ? '💀' : player.username.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        {/* Turn indicator */}
                        {gameData?.current_turn_user_id?.toString() === player.id && player.status === 'active' && (
                          <div className="absolute -top-1 -right-1 h-4 w-4 bg-green-500 rounded-full animate-pulse border-2 border-background"></div>
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-muted-foreground bg-muted/50 px-2 py-1 rounded-full">
                            #{index + 1}
                          </span>
                          {/* (Responsive) text-sm sm:text-base */}
                          <span className={`text-sm sm:text-base font-bold truncate ${
                            player.username === currentUser ? "text-primary" : player.status === 'dead' ? "text-red-500 line-through" : "text-foreground"
                          }`}>
                            {player.username}
                          </span>
                          {gameData?.current_turn_user_id?.toString() === player.id && player.status === 'active' && (
                            <span className="text-xs bg-green-500/20 text-green-600 px-2 py-0.5 rounded-full font-semibold">
                              Current Turn
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground font-medium mt-1.5 flex items-center gap-2">
                          <span>{player.status === 'dead' ? '💀 Eliminated' : '🎯 Quiz Master'}</span>
                          <span>•</span>
                          <span>⭐ {player.score}/10 pts</span>
                        </div>
                      </div>
                      
                      <div className="flex-shrink-0">
                        {/* (Responsive) px-3 py-1 sm:px-4 sm:py-1.5 text-xs sm:text-sm */}
                        <Badge className={`border-2 font-bold px-3 py-1 sm:px-4 sm:py-1.5 shadow-lg text-xs sm:text-sm ${
                          player.status === 'dead'
                            ? 'bg-gradient-to-r from-red-500/20 to-red-600/20 text-red-600 border-red-500/40'
                            : 'bg-gradient-to-r from-primary/20 to-purple-500/20 text-primary border-primary/40 hover:from-primary/30 hover:to-purple-500/30 shadow-primary/20'
                        }`}>
                          {player.status === 'dead' ? '💀 Dead' : '⭐ Active'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
              
            </div>
          </div>
        </main>

        {/* Footer Navigation */}
        <footer className="fixed bottom-0 left-0 right-0 bg-card/80 backdrop-blur-xl border-t border-border/50 shadow-2xl z-40">
          <div className="absolute inset-0 bg-gradient-to-t from-primary/5 via-transparent to-transparent pointer-events-none"></div>
          <div className="relative max-w-7xl mx-auto px-4 py-4">
            {/* Game Status and Winner Display */}
            {isGameFinished && gameData?.winner_id && (
              <div className="mb-4 p-4 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border-2 border-yellow-500/50 rounded-xl text-center">
                <h2 className="text-xl font-bold text-yellow-600 mb-2">🎉 Game Over!</h2>
                <p className="text-base font-semibold">
                  Winner: {players.find(p => p.id === gameData.winner_id?.toString())?.username || 'Unknown'}
                </p>
              </div>
            )}

            {/* Turn Indicator */}
            {!isGameFinished && gameData?.current_turn_user_id && (
              <div className="mb-3 text-center">
                <div className={`inline-block px-4 py-2 rounded-full ${
                  isMyTurn 
                    ? 'bg-gradient-to-r from-green-500/20 to-emerald-500/20 border-2 border-green-500/50 text-green-600' 
                    : 'bg-muted/50 border-2 border-border text-muted-foreground'
                }`}>
                  <p className="text-sm font-semibold">
                    {isMyTurn 
                      ? '🎯 Your Turn!' 
                      : `⏳ ${players.find(p => p.id === gameData.current_turn_user_id?.toString())?.username || 'Unknown'}'s Turn`
                    }
                  </p>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            {!isGameFinished && !isPlayerDead && (
              <div className="flex items-center justify-center gap-3">
                {/* Skip Button */}
                <Button 
                  onClick={handleSkipTurn}
                  disabled={!isMyTurn || isSkipping}
                  variant="outline"
                  className={`h-12 px-6 rounded-xl font-semibold transition-all ${
                    !isMyTurn 
                      ? 'opacity-50 cursor-not-allowed' 
                      : 'hover:bg-yellow-500/10 hover:border-yellow-500 hover:text-yellow-600'
                  }`}
                >
                  {isSkipping ? 'Skipping...' : '⏭️ Skip'}
                </Button>

                {/* Scan QR Button (Center, Elevated) */}
                <div className="relative">
                  <Button 
                    id="scan-qr-button"
                    onClick={handleScanQRCode}
                    disabled={!isMyTurn}
                    size="lg"
                    className={`h-16 w-16 rounded-full shadow-2xl transition-all duration-300 group border-4 border-background ${
                      isMyTurn
                        ? 'bg-gradient-to-br from-primary via-primary/90 to-purple-600 hover:from-primary/90 hover:via-primary/80 hover:to-purple-500 shadow-primary/40 hover:shadow-3xl hover:shadow-primary/60 hover:scale-110'
                        : 'bg-muted opacity-50 cursor-not-allowed'
                    }`}
                  >
                    <QrCode className={`h-8 w-8 text-white transition-transform ${
                      isMyTurn ? 'group-hover:scale-110' : ''
                    }`} />
                  </Button>
                  {isMyTurn && (
                    <div className="absolute -top-1 -right-1 h-4 w-4 bg-green-500 rounded-full animate-pulse"></div>
                  )}
                </div>

                {/* Dead Button */}
                <Button 
                  onClick={handleMarkDead}
                  disabled={!isMyTurn || isMarkingDead}
                  variant="destructive"
                  className={`h-12 px-6 rounded-xl font-semibold transition-all ${
                    !isMyTurn 
                      ? 'opacity-50 cursor-not-allowed' 
                      : 'hover:bg-red-600'
                  }`}
                >
                  {isMarkingDead ? 'Processing...' : '💀 Dead'}
                </Button>
              </div>
            )}

            {/* Dead Player Message */}
            {isPlayerDead && !isGameFinished && (
              <div className="text-center p-4 bg-red-500/10 border-2 border-red-500/30 rounded-xl">
                <p className="text-red-600 font-semibold">💀 You are eliminated from the game</p>
                <p className="text-sm text-muted-foreground mt-1">Waiting for the game to finish...</p>
              </div>
            )}
          </div>
        </footer>
      </div>
    </ProtectedRoute>
  )
}