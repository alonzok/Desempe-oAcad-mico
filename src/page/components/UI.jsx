import PropTypes from 'prop-types';
import { Typography } from '@ellucian/react-design-system/core';
import { COLORES } from '../../data/datosDemo';

// ── Contenedor blanco con borde, usado en todas las secciones ───────
export const Panel = ({ children, sinPadding, estilo }) => (
    <div
        style={{
            background: '#FFFFFF',
            border: `1px solid ${COLORES.linea}`,
            borderRadius: 14,
            padding: sinPadding ? 0 : '1.25rem 1.4rem',
            ...estilo
        }}
    >
        {children}
    </div>
);
Panel.propTypes = {
    children: PropTypes.node,
    sinPadding: PropTypes.bool,
    estilo: PropTypes.object
};

// ── Rótulo pequeño en mayúsculas ────────────────────────────────────
export const Rotulo = ({ children, color }) => (
    <Typography
        style={{
            fontSize: 11,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: color || COLORES.textoSuave,
            fontWeight: 600,
            marginBottom: 6
        }}
    >
        {children}
    </Typography>
);
Rotulo.propTypes = { children: PropTypes.node, color: PropTypes.string };

// ── Tarjeta de dato suelto (promedio, cursos, asistencia) ───────────
export const Estadistica = ({ etiqueta, detalle, valor, sufijo, color }) => (
    // Fondo gris suave y sin borde: en el diseño estas cifras van dentro del
    // panel blanco, así que un borde extra las haría ver encajonadas.
    <div
        style={{
            background: '#FAFAFA',
            border: `1px solid ${COLORES.linea}`,
            borderRadius: 12,
            padding: '1rem 1.2rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12
        }}
    >
        <div>
            <Typography style={{ fontSize: 13, color: COLORES.texto, fontWeight: 600 }}>
                {etiqueta}
            </Typography>
            {detalle ? (
                <Typography style={{ fontSize: 12, color: COLORES.textoSuave, marginTop: 2 }}>
                    {detalle}
                </Typography>
            ) : null}
        </div>
        <Typography style={{ fontSize: 30, fontWeight: 700, color: color || COLORES.texto, whiteSpace: 'nowrap' }}>
            {valor}
            {sufijo ? (
                <span style={{ fontSize: 15, fontWeight: 600, color: COLORES.textoSuave }}>{sufijo}</span>
            ) : null}
        </Typography>
    </div>
);
Estadistica.propTypes = {
    etiqueta: PropTypes.string,
    detalle: PropTypes.string,
    valor: PropTypes.node,
    sufijo: PropTypes.string,
    color: PropTypes.string
};

// ── Anillo de avance ────────────────────────────────────────────────
export const Anillo = ({ porcentaje, etiqueta, tamano = 96, grosor = 9, color }) => {
    const radio = (tamano - grosor) / 2;
    const circunferencia = 2 * Math.PI * radio;
    const avance = Math.max(0, Math.min(100, Number(porcentaje) || 0));
    const centro = tamano / 2;

    return (
        <svg width={tamano} height={tamano} viewBox={`0 0 ${tamano} ${tamano}`} aria-hidden="true">
            <circle cx={centro} cy={centro} r={radio} fill="none" stroke="#EFEFEF" strokeWidth={grosor} />
            <circle
                cx={centro}
                cy={centro}
                r={radio}
                fill="none"
                stroke={color || COLORES.oro}
                strokeWidth={grosor}
                strokeLinecap="round"
                strokeDasharray={`${(avance / 100) * circunferencia} ${circunferencia}`}
                transform={`rotate(-90 ${centro} ${centro})`}
            />
            <text
                x={centro}
                y={centro - 2}
                textAnchor="middle"
                dominantBaseline="middle"
                style={{ fontSize: 17, fontWeight: 700, fill: COLORES.texto }}
            >
                {avance}%
            </text>
            {etiqueta ? (
                <text
                    x={centro}
                    y={centro + 14}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    style={{ fontSize: 9, fill: COLORES.textoSuave }}
                >
                    {etiqueta}
                </text>
            ) : null}
        </svg>
    );
};
Anillo.propTypes = {
    porcentaje: PropTypes.number,
    etiqueta: PropTypes.string,
    tamano: PropTypes.number,
    grosor: PropTypes.number,
    color: PropTypes.string
};

// ── Barra lineal de avance ──────────────────────────────────────────
export const Barra = ({ porcentaje, color, alto = 6 }) => (
    <div style={{ background: '#EFEFEF', borderRadius: 999, height: alto, width: '100%', overflow: 'hidden' }}>
        <div
            style={{
                width: `${Math.max(0, Math.min(100, Number(porcentaje) || 0))}%`,
                background: color || COLORES.verdeTexto,
                height: '100%',
                borderRadius: 999
            }}
        />
    </div>
);
Barra.propTypes = { porcentaje: PropTypes.number, color: PropTypes.string, alto: PropTypes.number };

// ── Etiqueta de estado ──────────────────────────────────────────────
export const Insignia = ({ children, fondo, color }) => (
    <span
        style={{
            display: 'inline-block',
            fontSize: 12,
            fontWeight: 600,
            padding: '4px 12px',
            borderRadius: 999,
            background: fondo || COLORES.verdeClaro,
            color: color || COLORES.verdeTexto,
            whiteSpace: 'nowrap'
        }}
    >
        {children}
    </span>
);
Insignia.propTypes = { children: PropTypes.node, fondo: PropTypes.string, color: PropTypes.string };
