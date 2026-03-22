import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const { userId } = await request.json()

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Check if admin already exists
    const { count } = await supabase
      .from("admin_users")
      .select("*", { count: "exact", head: true })

    if (count && count > 0) {
      return NextResponse.json(
        { error: "Admin already exists" },
        { status: 400 }
      )
    }

    // Insert admin user
    const { error } = await supabase
      .from("admin_users")
      .insert({ user_id: userId })

    if (error) {
      throw error
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error creating admin:", error)
    return NextResponse.json(
      { error: "Failed to create admin" },
      { status: 500 }
    )
  }
}
