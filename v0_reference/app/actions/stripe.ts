'use server'

import { stripe } from '@/lib/stripe'
import { createClient } from '@/lib/supabase/server'

export async function startCheckoutSession(beatId: string) {
  const supabase = await createClient()
  
  // Fetch beat from database
  const { data: beat, error } = await supabase
    .from('beats')
    .select('*')
    .eq('id', beatId)
    .single()
  
  if (error || !beat) {
    throw new Error(`Beat not found`)
  }

  if (beat.is_sold) {
    throw new Error(`This beat has already been sold`)
  }

  // Create Checkout Session
  const session = await stripe.checkout.sessions.create({
    ui_mode: 'embedded',
    redirect_on_completion: 'never',
    line_items: [
      {
        price_data: {
          currency: 'usd',
          product_data: {
            name: beat.title,
            description: 'Premium beat / instrumental',
          },
          unit_amount: beat.price_in_cents,
        },
        quantity: 1,
      },
    ],
    mode: 'payment',
    metadata: {
      beat_id: beatId,
    },
  })

  return session.client_secret
}

export async function getCheckoutSessionStatus(sessionId: string) {
  const session = await stripe.checkout.sessions.retrieve(sessionId)
  
  return {
    status: session.status,
    customerEmail: session.customer_details?.email,
  }
}
