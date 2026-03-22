"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, LogOut, Trash2, Music } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import type { Beat } from "@/components/beats-carousel"

export default function AdminDashboard() {
  const [beats, setBeats] = useState<Beat[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDeleting, setIsDeleting] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function checkAdminAndFetch() {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        router.push("/admin/login")
        return
      }

      // Check admin status
      const { data: adminData } = await supabase
        .from("admin_users")
        .select("id")
        .eq("user_id", user.id)
        .single()

      if (!adminData) {
        router.push("/admin/login")
        return
      }

      // Fetch beats
      const { data: beatsData } = await supabase
        .from("beats")
        .select("*")
        .order("created_at", { ascending: false })

      setBeats(beatsData || [])
      setIsLoading(false)
    }

    checkAdminAndFetch()
  }, [router, supabase])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push("/admin/login")
  }

  const handleDelete = async (beatId: string) => {
    if (!confirm("Are you sure you want to delete this beat?")) return
    
    setIsDeleting(beatId)
    
    const { error } = await supabase
      .from("beats")
      .delete()
      .eq("id", beatId)

    if (!error) {
      setBeats(beats.filter(b => b.id !== beatId))
    }
    
    setIsDeleting(null)
  }

  const formatPrice = (cents: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD"
    }).format(cents / 100)
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-foreground" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="flex items-center justify-between px-8 py-6 border-b border-border">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-lg font-medium text-foreground hover:opacity-70 transition-opacity">
            BEATS
          </Link>
          <span className="text-muted-foreground">/</span>
          <span className="text-muted-foreground">Admin</span>
        </div>
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSignOut}
            className="gap-2"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-6xl mx-auto px-8 py-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-medium text-foreground">Beats</h1>
            <p className="text-muted-foreground mt-1">Manage your music catalog</p>
          </div>
          <Link href="/admin/upload">
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Upload Beat
            </Button>
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <Card className="border-border bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-normal text-muted-foreground">Total Beats</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-medium text-foreground">{beats.length}</p>
            </CardContent>
          </Card>
          <Card className="border-border bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-normal text-muted-foreground">Available</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-medium text-foreground">
                {beats.filter(b => !b.is_sold).length}
              </p>
            </CardContent>
          </Card>
          <Card className="border-border bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-normal text-muted-foreground">Sold</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-medium text-foreground">
                {beats.filter(b => b.is_sold).length}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Beats list */}
        {beats.length === 0 ? (
          <Card className="border-border bg-card">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Music className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg text-muted-foreground mb-4">No beats uploaded yet</p>
              <Link href="/admin/upload">
                <Button>Upload your first beat</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {beats.map((beat) => (
              <Card key={beat.id} className="border-border bg-card overflow-hidden group">
                <div className="relative aspect-square">
                  <Image
                    src={beat.cover_url}
                    alt={beat.title}
                    fill
                    className="object-cover"
                  />
                  {beat.is_sold && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                      <span className="text-white font-medium">SOLD</span>
                    </div>
                  )}
                </div>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-medium text-foreground">{beat.title}</h3>
                      <p className="text-sm text-muted-foreground">{formatPrice(beat.price_in_cents)}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(beat.id)}
                      disabled={isDeleting === beat.id}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
