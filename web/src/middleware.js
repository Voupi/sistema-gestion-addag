import { NextResponse } from 'next/server'

// Rutas que NO requieren autenticación
const PUBLIC_ROUTES = [
    '/admin/login',
    '/solicitud-socio',
    '/addag-parqueo',
]

export function middleware(request) {
    const { pathname } = request.nextUrl

    // Dejar pasar rutas de API (cron jobs, etc.) y assets
    if (
        pathname.startsWith('/api/') ||
        pathname.startsWith('/_next/') ||
        pathname.startsWith('/favicon')
    ) {
        return NextResponse.next()
    }

    // Dejar pasar rutas públicas explícitas
    if (PUBLIC_ROUTES.some(route => pathname.startsWith(route))) {
        return NextResponse.next()
    }

    // Proteger TODAS las rutas /admin/* excepto /admin/login
    if (pathname.startsWith('/admin')) {
        const sessionCookie = request.cookies.get('addag_auth')

        if (!sessionCookie?.value) {
            const loginUrl = new URL('/admin/login', request.url)
            // Guardar la URL de destino para redirigir de vuelta tras login
            loginUrl.searchParams.set('redirect', pathname)
            return NextResponse.redirect(loginUrl)
        }
    }

    return NextResponse.next()
}

export const config = {
    matcher: [
        /*
         * Aplica el middleware a todas las rutas EXCEPTO:
         * - Archivos estáticos (_next/static, _next/image, favicon)
         * - Rutas de imágenes optimizadas
         */
        '/((?!_next/static|_next/image|favicon.ico).*)',
    ],
}
