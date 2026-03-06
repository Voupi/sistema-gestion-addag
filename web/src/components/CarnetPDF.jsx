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
    primary: '#002855', // Azul Oscuro (texto)
    accent: '#B91C1C',  // Rojo (para el ID)
    white: '#FFFFFF',
    textLight: '#6B7280'
};

const styles = StyleSheet.create({
    page: {
        backgroundColor: '#FFFFFF',
    },
    // Contenedores del Grid
    cardsWrapperFront: {
        position: 'absolute',
        top: MARGIN_TOP,
        left: MARGIN_LEFT,
        flexDirection: 'row',
        flexWrap: 'wrap',
        width: COLS * CARD_W,
        height: ROWS * CARD_H,
    },
    cardsWrapperBack: {
        position: 'absolute',
        top: MARGIN_TOP,
        left: MARGIN_LEFT,
        flexDirection: 'row-reverse', // MAGIA ESPEJO: Alinea de derecha a izquierda
        flexWrap: 'wrap',
        width: COLS * CARD_W,
        height: ROWS * CARD_H,
    },
    cardContainer: {
        width: CARD_W,
        height: CARD_H,
        position: 'relative',
        overflow: 'hidden',
    },
    
    // El fondo debe ser lo primero que se pinta (queda abajo)
    bgImageAbsolute: {
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
    },

    // --- CAPAS FLOTANTES DEL FRENTE ---
    // 1. Contenedor de la Foto (Centrado arriba)
    fotoWrapper: {
        position: 'absolute',
        top: '32%', // Ajusta este % para subir o bajar la foto respecto al marco blanco del fondo
        left: 0,
        width: '100%',
        alignItems: 'center',
    },
    foto: {
        width: '38mm',  // Tamaño de la foto tipo pasaporte
        height: '39.6mm', 
        objectFit: 'cover',
        borderRadius: 14, // Bordes curvos para que encaje en tu diseño
        border: '1.5pt solid #FFFFFF' // Borde blanco
    },

    // 2. Contenedor del Nombre y Rol (Abajo de la foto)
    textoWrapper: {
        position: 'absolute',
        top: '79%', // Ajusta este % para subir o bajar los nombres
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

    // 3. Contenedor del ID (Esquina inferior derecha)
    idWrapper: {
        position: 'absolute',
        bottom: '2%', // Separación del borde inferior
        right: '5%', // Separación del borde derecho
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
        top: '30%', // Ajusta para que caiga justo bajo el logo trasero
        left: 0,
        width: '100%',
        alignItems: 'center',
    },
    venceTexto: {
        fontSize: 9,
        fontFamily: 'Helvetica-Bold',
        color: c.white, // Blanco para resaltar sobre el fondo oscuro
    },

    // Líneas de Guillotina Globales
    cutLinesLayer: {
        position: 'absolute',
        top: 0,
        left: 0,
    }
});

// Componente: Guías de Guillotina
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

// Componente: Cara Frontal
const CarnetFrontal = ({ miembro, baseUrl }) => (
    <View style={styles.cardContainer}>
        {/* 1. FONDO (Siempre de primero) */}
        <Image src={`${baseUrl}/assets/atleta-frente-bg.png`} style={styles.bgImageAbsolute} />

        {/* 2. FOTO */}
        <View style={styles.fotoWrapper}>
            <Image src={miembro.foto_url_final || miembro.foto_url} style={styles.foto} />
        </View>

        {/* 3. NOMBRES Y ROL */}
        <View style={styles.textoWrapper}>
            <Text style={styles.nombre}>{miembro.nombres}</Text>
            <Text style={styles.nombre}>{miembro.apellidos}</Text>
            <Text style={styles.rol}>{miembro.rol}</Text>
        </View>

        {/* 4. CÓDIGO */}
        <View style={styles.idWrapper}>
            <Text style={styles.idLabel}>ID.</Text>
            <Text style={styles.idValor}>{miembro.carnet_numero || 'PENDIENTE'}</Text>
        </View>
    </View>
);

// Componente: Reverso
const CarnetReverso = ({ baseUrl, fechaExpiracion }) => (
    <View style={styles.cardContainer}>
        {/* 1. FONDO REVERSO */}
        <Image src={`${baseUrl}/assets/atleta-atras-bg.png`} style={styles.bgImageAbsolute} />
        
        {/* 2. TEXTO VENCE */}
        <View style={styles.venceWrapper}>
            <Text style={styles.venceTexto}>
                {fechaExpiracion ? fechaExpiracion.toUpperCase() : '31/DIC/2026'}
            </Text>
        </View>
    </View>
);

// Documento Principal
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
                        <View style={styles.cardsWrapperFront}>
                            {grupo.map((miembro) => (
                                <CarnetFrontal
                                    key={miembro.id}
                                    miembro={miembro}
                                    baseUrl={baseUrl}
                                />
                            ))}
                        </View>
                        <CutLines />
                    </Page>

                    {/* PÁGINA PAR: REVERSOS (ESPEJO) */}
                    <Page size="LETTER" style={styles.page}>
                        <View style={styles.cardsWrapperBack}>
                            {grupo.map((_, i) => (
                                // React usa el índice 'i' para dibujar los reversos en orden inverso visualmente
                                <CarnetReverso 
                                    key={i} 
                                    baseUrl={baseUrl} 
                                    fechaExpiracion={fechaExpiracion}
                                />
                            ))}
                        </View>
                        <CutLines />
                    </Page>
                </React.Fragment>
            ))}
        </Document>
    );
};