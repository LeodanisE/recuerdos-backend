// middleware.ts
import { NextResponse } from 'next/server'

// Quita el parámetro ?v=… solo en /pricing
export function middleware(req: Request) {
  const url = new URL(req.url)

  if (url.searchParams.has('v')) {
    url.searchParams.delete('v')
    return NextResponse.redirect(url, 308) // redirección permanente a la URL limpia
  }

  return NextResponse.next()
}

// Aplica solo a /pricing
export const config = {
  matcher: ['/pricing'],
}