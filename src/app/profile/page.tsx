"use client"

// 1. Import useEffect and useState
import { useState, useEffect } from "react" 
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { ArrowLeft, Trophy, Target, Clock, Users, Star, Calendar, GamepadIcon, Loader2 } from "lucide-react" // (Add Loader2)
import { ProtectedRoute } from "@/components/protected-route"
import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"

// 2. Define the data types we get from the API
// (These correspond to the types in the API)
type UserStats = {
  user_id: number;
  total_games_played: number;
  total_wins: number;
  total_score: number;
}

type GameHistory = {
  result_id: number;
  score: number;
  result: 'win' | 'lose' | 'draw';
  finished_at: string;
  room_name: string;
}

// 3. Remove all mockData (mockGameHistory and mockAchievements)
// const mockGameHistory = [...] (delete)
// const mockAchievements = [...] (delete)

export default function ProfilePage() {
  const { user } = useAuth()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState("overview")

  // 4. Create state for real data
  const [stats, setStats] = useState<UserStats | null>(null);
  const [history, setHistory] = useState<GameHistory[]>([]);
  const [isLoading, setIsLoading] = useState(true); // (Manage loading state)

  // 5. Create useEffect to fetch data when component loads
  useEffect(() => {
    if (!user?.id) return; // Ensure user_id exists

    // Define an async function to fetch all data
    const fetchData = async () => {
      try {
        setIsLoading(true);

        // Use Promise.all to request both APIs simultaneously
        const [statsResponse, historyResponse] = await Promise.all([
          fetch(`/api/profile/${user.id}/stats`),
          fetch(`/api/profile/${user.id}/history`)
        ]);

        if (!statsResponse.ok || !historyResponse.ok) {
          throw new Error('Failed to fetch profile data');
        }

        const statsData = await statsResponse.json();
        const historyData = await historyResponse.json();

        setStats(statsData);
        setHistory(historyData);

      } catch (error) {
        console.error("Error loading profile:", error);
        // (You can set an error state here)
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [user?.id]); // (Depends on user.id)

  // 6. Dynamically calculate statistics from state (ensure handling of 0 cases)
  const totalGames = stats?.total_games_played || 0;
  const gamesWon = stats?.total_wins || 0;
  const totalScore = stats?.total_score || 0;
  
  // (Handle division by 0)
  const winRate = totalGames > 0 ? Math.round((gamesWon / totalGames) * 100) : 0;
  const averageScore = totalGames > 0 ? Math.round(totalScore / totalGames) : 0;
  
  // 7. (Optional) Add a loading screen
  if (isLoading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
            <p className="mt-4 text-muted-foreground">Loading Profile...</p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  // 8. (Updated) Return your JSX, but data source has been changed to state
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background relative overflow-hidden">
        {/* ... (your SVG background waves) ... */}
        
        {/* Header (unchanged) */}
        <header className="border-b border-border bg-card/80 backdrop-blur-sm relative z-20">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => router.back()} className="flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-foreground">Player Profile</h1>
                <p className="text-sm sm:text-base text-muted-foreground">{user?.username}'s gaming profile</p>
              </div>
            </div>
          </div>
        </header>

        <div className="container mx-auto px-4 py-6 sm:py-8 relative z-10">
          {/* Profile Header (data updated) */}
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row items-center gap-6">
                <Avatar className="h-20 w-20 sm:h-24 sm:w-24">
                  <AvatarImage src="/captain.png" alt={user?.username} />
                  <AvatarFallback className="text-lg font-bold">
                    {user?.username?.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="text-center sm:text-left flex-1">
                  <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">{user?.username}</h2>
                  <p className="text-muted-foreground mb-4">Member since January 2024</p> {/* (You can get this from user.created_at) */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                    <div>
                      {/* (Use data from state) */}
                      <div className="text-xl sm:text-2xl font-bold text-primary">{gamesWon}</div>
                      <div className="text-xs sm:text-sm text-muted-foreground">Games Won</div>
                    </div>
                    <div>
                      <div className="text-xl sm:text-2xl font-bold text-accent">{totalScore.toLocaleString()}</div>
                      <div className="text-xs sm:text-sm text-muted-foreground">Total Score</div>
                    </div>
                    <div>
                      <div className="text-xl sm:text-2xl font-bold text-green-500">{winRate}%</div>
                      <div className="text-xs sm:text-sm text-muted-foreground">Win Rate</div>
                    </div>
                    <div>
                      <div className="text-xl sm:text-2xl font-bold text-blue-500">{totalGames}</div>
                      <div className="text-xs sm:text-sm text-muted-foreground">Total Games</div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Profile Tabs (updated, Achievements removed) */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-2"> {/* (Changed to grid-cols-2) */}
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="history">Game History</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                {/* Recent Performance (data updated) */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Target className="h-5 w-5" />
                      Recent Performance
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between text-sm mb-2">
                          <span>Win Rate</span>
                          <span>{winRate}%</span>
                        </div>
                        <Progress value={winRate} className="h-2" />
                      </div>
                      <div>
                        <div className="flex justify-between text-sm mb-2">
                          <span>Average Score</span>
                          <span>{averageScore.toLocaleString()}</span>
                        </div>
                        {/* (The denominator 3500 here is mocked, you may need to adjust) */}
                        <Progress value={(averageScore / 3500) * 100} className="h-2" /> 
                      </div>
                      <div className="pt-2 border-t">
                        <p className="text-sm text-muted-foreground">
                          {/* (Use real history state) */}
                          Last 5 games:{" "}
                          {history
                            .slice(0, 5)
                            .map((game) => (game.result === "win" ? "W" : "L"))
                            .join(" - ")}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Favorite Game Modes (this is still mocked, because we don't store this data) */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <GamepadIcon className="h-5 w-5" />
                      Favorite Game Modes
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {/* ... (You can keep this part mocked for now, or do it later) ... */}
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Battle Royale</span>
                        <Badge variant="default">Most Played</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="history" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Game History
                  </CardTitle>
                  <CardDescription>
                    {/* (Dynamically display) */}
                    Showing your last {history.length} gaming sessions
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {/* (Use real history state) */}
                    {history.map((game) => (
                      <div
                        key={game.result_id} // (Use real ID)
                        className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 border border-border rounded-lg gap-3 sm:gap-0"
                      >
                        <div className="flex-1">
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <h3 className="font-semibold text-sm sm:text-base">{game.room_name}</h3> {/* (Real data) */}
                            <Badge variant={game.result === "win" ? "default" : "destructive"} className="text-xs">
                              {game.result === "win" ? "Victory" : "Defeat"}
                            </Badge>
                            {/* (Rank/Players/Duration we don't get from DB, comment out for now) */}
                            {/* <Badge variant="outline" className="text-xs">
                              Rank #{game.rank}
                            </Badge> */}
                          </div>
                          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Trophy className="h-3 w-3" />
                              {game.score.toLocaleString()} pts {/* (Real data) */}
                            </span>
                            {/* <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {game.duration}
                            </span> */}
                            {/* <span className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {game.players} players
                            </span> */}
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {new Date(game.finished_at).toLocaleDateString()} {/* (Real data) */}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                    {/* (If history is empty, show a message) */}
                    {history.length === 0 && (
                      <p className="text-center text-muted-foreground py-4">No game history found.</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* (Achievements Tab has been removed) */}
            
          </Tabs>
        </div>
      </div>
    </ProtectedRoute>
  )
}