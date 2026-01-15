'use server'

import nodemailer from 'nodemailer'

export async function enviarCorreoConfirmacion({ emailDestino, nombre, dpi, telefono }) {
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: true, // Gmail requiere true para puerto 465
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS.replace(/\s+/g, ''), // Quitamos espacios por si acaso
      },
    })

    const mailOptions = {
      from: '"Sistema ADDAG" <' + process.env.SMTP_USER + '>', // El robot envía
      to: emailDestino,
      replyTo: process.env.EMAIL_ADMIN_ADDAG, // <--- MAGIA: Las respuestas van a Tesorería
      subject: `[CARNÉ] Confirmación de Solicitud - ${nombre}`,
      html: `
        <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
          <div style="background-color: #1d4ed8; padding: 20px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">Solicitud Recibida</h1>
          </div>
          
          <div style="padding: 24px;">
            <p>Hola <strong>${nombre}</strong>,</p>
            <p>El sistema de la Asociación Departamental de Ajedrez de Guatemala (ADDAG) ha recibido tus datos.</p>
            
            <div style="background-color: #f3f4f6; padding: 16px; border-radius: 6px; margin: 20px 0;">
              <p style="margin: 0; font-weight: bold; border-bottom: 1px solid #d1d5db; padding-bottom: 8px;">Datos registrados:</p>
              <ul style="margin-top: 8px; padding-left: 20px; line-height: 1.6;">
                <li><strong>Documento:</strong> ${dpi}</li>
                <li><strong>Teléfono:</strong> ${telefono}</li>
                <li><strong>Email:</strong> ${emailDestino}</li>
              </ul>
              <p style="font-size: 13px; color: #666; font-style: italic; margin-top: 10px;">
                * Tu fotografía será revisada por nuestro equipo antes de la impresión.
              </p>
            </div>

            <p style="color: #004085; background-color: #cce5ff; padding: 10px; border-radius: 4px; font-size: 14px;">
              ℹ️ <strong>¿Error en tus datos?</strong><br>
              Simplemente responde a este correo indicando el cambio.
            </p>
            
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
            
            <p style="font-size: 12px; color: #6b7280; text-align: center;">
              Sistema de Gestión ADDAG
            </p>
          </div>
        </div>
      `,
    }

    const info = await transporter.sendMail(mailOptions)
    console.log("Correo Gmail enviado ID:", info.messageId)
    return { success: true, id: info.messageId }

  } catch (error) {
    console.error('Error enviando correo Gmail:', error)
    return { success: false, error: error.message }
  }
}