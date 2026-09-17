import { useState } from 'react';
import { useAnchoDe } from './useMedidas';

// ────────────────────────────────────────────────────────────────────
// Trayectoria de promedio por periodo.
//
// Se dibuja a la MEDIDA REAL del contenedor. Antes el SVG tenía un
// viewBox fijo de 460x110 estirado con width="100%": el navegador lo
// escalaba conservando la proporción, y por eso quedaban franjas blancas
// a los lados y el texto crecía o se encogía junto con el dibujo.
//
// La escala vertical arranca en 50 y no en 0: casi todos los promedios
// viven entre 60 y 100, y estirar el eje hasta 0 aplasta esas diferencias
// hasta volverlas ilegibles. Los valores que caen por debajo (un periodo
// en 0, por ejemplo) se dibujan SOBRE el piso con un marcador distinto,
// para que se vea la caída sin que el trazo se salga del recuadro, que es
// lo que pasaba antes.
// ────────────────────────────────────────────────────────────────────

const ACENTO = '#1D9E75';
const FUERA_ESCALA = '#C0392B';

const V_MIN = 50;
const V_MAX = 100;

const PAD_TOP = 30;
const PAD_BOTTOM = 34;
const ANCHO_MINIMO = 260;

// Separación mínima entre etiquetas para que no se encimen. Cuando hay
// más periodos de los que caben, se muestra una de cada N.
const SEP_PERIODO = 48;
const SEP_VALOR = 34;

const TrayectoriaPromedio = ({ datos = [], minima = 60, angosto = false }) => {
    const [contenedor, anchoMedido] = useAnchoDe();
    const [seleccion, setSeleccion] = useState(null);

    const alto = angosto ? 200 : 190;
    const padX = angosto ? 24 : 32;

    const ancho = Math.max(anchoMedido || 0, ANCHO_MINIMO);
    const util = Math.max(ancho - 2 * padX, 1);
    const piso = alto - PAD_BOTTOM;

    const yDe = (valor) => {
        const acotado = Math.max(V_MIN, Math.min(V_MAX, valor));
        return PAD_TOP + (1 - (acotado - V_MIN) / (V_MAX - V_MIN)) * (piso - PAD_TOP);
    };
    const xDe = (i) => (datos.length > 1 ? padX + (i * util) / (datos.length - 1) : ancho / 2);

    // Un periodo en curso llega sin promedio. Antes se convertía en una
    // coordenada NaN y rompía el trazo completo; aquí se marca como nulo y
    // simplemente no se dibuja.
    const puntos = datos.map((d, i) => {
        const numero = Number(d.promedio);
        const valor = d.promedio == null || !Number.isFinite(numero) ? null : numero;
        return {
            etiqueta: d.etiqueta,
            clave: d.clave != null ? d.clave : i,
            indice: i,
            valor,
            fuera: valor != null && valor < V_MIN,
            x: xDe(i),
            y: valor == null ? piso : yDe(valor)
        };
    });

    // El trazo se corta en los periodos sin promedio: unirlos dibujaría
    // una recta entre dos periodos que no son consecutivos.
    const tramos = [];
    let tramo = [];
    puntos.forEach((p) => {
        if (p.valor == null) {
            if (tramo.length > 1) tramos.push(tramo);
            tramo = [];
        } else {
            tramo.push(p);
        }
    });
    if (tramo.length > 1) tramos.push(tramo);

    const separacion = datos.length > 1 ? util / (datos.length - 1) : util;
    const paso = (minimo) => Math.max(1, Math.ceil(minimo / Math.max(separacion, 1)));
    const pasoPeriodo = paso(SEP_PERIODO);
    const pasoValor = paso(SEP_VALOR);
    const ultimo = puntos.length - 1;

    // El último periodo siempre se rotula; los que quedarían pegados a él
    // se omiten para que no se encimen.
    const rotular = (indice, cada) => {
        if (indice === ultimo) return true;
        if (indice % cada !== 0) return false;
        return ultimo - indice >= cada;
    };

    // Nunca menos de 26 px: por debajo de eso el dedo no distingue puntos.
    const anchoToque = Math.max(separacion, 26);

    const yMinima = yDe(minima);
    const hayFuera = puntos.some((p) => p.fuera);
    const hayEnCurso = puntos.some((p) => p.valor == null);

    const activo = puntos.find((p) => p.indice === seleccion) || null;

    const notas = [];
    if (hayFuera) {
        notas.push(`La escala empieza en ${V_MIN}: los periodos por debajo se marcan sobre el eje.`);
    }
    if (hayEnCurso) {
        notas.push('Los periodos sin promedio (en curso) no se dibujan y la línea se corta ahí.');
    }

    if (!puntos.length) {
        return (
            <div style={{ fontSize: 13, color: '#6E6E6E' }}>
                Todavía no hay periodos con promedio registrado.
            </div>
        );
    }

    return (
        <div ref={contenedor} style={{ width: '100%' }}>
            {/* En pantallas angostas no caben todas las etiquetas, así que
                el valor de cada punto se consulta tocándolo y se lee aquí. */}
            <div style={{ fontSize: 12, color: '#6E6E6E', minHeight: 18, marginBottom: 2 }}>
                {activo ? (
                    <span>
                        {activo.etiqueta}
                        {' · '}
                        <strong style={{ color: activo.fuera ? FUERA_ESCALA : '#2A2A2A' }}>
                            {activo.valor == null ? 'en curso' : `promedio ${activo.valor}`}
                        </strong>
                    </span>
                ) : (
                    'Toca un punto para ver su periodo.'
                )}
            </div>

            <svg
                width={ancho}
                height={alto}
                viewBox={`0 0 ${ancho} ${alto}`}
                style={{ display: 'block' }}
                role="img"
                aria-label="Promedio por periodo"
            >
                {/* Piso del área de dibujo */}
                <line x1={padX} y1={piso} x2={ancho - padX} y2={piso} stroke="#ECECEC" strokeWidth="1" />

                {/* Calificación mínima aprobatoria */}
                <line
                    x1={padX}
                    y1={yMinima}
                    x2={ancho - padX}
                    y2={yMinima}
                    stroke="#D0D0D0"
                    strokeWidth="1"
                    strokeDasharray="4 4"
                />
                <text x={ancho - padX} y={yMinima - 4} textAnchor="end" style={{ fontSize: 10, fill: '#9A9A9A' }}>
                    mínima ({minima})
                </text>

                {tramos.map((segmento) => (
                    <polyline
                        key={`tramo-${segmento[0].indice}`}
                        points={segmento.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')}
                        fill="none"
                        stroke={ACENTO}
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                ))}

                {puntos.map((p) => {
                    const seleccionado = p.indice === seleccion;
                    const mostrarValor = p.valor != null && (p.fuera || seleccionado || rotular(p.indice, pasoValor));
                    const mostrarPeriodo = seleccionado || rotular(p.indice, pasoPeriodo);

                    return (
                        <g key={p.clave}>
                            {p.valor == null ? null : (
                                <circle
                                    cx={p.x}
                                    cy={p.y}
                                    r={seleccionado ? 5.5 : 3.5}
                                    fill={p.fuera ? '#FFFFFF' : ACENTO}
                                    stroke={p.fuera ? FUERA_ESCALA : '#FFFFFF'}
                                    strokeWidth={p.fuera ? 2 : (seleccionado ? 2 : 0)}
                                />
                            )}

                            {mostrarValor ? (
                                <text
                                    x={p.x}
                                    y={p.y - 10}
                                    textAnchor="middle"
                                    style={{
                                        fontSize: 10,
                                        fill: p.fuera ? FUERA_ESCALA : '#2A2A2A',
                                        fontWeight: seleccionado ? 700 : 500
                                    }}
                                >
                                    {p.valor}
                                </text>
                            ) : null}

                            {mostrarPeriodo ? (
                                <text
                                    x={p.x}
                                    y={alto - 12}
                                    textAnchor="middle"
                                    style={{ fontSize: 10, fill: seleccionado ? '#2A2A2A' : '#9A9A9A' }}
                                >
                                    {p.etiqueta}
                                </text>
                            ) : null}

                            {/* Área de toque: una columna invisible de alto
                                completo. El punto visible mide 3.5 px de
                                radio y con el dedo habría que atinarle
                                también en vertical; así basta con tocar
                                sobre el periodo. */}
                            <rect
                                x={p.x - anchoToque / 2}
                                y={PAD_TOP - 14}
                                width={anchoToque}
                                height={piso - PAD_TOP + 28}
                                fill="transparent"
                                style={{ cursor: 'pointer' }}
                                onClick={() => setSeleccion(seleccionado ? null : p.indice)}
                            />
                        </g>
                    );
                })}
            </svg>

            {notas.length ? (
                <div style={{ fontSize: 11, color: '#9A9A9A', marginTop: 6, lineHeight: 1.4 }}>
                    {notas.map((nota) => (
                        <div key={nota}>{nota}</div>
                    ))}
                </div>
            ) : null}
        </div>
    );
};

export default TrayectoriaPromedio;
