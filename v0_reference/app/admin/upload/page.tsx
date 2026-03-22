"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { ArrowLeft, Upload, Image as ImageIcon, Music, X } from "lucide-react"
import Link from "next/link"
import Image from "next/image"

export default function UploadBeatPage() {
  const [title, setTitle] = useState("")
  const [price, setPrice] = useState("29.99")
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [audioFile, setAudioFile] = useState<File | null>(null)
  const [coverPreview, setCoverPreview] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isAuthorized, setIsAuthorized] = useState(false)
  
  const coverInputRef = useRef<HTMLInputElement>(null)
  const audioInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function checkAuth() {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        router.push("/admin/login")
        return
      }

      const { data: adminData } = await supabase
        .from("admin_users")
        .select("id")
        .eq("user_id", user.id)
        .single()

      if (!adminData) {
        router.push("/admin/login")
        return
      }

      setIsAuthorized(true)
    }

    checkAuth()
  }, [router, supabase])

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setCoverFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setCoverPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleAudioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setAudioFile(file)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!coverFile || !audioFile) {
      setError("Please select both cover art and audio file")
      return
    }

    setIsUploading(true)
    setError(null)

    try {
      // Upload cover art
      const coverFormData = new FormData()
      coverFormData.append("file", coverFile)
      
      const coverResponse = await fetch("/api/upload", {
        method: "POST",
        body: coverFormData,
      })
      
      if (!coverResponse.ok) {
        throw new Error("Failed to upload cover art")
      }
      
      const { url: coverUrl } = await coverResponse.json()

      // Upload audio file
      const audioFormData = new FormData()
      audioFormData.append("file", audioFile)
      
      const audioResponse = await fetch("/api/upload", {
        method: "POST",
        body: audioFormData,
      })
      
      if (!audioResponse.ok) {
        throw new Error("Failed to upload audio file")
      }
      
      const { url: audioUrl } = await audioResponse.json()

      // Save beat to database
      const priceInCents = Math.round(parseFloat(price) * 100)
      
      const { error: insertError } = await supabase
        .from("beats")
        .insert({
          title,
          cover_url: coverUrl,
          audio_url: audioUrl,
          price_in_cents: priceInCents,
        })

      if (insertError) {
        throw insertError
      }

      router.push("/admin")
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setIsUploading(false)
    }
  }

  if (!isAuthorized) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-foreground" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="flex items-center gap-4 px-8 py-6 border-b border-border">
        <Link 
          href="/admin" 
          className="p-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-lg font-medium text-foreground">Upload Beat</h1>
          <p className="text-sm text-muted-foreground">Add a new beat to your catalog</p>
        </div>
      </header>

      {/* Form */}
      <main className="max-w-2xl mx-auto px-8 py-12">
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title" className="text-foreground">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter beat title"
              required
              className="bg-input border-border text-foreground"
            />
          </div>

          {/* Price */}
          <div className="space-y-2">
            <Label htmlFor="price" className="text-foreground">Price (USD)</Label>
            <Input
              id="price"
              type="number"
              step="0.01"
              min="0"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="29.99"
              required
              className="bg-input border-border text-foreground"
            />
          </div>

          {/* Cover Art */}
          <div className="space-y-2">
            <Label className="text-foreground">Cover Art (1:1 ratio recommended)</Label>
            <input
              ref={coverInputRef}
              type="file"
              accept="image/*"
              onChange={handleCoverChange}
              className="hidden"
            />
            
            {coverPreview ? (
              <div className="relative w-48 h-48 rounded-lg overflow-hidden">
                <Image
                  src={coverPreview}
                  alt="Cover preview"
                  fill
                  className="object-cover"
                />
                <button
                  type="button"
                  onClick={() => {
                    setCoverFile(null)
                    setCoverPreview(null)
                  }}
                  className="absolute top-2 right-2 p-1 bg-black/50 rounded-full text-white hover:bg-black/70 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <Card
                onClick={() => coverInputRef.current?.click()}
                className="border-dashed border-2 border-border bg-transparent cursor-pointer hover:border-muted-foreground transition-colors"
              >
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <ImageIcon className="h-10 w-10 text-muted-foreground mb-3" />
                  <p className="text-sm text-muted-foreground">Click to upload cover art</p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Audio File */}
          <div className="space-y-2">
            <Label className="text-foreground">Audio File (MP3, WAV)</Label>
            <input
              ref={audioInputRef}
              type="file"
              accept="audio/*"
              onChange={handleAudioChange}
              className="hidden"
            />
            
            {audioFile ? (
              <Card className="border-border bg-card">
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <Music className="h-5 w-5 text-muted-foreground" />
                    <span className="text-sm text-foreground truncate max-w-xs">
                      {audioFile.name}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAudioFile(null)}
                    className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </CardContent>
              </Card>
            ) : (
              <Card
                onClick={() => audioInputRef.current?.click()}
                className="border-dashed border-2 border-border bg-transparent cursor-pointer hover:border-muted-foreground transition-colors"
              >
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Music className="h-10 w-10 text-muted-foreground mb-3" />
                  <p className="text-sm text-muted-foreground">Click to upload audio file</p>
                </CardContent>
              </Card>
            )}
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          {/* Submit */}
          <div className="flex gap-4">
            <Link href="/admin" className="flex-1">
              <Button type="button" variant="outline" className="w-full">
                Cancel
              </Button>
            </Link>
            <Button 
              type="submit" 
              disabled={isUploading || !coverFile || !audioFile || !title}
              className="flex-1 gap-2"
            >
              {isUploading ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  Upload Beat
                </>
              )}
            </Button>
          </div>
        </form>
      </main>
    </div>
  )
}
