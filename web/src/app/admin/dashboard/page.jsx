'use client'

import { useEffect, useState } from 'react' // <--- Importante
import { supabase } from '@/lib/supabaseClient' // <--- Importante
import { Users, FileText, CheckCircle, Clock, Loader2 } from 'lucide-react'

// Componente de Tarjeta de Resumen
function StatCard({ title, value, icon: Icon, color, subtext }) {
    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex items-start justify-between transition-all hover:shadow-md">
            <div>
                <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
                <h3 className="text-3xl font-bold text-gray-800">{value}</h3>
                {subtext && <p className="text-xs text-gray-400 mt-2">{subtext}</p>}
            </div>
            <div className={`p-3 rounded-lg ${color}`}>
                <Icon className="w-6 h-6 text-white" />
            </div>
        </div>
    )
}

export default function DashboardHome() {
    const [stats, setStats] = useState({
        pendientes: 0,
        aprobados: 0,
        totales: 0,
        impresos: 0
    })
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const cargarStats = async () => {
            try {
                // Hacemos las consultas en paralelo para que sea rápido
                const [resPendientes, resAprobados, resTotal, resImpresos] = await Promise.all([
                    supabase.from('miembros').select('*', { count: 'exact', head: true }).eq('estado', 'PENDIENTE'),
                    supabase.from('miembros').select('*', { count: 'exact', head: true }).eq('estado', 'APROBADO'),
                    supabase.from('miembros').select('*', { count: 'exact', head: true }),
                    supabase.from('miembros').select('*', { count: 'exact', head: true }).eq('estado', 'IMPRESO')
                ])

                setStats({
                    pendientes: resPendientes.count || 0,
                    aprobados: resAprobados.count || 0,
                    totales: resTotal.count || 0,
                    impresos: resImpresos.count || 0
                })
            } catch (error) {
                console.error('Error cargando stats:', error)
            } finally {
                setLoading(false)
            }
        }
        cargarStats()
    }, [])

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Panel General</h1>
                <p className="text-gray-500">Bienvenido al centro de control ADDAG.</p>
            </div>

            {loading ? (
                <div className="flex justify-center p-10"><Loader2 className="animate-spin text-blue-600"/></div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <StatCard 
                        title="Solicitudes Pendientes" 
                        value={stats.pendientes} 
                        icon={Clock} 
                        color="bg-orange-500" 
                        subtext="Requieren revisión"
                    />
                    <StatCard 
                        title="Carnés Aprobados" 
                        value={stats.aprobados} 
                        icon={CheckCircle} 
                        color="bg-green-500" 
                        subtext="Listos para imprimir"
                    />
                    <StatCard 
                        title="Miembros Totales" 
                        value={stats.totales} 
                        icon={Users} 
                        color="bg-blue-600"
                        subtext="Base de datos activa" 
                    />
                    <StatCard 
                        title="Total Impresos" 
                        value={stats.impresos} 
                        icon={FileText} 
                        color="bg-purple-500"
                        subtext="Histórico" 
                    />
                </div>
            )}

            {/* ... (El resto del área de trabajo rápido se queda igual) ... */}
        </div>
    )
}