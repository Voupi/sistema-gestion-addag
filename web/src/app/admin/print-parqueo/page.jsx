'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { PDFViewer } from '@react-pdf/renderer'
import { CarnetDocument } from '@/components/CarnetParqueoPDF'
import { supabase } from '@/lib/supabaseClient'
import { ShieldAlert } from 'lucide-react'

export default function PrintParqueoPage() {
    const router = useRouter()
    // 'checking' | 'allowed' | 'denied'
    const [authStatus, setAuthStatus] = useState('checking')
    const [miembros, setMiembros] = useState([])
    const [loading, setLoading] = useState(true)

    // RF15 + RF18: Verificar sesión y rol de administrador antes de mostrar el PDF
    useEffect(() => {
        const checkAuth = async () => {
            const { data: { session } } = await supabase.auth.getSession()

            if (!session) {
                router.replace('/admin/login')
                return
            }

            const { data: perfil } = await supabase
                .from('entrenadores')
                .select('es_admin')
                .eq('email', session.user.email)
                .single()

            if (perfil?.es_admin === true) {
                setAuthStatus('allowed')
            } else {
                setAuthStatus('denied')
            }
        }
        checkAuth()
    }, [router])

    useEffect(() => {
        if (authStatus !== 'allowed') return
        const cargarDatos = async () => {
            const { data } = await supabase
                .from('parqueos')
                .select('*')
                .in('estado', ['APROBADO', 'REIMPRESION'])
                .order('apellidos')

            setMiembros(data || [])
            setLoading(false)
        }
        cargarDatos()
    }, [authStatus])

    if (authStatus === 'checking' || (loading && authStatus === 'allowed')) {
        return (
            <div className="flex h-screen items-center justify-center bg-gray-100">
                <p className="text-xl font-bold text-gray-500 animate-pulse">Verificando acceso...</p>
            </div>
        )
    }

    // RF15 + RF18: Acceso denegado para no-administradores
    if (authStatus === 'denied') {
        return (
            <div className="flex flex-col h-screen items-center justify-center bg-gray-100 text-center">
                <ShieldAlert className="w-16 h-16 text-red-400 mb-4" />
                <h2 className="text-2xl font-bold text-gray-800 mb-2">Acceso Restringido</h2>
                <p className="text-gray-500 max-w-sm">
                    La generación de PDFs de parqueo es exclusiva para administradores.
                </p>
            </div>
        )
    }

    return (
        <div className="w-full h-screen">
            <PDFViewer width="100%" height="100%">
                <CarnetDocument miembros={miembros} />
            </PDFViewer>
        </div>
    )
}
