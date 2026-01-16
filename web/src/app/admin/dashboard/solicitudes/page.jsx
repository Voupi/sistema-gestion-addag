'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import {
    Search,
    Filter,
    MoreHorizontal,
    Eye,
    Loader2,
    FileDown,
    RefreshCw,
    UserCheck,
    UserX,
    Printer
} from 'lucide-react'
import ModalGestionMiembro from '@/components/ModalGestionMiembro'

// Utilidad para colores de estado
const getStatusColor = (status) => {
    switch (status) {
        case 'PENDIENTE': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
        case 'APROBADO': return 'bg-green-100 text-green-800 border-green-200'
        case 'IMPRESO': return 'bg-blue-100 text-blue-800 border-blue-200'
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

    // Cargar datos al inicio
    const fetchMiembros = async () => {
        setLoading(true)
        try {
            const { data, error } = await supabase
                .from('miembros')
                .select('*')
                .order('created_at', { ascending: false }) // Más recientes primero

            if (error) throw error
            setMiembros(data)
        } catch (error) {
            console.error('Error cargando miembros:', error)
            alert('Error al cargar la lista de miembros')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchMiembros()
    }, [])

    // Lógica de Filtrado (Cliente)
    // Como son ~350 registros, es más rápido filtrar en el navegador que pedirle a la DB cada vez
    const miembrosFiltrados = miembros.filter(miembro => {
        // 1. Filtro por Estado
        if (filtroEstado !== 'TODOS' && miembro.estado !== filtroEstado) return false

        // 2. Filtro por Búsqueda (Nombre, Apellido, DPI, Email)
        const termino = busqueda.toLowerCase()
        const matchNombre = miembro.nombres.toLowerCase().includes(termino)
        const matchApellido = miembro.apellidos.toLowerCase().includes(termino)
        const matchDPI = miembro.dpi_cui.toLowerCase().includes(termino)
        const matchEmail = miembro.email?.toLowerCase().includes(termino) || false

        return matchNombre || matchApellido || matchDPI || matchEmail
    })

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Encabezado */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Solicitudes y Miembros</h1>
                    <p className="text-gray-500 text-sm">Gestiona el padrón de atletas y deportistas</p>
                </div>
                <button
                    onClick={fetchMiembros}
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                    <RefreshCw className="w-4 h-4" /> Actualizar
                </button>
            </div>

            {/* Barra de Herramientas */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-col md:flex-row gap-4 justify-between items-center">
                {/* Pestañas de Estado */}
                <div className="flex bg-gray-100 p-1 rounded-lg w-full md:w-auto overflow-x-auto">
                    {['TODOS', 'PENDIENTE', 'APROBADO', 'IMPRESO'].map((estado) => (
                        <button
                            key={estado}
                            onClick={() => setFiltroEstado(estado)}
                            className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-all whitespace-nowrap ${filtroEstado === estado
                                ? 'bg-white text-blue-700 shadow-sm'
                                : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            {estado}
                        </button>
                    ))}
                </div>

                {/* Buscador */}
                <div className="relative w-full md:w-80">
                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Buscar por DPI, Nombre..."
                        value={busqueda}
                        onChange={(e) => setBusqueda(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none placeholder:text-gray-300 text-gray-900"
                    />
                </div>
            </div>

            {/* Tabla de Datos */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-4">Solicitante</th>
                                <th className="px-6 py-4">Documento</th>
                                <th className="px-6 py-4">Rol</th>
                                <th className="px-6 py-4">Fecha</th>
                                <th className="px-6 py-4">Estado</th>
                                <th className="px-6 py-4 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-12 text-center">
                                        <div className="flex flex-col items-center justify-center text-gray-500">
                                            <Loader2 className="w-8 h-8 animate-spin mb-2 text-blue-600" />
                                            <p>Cargando datos...</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : miembrosFiltrados.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                                        No se encontraron registros con los filtros actuales.
                                    </td>
                                </tr>
                            ) : (
                                miembrosFiltrados.map((miembro) => (
                                    <tr key={miembro.id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                {/* Avatar Miniatura */}
                                                <div className="w-10 h-10 rounded-full bg-gray-100 border border-gray-200 overflow-hidden relative flex-shrink-0">
                                                    {miembro.foto_url ? (
                                                        <img
                                                            src={miembro.foto_url}
                                                            alt="Foto"
                                                            className="w-full h-full object-cover"
                                                            loading="lazy"
                                                        />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center bg-gray-200 text-gray-400">
                                                            <UserCheck className="w-5 h-5" />
                                                        </div>
                                                    )}
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-gray-900">{miembro.nombres} {miembro.apellidos}</p>
                                                    <p className="text-xs text-gray-500">{miembro.email || 'Sin correo'}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="font-mono text-xs font-medium text-gray-600 bg-gray-100 px-2 py-1 rounded w-fit">
                                                {miembro.dpi_cui}
                                            </p>
                                            <p className="text-xs text-gray-400 mt-1">{miembro.tipo_documento}</p>
                                        </td>
                                        <td className="px-6 py-4 text-gray-600">
                                            {miembro.rol}
                                        </td>
                                        <td className="px-6 py-4 text-gray-500 whitespace-nowrap">
                                            {new Date(miembro.created_at).toLocaleDateString('es-GT', {
                                                day: '2-digit', month: 'short', year: 'numeric'
                                            })}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${getStatusColor(miembro.estado)}`}>
                                                {miembro.estado}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                className="text-blue-600 hover:text-blue-800 font-medium text-xs px-3 py-1.5 border border-blue-200 rounded-md hover:bg-blue-50 transition-colors"
                                                onClick={() => setMiembroSeleccionado(miembro)}
                                            >
                                                Gestionar
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Footer de Tabla */}
                <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 text-xs text-gray-500 flex justify-between items-center">
                    <span>Mostrando {miembrosFiltrados.length} registros</span>
                    <span>Total en Base de Datos: {miembros.length}</span>
                </div>
            </div>
            {miembroSeleccionado && (
                <ModalGestionMiembro 
                    miembroInicial={miembroSeleccionado} // <-- Ojo: cambió el nombre de la prop
                    listaMiembros={miembrosFiltrados}    // <-- Nuevo: Pasamos la lista actual
                    onClose={() => setMiembroSeleccionado(null)}
                    onUpdate={fetchMiembros}
                />
            )}
        </div>
    )
}