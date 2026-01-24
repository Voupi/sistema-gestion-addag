'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import {
    Search,
    Loader2,
    RefreshCw,
    UserCheck,
    Printer,
    CheckCircle,
    RotateCcw, // Icono para Reimprimir
    XCircle // Icono para Sacar de Cola
} from 'lucide-react'
import ModalGestionMiembro from '@/components/ModalGestionMiembro'
import { notificarImpresion } from '@/actions/notificarImpresion'

// Colores de estado actualizados
const getStatusColor = (status) => {
    switch (status) {
        case 'PENDIENTE': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
        case 'APROBADO': return 'bg-green-100 text-green-800 border-green-200' // En Cola (Nuevo)
        case 'REIMPRESION': return 'bg-purple-100 text-purple-800 border-purple-200' // En Cola (Viejo)
        case 'IMPRESO': return 'bg-blue-100 text-blue-800 border-blue-200' // Histórico
        case 'RECHAZADO': return 'bg-red-100 text-red-800 border-red-200'
        default: return 'bg-gray-100 text-gray-800'
    }
}

export default function SolicitudesPage() {
    const [miembros, setMiembros] = useState([])
    const [loading, setLoading] = useState(true)
    const [filtroEstado, setFiltroEstado] = useState('TODOS')
    const [busqueda, setBusqueda] = useState('')
    const [miembroSeleccionado, setMiembroSeleccionado] = useState(null)
    const [showConfirmPrint, setShowConfirmPrint] = useState(false)
    const [isPrinting, setIsPrinting] = useState(false)

    // Cargar datos
    const fetchMiembros = async () => {
        setLoading(true)
        try {
            const { data, error } = await supabase
                .from('miembros')
                .select('*')
                .order('created_at', { ascending: false })

            if (error) throw error
            setMiembros(data)
        } catch (error) {
            console.error(error)
            alert('Error al cargar datos')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { fetchMiembros() }, [])

    // --- LÓGICA DE COLA DE IMPRESIÓN ---

    // Meter a la cola (Reimprimir)
    const handleReimprimir = async (id) => {
        if (!confirm('¿Deseas agregar este carné a la cola de impresión?')) return

        const { error } = await supabase
            .from('miembros')
            .update({ estado: 'REIMPRESION' })
            .eq('id', id)

        if (error) alert('Error al agregar a cola')
        else fetchMiembros()
    }

    // Sacar de la cola (Cancelar impresión)
    const handleSacarDeCola = async (miembro) => {
        if (!confirm('¿Sacar de la cola de impresión?')) return

        // Si era nuevo (APROBADO), vuelve a PENDIENTE para que se revise bien
        // Si era viejo (REIMPRESION), vuelve a IMPRESO (no pasó nada)
        const nuevoEstado = miembro.estado === 'APROBADO' ? 'PENDIENTE' : 'IMPRESO'

        const { error } = await supabase
            .from('miembros')
            .update({ estado: nuevoEstado })
            .eq('id', miembro.id)

        if (error) alert('Error al sacar de cola')
        else fetchMiembros()
    }

    // Imprimir Lote
    const handlePrintClick = () => {
        window.open('/admin/print', '_blank')
        setShowConfirmPrint(true)
    }

    // Confirmar Impresión (Finalizar Lote)
    const handleConfirmarImpresion = async () => {
        setIsPrinting(true)
        try {
            // Buscamos a TODOS los que están en cola
            const { data: listos } = await supabase
                .from('miembros')
                .select('id, email, nombres, apellidos')
                .in('estado', ['APROBADO', 'REIMPRESION'])

            if (!listos || listos.length === 0) {
                alert('No hay nadie en la cola para confirmar.')
                setShowConfirmPrint(false)
                setIsPrinting(false)
                return
            }

            // Actualizar todos a IMPRESO
            await supabase
                .from('miembros')
                .update({ estado: 'IMPRESO' })
                .in('estado', ['APROBADO', 'REIMPRESION'])

            // Notificar
            const notificaciones = listos.map(m =>
                notificarImpresion({ email: m.email, nombre: m.nombres, tipo: 'GENERAL' })
            )
            await Promise.allSettled(notificaciones)

            alert(`¡Éxito! ${listos.length} carnés procesados y notificados.`)
            setShowConfirmPrint(false)
            fetchMiembros()

        } catch (error) {
            console.error(error)
            alert('Error masivo. Revisa la consola.')
        } finally {
            setIsPrinting(false)
        }
    }

    // --- FILTRADO INTELIGENTE ---
    const miembrosFiltrados = miembros.filter(miembro => {
        // Filtro especial "EN COLA"
        if (filtroEstado === 'EN_COLA') {
            return miembro.estado === 'APROBADO' || miembro.estado === 'REIMPRESION'
        }
        // Filtros normales
        if (filtroEstado !== 'TODOS' && miembro.estado !== filtroEstado) return false

        // Búsqueda
        const termino = busqueda.toLowerCase()
        const matchNombre = miembro.nombres.toLowerCase().includes(termino)
        const matchApellido = miembro.apellidos.toLowerCase().includes(termino)
        const matchDPI = miembro.dpi_cui.toLowerCase().includes(termino)

        return matchNombre || matchApellido || matchDPI
    })

    return (
        <div className="space-y-6 animate-in fade-in duration-500 font-sans">
            {/* Encabezado */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Gestión de Carnés</h1>
                    <p className="text-gray-500 text-sm">Base de datos unificada</p>
                </div>
                <button
                    onClick={fetchMiembros}
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                    <RefreshCw className="w-4 h-4" /> Actualizar
                </button>
            </div>

            {/* Barra de Herramientas */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-col xl:flex-row gap-4 justify-between items-center">

                {/* Pestañas de Estado */}
                <div className="flex bg-gray-100 p-1 rounded-lg overflow-x-auto w-full xl:w-auto">
                    {[
                        { id: 'TODOS', label: 'TODOS' },
                        { id: 'PENDIENTE', label: 'PENDIENTES' },
                        { id: 'EN_COLA', label: 'EN COLA DE IMPRESIÓN 🖨️' }, // Nueva Pestaña Especial
                        { id: 'IMPRESO', label: 'HISTORIAL IMPRESOS' },
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setFiltroEstado(tab.id)}
                            className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all whitespace-nowrap ${filtroEstado === tab.id
                                ? 'bg-white text-blue-700 shadow-sm'
                                : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* BOTÓN IMPRIMIR (Solo visible en la pestaña EN COLA) */}
                {filtroEstado === 'EN_COLA' && (
                    <button
                        onClick={handlePrintClick}
                        className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 shadow-md animate-in zoom-in"
                    >
                        <Printer className="w-5 h-5" />
                        IMPRIMIR LOTE ({miembrosFiltrados.length})
                    </button>
                )}

                {/* Buscador */}
                <div className="relative w-full xl:w-80">
                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Buscar por DPI o Nombre..."
                        value={busqueda}
                        onChange={(e) => setBusqueda(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-gray-400 text-gray-900"
                    />
                </div>
            </div>

            {/* Tabla */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-4">Miembro</th>
                                <th className="px-6 py-4">Documento</th>
                                <th className="px-6 py-4">Estado</th>
                                <th className="px-6 py-4 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                <tr><td colSpan="4" className="p-8 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-500" /></td></tr>
                            ) : miembrosFiltrados.length === 0 ? (
                                <tr><td colSpan="4" className="p-8 text-center text-gray-500">No hay registros en esta sección.</td></tr>
                            ) : (
                                miembrosFiltrados.map((m) => (
                                    <tr key={m.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-gray-100 overflow-hidden border border-gray-200 relative">
                                                    {m.foto_url ? (
                                                        <img src={m.foto_url} alt="" className="w-full h-full object-cover" />
                                                    ) : <UserCheck className="w-5 h-5 m-auto text-gray-400" />}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-gray-900">{m.nombres} {m.apellidos}</p>
                                                    <p className="text-xs text-gray-500">{m.rol}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 font-mono text-gray-600">{m.dpi_cui}</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded text-[10px] font-bold border ${getStatusColor(m.estado)}`}>
                                                {m.estado === 'REIMPRESION' ? 'EN COLA (REIMP)' : m.estado === 'APROBADO' ? 'EN COLA (NUEVO)' : m.estado}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                {/* Botón Gestión (Siempre visible) */}
                                                <button
                                                    onClick={() => setMiembroSeleccionado(m)}
                                                    className="px-3 py-1.5 bg-blue-50 text-blue-700 border border-blue-300 rounded hover:bg-blue-100 text-xs font-bold"
                                                >
                                                    Editar
                                                </button>

                                                {/* Botón Reimprimir (Solo si ya fue impreso) */}
                                                {m.estado === 'IMPRESO' && (
                                                    <button
                                                        onClick={() => handleReimprimir(m.id)}
                                                        className="px-3 py-1.5 bg-purple-50 text-purple-700 border border-purple-200 rounded hover:bg-purple-100 text-xs font-bold flex items-center gap-1"
                                                        title="Agregar a la cola de impresión nuevamente"
                                                    >
                                                        <RotateCcw className="w-3 h-3" /> Reimprimir
                                                    </button>
                                                )}

                                                {/* Botón Sacar de Cola (Solo si está en cola) */}
                                                {(m.estado === 'APROBADO' || m.estado === 'REIMPRESION') && (
                                                    <button
                                                        onClick={() => handleSacarDeCola(m)}
                                                        className="px-3 py-1.5 bg-red-50 text-red-600 border border-red-200 rounded hover:bg-red-100 text-xs font-bold flex items-center gap-1"
                                                        title="Sacar de la cola de impresión"
                                                    >
                                                        <XCircle className="w-3 h-3" /> Sacar
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modales */}
            {miembroSeleccionado && (
                <ModalGestionMiembro
                    miembroInicial={miembroSeleccionado}
                    listaMiembros={miembrosFiltrados}
                    onClose={() => setMiembroSeleccionado(null)}
                    onUpdate={fetchMiembros}
                />
            )}

            {showConfirmPrint && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
                    <div className="bg-white p-8 rounded-xl max-w-md text-center shadow-2xl animate-in zoom-in-95">
                        <Printer className="w-16 h-16 text-blue-600 mx-auto mb-4" />
                        <h3 className="text-xl font-bold text-gray-900 mb-2">Impresión en Curso</h3>
                        <p className="text-gray-600 mb-6 text-sm">
                            Se ha abierto el PDF en otra pestaña. <br />
                            <strong>¿La impresión fue correcta?</strong><br />
                            Al confirmar, se marcarán como "IMPRESO" y se enviarán los correos.
                        </p>
                        <div className="flex flex-col gap-3">
                            <button
                                onClick={handleConfirmarImpresion}
                                disabled={isPrinting}
                                className="w-full py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg flex justify-center items-center gap-2 shadow-lg"
                            >
                                {isPrinting ? <Loader2 className="animate-spin" /> : <CheckCircle className="w-5 h-5" />}
                                Confirmar y Notificar
                            </button>
                            <button
                                onClick={() => setShowConfirmPrint(false)}
                                disabled={isPrinting}
                                className="w-full py-3 text-gray-500 hover:bg-gray-100 rounded-lg font-medium"
                            >
                                Cancelar / Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}