import React from 'react';
import { Document, Page, Text, View, Image, StyleSheet, Svg, Line, Font } from '@react-pdf/renderer';

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
        top: '35%', 
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

// Función para calcular el fontSize dinámico basado en la longitud del texto
// Ancho disponible: ~133pt (153pt - 20pt padding)
// Helvetica-Bold: ~14 chars por línea a fontSize 10, ~15.5 a fontSize 9, ~17 a fontSize 8
const calcularFontSize = (texto) => {
    if (!texto) return 10;
    
    const longitud = texto.length;
    
    // A fontSize 10: máximo ~14-15 caracteres por línea
    // Si cabe en máximo 2 líneas: 14 * 2 = 28 caracteres
    if (longitud <= 28) {
        return 10;
    }
    
    // A fontSize 9: máximo ~16 caracteres por línea
    // Si cabe en máximo 2 líneas: 16 * 2 = 32 caracteres
    if (longitud <= 32) {
        return 9;
    }
    
    // A fontSize 8: máximo ~18 caracteres por línea
    // Si ocupa 3+ líneas, usar fontSize 8
    return 8;
};

const CarnetFrontal = ({ miembro, baseUrl }) => {
    // 1. Unir nombre y apellidos en una sola cadena
    const nombreCompleto = `${miembro.nombres || ''} ${miembro.apellidos || ''}`.trim();
    
    // 2. Calcular el tamaño de fuente basado en el nombre completo
    const fontSize = calcularFontSize(nombreCompleto);
    
    // 3. Crear un solo objeto de estilo para el nombre completo
    const estiloNombreCompleto = {
        ...styles.nombre,
        fontSize: fontSize,
    };
    
    return (
        <View style={styles.cardContainer}>
            <Image src={`${baseUrl}/assets/atleta-frente-bg.png`} style={styles.bgImageAbsolute} />
            <View style={styles.fotoWrapper}>
                <Image src={miembro.foto_url_final || miembro.foto_url} style={styles.foto} />
            </View>
            <View style={styles.textoWrapper}>
                {/* 4. Usar un solo Text para que el texto fluya naturalmente */}
                <Text style={estiloNombreCompleto}>{nombreCompleto}</Text>
                <Text style={styles.rol}>{miembro.rol}</Text>
            </View>
            <View style={styles.idWrapper}>
                <Text style={styles.idLabel}>ID.</Text>
                <Text style={styles.idValor}>{miembro.carnet_numero || 'PENDIENTE'}</Text>
            </View>
        </View>
    );
};

const CarnetReverso = ({ baseUrl, fechaExpiracion }) => (
    <View style={styles.cardContainer}>
        <Image src={`${baseUrl}/assets/atleta-atras-bg.png`} style={styles.bgImageAbsolute} />
        <View style={styles.venceWrapper}>
            <Text style={styles.venceTexto}>
                {fechaExpiracion ? fechaExpiracion.toUpperCase() : `31/DIC/${new Date().getFullYear()}`}
            </Text>
        </View>
    </View>
);

// Desactivar la separación de palabras con guiones en todo el documento
// Esto hace que las palabras completas se muevan a la siguiente línea si no caben
Font.registerHyphenationCallback(word => [word]);

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