import React from 'react';
import { Document, Page, Text, View, Image, StyleSheet, Font } from '@react-pdf/renderer';

// Registrar fuentes (opcional, usamos Helvetica por defecto que es estándar)
// Font.register({ family: 'Roboto', src: 'https://...' });

const styles = StyleSheet.create({
    page: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        backgroundColor: '#FFFFFF',
        paddingTop: 30,
        paddingLeft: 58, // Ajustado de 40 a 60 para centrar
        //paddingRight: 50, // Margen derecho de seguridad
    },
    cardContainer: {
        width: '85.6mm', // Ancho tarjeta crédito
        height: '53.98mm',  // Alto tarjeta crédito
        marginRight: 10, // Espacio entre columnas
        marginBottom: 10, // Espacio entre filas
        border: '0.5pt dashed #999', // Borde línea de corte muy fina y gris
        position: 'relative',
        overflow: 'hidden'
    },
    // --- ESTILOS FRENTE ---
    frenteContainer: {
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'row',
        padding: 5
    },
    datosCol: {
        width: '65%',
        paddingRight: 2,
        fontSize: 9
    },
    fotoCol: {
        width: '35%',
        alignItems: 'center',
        justifyContent: 'center'
    },
    foto: {
        width: '24mm', // Ajuste según tu requerimiento de 139/166 ratio
        height: '29mm',
        objectFit: 'cover'
    },
    label: {
        fontSize: 7,
        fontFamily: 'Helvetica-Bold',
        color: '#000080', // Azul oscuro
        marginTop: 2
    },
    value: {
        fontSize: 8,
        fontFamily: 'Helvetica',
        marginBottom: 1
    },
    footerFunc: {
        position: 'absolute',
        bottom: 5,
        right: 5,
        fontSize: 8,
        fontFamily: 'Helvetica-Bold',
        textAlign: 'right'
    },
    selloArea: {
        position: 'absolute',
        bottom: 5,
        left: 20,
        width: '32mm', // Sello
        height: '32mm',
        border: '1pt dashed #ddd', // Guía para sello físico
        borderRadius: '50%'
    },
    // --- ESTILOS REVERSO ---
    reversoImage: {
        width: '100%',
        height: '100%'
    }
});

const CarnetFrontal = ({ miembro, baseUrl }) => (
    <View style={styles.cardContainer}>
        <View style={styles.frenteContainer}>
            {/* Columna Datos */}
            <View style={styles.datosCol}>
                <Text style={styles.label}>Carné No:</Text>
                <Text style={styles.value}>{miembro.carnet_numero || 'PENDIENTE'}</Text>

                <Text style={styles.label}>DPI/CUI:</Text>
                <Text style={styles.value}>{miembro.dpi_cui}</Text>

                <Text style={styles.label}>Nombres:</Text>
                <Text style={[styles.value, { fontSize: 7 }]}>{miembro.nombres?.toUpperCase()}</Text>

                <Text style={styles.label}>Apellidos:</Text>
                <Text style={[styles.value, { fontSize: 7 }]}>{miembro.apellidos?.toUpperCase()}</Text>

                <Text style={styles.label}>Departamento:</Text>
                <Text style={styles.value}>{miembro.departamento}</Text>

                <Text style={styles.label}>Vence:</Text>
                <Text style={styles.value}>31 de Diciembre de {new Date().getFullYear()}</Text>
            </View>

            {/* Columna Foto */}
            <View style={styles.fotoCol}>
                {/* Usamos proxy para evitar CORS en PDF si es necesario, pero Supabase público suele ir bien */}
                <Image
                    src={miembro.foto_url_final || miembro.foto_url}
                    style={styles.foto}
                />
            </View>
        </View>

        {/* Elementos Flotantes */}
        <View style={styles.footerFunc}>
            <Text>Función: {miembro.rol?.toUpperCase()}</Text>
        </View>

        {/* Guía Sello (Opcional, quitar si molesta) */}
        {/* <View style={styles.selloArea} /> */}
    </View>
);

const CarnetReverso = ({baseUrl}) => (
    <View style={styles.cardContainer}>
        {/* Asegúrate de tener esta imagen en public/assets */}
        <Image src={`${baseUrl}/assets/portada_carnet_tamaño_carne.png`} style={styles.reversoImage} />
    </View>
);

export const CarnetDocument = ({ miembros, baseUrl }) => {
    // Dividir en grupos de 8 (2 columnas x 4 filas = 8 por página carta)
    const itemsPorPagina = 8;
    const paginas = [];

    for (let i = 0; i < miembros.length; i += itemsPorPagina) {
        paginas.push(miembros.slice(i, i + itemsPorPagina));
    }

    return (
        <Document>
            {paginas.map((grupo, index) => (
                <React.Fragment key={index}>
                    {/* PÁGINA IMPAR: FRENTES */}
                    <Page size="LETTER" style={styles.page}>
                        {grupo.map((miembro) => (
                            <CarnetFrontal key={miembro.id} miembro={miembro} baseUrl={baseUrl}/>
                        ))}
                    </Page>

                    {/* PÁGINA PAR: REVERSOS (Espejo posicional) */}
                    {/* IMPORTANTE: Para impresión doble cara manual, el orden debe coincidir */}
                    <Page size="LETTER" style={styles.page}>
                        {grupo.map((_, i) => (
                            // Renderizamos tantos reversos como frentes haya en esta página
                            <CarnetReverso key={i} baseUrl={baseUrl}/>
                        ))}
                    </Page>
                </React.Fragment>
            ))}
        </Document>
    );
};