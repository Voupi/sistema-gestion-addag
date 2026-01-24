'use server'
import nodemailer from 'nodemailer'

export async function notificarImpresion({ email, nombre, tipo = 'GENERAL' }) { // <--- PARAMETRO TIPO
    if (!email) return

    const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT),
        secure: true,
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS.replace(/\s+/g, ''),
        },
    })

    // Configuración dinámica según tipo
    const esParqueo = tipo === 'PARQUEO'
    const colorTema = esParqueo ? '#166534' : '#1d4ed8' // Verde vs Azul
    const titulo = esParqueo ? '¡Pase de Parqueo Listo!' : '¡Carné de Socio Listo!'
    const mensaje = esParqueo
        ? 'Te informamos que tu pase de parqueo ha sido impreso.'
        : 'Te informamos que tu carné de socio ADDAG ha sido impreso.'

    await transporter.sendMail({
        from: '"Sistema ADDAG" <' + process.env.SMTP_USER + '>',
        to: email,
        replyTo: process.env.EMAIL_ADMIN_ADDAG,
        subject: `[CARNÉ] ${titulo} - ${nombre}`,
        html: `
        <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
            <div style="background-color: ${colorTema}; padding: 20px; text-align: center;">
                <h1 style="color: white; margin: 0; font-size: 24px;">¡Listo para recoger!</h1>
            </div>
            <div style="padding: 24px;">
                <p>Hola <strong>${nombre}</strong>,</p>
                <p>${mensaje}</p>
                <p>Puedes pasar a recogerlo en nuestras oficinas en horarios hábiles.</p>
                <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
                <p style="font-size: 12px; color: #666; text-align: center;">Sistema de Gestión ADDAG</p>
            </div>
        </div>
      `
    })
}