import React from 'react';
import { Document, Page, Text, View, Image, StyleSheet } from '@react-pdf/renderer';

// --- CONFIGURACIÓN DE COLORES ADDAG ---
const c = {
    primary: '#4A3321',   // Marrón Logo
    secondary: '#005696', // Azul Acción (Usado en Header)
    background: '#FFFFFF',
    text: '#3E4444',      // Gris oscuro lectura
    textLight: '#6B7280', // Gris secundario
    accent: '#C7A77B',    // Dorado/Ocre
    border: '#D1D5DB'     // Gris borde
};

const styles = StyleSheet.create({
    page: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        backgroundColor: '#FFFFFF',
        // Tus medidas validadas para centrado:
        paddingTop: 30,
        paddingLeft: 58,
        paddingRight: 10,
    },
    // --- CONTENEDOR PRINCIPAL CR-80 ---
    cardContainer: {
        width: '85.6mm',
        height: '54mm',
        marginRight: 10,
        marginBottom: 10,
        border: `0.5pt dashed ${c.textLight}`, // Línea de corte sutil
        position: 'relative',
        overflow: 'hidden',
        backgroundColor: c.background
    },

    // --- FRENTE: HEADER ---
    header: {
        width: '100%',
        height: '10mm',
        backgroundColor: c.secondary, // Fondo Azul
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 5
    },
    headerText: {
        color: '#FFFFFF',
        fontSize: 7,
        fontFamily: 'Helvetica-Bold',
        textTransform: 'uppercase'
    },
    logoHeader: {
        width: 25,
        height: 25,
        objectFit: 'contain'
    },

    // --- FRENTE: CUERPO ---
    body: {
        flexDirection: 'row',
        padding: 6,
        height: '44mm' // Resto de la altura
    },
    leftCol: {
        width: '32%',
        alignItems: 'center',
        justifyContent: 'flex-start',
        paddingTop: 2
    },
    rightCol: {
        width: '68%',
        paddingLeft: 6,
        justifyContent: 'flex-start'
    },

    // Foto
    fotoContainer: {
        width: '24mm',
        height: '30mm',
        border: `1pt solid ${c.border}`,
        borderRadius: 2,
        overflow: 'hidden',
        marginBottom: 2
    },
    foto: {
        width: '100%',
        height: '100%',
        objectFit: 'cover'
    },
    fotoLabel: {
        fontSize: 5,
        color: c.textLight,
        textAlign: 'center',
        marginTop: 1
    },

    // Datos
    nameText: {
        fontSize: 10,
        fontFamily: 'Helvetica-Bold',
        color: c.primary,
        marginBottom: 1,
        textTransform: 'uppercase'
    },
    roleText: {
        fontSize: 7,
        fontFamily: 'Helvetica-Bold',
        color: c.secondary,
        marginBottom: 6,
        textTransform: 'uppercase'
    },

    // Grid de datos técnicos (Estilo John Doe)
    dataRow: {
        flexDirection: 'row',
        marginBottom: 3
    },
    dataGroup: {
        width: '50%'
    },
    label: {
        fontSize: 5,
        color: c.textLight,
        fontFamily: 'Helvetica',
        textTransform: 'uppercase'
    },
    value: {
        fontSize: 8,
        color: c.text,
        fontFamily: 'Helvetica-Bold'
    },
    footerData: {
        marginTop: 4,
        borderTop: `0.5pt solid ${c.border}`,
        paddingTop: 2,
        flexDirection: 'row',
        justifyContent: 'space-between'
    },

    // --- REVERSO ---
    backContainer: {
        width: '100%',
        height: '100%',
        padding: 10,
        alignItems: 'center',
        justifyContent: 'space-between'
    },
    backTitle: {
        fontSize: 9,
        fontFamily: 'Helvetica-Bold',
        color: c.primary,
        textAlign: 'center',
        marginBottom: 5
    },
    legalText: {
        fontSize: 6,
        fontFamily: 'Helvetica',
        color: c.text,
        textAlign: 'center',
        lineHeight: 1.3,
        marginBottom: 10,
        paddingHorizontal: 5
    },
    authSection: {
        width: '100%',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        marginBottom: 5
    },
    firmaBox: {
        width: '45%',
        alignItems: 'center'
    },
    firmaLine: {
        width: '100%',
        borderBottom: `1pt solid ${c.text}`,
        marginBottom: 2
    },
    selloBox: {
        width: '45%',
        alignItems: 'center',
        justifyContent: 'center',
        height: '30mm', // Altura reservada para el sello
        position: 'relative'
    },
    // EL SELLO CIRCULAR (3CM)
    selloGuide: {
        width: '30mm', // 3 cm exactos
        height: '30mm',
        borderRadius: '15mm',
        border: `0.5pt dashed ${c.textLight}`, // Guía visual sutil
        alignItems: 'center',
        justifyContent: 'center',
        opacity: 0.5
    },
    selloText: {
        fontSize: 5,
        color: c.textLight,
        textAlign: 'center'
    },
    webFooter: {
        fontSize: 7,
        color: c.secondary,
        fontFamily: 'Helvetica-Bold'
    }
});

// --- COMPONENTE FRENTE ---
const CarnetFrente = ({ miembro }) => (
    <View style={styles.cardContainer}>
        {/* Header */}
        <View style={styles.header}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                {/* Logo pequeño en header si quieres, o solo texto */}
                <Image src="/assets/logo-oficial-new02.png" style={{ width: 15, height: 15, marginRight: 3 }} />
                <Text style={styles.headerText}>ADDAG</Text>
            </View>
            <Text style={styles.headerText}>Carnet de Parqueo</Text>
            <Text style={styles.headerText}>VENCIMIENTO: 31/DIC/2026</Text>
        </View>

        {/* Cuerpo */}
        <View style={styles.body}>
            {/* Izquierda: Foto */}
            <View style={styles.leftCol}>
                <View style={styles.fotoContainer}>
                    <Image src={miembro.foto_url_final || miembro.foto_url} style={styles.foto} />
                </View>
                <Text style={styles.fotoLabel}>FOTO</Text>
            </View>

            {/* Derecha: Datos */}
            <View style={styles.rightCol}>
                <Text style={styles.nameText}>{miembro.nombres}</Text>
                <Text style={styles.nameText}>{miembro.apellidos}</Text>
                {/* Línea decorativa o Rol */}
                <View style={{ width: '100%', height: 1, backgroundColor: c.accent, marginVertical: 4 }} />

                {/* Grid de Datos */}
                <View style={styles.dataRow}>
                    <View style={styles.dataGroup}>
                        <Text style={styles.label}>PERMISO N°</Text>
                        <Text style={[styles.value, { color: '#B91C1C' }]}>
                            {miembro.carnet_numero || 'PENDIENTE'}
                        </Text>
                    </View>
                    <View style={styles.dataGroup}>
                        <Text style={styles.label}>DOCUMENTO ID</Text>
                        <Text style={styles.value}>{miembro.dpi_cui}</Text>
                    </View>
                </View>

                <View style={styles.footerData}>
                    <View style={styles.dataGroup}>
                        <Text style={styles.label}>DEPTO</Text>
                        <Text style={[styles.value, { fontSize: 7 }]}>{miembro.departamento}</Text>
                    </View>
                    <View style={styles.dataGroup}>
                        <Text style={styles.label}>TELÉFONO</Text>
                        <Text style={styles.value}>{miembro.telefono}</Text>
                    </View>
                </View>
            </View>
        </View>
    </View>
);

// --- COMPONENTE REVERSO ---
const CarnetReverso = () => (
    <View style={styles.cardContainer}>
        <View style={styles.backContainer}>
            <View>
                <Text style={styles.backTitle}>ASOCIACIÓN DEPARTAMENTAL DE</Text>
                <Text style={styles.backTitle}>AJEDREZ DE GUATEMALA</Text>
            </View>

            <View>
                <Text style={styles.legalText}>ESTE CARNÉ ES PERSONAL E INTRANSFERIBLE.</Text>
                <Text style={styles.legalText}>
                    Válido únicamente para el uso de estacionamiento dentro de las
                    instalaciones autorizadas por la ADDAG.
                </Text>
            </View>

            {/* Área de Firma y Sello */}
            <View style={styles.authSection}>
                <View style={styles.firmaBox}>
                    <Text style={[styles.label, { marginBottom: 15 }]}>AUTORIZA (Firma):</Text>
                    <View style={styles.firmaLine} />
                    <Text style={{ fontSize: 6 }}>Administración</Text>
                </View>

                {/*<View style={styles.selloBox}>
                    {/* El Círculo Guía de 3cm /}
                    <View style={styles.selloGuide}>
                        <Text style={styles.selloText}>SELLO 3CM</Text>
                    </View>
                </View>*/}
            </View>

            <Text style={styles.webFooter}>www.ajedrezguate.org</Text>
        </View>
    </View>
);

// --- DOCUMENTO MAESTRO ---
export const CarnetDocument = ({ miembros }) => {
    // 8 carnés por página (2 columnas x 4 filas)
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
                            <CarnetFrente key={miembro.id} miembro={miembro} />
                        ))}
                    </Page>

                    {/* PÁGINA PAR: REVERSOS */}
                    <Page size="LETTER" style={styles.page}>
                        {grupo.map((_, i) => (
                            <CarnetReverso key={i} />
                        ))}
                    </Page>
                </React.Fragment>
            ))}
        </Document>
    );
};