'use client'

import { useState, useRef } from 'react'
import { supabase } from '@/lib/supabaseClient'
import Image from 'next/image'
import { Turnstile } from '@marsidev/react-turnstile'
import {
    User,
    CreditCard,
    Calendar,
    Phone,
    MapPin,
    Camera,
    Loader2,
    CheckCircle,
    AlertCircle,
    ShieldCheck,
    Globe,
    Mail,
    UploadCloud,
    X
} from 'lucide-react'
import { enviarCorreoConfirmacion } from '@/actions/enviarCorreo'

// Lista de departamentos de Guatemala
const DEPARTAMENTOS_GUATEMALA = [
    'Guatemala', 'Alta Verapaz', 'Baja Verapaz', 'Chimaltenango', 'Chiquimula',
    'El Progreso', 'Escuintla', 'Huehuetenango', 'Izabal', 'Jalapa', 'Jutiapa',
    'Petén', 'Quetzaltenango', 'Quiché', 'Retalhuleu', 'Sacatepéquez',
    'San Marcos', 'Santa Rosa', 'Sololá', 'Suchitepéquez', 'Totonicapán', 'Zacapa'
]

export default function FormularioSolicitud() {
    const turnstileRef = useRef()
    // Estados del formulario
    const [formData, setFormData] = useState({
        email: '',
        nombres: '',
        apellidos: '',
        tipo_documento: 'DPI',
        dpi_cui: '',
        fecha_nacimiento: '',
        telefono: '',
        departamento: 'Guatemala'
    })

    const [foto, setFoto] = useState(null)
    const [fotoPreview, setFotoPreview] = useState(null)
    const [turnstileToken, setTurnstileToken] = useState(null)
    const [isDragging, setIsDragging] = useState(false)

    // Estados de UI
    const [loading, setLoading] = useState(false)
    const [mensajeError, setMensajeError] = useState('') // Solo para errores
    const [showModalExito, setShowModalExito] = useState(false) // Nuevo estado para el Modal
    const [errores, setErrores] = useState({})

    // Lógica de Validación
    const validarDPI = (dpi) => /^\d{13}$/.test(dpi)
    const validarPasaporte = (pasaporte) => /^[A-Za-z0-9]{3,20}$/.test(pasaporte)
    const validarEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)

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

        if (errores[name]) {
            setErrores(prev => ({ ...prev, [name]: '' }))
        }
    }

    const procesarFichero = (file) => {
        if (!file.type.startsWith('image/')) {
            setErrores(prev => ({ ...prev, foto: 'El archivo debe ser una imagen válida (JPG, PNG)' }))
            return
        }
        if (file.size > 5 * 1024 * 1024) {
            setErrores(prev => ({ ...prev, foto: 'La imagen no debe superar los 5MB' }))
            return
        }
        setFoto(file)
        setFotoPreview(URL.createObjectURL(file))
        setErrores(prev => ({ ...prev, foto: '' }))
    }

    const handleFotoChange = (e) => {
        const file = e.target.files[0]
        if (file) procesarFichero(file)
    }

    const handleDragOver = (e) => { e.preventDefault(); setIsDragging(true); }
    const handleDragLeave = (e) => { e.preventDefault(); setIsDragging(false); }
    const handleDrop = (e) => {
        e.preventDefault(); setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) procesarFichero(e.dataTransfer.files[0]);
    }

    const validarFormulario = () => {
        const nuevosErrores = {}

        if (!formData.email.trim()) {
            nuevosErrores.email = 'El correo electrónico es requerido'
        } else if (!validarEmail(formData.email)) {
            nuevosErrores.email = 'Ingrese un correo electrónico válido'
        }

        if (!formData.nombres.trim()) nuevosErrores.nombres = 'Los nombres son requeridos'
        if (!formData.apellidos.trim()) nuevosErrores.apellidos = 'Los apellidos son requeridos'

        if (!formData.dpi_cui.trim()) {
            nuevosErrores.dpi_cui = 'El número de documento es requerido'
        } else {
            if (formData.tipo_documento === 'DPI' && !validarDPI(formData.dpi_cui)) {
                nuevosErrores.dpi_cui = 'El DPI debe tener 13 dígitos numéricos'
            }
            if (formData.tipo_documento === 'PASAPORTE' && !validarPasaporte(formData.dpi_cui)) {
                nuevosErrores.dpi_cui = 'Formato de pasaporte inválido (3-20 caracteres)'
            }
        }

        if (!formData.fecha_nacimiento) nuevosErrores.fecha_nacimiento = 'La fecha de nacimiento es requerida'
        if (!formData.telefono.trim()) nuevosErrores.telefono = 'El teléfono es requerido'
        if (!foto) nuevosErrores.foto = 'La fotografía es requerida'
        if (!turnstileToken) nuevosErrores.captcha = 'Complete la verificación de seguridad'

        setErrores(nuevosErrores)
        return Object.keys(nuevosErrores).length === 0
    }

    const cerrarModalExito = () => {
        setShowModalExito(false)
        window.scrollTo({ top: 0, behavior: 'smooth' })
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setMensajeError('')

        if (!validarFormulario()) {
            setMensajeError('Por favor completa todos los campos obligatorios marcados en rojo.')
            window.scrollTo({ top: 0, behavior: 'smooth' })
            return
        }

        setLoading(true)

        try {
            const timestamp = Date.now()
            const safeFileName = formData.dpi_cui.replace(/[^a-z0-9]/gi, '_').toLowerCase();
            const extension = foto.name.split('.').pop()
            const rutaArchivo = `${safeFileName}-${timestamp}.${extension}`

            const { error: uploadError } = await supabase.storage
                .from('fotos-carnet')
                .upload(rutaArchivo, foto, { cacheControl: '3600', upsert: false })

            if (uploadError) throw new Error(`Error al subir imagen: ${uploadError.message}`)

            const { data: urlData } = supabase.storage
                .from('fotos-carnet')
                .getPublicUrl(rutaArchivo)

            const rol = 'ATLETA'

            const { error: insertError } = await supabase
                .from('miembros')
                .insert([{
                    email: formData.email.trim(),
                    nombres: formData.nombres.trim(),
                    apellidos: formData.apellidos.trim(),
                    tipo_documento: formData.tipo_documento,
                    dpi_cui: formData.dpi_cui.trim(),
                    fecha_nacimiento: formData.fecha_nacimiento,
                    telefono: formData.telefono.trim(),
                    departamento: formData.departamento,
                    foto_url: urlData.publicUrl,
                    rol: rol
                }])

            if (insertError) {
                if (insertError.code === '23505') throw new Error('Este Documento ya está registrado.')
                throw new Error(insertError.message)
            }
            // --- BLOQUE DE DEBUG TEMPORAL ---
            try {
                console.log("Intentando enviar correo...") // Log en navegador
                const resultadoCorreo = await enviarCorreoConfirmacion({
                    emailDestino: formData.email,
                    nombre: `${formData.nombres} ${formData.apellidos}`,
                    dpi: formData.dpi_cui,
                    telefono: formData.telefono
                })

                if (!resultadoCorreo.success) {
                    alert("ERROR DE CORREO: " + resultadoCorreo.error) // Alerta visible
                    console.error("Error detallado:", resultadoCorreo.error)
                } else {
                    console.log("Correo enviado con ID:", resultadoCorreo.id)
                }

            } catch (mailError) {
                alert("ERROR CRÍTICO CORREO: " + mailError.message)
            }
            // ------------------------------------

            // ÉXITO: Limpiar y mostrar Modal
            setFormData({
                email: '', nombres: '', apellidos: '', tipo_documento: 'DPI',
                dpi_cui: '', fecha_nacimiento: '', telefono: '', departamento: 'Guatemala'
            })
            setFoto(null)
            setFotoPreview(null)
            setTurnstileToken(null)
            if (turnstileRef.current) turnstileRef.current.reset()

            setShowModalExito(true) // <--- Abrir modal aquí

        } catch (error) {
            console.error(error)
            setMensajeError(error.message || 'Ocurrió un error inesperado')
            window.scrollTo({ top: 0, behavior: 'smooth' })
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="w-full max-w-4xl mx-auto p-4 animate-in fade-in duration-500 font-sans relative">

            {/* MODAL DE ÉXITO */}
            {showModalExito && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center relative animate-in zoom-in-95 duration-300">
                        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                            <CheckCircle className="w-10 h-10 text-green-600" />
                        </div>
                        <h3 className="text-2xl font-bold text-gray-900 mb-2">¡Solicitud Enviada!</h3>
                        <p className="text-gray-600 mb-8">
                            Hemos recibido tus datos correctamente. Te enviaremos una notificación a tu correo cuando tu carné esté listo.
                        </p>
                        <button
                            onClick={cerrarModalExito}
                            className="w-full py-3 px-6 bg-blue-700 hover:bg-blue-800 text-white font-bold rounded-lg transition-colors shadow-lg"
                        >
                            Aceptar y Volver
                        </button>
                    </div>
                </div>
            )}

            <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
                {/* Header Estilo Google Forms */}
                <div className="bg-blue-700 h-3 w-full"></div>
                <div className="px-6 py-8 md:px-10 border-b border-gray-100">
                    <h2 className="text-3xl font-normal text-gray-900 mb-2">Solicitud Carné ADDAG</h2>
                    <p className="text-gray-600 text-sm mb-4">
                        El Carné es únicamente para uso de parqueo de 4 horas sin costo.
                    </p>

                    <div className="text-sm text-gray-600 space-y-2 border-t border-gray-100 pt-4">
                        <p className="font-medium text-red-600">* Indica que la pregunta es obligatoria</p>
                        <ul className="list-disc list-inside ml-2 space-y-1">
                            <li>Estar inscrito en el año en curso.</li>
                            <li>La foto debe ser tipo pasaporte (rostro enfocado).</li>
                        </ul>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="p-6 md:p-10 space-y-8 bg-gray-50/30">
                    {/* Solo mostramos errores aquí, el éxito va en el modal */}
                    {mensajeError && (
                        <div className="p-4 rounded-lg flex items-center gap-3 border bg-red-50 text-red-800 border-red-200 animate-pulse">
                            <AlertCircle className="w-5 h-5 flex-shrink-0" />
                            <span className="font-medium">{mensajeError}</span>
                        </div>
                    )}

                    {/* SECCIÓN 1: CONTACTO */}
                    <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm space-y-6">
                        <div className="space-y-2">
                            <label className="text-base font-medium text-gray-800">Correo electrónico <span className="text-red-600">*</span></label>
                            <div className="relative group">
                                <Mail className="absolute left-3 top-3 w-5 h-5 text-gray-400 group-focus-within:text-blue-600" />
                                <input
                                    type="email" name="email" value={formData.email} onChange={handleChange}
                                    className={`w-full pl-10 p-3 bg-white border-b-2 border-x-0 border-t-0 border-gray-200 focus:border-blue-600 focus:ring-0 outline-none transition-colors placeholder:text-gray-300 text-gray-900 ${errores.email ? 'border-red-500' : ''}`}
                                    placeholder="tu@correo.com"
                                />
                            </div>
                            {errores.email && <span className="text-xs text-red-500 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {errores.email}</span>}
                        </div>

                        <div className="space-y-2">
                            <label className="text-base font-medium text-gray-800">Número de Contacto <span className="text-red-600">*</span></label>
                            <div className="relative group">
                                <Phone className="absolute left-3 top-3 w-5 h-5 text-gray-400 group-focus-within:text-blue-600" />
                                <input
                                    type="tel" name="telefono" value={formData.telefono} onChange={handleChange}
                                    placeholder="0000-0000"
                                    className={`w-full pl-10 p-3 bg-white border-b-2 border-x-0 border-t-0 border-gray-200 focus:border-blue-600 focus:ring-0 outline-none transition-colors placeholder:text-gray-300 text-gray-900 ${errores.telefono ? 'border-red-500' : ''}`}
                                />
                            </div>
                            {errores.telefono && <span className="text-xs text-red-500 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {errores.telefono}</span>}
                        </div>
                    </div>

                    {/* SECCIÓN 2: DATOS DEL ATLETA */}
                    <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm space-y-6">
                        <h3 className="text-lg font-medium text-gray-800 border-b pb-2">Datos del Solicitante</h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-base font-medium text-gray-700">Nombres <span className="text-red-600">*</span></label>
                                <div className="relative">
                                    <User className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                                    <input
                                        type="text" name="nombres" value={formData.nombres} onChange={handleChange}
                                        className={`w-full pl-10 p-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all placeholder:text-gray-300 text-gray-900 ${errores.nombres ? 'border-red-500' : ''}`}
                                        placeholder="Ej: Juan Pablo"
                                    />
                                </div>
                                {errores.nombres && <span className="text-xs text-red-500">{errores.nombres}</span>}
                            </div>

                            <div className="space-y-2">
                                <label className="text-base font-medium text-gray-700">Apellidos <span className="text-red-600">*</span></label>
                                <div className="relative">
                                    <User className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                                    <input
                                        type="text" name="apellidos" value={formData.apellidos} onChange={handleChange}
                                        className={`w-full pl-10 p-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all placeholder:text-gray-300 text-gray-900 ${errores.apellidos ? 'border-red-500' : ''}`}
                                        placeholder="Ej: Pérez López"
                                    />
                                </div>
                                {errores.apellidos && <span className="text-xs text-red-500">{errores.apellidos}</span>}
                            </div>
                        </div>

                        {/* IDENTIFICACIÓN */}
                        <div className="p-4 bg-blue-50/50 rounded-lg border border-blue-100 space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-gray-700">Tipo de Documento</label>
                                <div className="relative">
                                    <Globe className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                                    <select
                                        name="tipo_documento" value={formData.tipo_documento} onChange={handleChange}
                                        className="w-full pl-10 p-3 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 outline-none text-gray-900"
                                    >
                                        <option value="DPI">DPI / CUI (Guatemala)</option>
                                        <option value="PASAPORTE">Pasaporte (Extranjero)</option>
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-base font-medium text-gray-700">
                                    {formData.tipo_documento === 'DPI' ? 'Número de CUI (13 dígitos)' : 'Número de Pasaporte'} <span className="text-red-600">*</span>
                                </label>
                                <div className="relative">
                                    <CreditCard className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                                    <input
                                        type="text" name="dpi_cui" value={formData.dpi_cui} onChange={handleChange}
                                        maxLength={formData.tipo_documento === 'DPI' ? 13 : 20}
                                        className={`w-full pl-10 p-3 bg-white border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder:text-gray-300 text-gray-900 ${errores.dpi_cui ? 'border-red-500' : 'border-gray-300'}`}
                                        placeholder={formData.tipo_documento === 'DPI' ? '0000 00000 0000' : 'A0000000'}
                                    />
                                </div>
                                {errores.dpi_cui && <span className="text-xs text-red-500">{errores.dpi_cui}</span>}
                                {formData.tipo_documento === 'DPI' && (
                                    <div className="bg-white p-3 rounded border border-gray-200 mt-2">
                                        <p className="text-xs text-gray-600 mb-2 font-medium">¿Dónde encuentro mi CUI?</p>
                                        <div className="relative w-full h-32 md:h-48 rounded overflow-hidden border">
                                            <Image
                                                src="/guias/ejemplo ubicación de código único de identificación.png"
                                                alt="Ejemplo CUI RENAP"
                                                fill
                                                className="object-contain"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Fecha Nacimiento LIMPIA */}
                            <div className="space-y-2">
                                <label className="text-base font-medium text-gray-700">Fecha de Nacimiento <span className="text-red-600">*</span></label>
                                <input
                                    type="date"
                                    name="fecha_nacimiento"
                                    value={formData.fecha_nacimiento}
                                    onChange={handleChange}
                                    max={new Date().toISOString().split('T')[0]}
                                    // Quitamos padding-left excesivo (pl-10) porque ya no hay icono a la izquierda
                                    className={`w-full p-3 bg-white border rounded-lg outline-none text-gray-900 cursor-pointer ${errores.fecha_nacimiento ? 'border-red-500' : 'border-gray-300'}`}
                                />
                                {errores.fecha_nacimiento && <span className="text-xs text-red-500">{errores.fecha_nacimiento}</span>}
                            </div>

                            <div className="space-y-2">
                                <label className="text-base font-medium text-gray-700">Departamento <span className="text-red-600">*</span></label>
                                <div className="relative">
                                    <MapPin className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                                    <select
                                        name="departamento" value={formData.departamento} onChange={handleChange}
                                        className="w-full pl-10 p-3 border border-gray-300 rounded-lg bg-white outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                                    >
                                        {DEPARTAMENTOS_GUATEMALA.map(depto => (
                                            <option key={depto} value={depto}>{depto}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* SECCIÓN 3: FOTOGRAFÍA (CON DRAG & DROP) */}
                    <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm space-y-6">
                        <label className="text-lg font-medium text-gray-800">
                            Foto para su Carnet <span className="text-red-600">*</span>
                        </label>

                        <div className="space-y-4">
                            <p className="text-sm text-gray-600">
                                Recuerde tomar foto solo del rostro para que salga bien su carnet.
                            </p>

                            <div className="flex flex-col items-center justify-center bg-gray-50 p-4 rounded-lg border border-gray-200">
                                <div className="relative w-full max-w-md h-48 md:h-64">
                                    <Image
                                        src="/guias/ejemplo de foto carné correcto y incorrecto.png"
                                        alt="Ejemplo Foto Correcta"
                                        fill
                                        className="object-contain"
                                    />
                                </div>
                                <p className="text-xs text-gray-500 mt-2 text-center italic">
                                    Ejemplo de encuadre correcto
                                </p>
                            </div>

                            <div className="mt-4">
                                <label className="text-base font-medium text-gray-700 mb-2 block">Adjuntar archivo</label>

                                <div
                                    className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center transition-all duration-300
                                        ${isDragging
                                            ? 'border-blue-500 bg-blue-50 scale-[1.02] shadow-lg'
                                            : fotoPreview
                                                ? 'border-green-400 bg-green-50'
                                                : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50'
                                        }
                                        ${errores.foto ? 'border-red-500 bg-red-50' : ''}
                                    `}
                                    onDragOver={handleDragOver}
                                    onDragLeave={handleDragLeave}
                                    onDrop={handleDrop}
                                >
                                    {fotoPreview ? (
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="relative h-40 w-32 shadow-md">
                                                <Image
                                                    src={fotoPreview}
                                                    alt="Vista previa"
                                                    fill
                                                    className="object-cover rounded-lg"
                                                    unoptimized
                                                />
                                            </div>
                                            <p className="text-sm text-green-700 font-medium flex items-center gap-1">
                                                <CheckCircle className="w-4 h-4" /> Foto cargada
                                            </p>
                                            <button
                                                type="button"
                                                onClick={() => { setFoto(null); setFotoPreview(null); }}
                                                className="text-sm text-red-600 hover:underline"
                                            >
                                                Cambiar fotografía
                                            </button>
                                        </div>
                                    ) : (
                                        <label className="cursor-pointer flex flex-col items-center gap-3 w-full h-full">
                                            <div className={`p-4 rounded-full transition-colors ${isDragging ? 'bg-blue-200' : 'bg-blue-100'}`}>
                                                {isDragging ? (
                                                    <UploadCloud className="w-10 h-10 text-blue-700 animate-bounce" />
                                                ) : (
                                                    <Camera className="w-8 h-8 text-blue-600" />
                                                )}
                                            </div>
                                            <div className="text-center">
                                                <span className="text-blue-600 font-medium text-lg hover:underline">
                                                    {isDragging ? '¡Suelta la imagen aquí!' : 'Clic para subir o arrastra aquí'}
                                                </span>
                                                <p className="text-sm text-gray-500 mt-1">Formatos: JPG, PNG (Máx 5MB)</p>
                                            </div>
                                            <input type="file" accept="image/*" onChange={handleFotoChange} className="hidden" />
                                        </label>
                                    )}
                                </div>
                                {errores.foto && <p className="text-xs text-red-500 font-medium mt-2">{errores.foto}</p>}
                            </div>
                        </div>
                    </div>

                    {/* CAPTCHA Y BOTÓN */}
                    <div className="flex flex-col items-center gap-6 pt-4">
                        <Turnstile
                            ref={turnstileRef}
                            siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY}
                            onSuccess={(token) => {
                                setTurnstileToken(token)
                                setErrores(prev => ({ ...prev, captcha: '' }))
                            }}
                            onError={() => setErrores(prev => ({ ...prev, captcha: 'Error de verificación' }))}
                            onExpire={() => setTurnstileToken(null)}
                        />
                        {errores.captcha && <span className="text-xs text-red-500 font-bold">{errores.captcha}</span>}

                        <button
                            type="submit"
                            disabled={loading || !turnstileToken}
                            className={`w-full md:w-1/2 py-3 px-6 rounded-lg font-bold text-lg shadow-sm transition-all
                                ${loading || !turnstileToken
                                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                    : 'bg-blue-700 text-white hover:bg-blue-800 hover:shadow-md'
                                }
                            `}
                        >
                            {loading ? (
                                <span className="flex items-center justify-center gap-3">
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Enviando...
                                </span>
                            ) : (
                                'Enviar Solicitud'
                            )}
                        </button>
                    </div>
                </form>
            </div>

            <div className="text-center mt-8 text-xs text-gray-500">
                Sistema de Gestión ADDAG &copy; {new Date().getFullYear()}
            </div>
        </div>
    )
}