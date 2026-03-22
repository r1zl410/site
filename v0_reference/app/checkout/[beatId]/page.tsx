"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { ArrowLeft, CheckCircle } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import {
  EmbeddedCheckout,
  EmbeddedCheckoutProvider,
} from "@stripe/react-stripe-js"
import { loadStripe } from "@stripe/stripe-js"
import { startCheckoutSession } from "@/app/actions/stripe"
import type { Beat } from "@/components/beats-carousel"

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

export default function CheckoutPage() {
  const params = useParams()
  const router = useRouter()
  const beatId = params.beatId as string
  
  const [beat, setBeat] = useState<Beat | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isComplete, setIsComplete] = useState(false)

  useEffect(() => {
    async function fetchBeat() {
      const supabase = createClient()
      const { data, error } = await supabase
        .from("beats")
        .select("*")
        .eq("id", beatId)
        .single()
      
      if (error || !data) {
        setError("Beat not found")
      } else if (data.is_sold) {
        setError("This beat has already been sold")
      } else {
        setBeat(data)
      }
      setIsLoading(false)
    }

    fetchBeat()
  }, [beatId])

  const fetchClientSecret = useCallback(() => {
    return startCheckoutSession(beatId)
  }, [beatId])

  const handleComplete = useCallback(() => {
    setIsComplete(true)
    // Update beat as sold in database
    const supabase = createClient()
    supabase
      .from("beats")
      .update({ is_sold: true })
      .eq("id", beatId)
      .then(() => {
        // Redirect after a short delay
        setTimeout(() => {
          router.push("/checkout/success")
        }, 2000)
      })
  }, [beatId, router])

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

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
        <p className="text-lg text-destructive mb-6">{error}</p>
        <Link 
          href="/"
          className="text-foreground hover:opacity-70 transition-opacity flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to home
        </Link>
      </div>
    )
  }

  if (isComplete) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
        <CheckCircle className="h-16 w-16 text-green-500 mb-6" />
        <h1 className="text-2xl font-medium text-foreground mb-2">Purchase Complete!</h1>
        <p className="text-muted-foreground">Redirecting you...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="flex items-center gap-4 px-8 py-6 border-b border-border">
        <Link 
          href="/" 
          className="p-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-lg font-medium text-foreground">Checkout</h1>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Beat info */}
          {beat && (
            <div className="flex flex-col items-center lg:items-start">
              <div className="relative w-64 h-64 md:w-80 md:h-80 rounded-xl overflow-hidden shadow-2xl mb-6">
                <Image
                  src={beat.cover_url}
                  alt={beat.title}
                  fill
                  className="object-cover"
                />
              </div>
              <h2 className="text-2xl font-medium text-foreground mb-2">{beat.title}</h2>
              <p className="text-xl text-muted-foreground">{formatPrice(beat.price_in_cents)}</p>
            </div>
          )}

          {/* Stripe Checkout */}
          <div className="w-full">
            <EmbeddedCheckoutProvider
              stripe={stripePromise}
              options={{ 
                clientSecret: fetchClientSecret,
                onComplete: handleComplete
              }}
            >
              <EmbeddedCheckout className="rounded-lg overflow-hidden" />
            </EmbeddedCheckoutProvider>
          </div>
        </div>
      </main>
    </div>
  )
}
