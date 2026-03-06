import React from 'react';
import { Document, Page, Text, View, Image, StyleSheet, Svg, Line } from '@react-pdf/renderer';

// --- MATEMÁTICA EXACTA PARA VERTICAL (CR-80 Portrait) ---
const MM_TO_PT = 72 / 25.4;
const CARD_W = 53.98 * MM_TO_PT;  // ≈ 153.01 pt (Ancho)
const CARD_H = 85.6 * MM_TO_PT;   // ≈ 242.64 pt (Alto)
const COLS = 3; // 3 Columnas
const ROWS = 3; // 3 Filas = 9 Carnés por página
const PAGE_W = 612;  // Ancho Carta
const PAGE_H = 792;  // Alto Carta

// Centrado absoluto de la cuadrícula en la hoja
const MARGIN_LEFT = (PAGE_W - COLS * CARD_W) / 2;
const MARGIN_TOP = (PAGE_H - ROWS * CARD_H) / 2;

// Líneas de Guillotina
const V_LINES = Array.from({ length: COLS + 1 }, (_, i) => MARGIN_LEFT + i * CARD_W);
const H_LINES = Array.from({ length: ROWS + 1 }, (_, i) => MARGIN_TOP + i * CARD_H);

// --- PALETA DE COLORES ---
const c = {
    primary: '#002855',
    accent: '#B91C1C',
    white: '#FFFFFF',
    textLight: '#6B7280'
};

const styles = StyleSheet.create({
    page: {
        backgroundColor: '#FFFFFF',
    },
    // Contenedor principal que envuelve todo (Sin FlexWrap)
    cardsWrapper: {
        position: 'absolute',
        top: MARGIN_TOP,
        left: MARGIN_LEFT,
        width: COLS * CARD_W,
        height: ROWS * CARD_H,
    },
    cardContainer: {
        width: CARD_W,
        height: CARD_H,
        position: 'relative',
        overflow: 'hidden',
    },
    
    bgImageAbsolute: {
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
    },

    // --- CAPAS FLOTANTES DEL FRENTE ---
    fotoWrapper: {
        position: 'absolute',
        top: '32%', 
        left: 0,
        width: '100%',
        alignItems: 'center',
    },
    foto: {
        width: '38mm',  
        height: '39.6mm', 
        objectFit: 'cover',
        borderRadius: 14, 
    },
    textoWrapper: {
        position: 'absolute',
        top: '79%', 
        left: 0,
        width: '100%',
        alignItems: 'center',
        paddingHorizontal: 10,
    },
    nombre: {
        fontSize: 10,
        fontFamily: 'Helvetica-Bold',
        color: c.primary,
        textAlign: 'center',
        textTransform: 'uppercase',
        lineHeight: 1.1,
    },
    rol: {
        fontSize: 8,
        fontFamily: 'Helvetica',
        color: c.primary,
        textAlign: 'center',
        textTransform: 'uppercase',
        marginTop: 2,
    },
    idWrapper: {
        position: 'absolute',
        bottom: '2%', 
        right: '5%', 
        flexDirection: 'row',
        alignItems: 'baseline',
    },
    idLabel: {
        fontSize: 10,
        fontFamily: 'Helvetica',
        color: c.accent,
        marginRight: 2,
    },
    idValor: {
        fontSize: 10,
        fontFamily: 'Helvetica-Bold',
        color: c.accent,
    },

    // --- CAPAS FLOTANTES DEL REVERSO ---
    venceWrapper: {
        position: 'absolute',
        top: '30%', 
        left: 0,
        width: '100%',
        alignItems: 'center',
    },
    venceTexto: {
        fontSize: 9,
        fontFamily: 'Helvetica-Bold',
        color: c.white, 
    },

    cutLinesLayer: {
        position: 'absolute',
        top: 0,
        left: 0,
    }
});

const CutLines = () => (
    <Svg style={styles.cutLinesLayer} width={PAGE_W} height={PAGE_H}>
        {V_LINES.map((x, i) => (
            <Line key={`v${i}`} x1={x} y1={0} x2={x} y2={PAGE_H} stroke="#999999" strokeWidth={0.5} strokeDasharray="3 3" />
        ))}
        {H_LINES.map((y, i) => (
            <Line key={`h${i}`} x1={0} y1={y} x2={PAGE_W} y2={y} stroke="#999999" strokeWidth={0.5} strokeDasharray="3 3" />
        ))}
    </Svg>
);

const CarnetFrontal = ({ miembro, baseUrl }) => (
    <View style={styles.cardContainer}>
        <Image src={`${baseUrl}/assets/atleta-frente-bg.png`} style={styles.bgImageAbsolute} />
        <View style={styles.fotoWrapper}>
            <Image src={miembro.foto_url_final || miembro.foto_url} style={styles.foto} />
        </View>
        <View style={styles.textoWrapper}>
            <Text style={styles.nombre}>{miembro.nombres}</Text>
            <Text style={styles.nombre}>{miembro.apellidos}</Text>
            <Text style={styles.rol}>{miembro.rol}</Text>
        </View>
        <View style={styles.idWrapper}>
            <Text style={styles.idLabel}>ID.</Text>
            <Text style={styles.idValor}>{miembro.carnet_numero || 'PENDIENTE'}</Text>
        </View>
    </View>
);

const CarnetReverso = ({ baseUrl, fechaExpiracion }) => (
    <View style={styles.cardContainer}>
        <Image src={`${baseUrl}/assets/atleta-atras-bg.png`} style={styles.bgImageAbsolute} />
        <View style={styles.venceWrapper}>
            <Text style={styles.venceTexto}>
                {fechaExpiracion ? fechaExpiracion.toUpperCase() : '31/DIC/2026'}
            </Text>
        </View>
    </View>
);

export const CarnetDocument = ({ miembros, baseUrl, fechaExpiracion }) => {
    const itemsPorPagina = COLS * ROWS; // 9
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
                        <View style={styles.cardsWrapper}>
                            {grupo.map((miembro, i) => {
                                // Lógica de Posicionamiento Absoluto (Fila y Columna)
                                const row = Math.floor(i / COLS);
                                const col = i % COLS;
                                return (
                                    <View key={miembro.id} style={{ position: 'absolute', left: col * CARD_W, top: row * CARD_H }}>
                                        <CarnetFrontal miembro={miembro} baseUrl={baseUrl} />
                                    </View>
                                )
                            })}
                        </View>
                        <CutLines />
                    </Page>

                    {/* PÁGINA PAR: REVERSOS (ESPEJO MATEMÁTICO) */}
                    <Page size="LETTER" style={styles.page}>
                        <View style={styles.cardsWrapper}>
                            {grupo.map((_, i) => {
                                const row = Math.floor(i / COLS);
                                // MAGIA ESPEJO: Invierte la columna (Si es Col 0, pasa a Col 2)
                                const colMirrored = (COLS - 1) - (i % COLS);
                                return (
                                    <View key={`back-${i}`} style={{ position: 'absolute', left: colMirrored * CARD_W, top: row * CARD_H }}>
                                        <CarnetReverso baseUrl={baseUrl} fechaExpiracion={fechaExpiracion} />
                                    </View>
                                )
                            })}
                        </View>
                        <CutLines />
                    </Page>
                </React.Fragment>
            ))}
        </Document>
    );
};