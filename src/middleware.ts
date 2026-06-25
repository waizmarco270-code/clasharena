import { clerkMiddleware } from '@clerk/nextjs/server'

export default clerkMiddleware()

export const config = {
  matcher: [
    // Skip Next.js internals, static files, and payment API callbacks
    '/((?!_next|api/recharge/verify-payment-redirect|api/recharge/webhook|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for Clerk's auto-proxy path
    '/__clerk/:path*',
    // Match all APIs except payment API callbacks
    '/api/((?!recharge/verify-payment-redirect|recharge/webhook).*)',
    '/trpc(.*)',
  ],
}