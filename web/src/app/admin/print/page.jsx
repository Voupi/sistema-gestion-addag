'use client'

import { useEffect, useState } from 'react'
import { PDFViewer } from '@react-pdf/renderer'
import { CarnetDocument } from '@/components/CarnetPDF'
import { supabase } from '@/lib/supabaseClient'

export default function PrintPage() {
    // Agrupamos todo el estado para evitar re-renders múltiples
    const [data, setData] = useState({
        miembros: [],
        baseUrl: '',
        ready: false
    })

    useEffect(() => {
        const cargarTodo = async () => {
            // 1. Obtener URL Base (para las imágenes)
            const origin = typeof window !== 'undefined' ? window.location.origin : ''

            // 2. Cargar Datos de Supabase
            const { data: dbData } = await supabase
                .from('miembros')
                .select('*')
                .in('estado', ['APROBADO', 'REIMPRESION']) 
                .order('apellidos')

            // 3. Actualizar todo el estado de una sola vez
            setData({
                miembros: dbData || [],
                baseUrl: origin,
                ready: true
            })
        }

        cargarTodo()
    }, [])

    if (!data.ready) {
        return (
            <div className="flex h-screen items-center justify-center bg-gray-100">
                <p className="text-xl font-bold text-gray-500 animate-pulse">
                    Preparando documentos...
                </p>
            </div>
        )
    }

    return (
        <div className="w-full h-screen">
            <PDFViewer width="100%" height="100%">
                <CarnetDocument 
                    miembros={data.miembros} 
                    baseUrl={data.baseUrl} // Pasamos la URL limpia
                />
            </PDFViewer>
        </div>
    )
}