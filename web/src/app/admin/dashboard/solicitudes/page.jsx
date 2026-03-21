'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import {
    Search, Loader2, RefreshCw, UserCheck, Printer,
    CheckCircle, RotateCcw, XCircle, Users,
    Scissors, PackageCheck, Info, Ban, ChevronLeft, ChevronRight
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
        case 'LISTO': return 'bg-indigo-100 text-indigo-800 border-indigo-200' // Indigo para diferenciar
        case 'ENTREGADO': return 'bg-gray-100 text-gray-600 border-gray-200'
        case 'RECHAZADO': return 'bg-red-50 text-red-800 border-red-200' // Para historial
        default: return 'bg-gray-50 text-gray-800'
    }
}

// Diccionario de Pestañas
const TABS = [
    { id: 'TODOS', label: 'TODOS', help: 'Vista general del padrón de asociados.' },
    { id: 'PENDIENTE', label: 'PENDIENTES', help: 'Solicitudes nuevas que requieren revisión.' },
    { id: 'EN_COLA', label: '1. COLA 🖨️', help: 'Aprobados listos para generar PDF.' },
    { id: 'IMPRESO', label: '2. TALLER ✂️', help: 'Carnés impresos en papel.' },
    { id: 'EN_PROCESO', label: '3. PROCESO ⚙️', help: 'En corte y emplasticado.' },
    { id: 'LISTO', label: '4. LISTOS ✅', help: 'Terminados. Usuario notificado.' },
    { id: 'ENTREGADO', label: '5. HISTORIAL 📂', help: 'Carnés entregados.' },
    { id: 'RECHAZADOS_HIST', label: '❌ RECHAZADOS', help: 'Historial de solicitudes denegadas.' },
]

export default function SolicitudesAdminPage() {
    const [verSoloMias, setVerSoloMias] = useState(false)
    const [miembros, setMiembros] = useState([])
    const [loading, setLoading] = useState(true)
    const [filtroEstado, setFiltroEstado] = useState('PENDIENTE')
    const [busqueda, setBusqueda] = useState('')
    const [miembroSeleccionado, setMiembroSeleccionado] = useState(null)
    const [showConfirmPrint, setShowConfirmPrint] = useState(false)
    const [isPrinting, setIsPrinting] = useState(false)
    const [userProfile, setUserProfile] = useState(null)
    // Historia 12: checkbox correo al finalizar fase EN_PROCESO (desactivado por defecto)
    const [enviarCorreoFinalizacion, setEnviarCorreoFinalizacion] = useState(false)
    // Nuevas funcionalidades de selección múltiple
    const [seleccionados, setSeleccionados] = useState([])
    const [seleccionarTodos, setSeleccionarTodos] = useState(false)

    // Modificamos el Fetch para que sea inteligente
    const fetchMiembros = async () => {
        setLoading(true)
        try {
            // 1. Obtener quién soy (Solo la primera vez)
            let currentProfile = userProfile
            if (!currentProfile) {
                const { data: { user } } = await supabase.auth.getUser()
                if (!user) throw new Error("No autenticado")

                const { data: profile } = await supabase
                    .from('entrenadores')
                    .select('*')
                    .eq('email', user.email)
                    .single()

                currentProfile = profile
                setUserProfile(profile)
            }

            let data, error

            // 2. Construir la consulta base
            if (filtroEstado === 'RECHAZADOS_HIST') {
                // No usamos join con entrenadores aquí porque solicitudes_rechazadas
                // no tiene FK definida hacia entrenadores. El entrenador_id existe
                // para filtrar, pero el nombre se omite en esta vista.
                let query = supabase.from('solicitudes_rechazadas').select('*').eq('origen', 'MIEMBRO')

                // Si NO soy admin, solo veo a MIS rechazados
                if (currentProfile && !currentProfile.es_admin) {
                    query = query.eq('entrenador_id', currentProfile.id)
                }

                const result = await query.order('created_at', { ascending: false })
                data = result.data
                error = result.error
                if (data) data = data.map(d => ({ ...d, estado: 'RECHAZADO', id: d.id }))

            } else {
                let query = supabase.from('miembros').select('*, entrenadores(nombre_completo)')

                // MULTI-TENANCY y TOGGLE DE ADMIN
                if (currentProfile) {
                    if (!currentProfile.es_admin) {
                        // Entrenador normal: SIEMPRE ve solo lo suyo
                        query = query.eq('entrenador_id', currentProfile.id)
                    } else if (verSoloMias) {
                        // Admin con el filtro activado: Ve solo lo suyo
                        query = query.eq('entrenador_id', currentProfile.id)
                    }
                    // Si es_admin y !verSoloMias, la query se queda limpia (ve todo)
                }

                const result = await query.order('created_at', { ascending: false })
                data = result.data
                error = result.error
            }

            if (error) throw error
            setMiembros(data)
        } catch (error) {
            console.error(error);
            alert('Error cargando datos: ' + error.message)
        }
        finally { setLoading(false) }
    }

    useEffect(() => { fetchMiembros() }, [filtroEstado, verSoloMias])

    // Limpiar selecciones al cambiar de pestaña
    useEffect(() => {
        setSeleccionados([])
        setSeleccionarTodos(false)
    }, [filtroEstado])

    // Manejar selección de todos
    useEffect(() => {
        if (seleccionarTodos) {
            setSeleccionados(miembrosFiltrados.map(m => m.id))
        } else {
            setSeleccionados([])
        }
    }, [seleccionarTodos])

    // Resetear pestaña si el perfil carga y el no-admin está en una pestaña no permitida
    useEffect(() => {
        if (!userProfile || userProfile.es_admin) return
        const tabsPermitidas = ['TODOS', 'PENDIENTE']
        if (!tabsPermitidas.includes(filtroEstado)) {
            setFiltroEstado('PENDIENTE')
        }
    }, [userProfile])

    // --- ACCIONES INDIVIDUALES ---
    const handleReimprimir = async (id) => {
        if (!confirm('¿Agregar a cola de impresión nuevamente?')) return
        await supabase.from('miembros').update({ estado: 'REIMPRESION' }).eq('id', id)
        fetchMiembros()
    }

    const handleSacarDeCola = async (miembro) => {
        if (!confirm('¿Sacar de la cola?')) return
        const nuevoEstado = miembro.estado === 'APROBADO' ? 'PENDIENTE' : 'IMPRESO'
        await supabase.from('miembros').update({ estado: nuevoEstado }).eq('id', miembro.id)
        fetchMiembros()
    }

    const avanzarEstadoIndividual = async (id, nuevoEstado, confirmar = false) => {
        if (confirmar && !confirm('¿Avanzar a la siguiente etapa?')) return
        await supabase.from('miembros').update({ estado: nuevoEstado }).eq('id', id)
        fetchMiembros()
    }

    const handleMarcarListo = async (miembro) => {
        if (!confirm(`¿Marcar carné de ${miembro.nombres} como LISTO?`)) return

        await supabase.from('miembros').update({ estado: 'LISTO' }).eq('id', miembro.id)

        // Historia 12: solo envía correo si el checkbox está activo
        if (enviarCorreoFinalizacion) {
            notificarImpresion({
                email: miembro.email,
                nombre: miembro.nombres,
                tipo: 'GENERAL'
            })
        }
        fetchMiembros()
    }

    const handleMarcarEntregado = async (id) => {
        if (!confirm('¿Confirmar entrega?')) return
        await supabase.from('miembros').update({ estado: 'ENTREGADO' }).eq('id', id)
        fetchMiembros()
    }

    // --- SELECCIÓN MÚLTIPLE ---
    const toggleSeleccion = (id) => {
        setSeleccionados(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        )
    }

    const moverSeleccionados = async (direccion) => {
        if (seleccionados.length === 0) return alert('Selecciona al menos una solicitud.')

        // Determinar estado destino según la fase actual y dirección
        let nuevoEstado = ''
        const faseActual = filtroEstado

        if (direccion === 'siguiente') {
            if (faseActual === 'EN_COLA') nuevoEstado = 'IMPRESO'
            else if (faseActual === 'IMPRESO') nuevoEstado = 'EN_PROCESO'
            else if (faseActual === 'EN_PROCESO') nuevoEstado = 'LISTO'
            else if (faseActual === 'LISTO') nuevoEstado = 'ENTREGADO'
            else return alert('No hay fase siguiente.')
        } else if (direccion === 'anterior') {
            if (faseActual === 'IMPRESO') nuevoEstado = 'APROBADO'
            else if (faseActual === 'EN_PROCESO') nuevoEstado = 'IMPRESO'
            else if (faseActual === 'LISTO') nuevoEstado = 'EN_PROCESO'
            else if (faseActual === 'ENTREGADO') nuevoEstado = 'LISTO'
            else return alert('No hay fase anterior.')
        }

        if (!confirm(`¿Mover ${seleccionados.length} solicitud(es) a ${nuevoEstado}?`)) return

        setIsPrinting(true)
        try {
            const { error } = await supabase
                .from('miembros')
                .update({ estado: nuevoEstado })
                .in('id', seleccionados)

            if (error) throw error
            alert(`${seleccionados.length} solicitud(es) movida(s) a ${nuevoEstado}`)
            setSeleccionados([])
            setSeleccionarTodos(false)
            fetchMiembros()
        } catch (error) {
            console.error(error)
            alert('Error al mover solicitudes: ' + error.message)
        } finally {
            setIsPrinting(false)
        }
    }

    // --- ACCIONES MASIVAS ---
    const handleAccionMasiva = async () => {
        if (miembrosFiltrados.length === 0) return alert('No hay registros.')

        let nuevoEstado = ''
        let accionTexto = ''
        let requiereCorreo = false

        if (filtroEstado === 'IMPRESO') {
            nuevoEstado = 'EN_PROCESO'
            accionTexto = 'INICIAR PROCESO DE CORTE'
        } else if (filtroEstado === 'EN_PROCESO') {
            nuevoEstado = 'LISTO'
            accionTexto = 'FINALIZAR Y NOTIFICAR'
            requiereCorreo = true
        } else if (filtroEstado === 'LISTO') {
            nuevoEstado = 'ENTREGADO'
            accionTexto = 'ENTREGAR'
        } else { return }

        const confirm1 = confirm(`¿Estás seguro de ${accionTexto} a los ${miembrosFiltrados.length} registros?`)
        if (!confirm1) return

        setIsPrinting(true)
        try {
            const ids = miembrosFiltrados.map(m => m.id)
            const { error } = await supabase.from('miembros').update({ estado: nuevoEstado }).in('id', ids)
            if (error) throw error

            if (requiereCorreo && enviarCorreoFinalizacion) {
                const notificaciones = miembrosFiltrados.map(m =>
                    notificarImpresion({ email: m.email, nombre: m.nombres, tipo: 'GENERAL' })
                )
                await Promise.allSettled(notificaciones)
            }

            alert('¡Lote procesado!')
            fetchMiembros()
        } catch (error) { console.error(error); alert('Error masivo.') }
        finally { setIsPrinting(false) }
    }

    // --- IMPRESIÓN ---
    const handlePrintClick = () => {
        window.open('/admin/print', '_blank') // <--- Usa el PDF de Socios
        setShowConfirmPrint(true)
    }

    const handleConfirmarImpresion = async () => {
        setIsPrinting(true)
        try {
            const { error } = await supabase
                .from('miembros')
                .update({ estado: 'IMPRESO' })
                .in('estado', ['APROBADO', 'REIMPRESION'])

            if (error) throw error
            alert('Impresión confirmada. Pasa a Taller.')
            setShowConfirmPrint(false)
            fetchMiembros()
        } catch (error) { alert('Error actualizando') }
        finally { setIsPrinting(false) }
    }

    // --- FILTROS ---
    const miembrosFiltrados = miembros.filter(m => {
        if (filtroEstado === 'RECHAZADOS_HIST') return true // Ya viene filtrado de DB
        if (filtroEstado === 'EN_COLA') return m.estado === 'APROBADO' || m.estado === 'REIMPRESION'
        if (filtroEstado === 'TODOS') return true
        if (m.estado === filtroEstado) return true
        return false
    }).filter(m => {
        const term = busqueda.toLowerCase()
        return m.nombres?.toLowerCase().includes(term) || m.dpi_cui?.toLowerCase().includes(term)
    })

    // Tabs permitidas según rol: no-admins solo pueden ver TODOS y PENDIENTE
    const TABS_NO_ADMIN = ['TODOS', 'PENDIENTE']
    const tabsVisibles = (!userProfile || userProfile.es_admin)
        ? TABS
        : TABS.filter(t => TABS_NO_ADMIN.includes(t.id))

    const currentTabInfo = tabsVisibles.find(t => t.id === filtroEstado)

    return (
        <div className="space-y-6 animate-in fade-in duration-500 font-sans">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Users className="w-8 h-8 text-blue-800" /> Gestión de Asociados
                    </h1>
                    <p className="text-gray-500 text-sm">Control de Atletas y Miembros</p>
                </div>
                <div className="flex gap-2">
                    {/* BOTÓN SOLO PARA ADMINS */}
                    {userProfile?.es_admin && (
                        <button
                            onClick={() => setVerSoloMias(!verSoloMias)}
                            className={`px-4 py-2 rounded-lg text-sm font-bold border transition-colors ${verSoloMias
                                ? 'bg-blue-100 text-blue-800 border-blue-300'
                                : 'bg-white text-gray-500 border-gray-300 hover:bg-gray-50'
                                }`}
                        >
                            {verSoloMias ? '👤 Viendo Mis Atletas' : '🌍 Viendo Todos'}
                        </button>
                    )}
                    <button onClick={fetchMiembros} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50">
                        <RefreshCw className="w-4 h-4" /> Actualizar
                    </button>
                </div>
            </div>

            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 space-y-4">
                    <div className="flex bg-gray-100 p-1 rounded-lg overflow-x-auto">
                        {tabsVisibles.map((tab) => (
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
                        <div className="flex gap-2 flex-wrap">
                            {/* RF15: Botón de impresión solo visible para administradores */}
                            {filtroEstado === 'EN_COLA' && userProfile?.es_admin && (
                                <button onClick={handlePrintClick} className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 shadow-md animate-in zoom-in">
                                    <Printer className="w-5 h-5" /> IMPRIMIR LOTE ({miembrosFiltrados.length})
                                </button>
                            )}

                            {(filtroEstado === 'IMPRESO' || filtroEstado === 'EN_PROCESO' || filtroEstado === 'LISTO') && userProfile?.es_admin && (
                                <button onClick={handleAccionMasiva} className={`flex items-center gap-2 px-4 py-2 text-white rounded-lg font-bold shadow-md animate-in zoom-in transition-all ${filtroEstado === 'IMPRESO' ? 'bg-orange-600 hover:bg-orange-700' :
                                    filtroEstado === 'EN_PROCESO' ? 'bg-indigo-600 hover:bg-indigo-700' :
                                        'bg-gray-700 hover:bg-gray-800'
                                    }`}>
                                    {isPrinting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                                    {filtroEstado === 'IMPRESO' ? 'INICIAR PROCESO' : filtroEstado === 'EN_PROCESO' ? 'FINALIZAR' : 'ENTREGAR TODOS'} ({miembrosFiltrados.length})
                                </button>
                            )}

                            {/* Botones de mover seleccionados - visible en fases procesables */}
                            {userProfile?.es_admin && seleccionados.length > 0 && ['EN_COLA', 'IMPRESO', 'EN_PROCESO', 'LISTO', 'ENTREGADO'].includes(filtroEstado) && (
                                <>
                                    {['IMPRESO', 'EN_PROCESO', 'LISTO', 'ENTREGADO'].includes(filtroEstado) && (
                                        <button onClick={() => moverSeleccionados('anterior')} className="flex items-center gap-2 px-4 py-2 bg-gray-500 text-white rounded-lg font-bold hover:bg-gray-600 shadow-md">
                                            <ChevronLeft className="w-4 h-4" /> Fase Anterior ({seleccionados.length})
                                        </button>
                                    )}
                                    {['EN_COLA', 'IMPRESO', 'EN_PROCESO', 'LISTO'].includes(filtroEstado) && (
                                        <button onClick={() => moverSeleccionados('siguiente')} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 shadow-md">
                                            Fase Siguiente ({seleccionados.length}) <ChevronRight className="w-4 h-4" />
                                        </button>
                                    )}
                                </>
                            )}

                            {/* Historia 12: checkbox correo al finalizar - solo visible en fase EN_PROCESO y solo para admins */}
                            {filtroEstado === 'EN_PROCESO' && userProfile?.es_admin && (
                                <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer bg-indigo-50 border border-indigo-200 px-3 py-2 rounded-lg select-none">
                                    <input
                                        type="checkbox"
                                        checked={enviarCorreoFinalizacion}
                                        onChange={e => setEnviarCorreoFinalizacion(e.target.checked)}
                                        className="w-3.5 h-3.5 accent-indigo-600"
                                    />
                                    Notificar por correo al finalizar
                                </label>
                            )}
                        </div>

                        <div className="relative w-full xl:w-80">
                            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                            <input type="text" placeholder="Buscar..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 outline-none focus:ring-2 focus:ring-blue-500" />
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-200">
                                <tr>
                                    {/* Columna de checkbox - solo en fases procesables y solo para admins */}
                                    {userProfile?.es_admin && ['EN_COLA', 'IMPRESO', 'EN_PROCESO', 'LISTO', 'ENTREGADO'].includes(filtroEstado) && (
                                        <th className="px-4 py-4 w-12">
                                            <input
                                                type="checkbox"
                                                checked={seleccionarTodos}
                                                onChange={(e) => setSeleccionarTodos(e.target.checked)}
                                                className="w-4 h-4 accent-blue-600 cursor-pointer"
                                                title="Seleccionar todas"
                                            />
                                        </th>
                                    )}
                                    <th className="px-6 py-4">Miembro</th>
                                    <th className="px-6 py-4">Rol</th>
                                    <th className="px-6 py-4">Documento</th>
                                    {/* Columna de fecha de aprobación - solo en cola y fases posteriores */}
                                    {['EN_COLA', 'IMPRESO', 'EN_PROCESO', 'LISTO', 'ENTREGADO'].includes(filtroEstado) && (
                                        <th className="px-6 py-4">Fecha Aprobación</th>
                                    )}
                                    <th className="px-6 py-4">Estado</th>
                                    <th className="px-6 py-4 text-right">Acción</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {loading ? (<tr><td colSpan="7" className="p-8 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-500" /></td></tr>) :
                                    miembrosFiltrados.map((m) => (
                                        <tr key={m.id} className={`hover:bg-gray-50 transition-colors ${seleccionados.includes(m.id) ? 'bg-blue-50' : ''}`}>
                                            {/* Checkbox individual */}
                                            {userProfile?.es_admin && ['EN_COLA', 'IMPRESO', 'EN_PROCESO', 'LISTO', 'ENTREGADO'].includes(filtroEstado) && (
                                                <td className="px-4 py-4">
                                                    <input
                                                        type="checkbox"
                                                        checked={seleccionados.includes(m.id)}
                                                        onChange={() => toggleSeleccion(m.id)}
                                                        className="w-4 h-4 accent-blue-600 cursor-pointer"
                                                    />
                                                </td>
                                            )}
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-gray-100 overflow-hidden border border-gray-200 relative">
                                                        {m.foto_url ? <img src={m.foto_url} alt="" className="w-full h-full object-cover" /> : <UserCheck className="w-5 h-5 m-auto text-gray-400" />}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-gray-900">{m.nombres} {m.apellidos}</p>
                                                        <p className="text-xs text-gray-500">{m.email}</p>
                                                        {/* Entrenador asignado (muestra en todas las vistas, incluido rechazados) */}
                                                        {m.entrenadores?.nombre_completo && (
                                                            <span className="inline-block mt-1 px-2 py-0.5 bg-gray-100 text-gray-600 text-[10px] rounded-full border border-gray-200">
                                                                Prof. {m.entrenadores.nombre_completo}
                                                            </span>
                                                        )}
                                                        {/* Quién aprobó — solo en Cola e Historial */}
                                                        {(filtroEstado === 'EN_COLA' || filtroEstado === 'ENTREGADO') && m.aprobado_por && (
                                                            <span className="inline-block mt-1 ml-1 px-2 py-0.5 bg-blue-50 text-blue-700 text-[10px] rounded-full border border-blue-200">
                                                                ✓ {m.aprobado_por}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            {/* CELDA ROL */}
                                            <td className="px-6 py-4 text-xs font-semibold text-blue-700 bg-blue-50 w-fit rounded px-2">{m.rol || 'N/A'}</td>
                                            <td className="px-6 py-4 font-mono text-gray-600">{m.dpi_cui}</td>
                                            {/* Columna de fecha de aprobación */}
                                            {['EN_COLA', 'IMPRESO', 'EN_PROCESO', 'LISTO', 'ENTREGADO'].includes(filtroEstado) && (
                                                <td className="px-6 py-4">
                                                    {m.fecha_aprobacion ? (
                                                        <div className="text-xs">
                                                            <p className="text-gray-700 font-medium">
                                                                {new Date(m.fecha_aprobacion).toLocaleDateString('es-GT', {
                                                                    day: '2-digit',
                                                                    month: '2-digit',
                                                                    year: 'numeric'
                                                                })}
                                                            </p>
                                                            <p className="text-gray-500 text-[10px]">
                                                                {new Date(m.fecha_aprobacion).toLocaleTimeString('es-GT', {
                                                                    hour: '2-digit',
                                                                    minute: '2-digit'
                                                                })}
                                                            </p>
                                                        </div>
                                                    ) : (
                                                        <span className="text-xs text-gray-400">-</span>
                                                    )}
                                                </td>
                                            )}
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-1 rounded text-[10px] font-bold border ${getStatusColor(m.estado)}`}>{m.estado}</span>
                                                {m.estado === 'RECHAZADO' && <p className="text-[10px] text-red-600 mt-1 max-w-[150px] truncate">{m.motivo}</p>}
                                            </td>

                                            <td className="px-6 py-4 text-right">
                                                <div className="flex justify-end gap-2 items-center">
                                                    {m.estado === 'RECHAZADO' ? (
                                                        <button onClick={() => alert(m.motivo)} className="px-3 py-1.5 border border-red-200 text-red-600 bg-red-50 rounded text-xs font-medium">Ver Motivo</button>
                                                    ) : (
                                                        <>
                                                            {/* Botones de avanzar estado - solo para admins */}
                                                            {userProfile?.es_admin && m.estado === 'IMPRESO' && <button onClick={() => avanzarEstadoIndividual(m.id, 'EN_PROCESO')} className="btn-action bg-orange-50 text-orange-700 border-orange-200" title="Pasar a Corte"><Scissors className="w-4 h-4" /></button>}
                                                            {userProfile?.es_admin && m.estado === 'EN_PROCESO' && <button onClick={() => handleMarcarListo(m)} className="btn-action bg-indigo-50 text-indigo-700 border-indigo-200" title="Finalizar"><PackageCheck className="w-4 h-4" /></button>}
                                                            {userProfile?.es_admin && m.estado === 'LISTO' && <button onClick={() => handleMarcarEntregado(m.id)} className="btn-action bg-gray-100 text-gray-700 border-gray-300" title="Entregar"><UserCheck className="w-4 h-4" /></button>}

                                                            <button onClick={() => setMiembroSeleccionado(m)} className="px-3 py-1.5 border border-gray-300 rounded hover:bg-gray-50 text-xs font-medium text-gray-700">Ver</button>

                                                            {/* Botones de reimprimir y sacar de cola - solo para admins */}
                                                            {userProfile?.es_admin && (m.estado === 'ENTREGADO' || m.estado === 'LISTO' || m.estado === 'IMPRESO') && (
                                                                <button onClick={() => handleReimprimir(m.id)} className="p-1.5 text-purple-600 hover:bg-purple-50 rounded" title="Reimprimir"><RotateCcw className="w-4 h-4" /></button>
                                                            )}
                                                            {userProfile?.es_admin && (m.estado === 'APROBADO' || m.estado === 'REIMPRESION') && (
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

                {miembroSeleccionado && (
                    <ModalGestionMiembro
                        miembroInicial={miembroSeleccionado}
                        listaMiembros={miembrosFiltrados}
                        onClose={() => setMiembroSeleccionado(null)}
                        onUpdate={fetchMiembros}
                        modo="MIEMBRO" // <--- IMPORTANTE: MODO MIEMBRO PARA EDITAR ROL
                    />
                )}

                {showConfirmPrint && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
                        <div className="bg-white p-8 rounded-xl max-w-md text-center shadow-2xl">
                            <Printer className="w-16 h-16 text-blue-600 mx-auto mb-4" />
                            <h3 className="text-xl font-bold text-gray-900 mb-2">Impresión Socios</h3>
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