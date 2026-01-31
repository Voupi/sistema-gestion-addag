'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import {
    Search, Loader2, RefreshCw, UserCheck, Printer,
    CheckCircle, RotateCcw, XCircle, Car,
    Scissors, PackageCheck, Info
} from 'lucide-react'
import ModalGestionMiembro from '@/components/ModalGestionMiembro'
import { notificarImpresion } from '@/actions/notificarImpresion'

const getStatusColor = (status) => {
    switch (status) {
        case 'PENDIENTE': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
        case 'APROBADO': return 'bg-green-100 text-green-800 border-green-200'
        case 'REIMPRESION': return 'bg-purple-100 text-purple-800 border-purple-200'
        case 'IMPRESO': return 'bg-blue-100 text-blue-800 border-blue-200'
        case 'EN_PROCESO': return 'bg-orange-100 text-orange-800 border-orange-200'
        case 'LISTO': return 'bg-teal-100 text-teal-800 border-teal-200'
        case 'ENTREGADO': return 'bg-gray-100 text-gray-600 border-gray-200'
        default: return 'bg-gray-50 text-gray-800'
    }
}

// Diccionario de Pestañas y Ayuda
const TABS = [
    { id: 'TODOS', label: 'TODOS', help: 'Vista general de todos los registros históricos.' },
    { id: 'PENDIENTE', label: 'PENDIENTES', help: 'Solicitudes nuevas que requieren revisión y aprobación.' },
    { id: 'EN_COLA', label: '1. COLA 🖨️', help: 'Carnés aprobados listos para generar el PDF de impresión.' },
    { id: 'IMPRESO', label: '2. TALLER ✂️', help: 'Carnés ya impresos en papel. Listos para corte y emplasticado.' },
    { id: 'EN_PROCESO', label: '3. PROCESO ⚙️', help: 'Actualmente en mesa de trabajo (secando, pegando).' },
    { id: 'LISTO', label: '4. LISTOS ✅', help: 'Terminados y notificados. Esperando en recepción.' },
    { id: 'ENTREGADO', label: '5. HISTORIAL 📂', help: 'Carnés ya entregados al usuario final.' },
    { id: 'RECHAZADOS_HIST', label: '❌ RECHAZADOS', help: 'Historial de solicitudes denegadas.' },
]

export default function ParqueosAdminPage() {
    const [miembros, setMiembros] = useState([])
    const [loading, setLoading] = useState(true)
    const [filtroEstado, setFiltroEstado] = useState('TODOS')
    const [busqueda, setBusqueda] = useState('')
    const [miembroSeleccionado, setMiembroSeleccionado] = useState(null)
    const [showConfirmPrint, setShowConfirmPrint] = useState(false)
    const [isPrinting, setIsPrinting] = useState(false)

    const fetchMiembros = async () => {
        setLoading(true)
        try {
            let data, error

            if (filtroEstado === 'RECHAZADOS_HIST') {
                // CONSULTA A LA TABLA DE RECHAZADOS (Solo los de Parqueo)
                const result = await supabase
                    .from('solicitudes_rechazadas')
                    .select('*')
                    .eq('origen', 'PARQUEO')
                    .order('created_at', { ascending: false })

                data = result.data
                error = result.error

                // Mapeamos para que la estructura visual no se rompa (agregamos estado ficticio)
                if (data) {
                    data = data.map(d => ({
                        ...d,
                        estado: 'RECHAZADO', // Estado visual para el badge rojo
                        id: d.id // ID del registro histórico
                    }))
                }
            } else {
                // CONSULTA NORMAL A PARQUEOS
                const result = await supabase
                    .from('parqueos')
                    .select('*')
                    .order('created_at', { ascending: false })
                data = result.data
                error = result.error
            }

            if (error) throw error
            setMiembros(data)
        } catch (error) { console.error(error); alert('Error cargando datos') }
        finally { setLoading(false) }
    }

    // Efecto para recargar cuando cambias de pestaña
    useEffect(() => {
        fetchMiembros()
    }, [filtroEstado]) // <--- AGREGAMOS DEPENDENCIA filtroEstado

    useEffect(() => { fetchMiembros() }, [])

    // --- ACCIONES INDIVIDUALES ---
    const handleReimprimir = async (id) => {
        if (!confirm('¿Agregar a cola de impresión nuevamente?')) return
        await supabase.from('parqueos').update({ estado: 'REIMPRESION' }).eq('id', id)
        fetchMiembros()
    }

    const handleSacarDeCola = async (miembro) => {
        if (!confirm('¿Sacar de la cola?')) return
        const nuevoEstado = miembro.estado === 'APROBADO' ? 'PENDIENTE' : 'IMPRESO'
        await supabase.from('parqueos').update({ estado: nuevoEstado }).eq('id', miembro.id)
        fetchMiembros()
    }

    const avanzarEstadoIndividual = async (id, nuevoEstado, confirmar = false) => {
        if (confirmar && !confirm('¿Avanzar a la siguiente etapa?')) return
        await supabase.from('parqueos').update({ estado: nuevoEstado }).eq('id', id)
        fetchMiembros()
    }
    const handleMarcarListo = async (miembro) => {
        const confirm1 = confirm('¿Marcar como LISTO y notificar al usuario por correo?')
        if (!confirm1) return
        await avanzarEstadoIndividual(miembro.id, 'LISTO')
        try {
            await notificarImpresion({ email: miembro.email, nombre: miembro.nombres, tipo: 'PARQUEO' })
        } catch (error) {
            console.error('Error enviando notificación:', error)
            alert('Error enviando correo de notificación.')
        }
    }
    const handleMarcarEntregado = async (id) => {
        const confirm1 = confirm('¿Marcar como ENTREGADO?')
        if (!confirm1) return
        await avanzarEstadoIndividual(id, 'ENTREGADO')
    }

    // --- ACCIONES MASIVAS ---
    const handleAccionMasiva = async () => {
        if (miembrosFiltrados.length === 0) return alert('No hay registros para procesar.')

        let nuevoEstado = ''
        let accionTexto = ''
        let requiereCorreo = false

        // Lógica según pestaña
        if (filtroEstado === 'IMPRESO') { // TALLER
            nuevoEstado = 'EN_PROCESO'
            accionTexto = 'INICIAR PROCESO DE CORTE'
        } else if (filtroEstado === 'EN_PROCESO') { // PROCESO
            nuevoEstado = 'LISTO'
            accionTexto = 'FINALIZAR Y NOTIFICAR'
            requiereCorreo = true
        } else if (filtroEstado === 'LISTO') { // LISTOS
            nuevoEstado = 'ENTREGADO'
            accionTexto = 'ENTREGAR'
        } else {
            return
        }

        const confirm1 = confirm(`¿Estás seguro de ${accionTexto} a los ${miembrosFiltrados.length} registros?`)
        if (!confirm1) return

        setIsPrinting(true)
        try {
            const ids = miembrosFiltrados.map(m => m.id)
            const { error } = await supabase.from('parqueos').update({ estado: nuevoEstado }).in('id', ids)
            if (error) throw error

            if (requiereCorreo) {
                const notificaciones = miembrosFiltrados.map(m =>
                    notificarImpresion({ email: m.email, nombre: m.nombres, tipo: 'PARQUEO' })
                )
                await Promise.allSettled(notificaciones)
            }

            alert('¡Lote procesado con éxito!')
            fetchMiembros()
        } catch (error) {
            console.error(error)
            alert('Error al procesar el lote.')
        } finally {
            setIsPrinting(false)
        }
    }

    // --- IMPRESIÓN ---
    const handlePrintClick = () => {
        window.open('/admin/print-parqueo', '_blank')
        setShowConfirmPrint(true)
    }

    const handleConfirmarImpresion = async () => {
        setIsPrinting(true)
        try {
            const { error } = await supabase
                .from('parqueos')
                .update({ estado: 'IMPRESO' }) // Pasa a TALLER
                .in('estado', ['APROBADO', 'REIMPRESION'])

            if (error) throw error
            alert('Impresión confirmada. Pasa a la pestaña "2. TALLER".')
            setShowConfirmPrint(false)
            fetchMiembros()
        } catch (error) { alert('Error actualizando estados') }
        finally { setIsPrinting(false) }
    }

    // --- FILTROS ---
    const miembrosFiltrados = miembros.filter(m => {
        if (filtroEstado === 'EN_COLA') return m.estado === 'APROBADO' || m.estado === 'REIMPRESION'
        if (filtroEstado === 'TODOS') return true
        if (m.estado === filtroEstado) return true
        return false
    }).filter(m => {
        const term = busqueda.toLowerCase()
        return m.nombres.toLowerCase().includes(term) || m.dpi_cui.toLowerCase().includes(term)
    })

    const currentTabInfo = TABS.find(t => t.id === filtroEstado)

    return (
        <div className="space-y-6 animate-in fade-in duration-500 font-sans">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Car className="w-8 h-8 text-blue-600" /> Gestión de Parqueos
                    </h1>
                    <p className="text-gray-500 text-sm">Flujo de Trabajo v2.0</p>
                </div>
                <button onClick={fetchMiembros} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50">
                    <RefreshCw className="w-4 h-4" /> Actualizar
                </button>
            </div>

            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 space-y-4">
                <div className="flex bg-gray-100 p-1 rounded-lg overflow-x-auto">
                    {TABS.map((tab) => (
                        <button key={tab.id} onClick={() => setFiltroEstado(tab.id)} className={`px-4 py-2 rounded-md text-xs font-bold whitespace-nowrap transition-all ${filtroEstado === tab.id ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                            {tab.label}
                        </button>
                    ))}
                </div>

                <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-800 text-xs rounded-md border border-blue-100">
                    <Info className="w-4 h-4" />
                    <span className="font-medium">{currentTabInfo?.help}</span>
                </div>

                <div className="flex flex-col xl:flex-row gap-4 justify-between items-center pt-2 border-t border-gray-100">
                    <div className="flex gap-2">
                        {filtroEstado === 'EN_COLA' && (
                            <button onClick={handlePrintClick} className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 shadow-md animate-in zoom-in">
                                <Printer className="w-5 h-5" /> IMPRIMIR LOTE ({miembrosFiltrados.length})
                            </button>
                        )}

                        {(filtroEstado === 'IMPRESO' || filtroEstado === 'EN_PROCESO' || filtroEstado === 'LISTO') && (
                            <button onClick={handleAccionMasiva} className={`flex items-center gap-2 px-4 py-2 text-white rounded-lg font-bold shadow-md animate-in zoom-in transition-all ${filtroEstado === 'IMPRESO' ? 'bg-orange-600 hover:bg-orange-700' :
                                filtroEstado === 'EN_PROCESO' ? 'bg-teal-600 hover:bg-teal-700' :
                                    'bg-gray-700 hover:bg-gray-800'
                                }`}>
                                {isPrinting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                                {filtroEstado === 'IMPRESO' ? 'INICIAR PROCESO' : filtroEstado === 'EN_PROCESO' ? 'FINALIZAR Y NOTIFICAR' : 'ENTREGAR TODOS'} ({miembrosFiltrados.length})
                            </button>
                        )}
                    </div>

                    <div className="relative w-full xl:w-80">
                        <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                        <input type="text" placeholder="Buscar..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-4">Solicitante</th>
                                <th className="px-6 py-4">Estado Actual</th>
                                <th className="px-6 py-4 text-right">Siguiente Paso</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (<tr><td colSpan="3" className="p-8 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-500" /></td></tr>) :
                                miembrosFiltrados.map((m) => (
                                    <tr key={m.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-gray-100 overflow-hidden border border-gray-200 relative">
                                                    {m.foto_url ? <img src={m.foto_url} alt="" className="w-full h-full object-cover" /> : <UserCheck className="w-5 h-5 m-auto text-gray-400" />}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-gray-900">{m.nombres} {m.apellidos}</p>
                                                    <p className="font-mono text-xs text-gray-500">{m.dpi_cui}</p>
                                                </div>
                                            </div>

                                        </td>
                                        <td className="px-6 py-4"><span className={`px-2 py-1 rounded text-[10px] font-bold border ${getStatusColor(m.estado)}`}>{m.estado}</span>
                                            {/* Mostrar motivo si es rechazado */}
                                            {m.estado === 'RECHAZADO' && (
                                                <p className="text-[10px] text-red-600 mt-1 max-w-[200px] truncate" title={m.motivo}>
                                                    {m.motivo}
                                                </p>
                                            )}
                                        </td>
                                        {/* Celda Acciones */}
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2 items-center">
                                                {m.estado === 'RECHAZADO' ? (
                                                    <button
                                                        onClick={() => alert(`Motivo de rechazo:\n\n${m.motivo}`)}
                                                        className="px-3 py-1.5 border border-red-200 text-red-600 bg-red-50 rounded text-xs font-medium"
                                                    >
                                                        Ver Motivo
                                                    </button>
                                                ) : (
                                                    <>
                                                        {m.estado === 'IMPRESO' && (
                                                            <button onClick={() => avanzarEstadoIndividual(m.id, 'EN_PROCESO')} className="btn-action bg-orange-50 text-orange-700 border-orange-200" title="Pasar a Corte">
                                                                <Scissors className="w-4 h-4" /> En Proceso
                                                            </button>
                                                        )}
                                                        {m.estado === 'EN_PROCESO' && (
                                                            <button onClick={() => handleMarcarListo(m)} className="btn-action bg-teal-50 text-teal-700 border-teal-200" title="Finalizar">
                                                                <PackageCheck className="w-4 h-4" /> ¡Listo!
                                                            </button>
                                                        )}
                                                        {m.estado === 'LISTO' && (
                                                            <button onClick={() => handleMarcarEntregado(m.id)} className="btn-action bg-gray-100 text-gray-700 border-gray-300" title="Entregar">
                                                                <UserCheck className="w-4 h-4" /> Entregar
                                                            </button>
                                                        )}

                                                        <button onClick={() => setMiembroSeleccionado(m)} className="px-3 py-1.5 border border-gray-300 rounded hover:bg-gray-50 text-xs font-medium">Ver</button>

                                                        {(m.estado === 'ENTREGADO' || m.estado === 'LISTO' || m.estado === 'IMPRESO') && (
                                                            <button onClick={() => handleReimprimir(m.id)} className="p-1.5 text-purple-600 hover:bg-purple-50 rounded" title="Reimprimir"><RotateCcw className="w-4 h-4" /></button>
                                                        )}
                                                        {(m.estado === 'APROBADO' || m.estado === 'REIMPRESION') && (
                                                            <button onClick={() => handleSacarDeCola(m)} className="p-1.5 text-red-600 hover:bg-red-50 rounded" title="Sacar"><XCircle className="w-4 h-4" /></button>
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {miembroSeleccionado && <ModalGestionMiembro miembroInicial={miembroSeleccionado} listaMiembros={miembrosFiltrados} onClose={() => setMiembroSeleccionado(null)} onUpdate={fetchMiembros} modo="PARQUEO" />}

            {showConfirmPrint && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
                    <div className="bg-white p-8 rounded-xl max-w-md text-center shadow-2xl">
                        <Printer className="w-16 h-16 text-blue-600 mx-auto mb-4" />
                        <h3 className="text-xl font-bold text-gray-900 mb-2">Impresión Lote</h3>
                        <p className="text-gray-600 mb-6 text-sm">Al confirmar, pasarán a la pestaña <strong>2. TALLER</strong>.</p>
                        <div className="flex flex-col gap-3">
                            <button onClick={handleConfirmarImpresion} disabled={isPrinting} className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg flex justify-center items-center gap-2">{isPrinting ? <Loader2 className="animate-spin" /> : <CheckCircle className="w-5 h-5" />} Confirmar</button>
                            <button onClick={() => setShowConfirmPrint(false)} disabled={isPrinting} className="w-full py-3 text-gray-500 hover:bg-gray-100 rounded-lg">Cancelar</button>
                        </div>
                    </div>
                </div>
            )}

            <style jsx>{`
                .btn-action { display: flex; align-items: center; gap: 0.5rem; padding: 0.3rem 0.75rem; border: 1px solid; border-radius: 0.375rem; font-size: 0.75rem; font-weight: 700; transition: all 0.2s; }
                .btn-action:hover { filter: brightness(0.95); }
            `}</style>
        </div>
    )
}