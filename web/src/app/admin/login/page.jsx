'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { Lock, Mail, Loader2, ShieldAlert } from 'lucide-react'

export default function AdminLogin() {
    const router = useRouter()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)

    // Verificar si ya hay sesión al cargar
    useEffect(() => {
        const checkSession = async () => {
            const { data: { session } } = await supabase.auth.getSession()
            if (session) {
                router.replace('/admin/dashboard')
            }
        }
        checkSession()
    }, [router])

    const handleLogin = async (e) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            })

            if (error) throw error

            // Login exitoso
            router.replace('/admin/dashboard')

        } catch (error) {
            console.error('Error de login:', error.message)
            setError('Credenciales inválidas o error de conexión.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4 font-sans">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
                {/* Header */}
                <div className="bg-blue-900 px-8 py-10 text-center relative">
                    <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-400 to-blue-600"></div>
                    <div className="w-16 h-16 bg-blue-800 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-blue-700 shadow-lg">
                        <Lock className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-2xl font-bold text-white tracking-wide">Acceso Administrativo</h1>
                    <p className="text-blue-200 text-sm mt-2">Sistema de Gestión ADDAG</p>
                </div>

                {/* Formulario */}
                <form onSubmit={handleLogin} className="p-8 space-y-6">
                    {error && (
                        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                            <ShieldAlert className="w-5 h-5 text-red-600 flex-shrink-0" />
                            <p className="text-sm text-red-700 font-medium">{error}</p>
                        </div>
                    )}

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-gray-700">Correo Institucional</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full pl-10 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-900 focus:border-transparent outline-none transition-all placeholder:text-gray-300 text-gray-900"
                                    placeholder="admin@addag.com"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-gray-700">Contraseña</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-3 w-5 h-5 placeholder:text-gray-300 text-gray-900" />
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full pl-10 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-900 focus:border-transparent outline-none transition-all placeholder:text-gray-300 text-gray-900"
                                    placeholder="••••••••••••"
                                    required
                                />
                            </div>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className={`w-full py-3.5 rounded-lg font-bold text-white shadow-lg transition-all
                            ${loading
                                ? 'bg-gray-400 cursor-not-allowed'
                                : 'bg-blue-900 hover:bg-blue-800 active:scale-[0.98]'
                            }
                        `}
                    >
                        {loading ? (
                            <span className="flex items-center justify-center gap-2">
                                <Loader2 className="w-5 h-5 animate-spin" />
                                Verificando...
                            </span>
                        ) : (
                            'Iniciar Sesión Segura'
                        )}
                    </button>

                    <div className="text-center">
                        <p className="text-xs text-gray-400 mt-4">
                            Acceso restringido y monitoreado.
                        </p>
                    </div>
                </form>
            </div>
        </div>
    )
}