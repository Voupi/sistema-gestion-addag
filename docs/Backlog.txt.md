# 📋 Backlog de Proyecto: Módulo de Carnés de Asociados (ADDAG)

Este documento detalla las historias de usuario y requerimientos técnicos para la gestión de atletas y miembros de la asociación.

## 👥 Historias de Usuario (User Stories)

1. **Selección de Entrenador:** Como **Alumno**, quiero poder seleccionar a mi entrenador principal desde el formulario de solicitud para que mi proceso de aprobación sea gestionado por la persona correcta.
2. **Privacidad por Entrenador:** Como **Entrenador**, quiero que al iniciar sesión solo me aparezcan las solicitudes de mis alumnos asignados, para mantener el orden y la privacidad de mi grupo.
3. **Control Total:** Como **Administrador Principal**, quiero tener una vista global de todas las solicitudes de todos los entrenadores para supervisar el proceso completo.
4. **Fecha de Expiración Global:** Como **Administrador**, quiero configurar una fecha de vencimiento única y persistente para todos los carnés del ciclo, de modo que no tenga que escribirla en cada registro y se mantenga activa incluso tras cerrar sesión.
5. **Auditoría de Aprobación:** Como **Director**, quiero saber exactamente qué cuenta de correo aprobó cada carné y en qué fecha/hora ocurrió, para tener un registro histórico de responsabilidad.
6. **Comunicación Flexible:** Como **Aprobador (Admin/Entrenador)**, quiero decidir mediante un checkbox si deseo enviar o no el correo automático de notificación al alumno al momento de aprobar o rechazar, para tener control sobre la comunicación.
7. **Eficiencia en Impresión:** Como **Operador de Oficina**, quiero que los carnés aprobados por todos los entrenadores se acumulen en una sola "Cola de Impresión" pública para poder imprimir lotes masivos sin importar el origen.
8. **Optimización de Corte:** Como **Encargado de Producción**, quiero que el PDF generado tenga los carnés pegados (espacio cero) y guías de corte largas, para reducir la cantidad de cortes de guillotina necesarios.
9. Notificación de Pendientes: Como Entrenador, quiero recibir un correo electrónico diario de resumen solo si tengo solicitudes pendientes, para recordarme que debo revisarlas antes del fin de semana de impresión.
10. Persistencia de Datos: Como Asociación, quiero que los datos de los carnés oficiales persistan año con año para llevar un registro histórico de quiénes han sido miembros de la ADDAG.
RF11 - Gestión de Imágenes: Como Aprobador, quiero editar/recortar la foto del usuario y tener un botón de "Revertir" a la original si me equivoco, asegurando la integridad de la imagen base.

RF12 - Comunicación Controlada: En todas las etapas (aprobación/rechazo/entrega), quiero un checkbox de "Enviar Correo" (desactivado por defecto) para decidir cuándo y qué notificar al usuario, evitando accidentes.

RF13 - Estabilidad Visual: Cuando haya red lenta, el sistema debe confirmar que la imagen editada se subió correctamente a Supabase antes de refrescar el modal, evitando mostrar imágenes rotas.

RF14 - Resumen Semanal: Como Entrenador, quiero recibir un correo semanal automático a las 8:00 AM (GT) solo si tengo alumnos pendientes, para no llenar mi bandeja de entrada.

RF15 - Función de Generación de PDF: Como Administrador solamente yo tendré acceso a la función de generación de PDF, para mantener el control sobre la producción de carnés. Los que no sean administradores no podrán ver ni ejecutar esta función. El botón de imprimir lote solo estará visible para los administradores tanto en el módulo de carnets de parqueo como el de carnet de asociado.

RF17 - Optimización de Impresión: El PDF final debe estar optimizado para guillotina (espacio cero entre carnés, guías de corte punteadas) y mostrar los datos en formato vertical profesional.

RF18 - Solo los administradores podrán ver el módulo de parqueos, los entrenadores no tendrán acceso a ese módulo, solo al de carnets de asociados.
---

## ⚙️ Requerimientos Funcionales (Especificaciones Técnicas)

### 1. Gestión de Accesos y Seguridad
*   **RF01 - Tabla de Entrenadores:** El sistema contará con una tabla `entrenadores` vinculada a las cuentas de autenticación.
*   **RF02 - Filtrado por RLS:** Se implementarán políticas de Row Level Security (RLS) en Supabase para filtrar la tabla `miembros` basándose en el email del usuario autenticado (salvo para cuentas marcadas como `es_admin`).
*   **RF03 - Registro de Auditoría:** Las columnas `aprobado_por` y `fecha_aprobacion` se llenarán automáticamente al ejecutar la función de aprobación.

### 2. Formulario de Solicitud (Público)
*   **RF04 - Selector de Entrenador:** El formulario en `/solicitud-socio` incluirá un `select` obligatorio que cargará dinámicamente los nombres desde la tabla `entrenadores`.
*   **RF05 - Notificación de Asignación:** El correo de confirmación enviado al alumno tras el registro mencionará explícitamente el nombre del entrenador que revisará su solicitud.

### 3. Panel Administrativo (Privado)
*   **RF06 - Configuración de Fecha Global:** Existirá una variable o tabla de configuración para la `fecha_expiracion_global`. Solo usuarios con rol `admin` podrán modificarla. El valor se cargará por defecto en el Modal de Gestión.
*   **RF07 - Condición de Solvencia:** El entrenador revisará externamente la solvencia del alumno antes de proceder. El sistema permitirá la edición de datos y fotos antes de mover el registro a la cola de impresión.
*   **RF08 - Checkbox de Notificación:** El Modal de Gestión incluirá un interruptor (por defecto desactivado) que determinará si se dispara la acción de envío de correo al guardar cambios.

### 4. Generación de PDF (Salida)
*   **RF09 - Diseño "Zero Gap":** Los contenedores de los carnés en el PDF no tendrán márgenes entre sí (estarán pegados lateral y verticalmente).
*   **RF10 - Guías de Guillotina:** El PDF dibujará líneas punteadas que atraviesen toda la página (de borde a borde) en las coordenadas donde terminan las filas y columnas de los carnés.
RF11 - Correo de Resumen (Daily Digest): El sistema contará con una tarea programada que enviará un reporte por correo a cada entrenador que posea registros en estado PENDIENTE.
RF12 (Final): El correo de confirmación al alumno indicará: "Tu solicitud será revisada por el Prof. [Nombre del Entrenador]".

RF13 (Escalabilidad): La arquitectura permitirá en el futuro registros del mismo DPI en años distintos, diferenciándolos mediante la columna carnet_anio.