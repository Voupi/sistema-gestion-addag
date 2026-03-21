# Secuencia Lógica de Procesamiento de Imágenes

## Flujo General del Sistema

El sistema de gestión de carnés ADDAG procesa imágenes de forma inteligente, aplicando correcciones automáticas de orientación y permitiendo edición manual cuando sea necesario.

## 1. CARGA INICIAL DE LA IMAGEN

**Archivo**: `solicitud-socio/page.js` (líneas 59-60, 105-109)

```
Usuario sube foto → Validación (tipo, tamaño max 5MB) → Supabase Storage bucket 'fotos-carnet' → Se guarda foto_url en BD
```

- La imagen se guarda en el bucket de Supabase tal como el usuario la subió
- **NO se aplican transformaciones en este punto**
- Se almacena la URL en el campo `foto_url` de la tabla `miembros` o `parqueos`

## 2. REVISIÓN POR EL ADMINISTRADOR/ENTRENADOR

**Archivo**: `ModalGestionMiembro.jsx`

### 2.1. Apertura del Modal (líneas 113-133)

Cuando se abre el modal para revisar una solicitud:

```javascript
1. Se obtiene la URL fuente: foto_url_final || foto_url
   - Si existe foto_url_final → usa la versión procesada
   - Si NO existe → usa la original (foto_url)

2. Se carga la imagen con reintentos (Historia 13):
   - Función cargarImagenConReintentos() hace hasta 3 intentos
   - Maneja conexiones lentas con backoff incremental
   - Convierte a Blob URL para mejor rendimiento

3. Se muestra la imagen en el modal para revisión
```

## 3. FLUJO DE APROBACIÓN SIN EDITAR (¡NUEVO! - CORRECCIÓN AUTOMÁTICA EXIF)

**Archivo**: `ModalGestionMiembro.jsx` (líneas 206-287)

### Problema Anterior

Cuando un administrador aprobaba directamente sin editar la imagen:
- La imagen se usaba tal cual (foto_url)
- Si tenía metadatos EXIF de orientación → aparecía rotada en el PDF
- El navegador interpretaba EXIF automáticamente, pero el procesamiento de PDF NO

### Solución Implementada (NUEVA)

Cuando se presiona "APROBAR Y SIGUIENTE" **sin haber editado** la imagen:

```javascript
// Líneas 268-272
const esAprobacionSinEditar = accion === 'APROBAR' && !editandoFoto && !miembro.foto_url_final

if (esAprobacionSinEditar) {
    // 1. Leer orientación EXIF de la imagen original
    const exifOrientation = await getExifOrientation(imgBlobUrl)

    // 2. Solo procesar si tiene orientación diferente a 1 (normal)
    if (exifOrientation !== 1) {
        // 3. Crear un "crop" de toda la imagen (sin recorte)
        const img = new Image()
        img.src = imgBlobUrl
        await new Promise(resolve => { img.onload = resolve })

        const fullCrop = {
            x: 0,
            y: 0,
            width: img.width,
            height: img.height
        }

        // 4. Aplicar corrección EXIF usando getCroppedImg
        blob = await getCroppedImg(imgBlobUrl, fullCrop, 0, exifOrientation)

        // 5. Subir imagen corregida como foto_url_final
        // 6. Actualizar BD con la nueva URL
    }
}
```

### Valores de Orientación EXIF

| Valor | Descripción | Transformación |
|-------|-------------|----------------|
| 1 | Normal | Sin cambios |
| 2 | Espejo horizontal | Voltear horizontalmente |
| 3 | 180° | Rotar 180° |
| 4 | Espejo vertical | Voltear verticalmente |
| 5 | Transponer | Transponer (rotar 90° + espejo) |
| 6 | 90° derecha | Rotar 90° en sentido horario |
| 7 | Transverso | Transverso (rotar 270° + espejo) |
| 8 | 90° izquierda | Rotar 90° en sentido antihorario |

### Función getExifOrientation() (líneas 13-72)

```javascript
// Lee los bytes de la imagen para detectar marcadores EXIF
1. Verifica que sea JPEG (0xFFD8)
2. Busca el marcador APP1 (0xFFE1) que contiene EXIF
3. Busca el tag 0x0112 (Orientation)
4. Retorna el valor de orientación (1-8)
5. Si no encuentra EXIF o hay error → retorna 1 (sin rotación)
```

### Función applyExifOrientation() (líneas 75-95)

```javascript
// Aplica la transformación correspondiente al contexto del canvas
- Usa ctx.transform() para aplicar matriz de transformación
- Maneja los 8 casos posibles de orientación EXIF
- Se aplica ANTES de cualquier rotación manual del usuario
```

## 4. FLUJO DE EDICIÓN MANUAL DE LA IMAGEN

**Archivo**: `ModalGestionMiembro.jsx`

### 4.1. Entrar en Modo Edición (línea 329)

```
Usuario hace clic en "Editar Foto" → setEditandoFoto(true) → Se activa react-easy-crop
```

El componente Cropper permite:
- Recortar la imagen (aspect ratio 232/242)
- Hacer zoom (1x - 3x)
- Rotar manualmente en incrementos de 90° → setRotation(r => r + 90)

### 4.2. Aplicar Cambios (línea 322 - "Aplicar")

```javascript
// Líneas 259-266
if (debeProcesarImagen) {  // Usuario editó manualmente
    // 1. Obtener orientación EXIF
    const exifOrientation = await getExifOrientation(imgBlobUrl)

    // 2. Procesar con getCroppedImg() aplicando EXIF + rotación manual
    blob = await getCroppedImg(imgBlobUrl, croppedAreaPixels, rotation, exifOrientation)

    // 3. Subir a Supabase como procesada_[DPI]_[timestamp].jpg
    // 4. Guardar en foto_url_final
}
```

### 4.3. Función getCroppedImg() Mejorada (líneas 97-151)

```javascript
async function getCroppedImg(imageSrc, pixelCrop, rotation = 0, exifOrientation = 1) {
    // 1. Cargar imagen en memoria
    const image = new Image()
    image.src = imageSrc
    await imagen.onload

    // 2. Ajustar dimensiones si EXIF intercambia ancho/alto (orientaciones 5-8)
    let width = image.width
    let height = image.height
    if (exifOrientation >= 5 && exifOrientation <= 8) {
        [width, height] = [height, width]
    }

    // 3. Crear canvas con área segura para rotaciones
    const safeArea = 2 * ((maxSize / 2) * Math.sqrt(2))
    canvas.width = safeArea
    canvas.height = safeArea

    // 4. PRIMERO: Aplicar orientación EXIF (si !== 1)
    ctx.translate(safeArea / 2, safeArea / 2)
    if (exifOrientation !== 1) {
        applyExifOrientation(ctx, exifOrientation, width, height)
    }

    // 5. SEGUNDO: Aplicar rotación manual del usuario
    ctx.rotate((rotation * Math.PI) / 180)

    // 6. Dibujar imagen con transformaciones aplicadas
    ctx.drawImage(image, ...)

    // 7. Extraer el área recortada (pixelCrop)
    const data = ctx.getImageData(cropX, cropY, cropWidth, cropHeight)

    // 8. Crear canvas final con dimensiones exactas del crop
    canvas.width = pixelCrop.width
    canvas.height = pixelCrop.height
    ctx.putImageData(data, 0, 0)

    // 9. Convertir a Blob JPEG con calidad 0.9
    return canvas.toBlob((blob) => blob, 'image/jpeg', 0.9)
}
```

## 5. GENERACIÓN DEL PDF

**Archivo**: `CarnetPDF.jsx` (línea 149)

```javascript
// El componente de PDF usa:
<Image src={miembro.foto_url_final || miembro.foto_url} />

// Prioridad:
1. Si existe foto_url_final → imagen procesada (con EXIF corregido y/o editada)
2. Si NO existe → imagen original (foto_url)
```

**IMPORTANTE**: Ahora con la corrección automática EXIF, todas las aprobaciones generan `foto_url_final` si es necesario, por lo que las imágenes siempre aparecerán correctamente orientadas en el PDF.

## 6. HISTORIA 11: REVERTIR A FOTO ORIGINAL

**Archivo**: `ModalGestionMiembro.jsx` (líneas 208-223)

Botón "Revertir original" (solo visible si existe foto_url_final):

```javascript
handleRevertirFoto() {
    // 1. Confirmar con el usuario
    // 2. Eliminar foto_url_final de la BD (SET NULL)
    // 3. Recargar imagen original con reintentos
    // 4. Actualizar vista del modal
}
```

Esto permite deshacer ediciones/correcciones y volver a la foto que subió el alumno.

## 7. HISTORIA 13: MANEJO DE CONEXIONES LENTAS

**Archivo**: `ModalGestionMiembro.jsx` (líneas 107-120)

### cargarImagenConReintentos() (líneas 107-120)

```javascript
// Hace hasta 3 intentos de carga con backoff incremental
Intento 1: fetch imagen
↓ (error)
Esperar 1 segundo
↓
Intento 2: fetch imagen
↓ (error)
Esperar 2 segundos
↓
Intento 3: fetch imagen
↓
Si todo falla → usa URL directa (fallback con advertencia)
```

### verificarImagenCargada() (líneas 123-130)

```javascript
// Antes de guardar la URL en BD, verifica que cargue correctamente
1. Crea elemento <img> en memoria
2. Intenta cargar la URL con timeout de 13 segundos
3. Si carga → resolve()
4. Si falla/timeout → reject() con mensaje de error
5. Evita guardar URLs rotas en la base de datos
```

## RESUMEN: ¿Qué pasa cuando NO se edita y se aprueba directamente?

### ANTES (Bug)
```
1. Usuario sube foto con orientación incorrecta (EXIF 6 = rotada 90°)
2. Admin aprueba sin editar
3. Se usa foto_url directamente
4. PDF genera carné con imagen rotada ❌
```

### AHORA (Corregido)
```
1. Usuario sube foto con orientación incorrecta (EXIF 6 = rotada 90°)
2. Admin aprueba sin editar
3. Sistema detecta EXIF !== 1
4. Procesa automáticamente la imagen corrigiendo orientación
5. Guarda en foto_url_final
6. PDF genera carné con imagen correcta ✅
```

## VENTAJAS DEL NUEVO SISTEMA

✅ **Automático**: No requiere intervención manual del admin
✅ **Inteligente**: Solo procesa si detecta orientación EXIF incorrecta
✅ **Eficiente**: No procesa imágenes que ya están correctas
✅ **Preserva calidad**: Usa JPEG 0.9 de calidad
✅ **Robusto**: Maneja conexiones lentas con reintentos
✅ **Reversible**: Siempre se puede volver a la original

## FLUJO DE DATOS COMPLETO

```
┌─────────────────┐
│ Usuario sube    │
│ foto con EXIF 6 │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Supabase        │
│ foto_url        │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Admin revisa    │
│ en modal        │
└────────┬────────┘
         │
         ├──► [Edita manualmente] ──► getCroppedImg(EXIF + rotación) ──► foto_url_final
         │
         └──► [Aprueba directo] ──► getExifOrientation() ──┐
                                                            │
                                    ┌───────────────────────┘
                                    │
                                    ├──► EXIF == 1? ──► No procesa
                                    │
                                    └──► EXIF != 1? ──► getCroppedImg(EXIF) ──► foto_url_final
                                                                                      │
                                                                                      ▼
                                                                            ┌─────────────────┐
                                                                            │ PDF usa         │
                                                                            │ foto_url_final  │
                                                                            │ (CORRECTA ✅)   │
                                                                            └─────────────────┘
```

## ARCHIVOS MODIFICADOS

1. **ModalGestionMiembro.jsx**:
   - Nuevas funciones: `getExifOrientation()`, `applyExifOrientation()`
   - Modificada: `getCroppedImg()` ahora acepta parámetro `exifOrientation`
   - Modificada: `handleSave()` detecta aprobaciones sin editar y procesa EXIF

2. **CarnetPDF.jsx**:
   - Sin cambios (ya usaba foto_url_final con fallback a foto_url)

## REFERENCIAS TÉCNICAS

- **EXIF Specification**: https://www.exif.org/Exif2-2.PDF
- **Canvas API**: https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API
- **react-easy-crop**: https://github.com/ricardo-ch/react-easy-crop
- **Supabase Storage**: https://supabase.com/docs/guides/storage
