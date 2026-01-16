'use server'
import nodemailer from 'nodemailer'

export async function notificarImpresion({ email, nombre }) {
    if (!email) return // Si no tiene correo, ignorar

    const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT),
        secure: true,
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS.replace(/\s+/g, ''),
        },
    })

    await transporter.sendMail({
        from: '"Sistema ADDAG" <' + process.env.SMTP_USER + '>',
        to: email,
        replyTo: process.env.EMAIL_ADMIN_ADDAG,
        subject: `[CARNÉ] ¡Tu Carné está Listo! - ${nombre}`,
        html: `
        <div style="font-family: sans-serif; color: #333; padding: 20px;">
            <h2 style="color: #166534;">¡Buenas noticias!</h2>
            <p>Hola <strong>${nombre}</strong>,</p>
            <p>Te informamos que tu carné de la ADDAG ha sido <strong>IMPRESO</strong> exitosamente.</p>
            <p>Puedes pasar a recogerlo en nuestras oficinas en horarios hábiles.</p>
            <hr>
            <p style="font-size: 12px; color: #666;">Sistema de Gestión ADDAG</p>
        </div>
      `
    })
}