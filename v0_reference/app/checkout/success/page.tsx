import Link from "next/link"
import { CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function CheckoutSuccessPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="text-center max-w-md">
        <CheckCircle className="h-20 w-20 text-green-500 mx-auto mb-8" />
        
        <h1 className="text-3xl font-medium text-foreground mb-4">
          Thank you for your purchase!
        </h1>
        
        <p className="text-muted-foreground mb-8 leading-relaxed">
          Your beat has been purchased successfully. You will receive an email with the download link and license details shortly.
        </p>
        
        <Link href="/">
          <Button className="px-8">
            Browse More Beats
          </Button>
        </Link>
      </div>
    </div>
  )
}
