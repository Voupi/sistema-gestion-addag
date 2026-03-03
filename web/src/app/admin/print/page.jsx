'use client'

import { useEffect, useState } from 'react'
import { PDFViewer } from '@react-pdf/renderer'
import { CarnetDocument } from '@/components/CarnetPDF'
import { supabase } from '@/lib/supabaseClient'

const LS_KEY = 'addag_fecha_expiracion'
const defaultFecha = `31 de Diciembre de ${new Date().getFullYear()}`

export default function PrintPage() {
    const [data, setData] = useState({ miembros: [], baseUrl: '', ready: false })

    // RF06: Fecha de vencimiento global guardada en localStorage
    const [fechaExpiracion, setFechaExpiracion] = useState(defaultFecha)
    const [inputFecha, setInputFecha] = useState(defaultFecha)
    const [fechaGuardada, setFechaGuardada] = useState(false)

    // Cargar la fecha guardada al montar
    useEffect(() => {
        const saved = localStorage.getItem(LS_KEY)
        if (saved) {
            setFechaExpiracion(saved)
            setInputFecha(saved)
        }
    }, [])

    const handleGuardarFecha = () => {
        const trimmed = inputFecha.trim()
        if (!trimmed) return
        localStorage.setItem(LS_KEY, trimmed)
        setFechaExpiracion(trimmed)
        setFechaGuardada(true)
        setTimeout(() => setFechaGuardada(false), 2000)
    }

    useEffect(() => {
        const cargarTodo = async () => {
            const origin = typeof window !== 'undefined' ? window.location.origin : ''
            const { data: dbData } = await supabase
                .from('miembros')
                .select('*')
                .in('estado', ['APROBADO', 'REIMPRESION'])
                .order('apellidos')
            setData({ miembros: dbData || [], baseUrl: origin, ready: true })
        }
        cargarTodo()
    }, [])

    if (!data.ready) {
        return (
            <div className="flex h-screen items-center justify-center bg-gray-100">
                <p className="text-xl font-bold text-gray-500 animate-pulse">Preparando documentos...</p>
            </div>
        )
    }

    return (
        <div className="flex flex-col h-screen">
            {/* RF06: Barra de configuración de fecha global */}
            <div className="flex items-center gap-3 px-4 py-2 bg-blue-900 text-white text-sm flex-shrink-0">
                <span className="font-semibold whitespace-nowrap">Fecha de vencimiento global:</span>
                <input
                    type="text"
                    value={inputFecha}
                    onChange={(e) => setInputFecha(e.target.value)}
                    placeholder="Ej: 31 de Diciembre de 2026"
                    className="flex-1 max-w-xs px-3 py-1 rounded text-gray-900 text-sm outline-none border-2 border-transparent focus:border-blue-400"
                />
                <button
                    onClick={handleGuardarFecha}
                    className="px-4 py-1 bg-blue-500 hover:bg-blue-400 rounded font-bold transition-colors"
                >
                    {fechaGuardada ? '✓ Guardada' : 'Aplicar'}
                </button>
                <span className="text-blue-300 text-xs">
                    ({data.miembros.length} carnés en cola)
                </span>
            </div>

            <div className="flex-1">
                <PDFViewer width="100%" height="100%">
                    <CarnetDocument
                        miembros={data.miembros}
                        baseUrl={data.baseUrl}
                        fechaExpiracion={fechaExpiracion}
                    />
                </PDFViewer>
            </div>
        </div>
    )
}
