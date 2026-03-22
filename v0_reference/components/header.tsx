"use client"

import Link from "next/link"
import { Instagram } from "lucide-react"

interface HeaderProps {
  siteName?: string
  instagramUrl?: string
}

export function Header({ 
  siteName = "BEATS", 
  instagramUrl = "https://instagram.com" 
}: HeaderProps) {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 py-6 bg-background/80 backdrop-blur-xl">
      <Link 
        href="/" 
        className="text-lg font-medium tracking-tight text-foreground transition-opacity hover:opacity-70"
      >
        {siteName}
      </Link>
      
      <a
        href={instagramUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="text-foreground/70 transition-all duration-300 hover:text-foreground hover:scale-110"
        aria-label="Instagram"
      >
        <Instagram className="h-5 w-5" strokeWidth={1.5} />
      </a>
    </header>
  )
}
