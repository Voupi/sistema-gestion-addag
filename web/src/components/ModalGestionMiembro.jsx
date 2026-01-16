'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabaseClient'
import Cropper from 'react-easy-crop'
import { rechazarSolicitud } from '@/actions/rechazarSolicitud'
import {
    X, Save, RotateCw, CheckCircle, Loader2,
    AlertTriangle, ChevronRight, ChevronLeft,
    Scissors, Ban, Send
} from 'lucide-react'

// Función auxiliar para recortar imagen (Pixel Crop)
const getCroppedImg = async (imageSrc, pixelCrop, rotation = 0) => {
    const image = new Image()
    image.src = imageSrc + '?t=' + new Date().getTime()
    image.crossOrigin = 'anonymous' // Importante para evitar CORS
    await new Promise((resolve) => { image.onload = resolve })

    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')

    const maxSize = Math.max(image.width, image.height)
    const safeArea = 2 * ((maxSize / 2) * Math.sqrt(2))

    canvas.width = safeArea
    canvas.height = safeArea

    ctx.translate(safeArea / 2, safeArea / 2)
    ctx.rotate((rotation * Math.PI) / 180)
    ctx.translate(-safeArea / 2, -safeArea / 2)

    ctx.drawImage(
        image,
        safeArea / 2 - image.width * 0.5,
        safeArea / 2 - image.height * 0.5
    )

    const data = ctx.getImageData(
        safeArea / 2 - image.width * 0.5 + pixelCrop.x,
        safeArea / 2 - image.height * 0.5 + pixelCrop.y,
        pixelCrop.width,
        pixelCrop.height
    )

    canvas.width = pixelCrop.width
    canvas.height = pixelCrop.height

    ctx.putImageData(data, 0, 0)

    return new Promise((resolve) => {
        canvas.toBlob((blob) => {
            resolve(blob)
        }, 'image/jpeg', 0.9)
    })
}

export default function ModalGestionMiembro({ miembroInicial, listaMiembros, onClose, onUpdate }) {
    // Control de índice para navegación
    const [currentIndex, setCurrentIndex] = useState(0)
    const miembro = listaMiembros[currentIndex]

    useEffect(() => {
        // Encontrar el índice inicial
        const idx = listaMiembros.findIndex(m => m.id === miembroInicial.id)
        if (idx !== -1) setCurrentIndex(idx)
    }, [miembroInicial, listaMiembros])

    // Estados de Formulario y UI
    const [formData, setFormData] = useState({ ...miembro })
    const [loading, setLoading] = useState(false)
    const [modoRechazo, setModoRechazo] = useState(false)
    const [motivoRechazo, setMotivoRechazo] = useState('La fotografía no cumple con los requisitos (oscura, borrosa o no es tipo pasaporte).')

    // Estados de Imagen (Crop & Rotate)
    const [crop, setCrop] = useState({ x: 0, y: 0 })
    const [zoom, setZoom] = useState(1)
    const [rotation, setRotation] = useState(0)
    const [croppedAreaPixels, setCroppedAreaPixels] = useState(null)
    const [editandoFoto, setEditandoFoto] = useState(false) // Activa el modo edición

    useEffect(() => {
        setFormData({ ...listaMiembros[currentIndex] })
        setRotation(0)
        setZoom(1)
        setCrop({ x: 0, y: 0 })
        setEditandoFoto(false)
        setModoRechazo(false)
    }, [currentIndex, listaMiembros])

    const onCropComplete = useCallback((croppedArea, croppedAreaPixels) => {
        setCroppedAreaPixels(croppedAreaPixels)
    }, [])

    const handleNavegacion = (direccion) => {
        if (direccion === 'next' && currentIndex < listaMiembros.length - 1) {
            setCurrentIndex(prev => prev + 1)
        } else if (direccion === 'prev' && currentIndex > 0) {
            setCurrentIndex(prev => prev - 1)
        }
    }

    const handleSave = async (accion) => {
        setLoading(true)
        try {
            // --- CASO RECHAZAR ---
            if (accion === 'RECHAZAR') {
                // 1. Enviar correo (La evidencia queda en el email del usuario)
                await rechazarSolicitud({
                    email: formData.email,
                    nombre: formData.nombres,
                    motivo: motivoRechazo,
                    id: miembro.id
                })

                // 2. ELIMINAR el registro para liberar el DPI
                await supabase.from('miembros').delete().eq('id', miembro.id)

                // 3. (Opcional) Si quieres borrar la foto del bucket también para ahorrar espacio:
                // Extraer el nombre del archivo desde la URL
                const fotoPath = miembro.foto_url.split('/').pop()
                await supabase.storage.from('fotos-carnet').remove([fotoPath])

                onUpdate()
                if (currentIndex < listaMiembros.length - 1) handleNavegacion('next')
                else onClose()
                return
            }

            // --- CASO GUARDAR / APROBAR ---
            let updates = {
                nombres: formData.nombres,
                apellidos: formData.apellidos,
                dpi_cui: formData.dpi_cui,
                email: formData.email,
                telefono: formData.telefono
            }

            // Procesar Imagen SI se editó
            if (editandoFoto && croppedAreaPixels) {
                const blob = await getCroppedImg(miembro.foto_url, croppedAreaPixels, rotation)
                const fileName = `procesada_${miembro.dpi_cui}_${Date.now()}.jpg`

                const { error: uploadError } = await supabase.storage
                    .from('fotos-carnet')
                    .upload(fileName, blob, { upsert: true })

                if (uploadError) throw uploadError

                const { data: urlData } = supabase.storage
                    .from('fotos-carnet')
                    .getPublicUrl(fileName)

                updates.foto_url_final = urlData.publicUrl
            }

            // Guardar cambios texto
            await supabase.from('miembros').update(updates).eq('id', miembro.id)

            // Ejecutar aprobación si es requerido
            if (accion === 'APROBAR') {
                if (miembro.estado !== 'APROBADO' && miembro.estado !== 'IMPRESO') {
                    await supabase.rpc('aprobar_miembro', { miembro_id: miembro.id })
                }
            }

            onUpdate() // Refrescar lista
            setLoading(false)

            // Navegación inteligente
            if (accion === 'APROBAR' && currentIndex < listaMiembros.length - 1) {
                handleNavegacion('next')
            } else if (accion === 'APROBAR') {
                onClose() // Si era el último, cerrar
            } else {
                // Si solo fue "Guardar", quedarse aquí
                setEditandoFoto(false)
                alert("Cambios guardados correctamente.")
            }

        } catch (error) {
            console.error(error)
            alert('Error: ' + error.message)
            setLoading(false)
        }
    }

    if (!miembro) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[95vh] flex flex-col overflow-hidden">

                {/* TOOLBAR SUPERIOR (Navegación) */}
                <div className="bg-gray-100 px-6 py-3 flex justify-between items-center border-b">
                    <div className="flex items-center gap-4">
                        <button onClick={() => handleNavegacion('prev')} disabled={currentIndex === 0}
                            className="p-2 rounded-full hover:bg-white disabled:opacity-30 transition-colors">
                            <ChevronLeft className="w-6 h-6" />
                        </button>
                        <span className="text-sm font-medium text-gray-500">
                            Solicitud {currentIndex + 1} de {listaMiembros.length}
                        </span>
                        <button onClick={() => handleNavegacion('next')} disabled={currentIndex === listaMiembros.length - 1}
                            className="p-2 rounded-full hover:bg-white disabled:opacity-30 transition-colors">
                            <ChevronRight className="w-6 h-6" />
                        </button>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                        aria-label="Cerrar"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="flex flex-col lg:flex-row h-full overflow-hidden">

                    {/* COLUMNA IZQUIERDA: EDITOR FOTO */}
                    <div className="w-full lg:w-3/5 bg-gray-900 relative flex flex-col">
                        <div className="flex-1 relative min-h-[400px]">
                            {editandoFoto ? (
                                <Cropper
                                    image={miembro.foto_url} // Siempre editar sobre la original
                                    crop={crop}
                                    zoom={zoom}
                                    rotation={rotation}
                                    aspect={139 / 166}  // <--- PROPORCIÓN EXACTA DEL PYTHON
                                    onCropChange={setCrop}
                                    onCropComplete={onCropComplete}
                                    onZoomChange={setZoom}
                                    onRotationChange={setRotation}
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center p-8">
                                    <img
                                        src={miembro.foto_url_final || miembro.foto_url}
                                        alt="Foto"
                                        className="max-h-full max-w-full object-contain shadow-2xl rounded-lg"
                                        crossOrigin="anonymous"
                                    />
                                </div>
                            )}
                        </div>

                        {/* Controles de Edición */}
                        <div className="p-4 bg-gray-800 flex justify-between items-center gap-4 border-t border-gray-700">
                            {editandoFoto ? (
                                <>
                                    <div className="flex gap-4 items-center flex-1">
                                        <div className="flex flex-col w-full max-w-[200px]">
                                            <label className="text-xs text-gray-400">Zoom</label>
                                            <input type="range" value={zoom} min={1} max={3} step={0.1}
                                                onChange={(e) => setZoom(e.target.value)} className="accent-blue-500" />
                                        </div>
                                        <button onClick={() => setRotation(r => r + 90)} className="text-white hover:text-blue-400">
                                            <RotateCw className="w-6 h-6" />
                                        </button>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => setEditandoFoto(false)} className="px-4 py-2 text-gray-300 hover:text-white text-sm">
                                            Cancelar
                                        </button>
                                        <button onClick={() => handleSave('GUARDAR')} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-bold">
                                            Aplicar Recorte
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <div className="w-full flex justify-center">
                                    <button
                                        onClick={() => setEditandoFoto(true)}
                                        className="flex items-center gap-2 px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-full transition-colors font-medium text-sm"
                                    >
                                        <Scissors className="w-4 h-4" />
                                        Editar / Recortar Foto
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* COLUMNA DERECHA: DATOS */}
                    <div className="w-full lg:w-2/5 p-6 md:p-8 overflow-y-auto bg-white flex flex-col">

                        {modoRechazo ? (
                            <div className="flex-1 flex flex-col animate-in slide-in-from-right-10">
                                <h3 className="text-xl font-bold text-red-700 mb-4 flex items-center gap-2">
                                    <Ban className="w-6 h-6" /> Rechazar Solicitud
                                </h3>
                                <div className="flex-1 space-y-4">
                                    <p className="text-sm text-gray-600">Se enviará un correo al usuario explicando el motivo.</p>
                                    <textarea
                                        value={motivoRechazo}
                                        onChange={(e) => setMotivoRechazo(e.target.value)}
                                        className="w-full h-40 p-3 border rounded-lg focus:ring-2 focus:ring-red-500 outline-none text-gray-800 text-sm"
                                        placeholder="Escriba el motivo..."
                                    />
                                </div>
                                <div className="mt-6 flex gap-3">
                                    <button onClick={() => setModoRechazo(false)} className="flex-1 py-3 text-gray-600 font-medium">Cancelar</button>
                                    <button
                                        onClick={() => handleSave('RECHAZAR')}
                                        disabled={loading}
                                        className="flex-1 py-3 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 flex justify-center items-center gap-2"
                                    >
                                        {loading ? <Loader2 className="animate-spin w-4 h-4" /> : <Send className="w-4 h-4" />}
                                        Enviar Rechazo
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <>
                                <div className="flex items-center gap-3 mb-6 pb-4 border-b">
                                    <div className={`w-3 h-3 rounded-full ${miembro.estado === 'PENDIENTE' ? 'bg-yellow-400' : 'bg-green-500'}`}></div>
                                    <h2 className="text-xl font-bold text-gray-800 uppercase tracking-wide">
                                        {miembro.nombres} {miembro.apellidos}
                                    </h2>
                                </div>

                                <div className="space-y-4 flex-1">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Nombres</label>
                                            <input value={formData.nombres} onChange={e => setFormData({ ...formData, nombres: e.target.value })} className="input-field" />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Apellidos</label>
                                            <input value={formData.apellidos} onChange={e => setFormData({ ...formData, apellidos: e.target.value })} className="input-field" />
                                        </div>
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Documento ({miembro.tipo_documento})</label>
                                        <input value={formData.dpi_cui} onChange={e => setFormData({ ...formData, dpi_cui: e.target.value })} className="input-field font-mono" />
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Correo</label>
                                        <input value={formData.email || ''} onChange={e => setFormData({ ...formData, email: e.target.value })} className="input-field" />
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Teléfono</label>
                                        <input value={formData.telefono || ''} onChange={e => setFormData({ ...formData, telefono: e.target.value })} className="input-field" />
                                    </div>
                                </div>

                                <div className="mt-8 space-y-3">
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleSave('GUARDAR')}
                                            className="flex-1 py-3 border border-gray-300 text-gray-700 font-bold rounded-lg hover:bg-gray-50 text-sm"
                                        >
                                            Guardar Cambios
                                        </button>
                                        <button
                                            onClick={() => setModoRechazo(true)}
                                            className="px-4 py-3 border border-red-200 text-red-600 font-bold rounded-lg hover:bg-red-50 text-sm"
                                        >
                                            Rechazar
                                        </button>
                                    </div>

                                    {miembro.estado !== 'APROBADO' && miembro.estado !== 'IMPRESO' && (
                                        <button
                                            onClick={() => handleSave('APROBAR')}
                                            className="w-full flex items-center justify-center gap-2 py-4 bg-blue-700 text-white font-bold rounded-lg hover:bg-blue-800 shadow-lg hover:shadow-blue-500/30 transition-all"
                                        >
                                            {loading ? <Loader2 className="animate-spin w-5 h-5" /> : <CheckCircle className="w-5 h-5" />}
                                            APROBAR Y SIGUIENTE
                                        </button>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>

            <style jsx>{`
                .input-field {
                    width: 100%;
                    padding: 0.5rem 0.75rem;
                    border: 1px solid #e5e7eb;
                    border-radius: 0.5rem;
                    font-size: 0.875rem;
                    color: #1f2937;
                    outline: none;
                    transition: border-color 0.2s;
                }
                .input-field:focus {
                    border-color: #3b82f6;
                    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
                }
            `}</style>
        </div>
    )
}