'use client'

import { useEffect, useState } from 'react'
import { PDFViewer } from '@react-pdf/renderer'
import { CarnetDocument } from '@/components/CarnetParqueoPDF' // <--- OJO: Importamos el componente NUEVO
import { supabase } from '@/lib/supabaseClient'

export default function PrintParqueoPage() {
    const [miembros, setMiembros] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const cargarDatos = async () => {
            // Cargar SOLO la cola activa de PARQUEOS
            const { data } = await supabase
                .from('parqueos') // <--- Tabla Parqueos
                .select('*')
                .in('estado', ['APROBADO', 'REIMPRESION']) 
                .order('apellidos')

            setMiembros(data || [])
            setLoading(false)
        }
        cargarDatos()
    }, [])

    if (loading) return <div className="p-10 text-center font-bold">Generando PDF de Parqueos...</div>

    return (
        <div className="w-full h-screen">
            <PDFViewer width="100%" height="100%">
                {/* Asegúrate que en CarnetParqueoPDF.jsx exportaste 'CarnetDocument' o cambiale el nombre aquí */}
                <CarnetDocument miembros={miembros} />
            </PDFViewer>
        </div>
    )
}