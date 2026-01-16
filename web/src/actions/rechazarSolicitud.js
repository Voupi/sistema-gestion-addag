'use server'

import nodemailer from 'nodemailer'

export async function rechazarSolicitud({ email, nombre, motivo }) {
    try {
        // Validación básica
        if (!email) {
            console.error('Intento de rechazo sin email de destino')
            return { success: false, error: 'No hay email para enviar la notificación' }
        }

        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: Number(process.env.SMTP_PORT),
            secure: true, // Gmail puerto 465
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS.replace(/\s+/g, ''),
            },
        })

        const mailOptions = {
            from: '"Sistema ADDAG" <' + process.env.SMTP_USER + '>',
            to: email,
            replyTo: process.env.EMAIL_ADMIN_ADDAG,
            subject: `[CARNÉ] Acción Requerida: Solicitud Observada - ${nombre}`,
            html: `
        <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #fee2e2; border-radius: 8px; overflow: hidden;">
          <div style="background-color: #dc2626; padding: 20px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">Solicitud Observada</h1>
          </div>
          
          <div style="padding: 24px;">
            <p>Hola <strong>${nombre}</strong>,</p>
            <p>Hemos revisado tu solicitud de carné y encontramos un detalle que necesitamos corregir.</p>
            
            <div style="background-color: #fef2f2; padding: 16px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #dc2626;">
              <p style="margin: 0; font-weight: bold; color: #991b1b;">Motivo:</p>
              <p style="margin-top: 5px; font-size: 15px;">${motivo}</p>
            </div>

            <p><strong>¿Qué debes hacer?</strong></p>
            <p>Por favor, ingresa nuevamente al formulario y envía una nueva solicitud corrigiendo este punto.</p>
            
            <p style="text-align: center; margin-top: 24px;">
              <a href="https://sistema-gestion-addag.vercel.app/" style="background-color: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                Llenar Formulario Nuevamente
              </a>
            </p>
            
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
            <p style="font-size: 12px; color: #666; text-align: center;">
              Si tienes dudas, responde a este correo.
            </p>
          </div>
        </div>
      `
        }

        const info = await transporter.sendMail(mailOptions)
        console.log("Correo rechazo enviado ID:", info.messageId)
        return { success: true }

    } catch (error) {
        console.error('Error enviando correo rechazo:', error)
        return { success: false, error: error.message }
    }
}