import React from 'react';
import { Document, Page, Text, View, Image, StyleSheet, Svg, Line } from '@react-pdf/renderer';

// --- CONSTANTES DE DISEÑO (RF09/RF10) ---
const MM_TO_PT = 72 / 25.4;
const CARD_W = 85.6 * MM_TO_PT;   // ≈ 242.65 pt
const CARD_H = 53.98 * MM_TO_PT;  // ≈ 153.03 pt
const COLS = 2;
const ROWS = 4;
const PAGE_W = 612;  // LETTER width en puntos
const PAGE_H = 792;  // LETTER height en puntos

// Centrado de la cuadrícula en la página (RF09: zero gap)
const MARGIN_LEFT = (PAGE_W - COLS * CARD_W) / 2;
const MARGIN_TOP = (PAGE_H - ROWS * CARD_H) / 2;

// Posiciones de las guías de guillotina (RF10)
const V_LINES = [
    MARGIN_LEFT,
    MARGIN_LEFT + CARD_W,
    MARGIN_LEFT + 2 * CARD_W,
];
const H_LINES = Array.from({ length: ROWS + 1 }, (_, i) => MARGIN_TOP + i * CARD_H);

const styles = StyleSheet.create({
    page: {
        backgroundColor: '#FFFFFF',
    },
    // RF09: cero margen entre carnés
    cardsWrapper: {
        position: 'absolute',
        top: MARGIN_TOP,
        left: MARGIN_LEFT,
        flexDirection: 'row',
        flexWrap: 'wrap',
        width: COLS * CARD_W,
    },
    cardContainer: {
        width: CARD_W,
        height: CARD_H,
        // Sin márgenes (RF09: zero gap)
        position: 'relative',
        overflow: 'hidden',
    },
    // RF10: capa de guías absoluta
    cutLinesLayer: {
        position: 'absolute',
        top: 0,
        left: 0,
    },
    // --- ESTILOS FRENTE ---
    frenteContainer: {
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'row',
        padding: 5,
    },
    datosCol: {
        width: '65%',
        paddingRight: 2,
        fontSize: 9,
    },
    fotoCol: {
        width: '35%',
        alignItems: 'center',
        justifyContent: 'center',
    },
    foto: {
        width: '24mm',
        height: '29mm',
        objectFit: 'cover',
    },
    label: {
        fontSize: 7,
        fontFamily: 'Helvetica-Bold',
        color: '#000080',
        marginTop: 2,
    },
    value: {
        fontSize: 8,
        fontFamily: 'Helvetica',
        marginBottom: 1,
    },
    footerFunc: {
        position: 'absolute',
        bottom: 5,
        right: 5,
        fontSize: 8,
        fontFamily: 'Helvetica-Bold',
        textAlign: 'right',
    },
    // --- ESTILOS REVERSO ---
    reversoImage: {
        width: '100%',
        height: '100%',
    },
});

// RF10: Guías de guillotina que atraviesan toda la página
const CutLines = () => (
    <Svg
        style={styles.cutLinesLayer}
        width={PAGE_W}
        height={PAGE_H}
    >
        {V_LINES.map((x, i) => (
            <Line
                key={`v${i}`}
                x1={x} y1={0}
                x2={x} y2={PAGE_H}
                stroke="#AAAAAA"
                strokeWidth={0.5}
                strokeDasharray="4 3"
            />
        ))}
        {H_LINES.map((y, i) => (
            <Line
                key={`h${i}`}
                x1={0} y1={y}
                x2={PAGE_W} y2={y}
                stroke="#AAAAAA"
                strokeWidth={0.5}
                strokeDasharray="4 3"
            />
        ))}
    </Svg>
);

// RF06: fechaExpiracion se recibe como prop
const CarnetFrontal = ({ miembro, fechaExpiracion }) => (
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
                <Text style={styles.value}>{fechaExpiracion || `31 de Diciembre de ${new Date().getFullYear()}`}</Text>
            </View>

            {/* Columna Foto */}
            <View style={styles.fotoCol}>
                <Image
                    src={miembro.foto_url_final || miembro.foto_url}
                    style={styles.foto}
                />
            </View>
        </View>

        {/* Rol en esquina inferior derecha */}
        <View style={styles.footerFunc}>
            <Text>Función: {miembro.rol?.toUpperCase()}</Text>
        </View>
    </View>
);

const CarnetReverso = ({ baseUrl }) => (
    <View style={styles.cardContainer}>
        <Image src={`${baseUrl}/assets/portada_carnet_tamaño_carne.png`} style={styles.reversoImage} />
    </View>
);

// RF06: recibe fechaExpiracion como prop
export const CarnetDocument = ({ miembros, baseUrl, fechaExpiracion }) => {
    const itemsPorPagina = COLS * ROWS; // 8
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
                        {/* RF09: cuadrícula sin márgenes, centrada en página */}
                        <View style={styles.cardsWrapper}>
                            {grupo.map((miembro) => (
                                <CarnetFrontal
                                    key={miembro.id}
                                    miembro={miembro}
                                    fechaExpiracion={fechaExpiracion}
                                />
                            ))}
                        </View>
                        {/* RF10: guías de corte sobre la cuadrícula */}
                        <CutLines />
                    </Page>

                    {/* PÁGINA PAR: REVERSOS */}
                    <Page size="LETTER" style={styles.page}>
                        <View style={styles.cardsWrapper}>
                            {grupo.map((_, i) => (
                                <CarnetReverso key={i} baseUrl={baseUrl} />
                            ))}
                        </View>
                        <CutLines />
                    </Page>
                </React.Fragment>
            ))}
        </Document>
    );
};
