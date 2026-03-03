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
11. Gestión de Imagenes: Como Aprobador, quiero poder, editar la foto del alumno y sus datos personales, y también en caso me equivocara al modificar la foto, tener la opción de poder revertirla a la original.
12. En la fase 3. de Proceso, quiero tener la opción de marcar un checkbox que indique si deseo enviar o no el correo de notificación al alumno, para tener control sobre la comunicación. Y que esté esté predeterminantemente desactivado para evitar envíos accidentales. Tanto en el módulo de carnets de parqueo como en el módulo de carnets de asociados.
13. Cuando haya un lentitud del internet del sistema, en la modificación de imágenes, quiero que el sistema verifique que la imagen editada se haya guardado correctamente antes de mostrarla en el modal, para evitar mostrar una imagen rota o desactualizada al usuario.
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