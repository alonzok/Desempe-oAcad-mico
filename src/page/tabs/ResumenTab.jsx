import { useRef, useState } from 'react';
import { Typography } from '@ellucian/react-design-system/core';
import { Rotulo, Anillo, Barra, Insignia } from '../components/UI';
import DesempenoSeccion from './DesempenoTab';
import { COLORES, RANGOS_DESEMPENO, DESEMPENO_SIN_DATOS } from '../../data/datosDemo';
import LoadingOverlay from '../components/LoadingOverlay';

const iniciales = (nombre) =>
    String(nombre || '')
        .split(' ')
        .slice(0, 2)
        .map((x) => x[0])
        .join('')
        .toUpperCase();

// ── Ficha del estudiante ────────────────────────────────────────────
const FichaEstudiante = ({ estudiante, onIrCredencial }) => (
    <div>
        <div style={{ display: 'flex', gap: 16 }}>
            <div style={{ textAlign: 'center', flexShrink: 0 }}>
                <div
                    style={{
                        width: 84,
                        height: 96,
                        borderRadius: 12,
                        background: COLORES.verdeClaro,
                        color: COLORES.verde,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 28,
                        fontWeight: 700
                    }}
                >
                    {iniciales(estudiante.nombre)}
                </div>
                <div
                    style={{
                        marginTop: -10,
                        position: 'relative',
                        display: 'inline-block',
                        background: COLORES.verde,
                        color: '#FFFFFF',
                        fontSize: 10,
                        fontWeight: 700,
                        letterSpacing: '0.06em',
                        padding: '3px 10px',
                        borderRadius: 999
                    }}
                >
                    {estudiante.estatus}
                </div>
            </div>

            <div style={{ minWidth: 0 }}>
                <Rotulo color={COLORES.verdeTexto}>Estudiante</Rotulo>
                <Typography style={{ fontSize: 20, fontWeight: 700, lineHeight: 1.25, color: COLORES.verde }}>
                    {estudiante.nombre}
                </Typography>
                <Typography style={{ fontSize: 13, color: COLORES.texto, marginTop: 4 }}>
                    {estudiante.programa}
                </Typography>
                <Typography style={{ fontSize: 13, color: COLORES.verdeTexto, fontWeight: 600 }}>
                    {estudiante.facultad}
                </Typography>

                <div style={{ display: 'flex', gap: 22, marginTop: 14, flexWrap: 'wrap' }}>
                    {[
                        ['Matrícula', estudiante.matricula],
                        ['Campus', estudiante.campus],
                        ['Semestre', estudiante.semestre]
                    ].map(([etiqueta, valor]) => (
                        <div key={etiqueta}>
                            <Typography style={{ fontSize: 10, letterSpacing: '0.06em', textTransform: 'uppercase', color: COLORES.textoSuave, fontWeight: 600 }}>
                                {etiqueta}
                            </Typography>
                            <Typography style={{ fontSize: 14, fontWeight: 700, color: COLORES.verde }}>
                                {valor}
                            </Typography>
                        </div>
                    ))}
                </div>
            </div>
        </div>

        <button
            type="button"
            onClick={onIrCredencial}
            style={{
                marginTop: 18,
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                background: COLORES.verdeClaro,
                border: 'none',
                borderRadius: 10,
                padding: '12px 14px',
                cursor: 'pointer',
                textAlign: 'left'
            }}
        >
            <span>
                <span style={{ display: 'block', fontSize: 14, fontWeight: 700, color: COLORES.verde }}>
                    Ver credencial digital
                </span>
                <span style={{ display: 'block', fontSize: 12, color: COLORES.textoSuave }}>
                    Acceso seguro con código QR
                </span>
            </span>
            <span style={{ color: COLORES.verde, fontSize: 18 }}>›</span>
        </button>
    </div>
);

// ── Desempeño actual (calculado con los datos del pipeline) ─────────
// Colores de la insignia según el rango alcanzado.
const COLOR_RANGO = {
    verde: { bg: COLORES.verdeClaro, fg: COLORES.verdeTexto },
    ambar: { bg: COLORES.ambarFondo, fg: COLORES.ambar },
    rojo: { bg: '#FEE2E2', fg: '#B91C1C' },
    gris: { bg: '#EEEEEE', fg: '#555555' }
};

const DesempenoActual = ({ resumen }) => {
    const { promedio, asistencia, avance, creditos, creditosCursados, creditosTotales, titulo, etiqueta, color } = resumen;
    // Si hay avance del plan se muestra ese; si no, la asistencia.
    const hayAvance = avance != null;
    const colorEtiqueta = COLOR_RANGO[color] || COLOR_RANGO.gris;

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                <Rotulo color={COLORES.verdeTexto}>Desempeño actual</Rotulo>
                <Insignia fondo={colorEtiqueta.bg} color={colorEtiqueta.fg}>{etiqueta}</Insignia>
            </div>

            <Typography style={{ fontSize: 19, fontWeight: 700, color: COLORES.verde, marginBottom: 14 }}>
                {titulo}
            </Typography>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <div>
                    <Typography style={{ fontSize: 34, fontWeight: 700, color: COLORES.verdeTexto, lineHeight: 1 }}>
                        {promedio == null ? '—' : promedio}
                        {promedio == null ? null : (
                            <span style={{ fontSize: 14, color: COLORES.textoSuave, fontWeight: 600 }}>/100</span>
                        )}
                    </Typography>
                    <Typography style={{ fontSize: 12, color: COLORES.textoSuave, marginTop: 4 }}>Promedio</Typography>
                </div>

                {/* Avance de la carrera (créditos cursados del plan). Si el
                    pipeline no lo manda, se muestra la asistencia. */}
                <Anillo
                    porcentaje={hayAvance ? avance : asistencia}
                    etiqueta={hayAvance ? 'Avance' : 'Asistencia'}
                    color={COLORES.oro}
                />

                <div style={{ textAlign: 'right' }}>
                    <Typography style={{ fontSize: 30, fontWeight: 700, color: COLORES.verde, lineHeight: 1 }}>
                        {hayAvance ? creditosCursados : creditos}
                    </Typography>
                    <Typography style={{ fontSize: 12, color: COLORES.textoSuave, marginTop: 4 }}>
                        {hayAvance ? `de ${creditosTotales}` : 'Créditos'}
                    </Typography>
                    <Typography style={{ fontSize: 12, color: COLORES.textoSuave }}>
                        {hayAvance ? 'Créditos' : 'del periodo'}
                    </Typography>
                </div>
            </div>

            <div style={{ marginTop: 16 }}>
                <Barra porcentaje={hayAvance ? avance : asistencia} />
            </div>
        </div>
    );
};

// ── Adeudos pendientes ──────────────────────────────────────────────
const MESES_CORTOS = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];
const partirFecha = (iso) => {
    const m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!m) return { dia: '--', mes: '' };
    return { dia: m[3], mes: MESES_CORTOS[Number(m[2]) - 1] || '' };
};

const moneda = (n) => `$${Number(n || 0).toLocaleString('es-MX')}`;

// Cuántos adeudos se muestran antes de ofrecer "Ver todos".
const ADEUDOS_VISIBLES = 3;

const AccionesPrioritarias = ({ adeudos = [] }) => {
    const [verTodos, setVerTodos] = useState(false);

    // Solo cuentan como "pendientes de pago" los que traen monto.
    const conMontoTotal = adeudos.reduce((acc, a) => acc + (a.monto || 0), 0);

    // El botón solo aparece si hay más de tres; con tres o menos se
    // muestran todos y no hace falta desplegar nada.
    const hayDeMas = adeudos.length > ADEUDOS_VISIBLES;
    const visibles = hayDeMas && !verTodos ? adeudos.slice(0, ADEUDOS_VISIBLES) : adeudos;

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                <Rotulo color={COLORES.verdeTexto}>Lo siguiente para ti</Rotulo>
                <span
                    style={{
                        background: COLORES.oro,
                        color: '#FFFFFF',
                        fontSize: 11,
                        fontWeight: 700,
                        width: 20,
                        height: 20,
                        borderRadius: '50%',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}
                >
                    {adeudos.length}
                </span>
            </div>

            <Typography style={{ fontSize: 19, fontWeight: 700, color: COLORES.verde, marginBottom: 4 }}>
                Adeudos pendientes
            </Typography>
            {conMontoTotal > 0 ? (
                <Typography style={{ fontSize: 12, color: COLORES.textoSuave, marginBottom: 12 }}>
                    Total por pagar: <strong style={{ color: COLORES.ambar }}>{moneda(conMontoTotal)} pesos</strong>
                </Typography>
            ) : (
                <div style={{ marginBottom: 12 }} />
            )}

            {adeudos.length === 0 ? (
                <Typography style={{ fontSize: 13, color: COLORES.textoSuave }}>
                    No tienes adeudos pendientes.
                </Typography>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {visibles.map((adeudo, i) => {
                        const f = partirFecha(adeudo.fecha);
                        const conMonto = adeudo.monto > 0;
                        return (
                            <div
                                key={`${adeudo.tipo}-${i}`}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 12,
                                    padding: '10px 12px',
                                    borderRadius: 10,
                                    background: conMonto ? COLORES.ambarFondo : '#F3F7F4',
                                    borderLeft: `3px solid ${conMonto ? COLORES.oro : COLORES.verdeTexto}`
                                }}
                            >
                                <div style={{ textAlign: 'center', flexShrink: 0, minWidth: 30 }}>
                                    <div style={{ fontSize: 16, fontWeight: 700, color: COLORES.verde, lineHeight: 1 }}>
                                        {f.dia}
                                    </div>
                                    <div style={{ fontSize: 9, color: COLORES.textoSuave, fontWeight: 700 }}>{f.mes}</div>
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontSize: 13, fontWeight: 700, color: COLORES.texto }}>{adeudo.tipo}</div>
                                    <div style={{ fontSize: 12, color: COLORES.textoSuave }}>{adeudo.razon}</div>
                                </div>
                                {conMonto ? (
                                    <div style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                                        <div style={{ fontSize: 20, fontWeight: 700, color: COLORES.ambar, lineHeight: 1.1 }}>
                                            {moneda(adeudo.monto)}
                                        </div>
                                        <div style={{ fontSize: 10, color: COLORES.textoSuave, fontWeight: 600 }}>
                                            pesos
                                        </div>
                                    </div>
                                ) : (
                                    <span style={{ fontSize: 11, color: COLORES.verdeTexto, fontWeight: 600, whiteSpace: 'nowrap' }}>
                                        Sin monto
                                    </span>
                                )}
                            </div>
                        );
                    })}

                    {hayDeMas ? (
                        <button
                            type="button"
                            onClick={() => setVerTodos((v) => !v)}
                            style={{
                                marginTop: 2,
                                background: 'none',
                                border: 'none',
                                padding: '6px 0',
                                cursor: 'pointer',
                                color: COLORES.verde,
                                fontSize: 13,
                                fontWeight: 700,
                                textAlign: 'left'
                            }}
                        >
                            {verTodos
                                ? 'Ver menos'
                                : `Ver todos (${adeudos.length})`}
                        </button>
                    ) : null}
                </div>
            )}
        </div>
    );
};

// Las tres secciones van en una sola fila, separadas por líneas finas,
// tal como en el diseño (no son tarjetas independientes).
const columna = (primera) => ({
    padding: primera ? '0 1.6rem 0 0' : '0 1.6rem',
    borderLeft: primera ? 'none' : `1px solid ${COLORES.linea}`,
    minWidth: 0
});

const ResumenTab = ({ onCambiarTab, estudiante, resumen, adeudos }) => (
    <div
        style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))',
            alignItems: 'start',
            rowGap: '1.5rem'
        }}
    >
        <div style={columna(true)}>
            <FichaEstudiante
                estudiante={estudiante}
                onIrCredencial={() => onCambiarTab && onCambiarTab('credencial')}
            />
        </div>
        <div style={columna(false)}>
            <DesempenoActual resumen={resumen} />
        </div>
        <div style={{ ...columna(false), paddingRight: 0 }}>
            <AccionesPrioritarias adeudos={adeudos} />
        </div>
    </div>
);

// Calcula las cifras a partir de los datos del pipeline.
//
// El promedio y el avance en créditos ahora son OFICIALES: vienen en el
// bloque de programa del alumno. Si por alguna razón no llegan, se calculan
// con los cursos del periodo (las materias sin calificación cuentan como 0).
function calcularResumen(cursos, programa = {}) {
    // Los promedios se muestran tal como llegan, sin redondear: el oficial
    // trae decimales (92.63) y perderlos cambiaría el dato.
    const promedioCursos = cursos.length
        ? cursos.reduce((acc, c) => acc + (c.calificacion || 0), 0) / cursos.length
        : null;
    const promedio = programa.promedio != null ? programa.promedio : promedioCursos;

    const asistidas = cursos.reduce((acc, c) => acc + c.asistencias, 0);
    const registros = cursos.reduce((acc, c) => acc + c.registros, 0);
    const asistencia = registros > 0 ? Math.round((asistidas / registros) * 100) : 0;

    // Avance real de la carrera: créditos cursados sobre el total del plan.
    const avance = programa.creditosTotales > 0
        ? Math.round((programa.creditosCursados / programa.creditosTotales) * 100)
        : null;

    const creditos = cursos.reduce((acc, c) => acc + (c.creditos || 0), 0);

    // La etiqueta y el mensaje salen de la tabla de rangos (datosDemo.js).
    const rango = promedio == null
        ? DESEMPENO_SIN_DATOS
        : RANGOS_DESEMPENO.find((r) => promedio >= r.min) || DESEMPENO_SIN_DATOS;

    return {
        promedio,
        asistencia,
        avance,
        creditos,
        creditosCursados: programa.creditosCursados || 0,
        creditosTotales: programa.creditosTotales || 0,
        titulo: rango.titulo,
        etiqueta: rango.etiqueta,
        color: rango.color
    };
}

// El resumen incluye, debajo de las tres columnas, el detalle de
// calificaciones y asistencia por curso.
// Los datos llegan ya cargados desde la página, para que el encabezado,
// el resumen y la credencial compartan una sola consulta.
const ResumenCompleto = ({ onCambiarTab, estudiante, cursos = [], adeudos = [], programa = {}, cargando }) => {
    const refDesempeno = useRef(null);
    const resumen = calcularResumen(cursos, programa);

    return (
        <div style={{ position: 'relative', minHeight: cargando ? 320 : undefined }}>
            <LoadingOverlay activo={cargando} texto="Cargando información del estudiante..." />

            <ResumenTab
                onCambiarTab={onCambiarTab}
                estudiante={estudiante}
                resumen={resumen}
                adeudos={adeudos}
            />

            <div
                ref={refDesempeno}
                style={{
                    borderTop: `1px solid ${COLORES.linea}`,
                    marginTop: '1.75rem',
                    paddingTop: '1.75rem'
                }}
            >
                <DesempenoSeccion cursos={cursos} />
            </div>
        </div>
    );
};

export default ResumenCompleto;
