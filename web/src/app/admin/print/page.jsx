'use client'

import { useEffect, useState } from 'react'
import { PDFViewer } from '@react-pdf/renderer'
import { CarnetDocument } from '@/components/CarnetPDF'
import { supabase } from '@/lib/supabaseClient'

export default function PrintPage() {
    const [miembros, setMiembros] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const cargarDatos = async () => {
            // Cargar solo los aprobados e impresos
            const { data } = await supabase
                .from('miembros')
                .select('*')
                .in('estado', ['APROBADO', 'IMPRESO']) // Filtramos
                .order('apellidos') // Orden alfabético para imprimir ordenado

            setMiembros(data || [])
            setLoading(false)
        }
        cargarDatos()
    }, [])

    if (loading) return <div>Generando PDF...</div>

    return (
        <div className="w-full h-screen">
            <PDFViewer width="100%" height="100%">
                <CarnetDocument miembros={miembros} />
            </PDFViewer>
        </div>
    )
}