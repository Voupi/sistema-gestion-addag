'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { Loader2, LayoutDashboard, Users, LogOut, FileText, Settings } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function AdminDashboardLayout({ children }) {
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [user, setUser] = useState(null)
    const pathname = usePathname()

    useEffect(() => {
        const checkAuth = async () => {
            // Verificar sesión actual
            const { data: { session }, error } = await supabase.auth.getSession()

            if (error || !session) {
                // Si no hay sesión, patear al login
                router.replace('/admin/login')
            } else {
                // Si hay sesión, permitir acceso
                setUser(session.user)
                setLoading(false)
            }
        }

        checkAuth()
    }, [router])

    const handleLogout = async () => {
        await supabase.auth.signOut()
        router.replace('/admin/login')
    }

    if (loading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
                <Loader2 className="w-10 h-10 text-blue-900 animate-spin mb-4" />
                <p className="text-gray-500 font-medium">Verificando credenciales...</p>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-100 flex font-sans">
            {/* Sidebar (Menú Lateral) */}
            <aside className="w-64 bg-blue-900 text-white hidden md:flex flex-col flex-shrink-0 shadow-xl z-20">
                <div className="p-6 bg-blue-950">
                    <h2 className="text-xl font-bold tracking-wider">ADDAG ADMIN</h2>
                    <p className="text-xs text-blue-300 mt-1">Panel de Control v2.0</p>
                </div>

                <nav className="flex-1 px-4 py-6 space-y-2">
                    {/* ENLACE RESUMEN: Usamos comparación exacta (===) */}
                    <Link href="/admin/dashboard" className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${pathname === '/admin/dashboard'
                            ? 'bg-blue-800 text-white font-medium shadow-sm border border-blue-700'
                            : 'hover:bg-blue-800/50 text-blue-100'
                        }`}>
                        <LayoutDashboard className="w-5 h-5" />
                        <span>Resumen</span>
                    </Link>

                    {/* ENLACE SOLICITUDES: Usamos includes */}
                    <Link href="/admin/dashboard/solicitudes" className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${pathname.includes('/solicitudes')
                            ? 'bg-blue-800 text-white font-medium shadow-sm border border-blue-700'
                            : 'hover:bg-blue-800/50 text-blue-100'
                        }`}>
                        <FileText className="w-5 h-5" />
                        <span>Solicitudes</span>
                    </Link>

                    {/* ENLACE MIEMBROS 
                    COMENTADO POR AHORA
                    <Link href="/admin/dashboard/miembros" className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${pathname.includes('/miembros')
                            ? 'bg-blue-800 text-white font-medium shadow-sm border border-blue-700'
                            : 'hover:bg-blue-800/50 text-blue-100'
                        }`}>
                        <Users className="w-5 h-5" />
                        <span>Miembros</span>
                    </Link>
                    */}
                </nav>

                <div className="p-4 border-t border-blue-800">
                    <div className="flex items-center gap-3 mb-4 px-2">
                        <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-sm font-bold">
                            {user?.email?.[0].toUpperCase() || 'A'}
                        </div>
                        <div className="overflow-hidden">
                            <p className="text-sm font-medium truncate">{user?.email}</p>
                            <p className="text-xs text-blue-300">Administrador</p>
                        </div>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg text-sm font-medium transition-colors"
                    >
                        <LogOut className="w-4 h-4" />
                        Cerrar Sesión
                    </button>
                </div>
            </aside>

            {/* Contenido Principal */}
            <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
                {/* Navbar Móvil (Solo visible en celus) */}
                <header className="bg-white shadow-sm border-b px-6 py-4 md:hidden flex justify-between items-center z-10">
                    <span className="font-bold text-blue-900">ADDAG Panel</span>
                    <button onClick={handleLogout} className="text-gray-500 hover:text-red-600">
                        <LogOut className="w-6 h-6" />
                    </button>
                </header>

                {/* Área de Scroll */}
                <div className="flex-1 overflow-auto p-4 md:p-8 relative">
                    {children}
                </div>
            </main>
        </div>
    )
}