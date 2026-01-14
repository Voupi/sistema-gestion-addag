'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import Image from 'next/image'
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
    Info
} from 'lucide-react'

// Lista de departamentos de Guatemala
const DEPARTAMENTOS_GUATEMALA = [
    'Guatemala',
    'Alta Verapaz',
    'Baja Verapaz',
    'Chimaltenango',
    'Chiquimula',
    'El Progreso',
    'Escuintla',
    'Huehuetenango',
    'Izabal',
    'Jalapa',
    'Jutiapa',
    'Petén',
    'Quetzaltenango',
    'Quiché',
    'Retalhuleu',
    'Sacatepéquez',
    'San Marcos',
    'Santa Rosa',
    'Sololá',
    'Suchitepéquez',
    'Totonicapán',
    'Zacapa'
]

export default function FormularioSolicitud() {
    // Estados del formulario
    const [formData, setFormData] = useState({
        nombres: '',
        apellidos: '',
        dpi_cui: '',
        fecha_nacimiento: '',
        telefono: '',
        departamento: 'Guatemala'
    })
    const [foto, setFoto] = useState(null)
    const [fotoPreview, setFotoPreview] = useState(null)

    // Estados de UI
    const [loading, setLoading] = useState(false)
    const [mensaje, setMensaje] = useState({ tipo: '', texto: '' })
    const [errores, setErrores] = useState({})

    // Manejador de cambios en inputs
    const handleChange = (e) => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))
        // Limpiar error del campo al escribir
        if (errores[name]) {
            setErrores(prev => ({ ...prev, [name]: '' }))
        }
    }

    // Manejador de cambio de foto
    const handleFotoChange = (e) => {
        const file = e.target.files[0]
        if (file) {
            // Validar que sea una imagen
            if (!file.type.startsWith('image/')) {
                setErrores(prev => ({ ...prev, foto: 'El archivo debe ser una imagen' }))
                return
            }
            // Validar tamaño (máximo 5MB)
            if (file.size > 5 * 1024 * 1024) {
                setErrores(prev => ({ ...prev, foto: 'La imagen no debe superar los 5MB' }))
                return
            }
            setFoto(file)
            setFotoPreview(URL.createObjectURL(file))
            setErrores(prev => ({ ...prev, foto: '' }))
        }
    }

    // Validar DPI (13 dígitos numéricos)
    const validarDPI = (dpi) => {
        const regex = /^\d{13}$/
        return regex.test(dpi)
    }

    // Calcular edad y determinar rol
    const calcularRol = (fechaNacimiento) => {
        const hoy = new Date()
        const nacimiento = new Date(fechaNacimiento)
        let edad = hoy.getFullYear() - nacimiento.getFullYear()
        const mes = hoy.getMonth() - nacimiento.getMonth()

        if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) {
            edad--
        }

        return edad < 18 ? 'ATLETA' : 'DEPORTISTA'
    }

    // Validar formulario completo
    const validarFormulario = () => {
        const nuevosErrores = {}

        if (!formData.nombres.trim()) {
            nuevosErrores.nombres = 'Los nombres son requeridos'
        }
        if (!formData.apellidos.trim()) {
            nuevosErrores.apellidos = 'Los apellidos son requeridos'
        }
        if (!formData.dpi_cui.trim()) {
            nuevosErrores.dpi_cui = 'El DPI/CUI es requerido'
        } else if (!validarDPI(formData.dpi_cui)) {
            nuevosErrores.dpi_cui = 'El DPI/CUI debe tener exactamente 13 dígitos numéricos'
        }
        if (!formData.fecha_nacimiento) {
            nuevosErrores.fecha_nacimiento = 'La fecha de nacimiento es requerida'
        }
        if (!foto) {
            nuevosErrores.foto = 'La foto es requerida'
        }

        setErrores(nuevosErrores)
        return Object.keys(nuevosErrores).length === 0
    }

    // Enviar formulario
    const handleSubmit = async (e) => {
        e.preventDefault()

        // Limpiar mensaje anterior
        setMensaje({ tipo: '', texto: '' })

        // Validar
        if (!validarFormulario()) {
            return
        }

        setLoading(true)

        try {
            // 1. Subir imagen al Storage
            const timestamp = Date.now()
            const nombreArchivo = `${formData.dpi_cui}-${timestamp}`
            const extension = foto.name.split('.').pop()
            const rutaArchivo = `${nombreArchivo}.${extension}`

            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('fotos-carnet')
                .upload(rutaArchivo, foto, {
                    cacheControl: '3600',
                    upsert: false
                })

            if (uploadError) {
                throw new Error(`Error al subir la imagen: ${uploadError.message}`)
            }

            // 2. Obtener URL pública de la imagen
            const { data: urlData } = supabase.storage
                .from('fotos-carnet')
                .getPublicUrl(rutaArchivo)

            const fotoUrl = urlData.publicUrl

            // 3. Calcular el rol basado en la edad
            const rol = calcularRol(formData.fecha_nacimiento)

            // 4. Insertar en la tabla miembros
            const { data: insertData, error: insertError } = await supabase
                .from('miembros')
                .insert([
                    {
                        nombres: formData.nombres.trim(),
                        apellidos: formData.apellidos.trim(),
                        dpi_cui: formData.dpi_cui,
                        fecha_nacimiento: formData.fecha_nacimiento,
                        telefono: formData.telefono.trim() || null,
                        departamento: formData.departamento,
                        foto_url: fotoUrl,
                        rol: rol
                        // estado se establece automáticamente como 'PENDIENTE' en la BD
                    }
                ])
                .select()

            if (insertError) {
                // Si hay error de DPI duplicado
                if (insertError.code === '23505') {
                    throw new Error('Este DPI/CUI ya está registrado en el sistema')
                }
                throw new Error(`Error al guardar la solicitud: ${insertError.message}`)
            }

            // 5. Éxito - limpiar formulario
            setFormData({
                nombres: '',
                apellidos: '',
                dpi_cui: '',
                fecha_nacimiento: '',
                telefono: '',
                departamento: 'Guatemala'
            })
            setFoto(null)
            setFotoPreview(null)

            setMensaje({
                tipo: 'exito',
                texto: '¡Solicitud enviada exitosamente! Tu carné será procesado pronto por nuestro equipo administrativo.'
            })

        } catch (error) {
            console.error('Error:', error)
            setMensaje({
                tipo: 'error',
                texto: error.message || 'Ocurrió un error al procesar tu solicitud'
            })
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="w-full max-w-4xl mx-auto p-4">
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-600 to-blue-800 px-6 py-8 text-center">
                    <h2 className="text-2xl md:text-3xl font-bold text-white">
                        Solicitud de Carné ADDAG
                    </h2>
                    <p className="text-blue-100 mt-2">
                        Asociación Departamental de Ajedrez de Guatemala
                    </p>
                </div>

                {/* Instrucciones importantes */}
                <div className="bg-blue-50 border-l-4 border-blue-600 px-6 py-6 space-y-4">
                    <div className="flex items-start gap-3">
                        <Info className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
                        <div className="space-y-3 text-sm text-gray-700">
                            <p className="font-semibold text-blue-900 text-base">
                                El Carné es únicamente para uso de parqueo de 4 horas sin costo.
                            </p>
                            <p className="font-medium text-gray-800">Para solicitar recuerde:</p>
                            <ul className="list-disc list-inside space-y-2 ml-2">
                                <li>
                                    Estar inscrito del año actual, lo que significa haber llenado el formulario de inscripción de nuestra página web{' '}
                                    <a
                                        href="https://www.ajedrezguate.org/formulario-de-inscripcion/"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-blue-600 hover:text-blue-800 underline font-medium"
                                    >
                                        ajedrezguate.org
                                    </a>
                                </li>
                                <li>
                                    <strong>La foto subida debe ser tipo pasaporte</strong> (Donde enfoque el rostro del atleta)
                                </li>
                                <li>
                                    Recuerde escribir bien los datos, ya que esos mismos serán impresos en su carnet
                                </li>
                                <li>
                                    <strong>Para menores de edad:</strong> El Documento de Identificación se encuentra en la parte de{' '}
                                    <span className="font-semibold">&quot;Documento de Identificación&quot;</span> en el Certificado de Nacimiento
                                </li>
                                <li>
                                    <strong>Para mayores de edad:</strong> Ingrese el número de DPI (13 dígitos)
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>

                {/* Formulario */}
                <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-6">
                    {/* Mensaje de éxito/error */}
                    {mensaje.texto && (
                        <div
                            className={`flex items-center gap-3 p-4 rounded-lg ${mensaje.tipo === 'exito'
                                    ? 'bg-green-50 text-green-800 border border-green-200'
                                    : 'bg-red-50 text-red-800 border border-red-200'
                                }`}
                        >
                            {mensaje.tipo === 'exito' ? (
                                <CheckCircle className="w-5 h-5 flex-shrink-0" />
                            ) : (
                                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                            )}
                            <p className="text-sm">{mensaje.texto}</p>
                        </div>
                    )}

                    {/* Grid de campos */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Nombres */}
                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">
                                Nombres *
                            </label>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input
                                    type="text"
                                    name="nombres"
                                    value={formData.nombres}
                                    onChange={handleChange}
                                    placeholder="Ingresa tus nombres"
                                    className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${errores.nombres ? 'border-red-500' : 'border-gray-300'
                                        }`}
                                />
                            </div>
                            {errores.nombres && (
                                <p className="text-red-500 text-xs">{errores.nombres}</p>
                            )}
                        </div>

                        {/* Apellidos */}
                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">
                                Apellidos *
                            </label>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input
                                    type="text"
                                    name="apellidos"
                                    value={formData.apellidos}
                                    onChange={handleChange}
                                    placeholder="Ingresa tus apellidos"
                                    className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${errores.apellidos ? 'border-red-500' : 'border-gray-300'
                                        }`}
                                />
                            </div>
                            {errores.apellidos && (
                                <p className="text-red-500 text-xs">{errores.apellidos}</p>
                            )}
                        </div>

                        {/* DPI/CUI */}
                        <div className="space-y-2 md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700">
                                Documento de Identificación (DPI/CUI) *
                            </label>
                            <div className="relative">
                                <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input
                                    type="text"
                                    name="dpi_cui"
                                    value={formData.dpi_cui}
                                    onChange={handleChange}
                                    placeholder="13 dígitos numéricos"
                                    maxLength={13}
                                    className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${errores.dpi_cui ? 'border-red-500' : 'border-gray-300'
                                        }`}
                                />
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                                Menores: Ver certificado de nacimiento • Mayores de edad: Número de DPI
                            </p>
                            {errores.dpi_cui && (
                                <p className="text-red-500 text-xs">{errores.dpi_cui}</p>
                            )}
                        </div>

                        {/* Fecha de Nacimiento */}
                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">
                                Fecha de Nacimiento *
                            </label>
                            <div className="relative">
                                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input
                                    type="date"
                                    name="fecha_nacimiento"
                                    value={formData.fecha_nacimiento}
                                    onChange={handleChange}
                                    max={new Date().toISOString().split('T')[0]}
                                    className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${errores.fecha_nacimiento ? 'border-red-500' : 'border-gray-300'
                                        }`}
                                />
                            </div>
                            {errores.fecha_nacimiento && (
                                <p className="text-red-500 text-xs">{errores.fecha_nacimiento}</p>
                            )}
                        </div>

                        {/* Teléfono */}
                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">
                                Teléfono
                            </label>
                            <div className="relative">
                                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input
                                    type="tel"
                                    name="telefono"
                                    value={formData.telefono}
                                    onChange={handleChange}
                                    placeholder="Ej: 5555-5555"
                                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                />
                            </div>
                        </div>

                        {/* Departamento */}
                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">
                                Departamento
                            </label>
                            <div className="relative">
                                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <select
                                    name="departamento"
                                    value={formData.departamento}
                                    onChange={handleChange}
                                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all appearance-none bg-white"
                                >
                                    {DEPARTAMENTOS_GUATEMALA.map((depto) => (
                                        <option key={depto} value={depto}>
                                            {depto}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Foto - Campo completo con guía visual */}
                    <div className="space-y-4">
                        <label className="block text-sm font-medium text-gray-700">
                            Foto para su Carnet (Tipo Pasaporte) *
                        </label>

                        {/* Guía visual de fotos */}
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                            <p className="text-sm font-semibold text-yellow-900 mb-3">
                                📸 Requisitos de la fotografía:
                            </p>
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                {/* Imagen de ejemplo de fotos correctas e incorrectas */}
                                <div className="bg-white rounded-lg p-3 border border-gray-200">
                                    <p className="text-xs text-gray-600 font-medium mb-2 text-center">
                                        Ejemplos de fotos correctas e incorrectas:
                                    </p>
                                    <Image
                                        src="/guias/ejemplo de foto carné correcto y incorrecto.png"
                                        alt="Ejemplos de fotos para carné correctas e incorrectas"
                                        width={400}
                                        height={300}
                                        className="rounded-lg w-full h-auto"
                                        priority
                                    />
                                </div>

                                {/* Texto de instrucciones */}
                                <div className="space-y-2 text-sm text-gray-700 flex flex-col justify-center">
                                    <p className="flex items-start gap-2">
                                        <span className="text-red-500 font-bold">✗</span>
                                        <span>No usar foto de cuerpo completo</span>
                                    </p>
                                    <p className="flex items-start gap-2">
                                        <span className="text-red-500 font-bold">✗</span>
                                        <span>No usar fondos oscuros o con sombras</span>
                                    </p>
                                    <p className="flex items-start gap-2">
                                        <span className="text-green-500 font-bold">✓</span>
                                        <span><strong>Enfoque el rostro completo</strong></span>
                                    </p>
                                    <p className="flex items-start gap-2">
                                        <span className="text-green-500 font-bold">✓</span>
                                        <span><strong>Fondo claro y uniforme</strong></span>
                                    </p>
                                    <p className="flex items-start gap-2">
                                        <span className="text-green-500 font-bold">✓</span>
                                        <span><strong>Mirada al frente</strong></span>
                                    </p>
                                </div>
                            </div>

                            {/* Referencia al certificado de nacimiento con imagen */}
                            <div className="mt-4 pt-4 border-t border-yellow-300">
                                <p className="text-xs text-gray-600 font-medium mb-3">
                                    📄 Para menores de edad - Dónde encontrar el Documento de Identificación:
                                </p>
                                <div className="bg-white rounded-lg p-3 border border-gray-200">
                                    <Image
                                        src="/guias/ejemplo ubicación de código único de identificación.png"
                                        alt="Ubicación del Documento de Identificación en el Certificado de Nacimiento"
                                        width={600}
                                        height={400}
                                        className="rounded-lg w-full h-auto"
                                    />
                                    <p className="text-xs text-gray-600 mt-2 text-center">
                                        Busque el campo <span className="font-bold">&quot;Documento de Identificación&quot;</span> en el Certificado de Nacimiento emitido por RENAP
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Input de foto */}
                        <div
                            className={`border-2 border-dashed rounded-lg p-6 text-center transition-all ${errores.foto
                                    ? 'border-red-400 bg-red-50'
                                    : fotoPreview
                                        ? 'border-green-400 bg-green-50'
                                        : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50'
                                }`}
                        >
                            {fotoPreview ? (
                                <div className="flex flex-col items-center gap-4">
                                    <img
                                        src={fotoPreview}
                                        alt="Vista previa"
                                        className="w-40 h-52 object-cover rounded-lg shadow-lg border-4 border-white"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setFoto(null)
                                            setFotoPreview(null)
                                        }}
                                        className="text-sm text-red-600 hover:text-red-800 font-medium"
                                    >
                                        Eliminar foto
                                    </button>
                                </div>
                            ) : (
                                <label className="cursor-pointer flex flex-col items-center gap-2">
                                    <Camera className="w-12 h-12 text-gray-400" />
                                    <span className="text-gray-600 font-medium">
                                        Haz clic para subir tu foto tipo pasaporte
                                    </span>
                                    <span className="text-gray-400 text-sm">
                                        PNG, JPG o JPEG (máx. 5MB)
                                    </span>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleFotoChange}
                                        className="hidden"
                                    />
                                </label>
                            )}
                        </div>
                        {errores.foto && (
                            <p className="text-red-500 text-xs">{errores.foto}</p>
                        )}
                    </div>

                    {/* Botón de envío */}
                    <button
                        type="submit"
                        disabled={loading}
                        className={`w-full py-4 px-6 rounded-lg font-semibold text-white transition-all ${loading
                                ? 'bg-gray-400 cursor-not-allowed'
                                : 'bg-blue-600 hover:bg-blue-700 active:scale-[0.98]'
                            }`}
                    >
                        {loading ? (
                            <span className="flex items-center justify-center gap-2">
                                <Loader2 className="w-5 h-5 animate-spin" />
                                Enviando solicitud...
                            </span>
                        ) : (
                            'Enviar Solicitud'
                        )}
                    </button>
                </form>
            </div>
        </div>
    )
}
