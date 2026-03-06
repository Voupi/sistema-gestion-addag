'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'
import {
    Users, FileText, CheckCircle, Clock, Loader2,
    Car, PrinterIcon, ClipboardList, ArrowRight,
    CalendarClock
} from 'lucide-react'

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

function AccionCard({ href, icon: Icon, color, title, description }) {
    return (
        <Link
            href={href}
            className="group bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex items-center gap-4 transition-all hover:shadow-md hover:border-blue-200"
        >
            <div className={`p-3 rounded-lg ${color} flex-shrink-0`}>
                <Icon className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-800 text-sm">{title}</p>
                <p className="text-xs text-gray-400 mt-0.5 truncate">{description}</p>
            </div>
            <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all flex-shrink-0" />
        </Link>
    )
}

function getProximoViernes() {
    const hoy = new Date()
    const dia = hoy.getDay() // 0=dom, 5=vie
    const diasHastaViernes = dia === 5 ? 7 : (5 - dia + 7) % 7 || 7
    const viernes = new Date(hoy)
    viernes.setDate(hoy.getDate() + (diasHastaViernes === 0 ? 7 : diasHastaViernes))
    return viernes.toLocaleDateString('es-GT', { weekday: 'long', day: 'numeric', month: 'long' })
}

export default function DashboardHome() {
    const [stats, setStats] = useState({
        pendientes: 0,
        aprobados: 0,
        totales: 0,
        impresos: 0,
        parqueosPendientes: 0,
        parqueosAprobados: 0,
    })
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const cargarStats = async () => {
            try {
                const [
                    resPendientes, resAprobados, resTotal, resImpresos,
                    resParkPend, resParkAprov
                ] = await Promise.all([
                    supabase.from('miembros').select('*', { count: 'exact', head: true }).eq('estado', 'PENDIENTE'),
                    supabase.from('miembros').select('*', { count: 'exact', head: true }).eq('estado', 'APROBADO'),
                    supabase.from('miembros').select('*', { count: 'exact', head: true }),
                    supabase.from('miembros').select('*', { count: 'exact', head: true }).eq('estado', 'IMPRESO'),
                    supabase.from('parqueos').select('*', { count: 'exact', head: true }).eq('estado', 'PENDIENTE'),
                    supabase.from('parqueos').select('*', { count: 'exact', head: true }).eq('estado', 'APROBADO'),
                ])
                setStats({
                    pendientes: resPendientes.count || 0,
                    aprobados: resAprobados.count || 0,
                    totales: resTotal.count || 0,
                    impresos: resImpresos.count || 0,
                    parqueosPendientes: resParkPend.count || 0,
                    parqueosAprobados: resParkAprov.count || 0,
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
                <div className="flex justify-center p-10">
                    <Loader2 className="animate-spin text-blue-600 w-8 h-8" />
                </div>
            ) : (
                <>
                    {/* Carnés de Asociado */}
                    <div>
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Carnés de Asociado</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <StatCard
                                title="Solicitudes Pendientes"
                                value={stats.pendientes}
                                icon={Clock}
                                color="bg-orange-500"
                                subtext="Requieren revisión"
                            />
                            <StatCard
                                title="Aprobados"
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
                    </div>

                    {/* Parqueos */}
                    <div>
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Carnés de Parqueo</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <StatCard
                                title="Parqueos Pendientes"
                                value={stats.parqueosPendientes}
                                icon={Clock}
                                color="bg-orange-400"
                                subtext="Requieren revisión"
                            />
                            <StatCard
                                title="Parqueos Aprobados"
                                value={stats.parqueosAprobados}
                                icon={Car}
                                color="bg-teal-500"
                                subtext="Listos para imprimir"
                            />
                        </div>
                    </div>

                    {/* Acciones Rápidas */}
                    <div>
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Acciones Rápidas</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <AccionCard
                                href="/admin/dashboard/solicitudes"
                                icon={ClipboardList}
                                color="bg-blue-600"
                                title="Revisar Solicitudes de Carnés"
                                description="Aprobar, editar o rechazar solicitudes de asociados"
                            />
                            <AccionCard
                                href="/admin/dashboard/parqueos"
                                icon={Car}
                                color="bg-teal-500"
                                title="Gestionar Parqueos"
                                description="Flujo de solicitudes de carnés de parqueo"
                            />
                            <AccionCard
                                href="/admin/print"
                                icon={PrinterIcon}
                                color="bg-purple-600"
                                title="Imprimir Carnés de Asociado"
                                description="PDF con carnés aprobados en cola de impresión"
                            />
                            <AccionCard
                                href="/admin/print-parqueo"
                                icon={PrinterIcon}
                                color="bg-indigo-500"
                                title="Imprimir Carnés de Parqueo"
                                description="PDF con carnés de parqueo listos para imprimir"
                            />
                        </div>
                    </div>

                    {/* Próxima sesión */}
                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-center gap-3">
                        <CalendarClock className="w-5 h-5 text-blue-500 flex-shrink-0" />
                        <p className="text-sm text-blue-800">
                            <span className="font-semibold">Próxima sesión de impresión:</span>{' '}
                            {getProximoViernes()} a las 4:00 PM
                        </p>
                    </div>
                </>
            )}
        </div>
    )
}
