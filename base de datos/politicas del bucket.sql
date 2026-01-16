-- 1. Permitir subidas públicas (INSERT) solo al bucket 'fotos-carnet'
CREATE POLICY "Permitir subida pública de fotos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'fotos-carnet' 
  AND auth.role() = 'anon'
);

-- 2. Permitir ver las fotos públicamente (SELECT)
CREATE POLICY "Permitir ver fotos públicamente"
ON storage.objects FOR SELECT
USING ( bucket_id = 'fotos-carnet' );

-- (No creamos políticas de UPDATE ni DELETE para 'anon', así que están bloqueadas por defecto)

-- Permitir a usuarios logueados (Admin) subir y modificar archivos
CREATE POLICY "Admin full access storage"
ON storage.objects FOR ALL
USING ( auth.role() = 'authenticated' )
WITH CHECK ( auth.role() = 'authenticated' );