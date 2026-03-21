'use client'

import { useState, useRef, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { ROL_DEFECTO } from '@/lib/constants'
import Image from 'next/image'
import { Turnstile } from '@marsidev/react-turnstile'
import { User, CreditCard, Phone, MapPin, Camera, Loader2, CheckCircle, AlertCircle, Globe, Mail, Users, ShieldCheck } from 'lucide-react'
// IMPORTAMOS LA NUEVA ACCIÓN SEPARADA
import { enviarCorreoConfirmacionSocio } from '@/actions/enviarCorreoAsociado'

const DEPARTAMENTOS_GUATEMALA = [
    'Guatemala', 'Alta Verapaz', 'Baja Verapaz', 'Chimaltenango', 'Chiquimula',
    'El Progreso', 'Escuintla', 'Huehuetenango', 'Izabal', 'Jalapa', 'Jutiapa',
    'Petén', 'Quetzaltenango', 'Quiché', 'Retalhuleu', 'Sacatepéquez',
    'San Marcos', 'Santa Rosa', 'Sololá', 'Suchitepéquez', 'Totonicapán', 'Zacapa'
]

export default function FormularioSolicitudSocio() {
    const turnstileRef = useRef()
    const botonSubmitRef = useRef(null) // Referencia para el auto-scroll

    // Detección de navegador dentro de app (Facebook, Instagram, WhatsApp, etc.)
    const [esNavegadorApp, setEsNavegadorApp] = useState(false)
    const [urlActual, setUrlActual] = useState('')
    useEffect(() => {
        const ua = navigator.userAgent || ''
        const esApp = (
            /FBAN|FBAV|FB_IAB|FBIOS/i.test(ua) ||
            /Instagram/i.test(ua) ||
            /WhatsApp/i.test(ua) ||
            /TikTok/i.test(ua) ||
            /Twitter/i.test(ua) ||
            /LinkedInApp/i.test(ua) ||
            /Snapchat/i.test(ua) ||
            /Line\//i.test(ua) ||
            (/Android/i.test(ua) && /wv\b/i.test(ua) && /Version\/\d/i.test(ua))
        )
        if (esApp) {
            setEsNavegadorApp(true)
            setUrlActual(window.location.href)
        }
    }, [])

    const [listaEntrenadores, setListaEntrenadores] = useState([])

    useEffect(() => {
        const cargarEntrenadores = async () => {
            const { data } = await supabase.from('entrenadores').select('id, nombre_completo').eq('activo', true)
            if (data) setListaEntrenadores(data)
        }
        cargarEntrenadores()
    }, [])

    const [formData, setFormData] = useState({
        email: '', nombres: '', apellidos: '', tipo_documento: 'DPI',
        dpi_cui: '', fecha_nacimiento: '', telefono: '', departamento: 'Guatemala', entrenador_id: ''
    })

    const [foto, setFoto] = useState(null)
    const [fotoPreview, setFotoPreview] = useState(null)
    const [turnstileToken, setTurnstileToken] = useState(null)
    const [isDragging, setIsDragging] = useState(false)
    const [loading, setLoading] = useState(false)
    const [mensaje, setMensaje] = useState({ tipo: '', texto: '' })
    const [errores, setErrores] = useState({})

    const validarDPI = (dpi) => /^\d{13}$/.test(dpi)
    const validarPasaporte = (pasaporte) => /^[A-Za-z0-9]{3,20}$/.test(pasaporte)
    const validarEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)

    // --- LÓGICA DE UX: VERIFICAR SI EL FORMULARIO ESTÁ COMPLETO ---
    const isFormComplete = Boolean(
        formData.entrenador_id && formData.email.trim() && formData.nombres.trim() &&
        formData.apellidos.trim() && formData.dpi_cui.trim() && formData.fecha_nacimiento &&
        formData.telefono.trim() && foto && turnstileToken
    )
    const [hasScrolled, setHasScrolled] = useState(false) // Nuevo estado
    // Auto-scroll cuando se completa
    useEffect(() => {
        // Solo hacer auto-scroll si está completo, NO estamos cargando/enviando, y NO hemos scrolleado antes
        if (isFormComplete && botonSubmitRef.current && !loading && !hasScrolled) {
            setTimeout(() => {
                botonSubmitRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
                setHasScrolled(true) // Marcar que ya lo hicimos para no molestar
            }, 300)
        }
    }, [isFormComplete, loading, hasScrolled])

    const handleChange = (e) => {
        const { name, value } = e.target
        if (name === 'tipo_documento') {
            setFormData(prev => ({ ...prev, [name]: value, dpi_cui: '' }))
            setErrores(prev => ({ ...prev, dpi_cui: '' }))
        } else {
            if (name === 'dpi_cui' && formData.tipo_documento === 'DPI') {
                if (value && !/^\d*$/.test(value)) return;
            }
            setFormData(prev => ({ ...prev, [name]: value }))
        }
        if (errores[name]) setErrores(prev => ({ ...prev, [name]: '' }))
    }

    const procesarFichero = (file) => {
        if (!file.type.startsWith('image/')) { setErrores(prev => ({ ...prev, foto: 'Debe ser imagen válida' })); return }
        if (file.size > 5 * 1024 * 1024) { setErrores(prev => ({ ...prev, foto: 'Máximo 5MB' })); return }
        setFoto(file); setFotoPreview(URL.createObjectURL(file)); setErrores(prev => ({ ...prev, foto: '' }))
    }

    const handleFotoChange = (e) => { if (e.target.files[0]) procesarFichero(e.target.files[0]) }
    const handleDragOver = (e) => { e.preventDefault(); setIsDragging(true); }
    const handleDragLeave = (e) => { e.preventDefault(); setIsDragging(false); }
    const handleDrop = (e) => { e.preventDefault(); setIsDragging(false); if (e.dataTransfer.files[0]) procesarFichero(e.dataTransfer.files[0]); }

    const validarFormulario = () => {
        const nuevosErrores = {}
        if (!formData.entrenador_id) nuevosErrores.entrenador_id = 'Requerido'
        if (!formData.email.trim()) nuevosErrores.email = 'Requerido'
        else if (!validarEmail(formData.email)) nuevosErrores.email = 'Inválido'
        if (!formData.nombres.trim()) nuevosErrores.nombres = 'Requerido'
        if (!formData.apellidos.trim()) nuevosErrores.apellidos = 'Requerido'
        if (!formData.dpi_cui.trim()) nuevosErrores.dpi_cui = 'Requerido'
        else {
            if (formData.tipo_documento === 'DPI' && !validarDPI(formData.dpi_cui)) nuevosErrores.dpi_cui = '13 dígitos'
            if (formData.tipo_documento === 'PASAPORTE' && !validarPasaporte(formData.dpi_cui)) nuevosErrores.dpi_cui = 'Inválido'
        }
        if (!formData.fecha_nacimiento) nuevosErrores.fecha_nacimiento = 'Requerido'
        if (!formData.telefono.trim()) nuevosErrores.telefono = 'Requerido'
        if (!foto) nuevosErrores.foto = 'Requerido'
        if (!turnstileToken) nuevosErrores.captcha = 'Requerido'

        setErrores(nuevosErrores)
        return Object.keys(nuevosErrores).length === 0
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setMensaje({ tipo: '', texto: '' })

        if (!validarFormulario()) {
            setMensaje({ tipo: 'error', texto: 'Corrija los campos en rojo.' })
            window.scrollTo({ top: 0, behavior: 'smooth' })
            return
        }

        setLoading(true)
        try {
            const timestamp = Date.now()
            const safeFileName = formData.dpi_cui.replace(/[^a-z0-9]/gi, '_').toLowerCase();
            const extension = foto.name.split('.').pop()
            const rutaArchivo = `${safeFileName}-${timestamp}.${extension}`

            const { error: uploadError } = await supabase.storage.from('fotos-carnet').upload(rutaArchivo, foto, { cacheControl: '3600', upsert: false })
            if (uploadError) throw new Error(`Error imagen: ${uploadError.message}`)

            const { data: urlData } = supabase.storage.from('fotos-carnet').getPublicUrl(rutaArchivo)
            const entrenadorSelec = listaEntrenadores.find(e => e.id === formData.entrenador_id)

            const { error: insertError } = await supabase
                .from('miembros')
                .insert([{
                    email: formData.email.trim(), nombres: formData.nombres.trim(),
                    apellidos: formData.apellidos.trim(), tipo_documento: formData.tipo_documento,
                    dpi_cui: formData.dpi_cui.trim(), fecha_nacimiento: formData.fecha_nacimiento,
                    telefono: formData.telefono.trim(), departamento: formData.departamento,
                    foto_url: urlData.publicUrl, rol: ROL_DEFECTO, entrenador_id: formData.entrenador_id
                }])

            if (insertError) {
                if (insertError.code === '23505') throw new Error('Este Documento ya está registrado.')
                throw new Error(insertError.message)
            }

            try {
                // USAMOS LA NUEVA FUNCIÓN
                await enviarCorreoConfirmacionSocio({
                    emailDestino: formData.email,
                    nombre: `${formData.nombres} ${formData.apellidos}`,
                    dpi: formData.dpi_cui,
                    telefono: formData.telefono,
                    entrenadorNombre: entrenadorSelec ? entrenadorSelec.nombre_completo : 'Administración'
                })
            } catch (mailError) { console.warn(mailError) }

            setMensaje({ tipo: 'exito', texto: '¡Solicitud enviada! Revisa tu correo.' })
            setFormData({ email: '', nombres: '', apellidos: '', tipo_documento: 'DPI', dpi_cui: '', fecha_nacimiento: '', telefono: '', departamento: 'Guatemala', entrenador_id: '' })
            setFoto(null); setFotoPreview(null); setTurnstileToken(null); setHasScrolled(false);
            if (turnstileRef.current) turnstileRef.current.reset()
            window.scrollTo({ top: 0, behavior: 'smooth' })

        } catch (error) {
            console.error(error)
            setMensaje({ tipo: 'error', texto: error.message })
            window.scrollTo({ top: 0, behavior: 'smooth' })
        } finally { setLoading(false) }
    }

    return (
        <div className="w-full max-w-4xl mx-auto p-4 animate-in fade-in duration-500 font-sans">

            {/* BARRERA: navegador dentro de app (Facebook, Instagram, WhatsApp…) */}
            {esNavegadorApp && (
                <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-[#002855] p-6 text-center">
                    <div className="max-w-sm w-full bg-white rounded-2xl shadow-2xl p-8 flex flex-col items-center gap-5">
                        <div className="w-16 h-16 rounded-full bg-orange-100 flex items-center justify-center">
                            <AlertCircle className="w-9 h-9 text-orange-500" />
                        </div>
                        <h2 className="text-xl font-bold text-gray-900 leading-tight">
                            Abre este formulario en tu navegador
                        </h2>
                        <p className="text-sm text-gray-600">
                            Este formulario <strong>no funciona correctamente</strong> dentro de aplicaciones
                            como Facebook, Instagram o WhatsApp, porque no permiten subir archivos.
                        </p>
                        <div className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-left">
                            <p className="text-xs text-gray-500 mb-1 font-semibold uppercase tracking-wide">Cómo abrir:</p>
                            <ol className="text-sm text-gray-700 space-y-1 list-decimal list-inside">
                                <li>Toca los <strong>tres puntos</strong> (⋮) o el ícono de compartir</li>
                                <li>Selecciona <strong>&quot;Abrir en Chrome&quot;</strong> o <strong>&quot;Abrir en Safari&quot;</strong></li>
                            </ol>
                        </div>
                        <div className="w-full bg-blue-50 border border-blue-200 rounded-lg px-4 py-2 break-all">
                            <p className="text-xs text-blue-500 font-semibold mb-1">O copia el siguiente enlace:</p>
                            <p className="text-xs text-blue-800 font-mono leading-relaxed">{urlActual}</p>
                        </div>
                    </div>
                </div>
            )}

            <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
                <div className="bg-blue-700 h-3 w-full"></div>
                <div className="px-6 py-8 md:px-10 border-b border-gray-100">
                    <h2 className="text-3xl font-bold text-gray-900 mb-2">Registro de Asociados ADDAG</h2>
                    <p className="text-gray-600 text-sm mb-5">Complete sus datos para solicitar su carné oficial.</p>

                    {/* Aviso de revisión y aprobación */}
                    <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg flex gap-3">
                        <ShieldCheck className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                        <div className="text-sm text-blue-800">
                            <p className="font-semibold mb-1">Tu solicitud quedará pendiente de aprobación</p>
                            <p>Al enviar este formulario, tu solicitud será <strong>revisada por el entrenador que selecciones</strong> antes de ser procesada. No todas las solicitudes son aprobadas automáticamente.</p>
                        </div>
                    </div>

                    {/* Requisitos obligatorios */}
                    <div className="p-4 bg-amber-50 border border-amber-300 rounded-lg flex gap-3">
                        <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                        <div className="text-sm text-amber-900">
                            <p className="font-bold mb-2">Requisitos — tu solicitud puede ser rechazada si no los cumples:</p>
                            <ul className="space-y-1.5 list-none">
                                <li className="flex items-start gap-2">
                                    <span className="text-amber-600 font-bold mt-0.5">✕</span>
                                    <span>Estar <strong>plenamente inscrito</strong> en el ciclo actual de la ADDAG.</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-amber-600 font-bold mt-0.5">✕</span>
                                    <span>Tener las <strong>cuotas al día</strong>. No se aprobará solicitudes con pagos pendientes.</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-amber-600 font-bold mt-0.5">✕</span>
                                    <span>La foto debe ser <strong>tipo pasaporte</strong> (rostro enfocado, fondo claro).</span>
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="p-6 md:p-10 space-y-8 bg-gray-50/30">
                    {mensaje.texto && (
                        <div className={`p-4 rounded-lg flex items-center gap-3 border ${mensaje.tipo === 'exito' ? 'bg-green-50 text-green-800 border-green-200' : 'bg-red-50 text-red-800 border-red-200'}`}>
                            {mensaje.tipo === 'exito' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                            <span className="font-medium">{mensaje.texto}</span>
                        </div>
                    )}

                    {/* SECCIÓN 0: ENTRENADOR */}
                    <div className="bg-white p-6 rounded-lg border border-blue-200 shadow-sm space-y-4">
                        <div className="flex items-center gap-2 mb-2">
                            <Users className="w-5 h-5 text-blue-600" />
                            <h3 className="text-lg font-medium text-gray-800">Entrenador Principal <span className="text-red-600">*</span></h3>
                        </div>
                        <p className="text-sm text-gray-500 mb-4">Seleccione al profesor a cargo de su grupo para que revise su solicitud.</p>
                        <select
                            name="entrenador_id"
                            value={formData.entrenador_id}
                            onChange={handleChange}
                            className={`w-full p-3 border rounded-lg outline-none bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 ${errores.entrenador_id ? 'border-red-500' : 'border-gray-300'}`}
                        >
                            <option value="" disabled>-- Seleccione su entrenador --</option>
                            {listaEntrenadores.map(e => (
                                <option key={e.id} value={e.id}>{e.nombre_completo}</option>
                            ))}
                        </select>
                        {errores.entrenador_id && <span className="text-xs text-red-500">{errores.entrenador_id}</span>}
                    </div>

                    {/* SECCIÓN 1: CONTACTO */}
                    <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm space-y-6">
                        <div className="space-y-2">
                            <label className="text-base font-medium text-gray-800">Correo electrónico <span className="text-red-600">*</span></label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                                <input
                                    type="email" name="email" value={formData.email} onChange={handleChange}
                                    className={`w-full pl-10 p-3 bg-white border-b-2 border-x-0 border-t-0 focus:border-blue-600 outline-none placeholder:text-gray-500 text-gray-900 ${errores.email ? 'border-red-500' : 'border-gray-200'}`}
                                    placeholder="tu@correo.com"
                                />
                            </div>
                            {errores.email && <span className="text-xs text-red-500">{errores.email}</span>}
                        </div>
                        <div className="space-y-2">
                            <label className="text-base font-medium text-gray-800">Teléfono <span className="text-red-600">*</span></label>
                            <div className="relative">
                                <Phone className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                                <input
                                    type="tel" name="telefono" value={formData.telefono} onChange={handleChange}
                                    className={`w-full pl-10 p-3 bg-white border-b-2 border-x-0 border-t-0 focus:border-blue-600 outline-none placeholder:text-gray-500 text-gray-900 ${errores.telefono ? 'border-red-500' : 'border-gray-200'}`}
                                    placeholder="0000-0000"
                                />
                            </div>
                            {errores.telefono && <span className="text-xs text-red-500">{errores.telefono}</span>}
                        </div>
                    </div>

                    {/* SECCIÓN 2: DATOS PERSONALES */}
                    <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-base font-medium text-gray-700">Nombres <span className="text-red-600">*</span></label>
                                <input type="text" name="nombres" value={formData.nombres} onChange={handleChange} className={`w-full p-3 bg-white border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none placeholder:text-gray-500 text-gray-900 ${errores.nombres ? 'border-red-500' : 'border-gray-300'}`} placeholder="Nombres" />
                                {errores.nombres && <span className="text-xs text-red-500">{errores.nombres}</span>}
                            </div>
                            <div className="space-y-2">
                                <label className="text-base font-medium text-gray-700">Apellidos <span className="text-red-600">*</span></label>
                                <input type="text" name="apellidos" value={formData.apellidos} onChange={handleChange} className={`w-full p-3 bg-white border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none placeholder:text-gray-500 text-gray-900 ${errores.apellidos ? 'border-red-500' : 'border-gray-300'}`} placeholder="Apellidos" />
                                {errores.apellidos && <span className="text-xs text-red-500">{errores.apellidos}</span>}
                            </div>
                        </div>

                        <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-gray-700">Tipo de Documento</label>
                                <select name="tipo_documento" value={formData.tipo_documento} onChange={handleChange} className="w-full p-3 border border-gray-300 rounded-lg bg-white outline-none text-gray-900">
                                    <option value="DPI">DPI / CUI (Guatemala)</option>
                                    <option value="PASAPORTE">Pasaporte</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-base font-medium text-gray-700">Número de Documento <span className="text-red-600">*</span></label>
                                <input type="text" name="dpi_cui" value={formData.dpi_cui} onChange={handleChange} maxLength={20} className={`w-full p-3 bg-white border rounded-lg outline-none placeholder:text-gray-500 text-gray-900 ${errores.dpi_cui ? 'border-red-500' : 'border-gray-300'}`} placeholder={formData.tipo_documento === 'DPI' ? "13 dígitos numéricos" : "Pasaporte"} />
                                {errores.dpi_cui && <span className="text-xs text-red-500">{errores.dpi_cui}</span>}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-base font-medium text-gray-700">Fecha de Nacimiento <span className="text-red-600">*</span></label>
                                <input type="date" name="fecha_nacimiento" value={formData.fecha_nacimiento} onChange={handleChange} max={new Date().toISOString().split('T')[0]} className={`w-full p-3 bg-white border rounded-lg outline-none text-gray-900 cursor-pointer ${errores.fecha_nacimiento ? 'border-red-500' : 'border-gray-300'}`} />
                                {errores.fecha_nacimiento && <span className="text-xs text-red-500">{errores.fecha_nacimiento}</span>}
                            </div>
                            <div className="space-y-2">
                                <label className="text-base font-medium text-gray-700">Departamento <span className="text-red-600">*</span></label>
                                <select name="departamento" value={formData.departamento} onChange={handleChange} className="w-full p-3 border border-gray-300 rounded-lg bg-white outline-none text-gray-900">
                                    {DEPARTAMENTOS_GUATEMALA.map(depto => <option key={depto} value={depto}>{depto}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* SECCIÓN 3: FOTO */}
                    <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm space-y-6">
                        <label className="text-lg font-medium text-gray-800">Foto para Carné <span className="text-red-600">*</span></label>
                        <div className="mt-4">
                            <div className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center transition-all ${isDragging ? 'border-blue-500 bg-blue-50' : fotoPreview ? 'border-green-400 bg-green-50' : 'border-gray-300 hover:border-blue-400'} ${errores.foto ? 'border-red-500 bg-red-50' : ''}`} onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}>
                                {fotoPreview ? (
                                    <div className="flex flex-col items-center gap-3">
                                        <div className="relative h-40 w-32 shadow-md"><Image src={fotoPreview} alt="Preview" fill className="object-cover rounded-lg" unoptimized /></div>
                                        <button type="button" onClick={() => { setFoto(null); setFotoPreview(null); }} className="text-sm text-red-600 hover:underline">Quitar foto</button>
                                    </div>
                                ) : (
                                    <label className="cursor-pointer flex flex-col items-center gap-3 w-full h-full">
                                        <div className="p-4 rounded-full bg-blue-50"><Camera className="w-8 h-8 text-blue-600" /></div>
                                        <span className="text-blue-600 font-medium text-lg hover:underline">Subir foto tipo pasaporte</span>
                                        <input type="file" accept="image/*" onChange={handleFotoChange} className="hidden" />
                                    </label>
                                )}
                            </div>
                            {errores.foto && <p className="text-xs text-red-500 mt-2">{errores.foto}</p>}
                        </div>
                    </div>

                    {/* CONTENEDOR FINAL CON REFERENCIA PARA SCROLL Y EFECTOS VISUALES */}
                    <div ref={botonSubmitRef} className={`flex flex-col items-center gap-6 pt-4 p-6 rounded-xl transition-all duration-500 ${isFormComplete ? 'bg-blue-50/50 border border-blue-100 shadow-inner' : ''}`}>
                        <Turnstile
                            ref={turnstileRef}
                            siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY}
                            onSuccess={(token) => { setTurnstileToken(token); setErrores(prev => ({ ...prev, captcha: '' })) }}
                            onError={() => setErrores(prev => ({ ...prev, captcha: 'Error' }))}
                            onExpire={() => setTurnstileToken(null)}
                        />
                        {errores.captcha && <span className="text-xs text-red-500 font-bold">{errores.captcha}</span>}

                        <button
                            type="submit"
                            disabled={loading || !isFormComplete}
                            className={`w-full md:w-1/2 py-4 px-6 rounded-xl font-bold text-lg text-white transition-all duration-300 
                                ${loading
                                    ? 'bg-gray-400 cursor-not-allowed'
                                    : isFormComplete
                                        ? 'bg-blue-600 hover:bg-blue-700 shadow-[0_0_20px_rgba(37,99,235,0.4)] hover:shadow-[0_0_25px_rgba(37,99,235,0.6)] transform hover:-translate-y-1 scale-105'
                                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                }`}
                        >
                            {loading ? <span className="flex items-center justify-center gap-3"><Loader2 className="w-5 h-5 animate-spin" /> Enviando...</span> : 'Enviar Solicitud'}
                        </button>

                        {isFormComplete && !loading && (
                            <p className="text-sm text-blue-600 font-medium animate-pulse">
                                ✨ Formulario completo, listo para enviar.
                            </p>
                        )}
                    </div>
                </form>
            </div>
        </div>
    )
}