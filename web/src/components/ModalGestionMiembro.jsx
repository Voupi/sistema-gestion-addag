'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { ROL_DEFECTO, ROLES_DISPONIBLES } from '@/lib/constants'
import Cropper from 'react-easy-crop'
import { rechazarSolicitud } from '@/actions/rechazarSolicitud'
import {
    X, RotateCw, CheckCircle, Loader2,
    ChevronRight, ChevronLeft,
    Scissors, Ban, Send, Lock, RotateCcw
} from 'lucide-react'

// Función para obtener la orientación EXIF de una imagen
const getExifOrientation = async (imageSrc) => {
    return new Promise((resolve) => {
        const img = new Image()
        img.crossOrigin = 'anonymous'
        img.onload = async () => {
            try {
                const canvas = document.createElement('canvas')
                const ctx = canvas.getContext('2d')
                canvas.width = img.width
                canvas.height = img.height
                ctx.drawImage(img, 0, 0)

                // Intentar obtener los datos de la imagen para detectar EXIF
                const response = await fetch(imageSrc)
                const blob = await response.blob()
                const arrayBuffer = await blob.arrayBuffer()
                const view = new DataView(arrayBuffer)

                // Verificar si es JPEG (0xFFD8)
                if (view.getUint16(0, false) !== 0xFFD8) {
                    resolve(1) // No es JPEG, sin EXIF
                    return
                }

                // Buscar el marcador de EXIF
                let offset = 2
                while (offset < view.byteLength) {
                    if (view.getUint16(offset + 2, false) <= 8) {
                        resolve(1)
                        return
                    }
                    const marker = view.getUint16(offset, false)
                    offset += 2

                    if (marker === 0xFFE1) { // Marcador APP1 (EXIF)
                        const exifOffset = offset + 2
                        if (view.getUint32(exifOffset, false) !== 0x45786966) {
                            resolve(1)
                            return
                        }

                        const little = view.getUint16(exifOffset + 6, false) === 0x4949
                        offset += view.getUint16(offset, false)

                        const tags = view.getUint16(exifOffset + 8 + (little ? 0 : 2), little)
                        for (let i = 0; i < tags; i++) {
                            const tagOffset = exifOffset + 10 + (i * 12)
                            if (view.getUint16(tagOffset, little) === 0x0112) {
                                resolve(view.getUint16(tagOffset + 8, little))
                                return
                            }
                        }
                    } else {
                        offset += view.getUint16(offset, false)
                    }
                }
                resolve(1) // Sin orientación EXIF
            } catch (err) {
                console.warn('Error leyendo EXIF:', err)
                resolve(1) // Por defecto sin rotación
            }
        }
        img.onerror = () => resolve(1)
        img.src = imageSrc
    })
}

// Función para aplicar la corrección EXIF a la imagen
const applyExifOrientation = (ctx, orientation, width, height) => {
    switch (orientation) {
        case 2:
            ctx.transform(-1, 0, 0, 1, width, 0)
            break
        case 3:
            ctx.transform(-1, 0, 0, -1, width, height)
            break
        case 4:
            ctx.transform(1, 0, 0, -1, 0, height)
            break
        case 5:
            ctx.transform(0, 1, 1, 0, 0, 0)
            break
        case 6:
            ctx.transform(0, 1, -1, 0, height, 0)
            break
        case 7:
            ctx.transform(0, -1, -1, 0, height, width)
            break
        case 8:
            ctx.transform(0, -1, 1, 0, 0, width)
            break
    }
}

const getCroppedImg = async (imageSrc, pixelCrop, rotation = 0, exifOrientation = 1) => {
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

    // Aplicar orientación EXIF antes de cualquier otra transformación
    let width = image.width
    let height = image.height

    // Las orientaciones 5, 6, 7 y 8 intercambian ancho y alto
    if (exifOrientation >= 5 && exifOrientation <= 8) {
        [width, height] = [height, width]
    }

    const maxSize = Math.max(width, height)
    const safeArea = 2 * ((maxSize / 2) * Math.sqrt(2))
    canvas.width = safeArea
    canvas.height = safeArea

    ctx.translate(safeArea / 2, safeArea / 2)

    // Primero aplicamos la orientación EXIF
    if (exifOrientation !== 1) {
        applyExifOrientation(ctx, exifOrientation, width, height)
    }

    // Luego aplicamos la rotación manual del usuario
    ctx.rotate((rotation * Math.PI) / 180)

    ctx.translate(-safeArea / 2, -safeArea / 2)
    ctx.drawImage(image, safeArea / 2 - width * 0.5, safeArea / 2 - height * 0.5)
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

// Historia 13: carga una URL de imagen con reintentos ante conexión lenta
const cargarImagenConReintentos = async (url, maxIntentos = 3) => {
    for (let intento = 1; intento <= maxIntentos; intento++) {
        try {
            const res = await fetch(`${url}${url.includes('?') ? '&' : '?'}nocache=${Date.now()}`, { cache: 'no-cache' })
            if (!res.ok) throw new Error(`HTTP ${res.status}`)
            const blob = await res.blob()
            return URL.createObjectURL(blob)
        } catch (err) {
            if (intento === maxIntentos) throw err
            await new Promise(r => setTimeout(r, 1000 * intento)) // backoff: 1s, 2s
        }
    }
}

// Historia 13: verifica que una URL de imagen cargue correctamente en el navegador
const verificarImagenCargada = (url) =>
    new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Tiempo de espera agotado al verificar la imagen guardada. Verifica tu conexión.')), 13000)
        const img = new window.Image()
        img.onload = () => { clearTimeout(timeout); resolve() }
        img.onerror = () => { clearTimeout(timeout); reject(new Error('La imagen no pudo cargarse tras guardar. Verifica tu conexión e intenta de nuevo.')) }
        img.src = `${url}?verify=${Date.now()}`
    })

export default function ModalGestionMiembro({ miembroInicial, listaMiembros, onClose, onUpdate, modo = 'MIEMBRO' }) {
    const [enviarCorreoRechazo, setEnviarCorreoRechazo] = useState(false)
    const [currentIndex, setCurrentIndex] = useState(() => {
        const idx = listaMiembros.findIndex(m => m.id === miembroInicial.id)
        return idx !== -1 ? idx : 0
    })
    const miembro = listaMiembros[currentIndex]

    const DB_TABLE = modo === 'PARQUEO' ? 'parqueos' : 'miembros'
    const RPC_APROBAR = modo === 'PARQUEO' ? 'aprobar_parqueo' : 'aprobar_miembro'
    const ID_PARAM = modo === 'PARQUEO' ? 'parqueo_id' : 'miembro_id'

    useEffect(() => {
        const idx = listaMiembros.findIndex(m => m.id === miembroInicial.id)
        if (idx !== -1) setCurrentIndex(idx)
    }, [miembroInicial, listaMiembros])

    const [formData, setFormData] = useState({ ...miembro, rol: miembro.rol || ROL_DEFECTO })
    const [loading, setLoading] = useState(false)
    const [modoRechazo, setModoRechazo] = useState(false)
    const [motivoRechazo, setMotivoRechazo] = useState('')
    const [crop, setCrop] = useState({ x: 0, y: 0 })
    const [zoom, setZoom] = useState(1)
    const [rotation, setRotation] = useState(0)
    const [croppedAreaPixels, setCroppedAreaPixels] = useState(null)
    const [editandoFoto, setEditandoFoto] = useState(false)
    const [imgBlobUrl, setImgBlobUrl] = useState(null)
    // Historia 13: estado de carga de imagen
    const [imgCargando, setImgCargando] = useState(false)
    const [imgError, setImgError] = useState(false)

    useEffect(() => {
        const m = listaMiembros[currentIndex]
        setFormData({ ...m, rol: m.rol || ROL_DEFECTO })
        setRotation(0)
        setZoom(1)
        setCrop({ x: 0, y: 0 })
        setEditandoFoto(false)
        setModoRechazo(false)
    }, [currentIndex, listaMiembros])

    useEffect(() => {
        // Historia 13: prepara la imagen con reintentos ante conexión lenta
        const prepararImagen = async () => {
            if (!miembro?.foto_url) return
            const urlFuente = miembro.foto_url_final || miembro.foto_url
            setImgCargando(true)
            setImgError(false)
            try {
                const objectUrl = await cargarImagenConReintentos(urlFuente)
                setImgBlobUrl(objectUrl)
            } catch {
                // Si fallan todos los reintentos, muestra la URL directa (fallback)
                setImgBlobUrl(urlFuente)
                setImgError(true)
            } finally {
                setImgCargando(false)
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

    // Historia 11: revertir la foto procesada a la original del alumno
    const handleRevertirFoto = async () => {
        if (!confirm('¿Revertir a la foto original subida por el alumno? Se perderá la edición actual.')) return
        setLoading(true)
        try {
            await supabase.from(DB_TABLE).update({ foto_url_final: null }).eq('id', miembro.id)
            // Historia 13: carga la original con reintentos
            const objectUrl = await cargarImagenConReintentos(miembro.foto_url)
            setImgBlobUrl(objectUrl)
            setImgError(false)
            await onUpdate()
        } catch (error) {
            alert('Error al revertir foto: ' + error.message)
        } finally {
            setLoading(false)
        }
    }

    const handleSave = async (accion) => {
        setLoading(true)
        try {
            // --- RECHAZAR ---
            if (accion === 'RECHAZAR') {
                if (enviarCorreoRechazo) {
                    await rechazarSolicitud({
                        email: formData.email,
                        nombre: formData.nombres,
                        motivo: motivoRechazo
                    })
                }

                const { error: historyError } = await supabase
                    .from('solicitudes_rechazadas')
                    .insert([{
                        origen: modo,
                        motivo: motivoRechazo,
                        nombres: formData.nombres,
                        apellidos: formData.apellidos,
                        dpi_cui: formData.dpi_cui,
                        email: formData.email,
                        telefono: formData.telefono,
                        departamento: formData.departamento,
                        foto_url: formData.foto_url,
                        fecha_solicitud_original: formData.created_at,
                        entrenador_id: formData.entrenador_id
                    }])

                if (historyError) {
                    console.error('Error guardando historial:', historyError)
                }

                await supabase.from(DB_TABLE).delete().eq('id', miembro.id)

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

            // Procesar imagen si se editó manualmente O si se está aprobando (para corregir EXIF)
            const debeProcesarImagen = editandoFoto && croppedAreaPixels
            const esAprobacionSinEditar = accion === 'APROBAR' && !editandoFoto && !miembro.foto_url_final

            if (debeProcesarImagen || esAprobacionSinEditar) {
                let blob

                if (debeProcesarImagen) {
                    // Usuario editó manualmente la foto
                    const exifOrientation = await getExifOrientation(imgBlobUrl)
                    blob = await getCroppedImg(imgBlobUrl, croppedAreaPixels, rotation, exifOrientation)
                } else {
                    // Aprobación sin editar: corregir solo orientación EXIF
                    const exifOrientation = await getExifOrientation(imgBlobUrl)

                    // Solo procesar si tiene orientación EXIF diferente a 1 (normal)
                    if (exifOrientation !== 1) {
                        // Crear un crop de toda la imagen
                        const img = new Image()
                        img.src = imgBlobUrl
                        await new Promise(resolve => { img.onload = resolve })

                        const fullCrop = {
                            x: 0,
                            y: 0,
                            width: img.width,
                            height: img.height
                        }

                        blob = await getCroppedImg(imgBlobUrl, fullCrop, 0, exifOrientation)
                    }
                }

                if (blob) {
                    const prefix = modo === 'PARQUEO' ? 'P_' : ''
                    const fileName = `${prefix}procesada_${miembro.dpi_cui}_${Date.now()}.jpg`

                    const { error: uploadError } = await supabase.storage
                        .from('fotos-carnet')
                        .upload(fileName, blob, { upsert: true })

                    if (uploadError) throw uploadError

                    const { data: urlData } = supabase.storage.from('fotos-carnet').getPublicUrl(fileName)
                    const nuevaUrl = urlData.publicUrl

                    // Historia 13: verifica que la imagen se cargó correctamente antes de continuar
                    await verificarImagenCargada(nuevaUrl)

                    updates.foto_url_final = nuevaUrl
                }
            }

            // RF03: registrar quién aprobó y cuándo (solo al aprobar por primera vez)
            if (accion === 'APROBAR' && miembro.estado !== 'APROBADO' && miembro.estado !== 'IMPRESO') {
                const { data: authData } = await supabase.auth.getUser()
                updates.aprobado_por = authData?.user?.email || 'sistema'
                updates.fecha_aprobacion = new Date().toISOString()
            }

            await supabase.from(DB_TABLE).update(updates).eq('id', miembro.id)

            if (accion === 'APROBAR') {
                if (miembro.estado !== 'APROBADO' && miembro.estado !== 'IMPRESO') {
                    await supabase.rpc(RPC_APROBAR, { [ID_PARAM]: miembro.id })
                }
            }

            await onUpdate()
            setLoading(false)

            if (accion === 'APROBAR') {
                if (listaMiembros.length > 1) {
                    if (currentIndex >= listaMiembros.length - 1) {
                        setCurrentIndex(prev => Math.max(0, prev - 1))
                    }
                } else {
                    onClose()
                }
            } else {
                setEditandoFoto(false)
                alert('Cambios guardados correctamente.')
            }

        } catch (error) {
            console.error(error)
            if (error.code === '23505') alert('🛑 ERROR: Documento duplicado.')
            else alert('Error: ' + error.message)
            setLoading(false)
        }
    }

    if (!miembro) return null

    const tieneEdicion = !!miembro.foto_url_final

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-2 sm:p-4 animate-in fade-in">
            <div className="bg-white rounded-2xl sm:rounded-2xl rounded-t-2xl shadow-2xl w-full max-w-6xl max-h-[100vh] sm:max-h-[95vh] flex flex-col overflow-hidden font-sans modal-container">
                <div className="bg-gray-100 px-3 sm:px-6 py-2 sm:py-3 flex justify-between items-center border-b">
                    <div className="flex items-center gap-2 sm:gap-4">
                        <button onClick={() => handleNavegacion('prev')} disabled={currentIndex === 0} className="p-2 rounded-full hover:bg-white disabled:opacity-30 transition-colors text-gray-700 touch-target"><ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" /></button>
                        <span className="text-xs sm:text-sm font-medium text-gray-500 hidden sm:inline">Solicitud {currentIndex + 1} de {listaMiembros.length} ({modo})</span>
                        <span className="text-xs font-medium text-gray-500 sm:hidden">{currentIndex + 1}/{listaMiembros.length}</span>
                        <button onClick={() => handleNavegacion('next')} disabled={currentIndex === listaMiembros.length - 1} className="p-2 rounded-full hover:bg-white disabled:opacity-30 transition-colors text-gray-700 touch-target"><ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" /></button>
                    </div>
                    <button onClick={onClose} className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors touch-target"><X className="w-5 h-5 sm:w-6 sm:h-6" /></button>
                </div>

                <div className="flex flex-col lg:flex-row h-full overflow-hidden">
                    {/* Panel de imagen */}
                    <div className="w-full lg:w-3/5 bg-gray-900 relative flex flex-col">
                        <div className="flex-1 relative min-h-[250px] sm:min-h-[350px] lg:min-h-[400px] flex items-center justify-center">
                            {imgCargando ? (
                                <div className="flex flex-col items-center gap-3 text-gray-400">
                                    <Loader2 className="w-10 h-10 animate-spin" />
                                    <span className="text-sm">Cargando imagen...</span>
                                </div>
                            ) : editandoFoto ? (
                                <Cropper image={imgBlobUrl} crop={crop} zoom={zoom} rotation={rotation} aspect={232 / 242} onCropChange={setCrop} onCropComplete={onCropComplete} onZoomChange={setZoom} onRotationChange={setRotation} />
                            ) : (
                                <div className="relative w-full h-full flex items-center justify-center">
                                    <img src={imgBlobUrl} alt="Foto" className="max-h-full max-w-full object-contain shadow-2xl rounded-lg" crossOrigin="anonymous" />
                                    {imgError && (
                                        <div className="absolute bottom-2 left-0 right-0 mx-auto text-center">
                                            <span className="text-xs bg-yellow-500 text-white px-3 py-1 rounded-full">Imagen cargada desde URL directa (conexión lenta)</span>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                        <div className="p-3 sm:p-4 bg-gray-800 flex flex-col sm:flex-row justify-between items-center gap-3 sm:gap-4 border-t border-gray-700">
                            {editandoFoto ? (
                                <>
                                    <div className="flex gap-4 items-center flex-1 w-full sm:w-auto">
                                        <input type="range" value={zoom} min={1} max={3} step={0.1} onChange={(e) => setZoom(e.target.value)} className="accent-blue-500 w-full sm:max-w-[200px]" />
                                        <button onClick={() => setRotation(r => r + 90)} className="text-white hover:text-blue-400 touch-target"><RotateCw className="w-6 h-6" /></button>
                                    </div>
                                    <div className="flex gap-2 w-full sm:w-auto">
                                        <button onClick={() => setEditandoFoto(false)} className="flex-1 sm:flex-none px-4 py-2 text-gray-300 hover:text-white text-sm no-mobile-padding">Cancelar</button>
                                        <button onClick={() => handleSave('GUARDAR')} disabled={loading} className="flex-1 sm:flex-none px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-bold flex items-center justify-center gap-2 no-mobile-padding">
                                            {loading && <Loader2 className="w-3 h-3 animate-spin" />} Aplicar
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <div className="w-full flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-3">
                                    <button onClick={() => setEditandoFoto(true)} className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-full transition-colors font-medium text-sm">
                                        <Scissors className="w-4 h-4" /> Editar Foto
                                    </button>
                                    {/* Historia 11: revertir foto solo si existe una edición */}
                                    {tieneEdicion && (
                                        <button onClick={handleRevertirFoto} disabled={loading} className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-amber-700 hover:bg-amber-600 text-white rounded-full transition-colors font-medium text-sm" title="Revertir a la foto original del alumno">
                                            <RotateCcw className="w-4 h-4" /> <span className="hidden sm:inline">Revertir original</span><span className="sm:hidden">Revertir</span>
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Panel de datos */}
                    <div className="w-full lg:w-2/5 p-4 sm:p-6 md:p-8 overflow-y-auto bg-white flex flex-col">
                        {modoRechazo ? (
                            <div className="flex-1 flex flex-col animate-in slide-in-from-right-10">
                                <h3 className="text-xl font-bold text-red-700 mb-4 flex items-center gap-2"><Ban className="w-6 h-6" /> Rechazar</h3>

                                <textarea value={motivoRechazo} onChange={(e) => setMotivoRechazo(e.target.value)} className="w-full h-32 p-3 border rounded-lg focus:ring-2 focus:ring-red-500 outline-none text-gray-800 text-sm mb-4" placeholder="Motivo..." />

                                <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer bg-gray-50 p-3 rounded-lg border border-gray-200">
                                    <input
                                        type="checkbox"
                                        checked={enviarCorreoRechazo}
                                        onChange={(e) => setEnviarCorreoRechazo(e.target.checked)}
                                        className="w-4 h-4 text-red-600 rounded"
                                    />
                                    <span>Notificar motivo al usuario por correo electrónico</span>
                                </label>

                                <div className="mt-6 flex gap-3">
                                    <button onClick={() => setModoRechazo(false)} className="flex-1 py-3 text-gray-600 font-medium">Cancelar</button>
                                    <button onClick={() => handleSave('RECHAZAR')} disabled={loading} className="flex-1 py-3 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 flex justify-center items-center gap-2">
                                        {loading ? <Loader2 className="animate-spin w-4 h-4" /> : <Send className="w-4 h-4" />} Confirmar Rechazo
                                    </button>
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
                                        {modo === 'MIEMBRO' && (
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Rol</label>
                                                <select value={formData.rol || ROL_DEFECTO} onChange={e => setFormData({ ...formData, rol: e.target.value })} className="input-field bg-white cursor-pointer">
                                                    {ROLES_DISPONIBLES.map(rol => (
                                                        <option key={rol} value={rol}>{rol}</option>
                                                    ))}
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
                                        <button onClick={() => handleSave('GUARDAR')} disabled={loading} className="flex-1 py-3 border border-gray-300 text-gray-700 font-bold rounded-lg hover:bg-gray-50 text-sm">Guardar Cambios</button>
                                        <button onClick={() => setModoRechazo(true)} className="px-4 py-3 border border-red-200 text-red-600 font-bold rounded-lg hover:bg-red-50 text-sm">Rechazar</button>
                                    </div>
                                    {miembro.estado !== 'APROBADO' && miembro.estado !== 'IMPRESO' && (
                                        <button onClick={() => handleSave('APROBAR')} disabled={loading} className="w-full flex items-center justify-center gap-2 py-4 bg-blue-700 text-white font-bold rounded-lg hover:bg-blue-800 shadow-lg hover:shadow-blue-500/30 transition-all">
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
