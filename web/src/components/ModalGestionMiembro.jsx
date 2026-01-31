'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabaseClient'
import Cropper from 'react-easy-crop'
import { rechazarSolicitud } from '@/actions/rechazarSolicitud'
import {
    X, RotateCw, CheckCircle, Loader2,
    ChevronRight, ChevronLeft,
    Scissors, Ban, Send, Lock
} from 'lucide-react'

const getCroppedImg = async (imageSrc, pixelCrop, rotation = 0) => {
    const image = new Image()
    const isLocalBlob = imageSrc.startsWith('blob:')
    if (isLocalBlob) {
        image.src = imageSrc
    } else {
        image.src = imageSrc + '?t=' + new Date().getTime()
        image.crossOrigin = 'anonymous'
    }
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
    ctx.drawImage(image, safeArea / 2 - image.width * 0.5, safeArea / 2 - image.height * 0.5)
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
        canvas.toBlob((blob) => { resolve(blob) }, 'image/jpeg', 0.9)
    })
}

export default function ModalGestionMiembro({ miembroInicial, listaMiembros, onClose, onUpdate, modo = 'MIEMBRO' }) {
    const [currentIndex, setCurrentIndex] = useState(0)
    const miembro = listaMiembros[currentIndex]

    // Configuración dinámica según el modo
    const DB_TABLE = modo === 'PARQUEO' ? 'parqueos' : 'miembros'
    const RPC_APROBAR = modo === 'PARQUEO' ? 'aprobar_parqueo' : 'aprobar_miembro'
    const ID_PARAM = modo === 'PARQUEO' ? 'parqueo_id' : 'miembro_id'

    useEffect(() => {
        const idx = listaMiembros.findIndex(m => m.id === miembroInicial.id)
        if (idx !== -1) setCurrentIndex(idx)
    }, [miembroInicial, listaMiembros])

    const [formData, setFormData] = useState({ ...miembro })
    const [loading, setLoading] = useState(false)
    const [modoRechazo, setModoRechazo] = useState(false)
    const [motivoRechazo, setMotivoRechazo] = useState('La fotografía no cumple con los requisitos.')
    const [crop, setCrop] = useState({ x: 0, y: 0 })
    const [zoom, setZoom] = useState(1)
    const [rotation, setRotation] = useState(0)
    const [croppedAreaPixels, setCroppedAreaPixels] = useState(null)
    const [editandoFoto, setEditandoFoto] = useState(false)
    const [imgBlobUrl, setImgBlobUrl] = useState(null)

    useEffect(() => {
        setFormData({ ...listaMiembros[currentIndex] })
        setRotation(0)
        setZoom(1)
        setCrop({ x: 0, y: 0 })
        setEditandoFoto(false)
        setModoRechazo(false)
    }, [currentIndex, listaMiembros])

    useEffect(() => {
        const prepararImagen = async () => {
            if (miembro?.foto_url) {
                const urlFuente = miembro.foto_url_final || miembro.foto_url
                try {
                    const res = await fetch(urlFuente)
                    const blob = await res.blob()
                    const objectUrl = URL.createObjectURL(blob)
                    setImgBlobUrl(objectUrl)
                } catch (err) {
                    setImgBlobUrl(urlFuente)
                }
            }
        }
        prepararImagen()
        return () => { if (imgBlobUrl) URL.revokeObjectURL(imgBlobUrl) }
    }, [miembro])

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
            // --- RECHAZAR ---
            if (accion === 'RECHAZAR') {
                // 1. Enviar correo
                await rechazarSolicitud({
                    email: formData.email,
                    nombre: formData.nombres,
                    motivo: motivoRechazo
                })

                // 2. GUARDAR EN HISTORIAL (Nuevo paso)
                const { error: historyError } = await supabase
                    .from('solicitudes_rechazadas')
                    .insert([{
                        origen: modo, // 'MIEMBRO' o 'PARQUEO'
                        motivo: motivoRechazo,
                        nombres: formData.nombres,
                        apellidos: formData.apellidos,
                        dpi_cui: formData.dpi_cui,
                        email: formData.email,
                        telefono: formData.telefono,
                        departamento: formData.departamento,
                        foto_url: formData.foto_url,
                        fecha_solicitud_original: formData.created_at
                    }])

                if (historyError) {
                    console.error('Error guardando historial:', historyError)
                    // No detenemos el proceso, pero logueamos el error
                }

                // 3. ELIMINAR de la tabla activa
                await supabase.from(DB_TABLE).delete().eq('id', miembro.id)

                // 4. (Opcional) Borrar foto del bucket
                // Si quieres guardar la evidencia fotográfica, comenta estas lineas.
                // Si quieres ahorrar espacio, déjalas descomentadas.
                /*
                if (miembro.foto_url) {
                    const path = miembro.foto_url.split('/').pop().split('?')[0]
                    await supabase.storage.from('fotos-carnet').remove([path])
                }
                */

                onUpdate()
                if (currentIndex < listaMiembros.length - 1) handleNavegacion('next')
                else onClose()
                return
            }

            // --- GUARDAR / APROBAR ---
            let updates = {
                nombres: formData.nombres,
                apellidos: formData.apellidos,
                dpi_cui: formData.dpi_cui,
                email: formData.email,
                telefono: formData.telefono,
            }
            if (modo === 'MIEMBRO') updates.rol = formData.rol

            if (editandoFoto && croppedAreaPixels) {
                const blob = await getCroppedImg(imgBlobUrl, croppedAreaPixels, rotation)
                const prefix = modo === 'PARQUEO' ? 'P_' : ''
                const fileName = `${prefix}procesada_${miembro.dpi_cui}_${Date.now()}.jpg`

                const { error: uploadError } = await supabase.storage
                    .from('fotos-carnet')
                    .upload(fileName, blob, { upsert: true })

                if (uploadError) throw uploadError
                const { data: urlData } = supabase.storage.from('fotos-carnet').getPublicUrl(fileName)
                updates.foto_url_final = urlData.publicUrl
            }

            await supabase.from(DB_TABLE).update(updates).eq('id', miembro.id)

            let aprobo = false
            if (accion === 'APROBAR') {
                if (miembro.estado !== 'APROBADO' && miembro.estado !== 'IMPRESO') {
                    await supabase.rpc(RPC_APROBAR, { [ID_PARAM]: miembro.id })
                    aprobo = true
                }
            }

            await onUpdate() // Refrescar lista
            setLoading(false)

            if (accion === 'APROBAR') {
                // Si aprobamos, probablemente el item desaparezca de la lista de "Pendientes"
                // Aplicamos la misma lógica que al eliminar:
                if (listaMiembros.length > 1) {
                    if (currentIndex >= listaMiembros.length - 1) {
                        setCurrentIndex(prev => Math.max(0, prev - 1))
                    }
                    // Si no es el último, mantenemos el índice (el siguiente item vendrá a nosotros)
                } else {
                    onClose()
                }
            } else {
                setEditandoFoto(false)
                alert("Cambios guardados correctamente.")
            }

        } catch (error) {
            console.error(error)
            if (error.code === '23505') alert('🛑 ERROR: Documento duplicado.')
            else alert('Error: ' + error.message)
            setLoading(false)
        }
    }

    if (!miembro) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[95vh] flex flex-col overflow-hidden font-sans">
                <div className="bg-gray-100 px-6 py-3 flex justify-between items-center border-b">
                    <div className="flex items-center gap-4">
                        <button onClick={() => handleNavegacion('prev')} disabled={currentIndex === 0} className="p-2 rounded-full hover:bg-white disabled:opacity-30 transition-colors"><ChevronLeft className="w-6 h-6" /></button>
                        <span className="text-sm font-medium text-gray-500">Solicitud {currentIndex + 1} de {listaMiembros.length} ({modo})</span>
                        <button onClick={() => handleNavegacion('next')} disabled={currentIndex === listaMiembros.length - 1} className="p-2 rounded-full hover:bg-white disabled:opacity-30 transition-colors"><ChevronRight className="w-6 h-6" /></button>
                    </div>
                    <button onClick={onClose} className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"><X className="w-6 h-6" /></button>
                </div>

                <div className="flex flex-col lg:flex-row h-full overflow-hidden">
                    <div className="w-full lg:w-3/5 bg-gray-900 relative flex flex-col">
                        <div className="flex-1 relative min-h-[400px] flex items-center justify-center">
                            {editandoFoto ? (
                                <Cropper image={imgBlobUrl} crop={crop} zoom={zoom} rotation={rotation} aspect={139 / 166} onCropChange={setCrop} onCropComplete={onCropComplete} onZoomChange={setZoom} onRotationChange={setRotation} />
                            ) : (
                                <img src={imgBlobUrl} alt="Foto" className="max-h-full max-w-full object-contain shadow-2xl rounded-lg" crossOrigin="anonymous" />
                            )}
                        </div>
                        <div className="p-4 bg-gray-800 flex justify-between items-center gap-4 border-t border-gray-700">
                            {editandoFoto ? (
                                <>
                                    <div className="flex gap-4 items-center flex-1">
                                        <input type="range" value={zoom} min={1} max={3} step={0.1} onChange={(e) => setZoom(e.target.value)} className="accent-blue-500 w-full max-w-[200px]" />
                                        <button onClick={() => setRotation(r => r + 90)} className="text-white hover:text-blue-400"><RotateCw className="w-6 h-6" /></button>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => setEditandoFoto(false)} className="px-4 py-2 text-gray-300 hover:text-white text-sm">Cancelar</button>
                                        <button onClick={() => handleSave('GUARDAR')} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-bold">Aplicar</button>
                                    </div>
                                </>
                            ) : (
                                <div className="w-full flex justify-center">
                                    <button onClick={() => setEditandoFoto(true)} className="flex items-center gap-2 px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-full transition-colors font-medium text-sm"><Scissors className="w-4 h-4" /> Editar Foto</button>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="w-full lg:w-2/5 p-6 md:p-8 overflow-y-auto bg-white flex flex-col">
                        {modoRechazo ? (
                            <div className="flex-1 flex flex-col animate-in slide-in-from-right-10">
                                <h3 className="text-xl font-bold text-red-700 mb-4 flex items-center gap-2"><Ban className="w-6 h-6" /> Rechazar</h3>
                                <textarea value={motivoRechazo} onChange={(e) => setMotivoRechazo(e.target.value)} className="w-full h-40 p-3 border rounded-lg focus:ring-2 focus:ring-red-500 outline-none text-gray-800 text-sm" placeholder="Motivo..." />
                                <div className="mt-6 flex gap-3">
                                    <button onClick={() => setModoRechazo(false)} className="flex-1 py-3 text-gray-600 font-medium">Cancelar</button>
                                    <button onClick={() => handleSave('RECHAZAR')} disabled={loading} className="flex-1 py-3 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 flex justify-center items-center gap-2">{loading ? <Loader2 className="animate-spin w-4 h-4" /> : <Send className="w-4 h-4" />} Enviar</button>
                                </div>
                            </div>
                        ) : (
                            <>
                                <div className="flex items-center gap-3 mb-6 pb-4 border-b">
                                    <div className={`w-3 h-3 rounded-full ${miembro.estado === 'PENDIENTE' ? 'bg-yellow-400' : 'bg-green-500'}`}></div>
                                    <h2 className="text-xl font-bold text-gray-800 uppercase tracking-wide truncate">{miembro.nombres} {miembro.apellidos}</h2>
                                </div>
                                <div className="space-y-5 flex-1">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Documento</label>
                                            <input value={formData.dpi_cui} onChange={e => setFormData({ ...formData, dpi_cui: e.target.value })} className="input-field font-mono bg-gray-50" />
                                        </div>
                                        {/* SOLO MOSTRAMOS ROL SI ES MIEMBRO */}
                                        {modo === 'MIEMBRO' && (
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Rol</label>
                                                <select value={formData.rol || 'ATLETA'} onChange={e => setFormData({ ...formData, rol: e.target.value })} className="input-field bg-white cursor-pointer">
                                                    <option value="ATLETA">ATLETA</option>
                                                    <option value="ENTRENADOR">ENTRENADOR</option>
                                                    <option value="DIRECTIVO">DIRECTIVO</option>
                                                    <option value="COLABORADOR">COLABORADOR</option>
                                                    <option value="ARBITRO">ARBITRO</option>
                                                </select>
                                            </div>
                                        )}
                                    </div>
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
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1 relative">
                                            <div className="flex justify-between"><label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Correo</label><Lock className="w-3 h-3 text-gray-300" /></div>
                                            <input value={formData.email || ''} onChange={e => setFormData({ ...formData, email: e.target.value })} className="input-field" />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Teléfono</label>
                                            <input value={formData.telefono || ''} onChange={e => setFormData({ ...formData, telefono: e.target.value })} className="input-field" />
                                        </div>
                                    </div>
                                </div>
                                <div className="mt-8 space-y-3 pt-6 border-t">
                                    <div className="flex gap-2">
                                        <button onClick={() => handleSave('GUARDAR')} className="flex-1 py-3 border border-gray-300 text-gray-700 font-bold rounded-lg hover:bg-gray-50 text-sm">Guardar Cambios</button>
                                        <button onClick={() => setModoRechazo(true)} className="px-4 py-3 border border-red-200 text-red-600 font-bold rounded-lg hover:bg-red-50 text-sm">Rechazar</button>
                                    </div>
                                    {miembro.estado !== 'APROBADO' && miembro.estado !== 'IMPRESO' && (
                                        <button onClick={() => handleSave('APROBAR')} className="w-full flex items-center justify-center gap-2 py-4 bg-blue-700 text-white font-bold rounded-lg hover:bg-blue-800 shadow-lg hover:shadow-blue-500/30 transition-all">
                                            {loading ? <Loader2 className="animate-spin w-5 h-5" /> : <CheckCircle className="w-5 h-5" />} APROBAR Y SIGUIENTE
                                        </button>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
            <style jsx>{` .input-field { width: 100%; padding: 0.6rem 0.75rem; border: 1px solid #e5e7eb; border-radius: 0.5rem; font-size: 0.875rem; color: #111827; outline: none; transition: all 0.2s; } .input-field:focus { border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1); } `}</style>
        </div>
    )
}