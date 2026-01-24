'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { Search, Loader2, RefreshCw, UserCheck, Printer, CheckCircle, RotateCcw, XCircle, Car } from 'lucide-react'
import ModalGestionMiembro from '@/components/ModalGestionMiembro'
import { notificarImpresion } from '@/actions/notificarImpresion'

const getStatusColor = (status) => {
    switch (status) {
        case 'PENDIENTE': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
        case 'APROBADO': return 'bg-green-100 text-green-800 border-green-200'
        case 'REIMPRESION': return 'bg-purple-100 text-purple-800 border-purple-200'
        case 'IMPRESO': return 'bg-blue-100 text-blue-800 border-blue-200'
        default: return 'bg-gray-100 text-gray-800'
    }
}

export default function ParqueosAdminPage() {
    const [miembros, setMiembros] = useState([])
    const [loading, setLoading] = useState(true)
    const [filtroEstado, setFiltroEstado] = useState('TODOS')
    const [busqueda, setBusqueda] = useState('')
    const [miembroSeleccionado, setMiembroSeleccionado] = useState(null)
    const [showConfirmPrint, setShowConfirmPrint] = useState(false)
    const [isPrinting, setIsPrinting] = useState(false)

    // TABLA PARQUEOS
    const fetchMiembros = async () => {
        setLoading(true)
        try {
            const { data, error } = await supabase
                .from('parqueos') // <--- TABLA DIFERENTE
                .select('*')
                .order('created_at', { ascending: false })
            if (error) throw error
            setMiembros(data)
        } catch (error) {
            console.error(error)
            alert('Error cargando parqueos')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { fetchMiembros() }, [])

    // --- REUTILIZAMOS LOGICA PERO APUNTANDO A PARQUEOS ---
    const handleReimprimir = async (id) => {
        if (!confirm('¿Agregar a cola?')) return
        await supabase.from('parqueos').update({ estado: 'REIMPRESION' }).eq('id', id)
        fetchMiembros()
    }

    const handleSacarDeCola = async (miembro) => {
        if (!confirm('¿Sacar de cola?')) return
        const nuevoEstado = miembro.estado === 'APROBADO' ? 'PENDIENTE' : 'IMPRESO'
        await supabase.from('parqueos').update({ estado: nuevoEstado }).eq('id', miembro.id)
        fetchMiembros()
    }

    const handleConfirmarImpresion = async () => {
        setIsPrinting(true)
        try {
            const { data: listos } = await supabase
                .from('parqueos')
                .select('id, email, nombres')
                .in('estado', ['APROBADO', 'REIMPRESION'])

            if (!listos?.length) {
                alert('Nadie en cola.')
                setShowConfirmPrint(false); setIsPrinting(false); return
            }

            await supabase.from('parqueos').update({ estado: 'IMPRESO' }).in('estado', ['APROBADO', 'REIMPRESION'])

            const notificaciones = listos.map(m => notificarImpresion({ email: m.email, nombre: m.nombres }))
            await Promise.allSettled(notificaciones)

            alert('Proceso finalizado.')
            setShowConfirmPrint(false)
            fetchMiembros()
        } catch (error) {
            alert('Error masivo')
        } finally {
            setIsPrinting(false)
        }
    }

    // Filtrado
    const miembrosFiltrados = miembros.filter(m => {
        if (filtroEstado === 'EN_COLA') return m.estado === 'APROBADO' || m.estado === 'REIMPRESION'
        if (filtroEstado !== 'TODOS' && m.estado !== filtroEstado) return false
        
        const term = busqueda.toLowerCase()
        return m.nombres.toLowerCase().includes(term) || m.apellidos.toLowerCase().includes(term) || m.dpi_cui.toLowerCase().includes(term)
    })

    return (
        <div className="space-y-6 animate-in fade-in duration-500 font-sans">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Car className="w-8 h-8 text-blue-600"/> Gestión de Parqueos
                    </h1>
                    <p className="text-gray-500 text-sm">Control de acceso vehicular</p>
                </div>
                <button onClick={fetchMiembros} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50">
                    <RefreshCw className="w-4 h-4" /> Actualizar
                </button>
            </div>

            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-col xl:flex-row gap-4 justify-between items-center">
                <div className="flex bg-gray-100 p-1 rounded-lg overflow-x-auto w-full xl:w-auto">
                    {[
                        { id: 'TODOS', label: 'TODOS' },
                        { id: 'PENDIENTE', label: 'PENDIENTES' },
                        { id: 'EN_COLA', label: 'EN COLA 🖨️' },
                        { id: 'IMPRESO', label: 'HISTORIAL' },
                    ].map((tab) => (
                        <button key={tab.id} onClick={() => setFiltroEstado(tab.id)} className={`px-4 py-1.5 rounded-md text-xs font-bold whitespace-nowrap ${filtroEstado === tab.id ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>{tab.label}</button>
                    ))}
                </div>

                {/* NOTA: Aún no tenemos PrintPage para parqueos, así que esto abrirá el de miembros por ahora. 
                    Lo cambiaremos mañana cuando diseñemos el PDF de parqueo. */}
                {filtroEstado === 'EN_COLA' && (
                    <button onClick={() => alert('El diseño de PDF de Parqueo está en construcción.')} className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 shadow-md">
                        <Printer className="w-5 h-5" /> IMPRIMIR PARQUEOS
                    </button>
                )}

                <div className="relative w-full xl:w-80">
                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                    <input type="text" placeholder="Buscar..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-4">Solicitante</th>
                                <th className="px-6 py-4">Documento</th>
                                <th className="px-6 py-4">Estado</th>
                                <th className="px-6 py-4 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (<tr><td colSpan="4" className="p-8 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-500"/></td></tr>) : 
                            miembrosFiltrados.map((m) => (
                                <tr key={m.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-gray-100 overflow-hidden border border-gray-200 relative">
                                                {m.foto_url ? <img src={m.foto_url} alt="" className="w-full h-full object-cover" /> : <UserCheck className="w-5 h-5 m-auto text-gray-400"/>}
                                            </div>
                                            <div>
                                                <p className="font-bold text-gray-900">{m.nombres} {m.apellidos}</p>
                                                <p className="text-xs text-gray-500">{m.email}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 font-mono text-gray-600">{m.dpi_cui}</td>
                                    <td className="px-6 py-4"><span className={`px-2 py-1 rounded text-[10px] font-bold border ${getStatusColor(m.estado)}`}>{m.estado}</span></td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end gap-2">
                                            <button onClick={() => setMiembroSeleccionado(m)} className="px-3 py-1.5 border border-gray-300 rounded hover:bg-gray-50 text-xs font-medium">Editar</button>
                                            {m.estado === 'IMPRESO' && <button onClick={() => handleReimprimir(m.id)} className="px-3 py-1.5 bg-purple-50 text-purple-700 border border-purple-200 rounded text-xs font-bold"><RotateCcw className="w-3 h-3"/></button>}
                                            {(m.estado === 'APROBADO' || m.estado === 'REIMPRESION') && <button onClick={() => handleSacarDeCola(m)} className="px-3 py-1.5 bg-red-50 text-red-600 border border-red-200 rounded text-xs font-bold"><XCircle className="w-3 h-3"/></button>}
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
                    modo="PARQUEO" // <--- MODO ACTIVADO
                />
            )}
        </div>
    )
}