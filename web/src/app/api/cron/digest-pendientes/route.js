import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import nodemailer from 'nodemailer'

// ─────────────────────────────────────────────────────────────────
// RF11 - Resumen diario de solicitudes pendientes por entrenador
//
// PARA CAMBIAR EL HORARIO: edita "schedule" en /web/vercel.json
//   Formato cron estándar (UTC): "MINUTO HORA * * *"
//   Guatemala = UTC-6 → 8:00am GT = 14:00 UTC
//
//   PRUEBAS RÁPIDAS (cambia schedule en vercel.json y redespliega):
//     "30 15 * * *"  → 9:30am GT  (15:30 UTC)
//     "0 20 * * *"   → 2:00pm GT  (20:00 UTC)
//   Una vez confirmado, vuelve a "0 14 * * *" para las 8am GT.
//
// SEGURIDAD: Vercel inyecta automáticamente el header
//   Authorization: Bearer <CRON_SECRET>
//   Debes definir CRON_SECRET en las variables de entorno de Vercel.
// ─────────────────────────────────────────────────────────────────

export async function GET(request) {
    // 1. Verificar que la petición viene del cron de Vercel
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // 2. Cliente Supabase con Service Role para bypasear RLS
    //    (Sin usuario autenticado, necesitamos acceso total)
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    // 3. Obtener todos los entrenadores activos
    const { data: entrenadores, error: errEnt } = await supabase
        .from('entrenadores')
        .select('id, nombre_completo, email')
        .eq('activo', true)

    if (errEnt) {
        console.error('[digest-pendientes] Error obteniendo entrenadores:', errEnt.message)
        return NextResponse.json({ error: errEnt.message }, { status: 500 })
    }

    if (!entrenadores?.length) {
        return NextResponse.json({ ok: true, mensaje: 'Sin entrenadores activos', enviados: 0 })
    }

    // 4. Configurar transporter de correo (misma config que las demás acciones)
    const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT),
        secure: true,
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS.replace(/\s+/g, ''),
        },
    })

    let enviados = 0
    const errores = []

    // 5. Para cada entrenador, verificar si tiene alumnos pendientes y notificar
    for (const entrenador of entrenadores) {
        const { data: pendientes, error: errPend } = await supabase
            .from('miembros')
            .select('nombres, apellidos, created_at')
            .eq('entrenador_id', entrenador.id)
            .eq('estado', 'PENDIENTE')
            .order('created_at', { ascending: true })

        if (errPend) {
            console.error(`[digest-pendientes] Error para ${entrenador.email}:`, errPend.message)
            continue
        }

        // Solo enviamos si HAY pendientes
        if (!pendientes?.length) continue

        const listaHtml = pendientes
            .map(m => {
                const fecha = new Date(m.created_at).toLocaleDateString('es-GT', {
                    year: 'numeric', month: 'long', day: 'numeric'
                })
                return `<li style="padding: 4px 0;"><strong>${m.nombres} ${m.apellidos}</strong> <span style="color:#666; font-size:12px;">— desde el ${fecha}</span></li>`
            })
            .join('')

        try {
            await transporter.sendMail({
                from: `"Sistema ADDAG" <${process.env.SMTP_USER}>`,
                to: entrenador.email,
                replyTo: process.env.EMAIL_ADMIN_ADDAG,
                subject: `[ADDAG] Recordatorio: ${pendientes.length} solicitud(es) pendiente(s) de revisión`,
                html: `
                <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
                    <div style="background-color: #1e3a5f; padding: 20px 24px;">
                        <h1 style="color: white; margin: 0; font-size: 20px;">📋 Solicitudes Pendientes de Revisión</h1>
                    </div>
                    <div style="padding: 24px;">
                        <p>Hola <strong>${entrenador.nombre_completo}</strong>,</p>
                        <p>Tienes <strong style="color: #dc2626;">${pendientes.length}</strong> solicitud(es) de carné de asociado esperando tu revisión en el sistema:</p>

                        <ul style="line-height: 1.8; padding-left: 20px; margin: 16px 0;">
                            ${listaHtml}
                        </ul>

                        <!-- BOTÓN DE ACCESO RÁPIDO -->
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="https://sistema-gestion-addag.vercel.app/admin/login" 
                            style="background-color: #1d4ed8; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; shadow: 0 4px 6px rgba(0,0,0,0.1);">
                            Ingresar al Panel de Control
                            </a>
                        </div>

                        <p style="font-size: 13px; color: #6b7280; text-align: center;">
                            Recuerda que las impresiones se realizan los fines de semana.
                        </p>

                        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
                        <p style="font-size: 11px; color: #9ca3af; text-align: center; margin: 0;">
                            Sistema de Gestión ADDAG • Notificación automática<br>
                            Este correo se envía solo si tienes tareas pendientes.
                            Si no deseas recibir estos recordatorios, contacta a administración.
                        </p>
                    </div>
                </div>
                `,
            })
            enviados++
        } catch (mailError) {
            console.error(`[digest-pendientes] Error enviando a ${entrenador.email}:`, mailError.message)
            errores.push({ entrenador: entrenador.email, error: mailError.message })
        }
    }

    return NextResponse.json({
        ok: true,
        enviados,
        revisados: entrenadores.length,
        errores: errores.length ? errores : undefined,
    })
}
