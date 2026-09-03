import { useCallback, useState } from 'react';
import PropTypes from 'prop-types';
import { Typography, Popper } from '@ellucian/react-design-system/core';
import { Panel, Estadistica, Barra, Insignia } from '../components/UI';
import { COLORES, UMBRAL_ASISTENCIA } from '../../data/datosDemo';

// 202610 -> 2026-1
const periodoLegible = (cod) => {
    const m = String(cod || '').match(/^(\d{4})(\d{2})$/);
    if (!m) return String(cod || '');
    const ciclo = { '10': '1', '20': '2', '30': '3' }[m[2]] || String(parseInt(m[2], 10));
    return `${m[1]}-${ciclo}`;
};

// ── Materias impartidas en Blackboard ───────────────────────────────
// El pipeline manda el campo Blackboard ("Y" / "N") por materia; el parser
// lo convierte en curso.blackboard.
const LOGO_BLACKBOARD = 'data:image/png;base64,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';

// Distintivo con explicación al pasar el mouse (o al enfocar con teclado).
// Se abre un Popper del design system en lugar del title del navegador,
// que tarda en aparecer y no se puede dar estilo.
const DistintivoBlackboard = ({ id }) => {
    const [anchorEl, setAnchorEl] = useState(null);
    const [abierto, setAbierto] = useState(false);

    const abrir = useCallback((evento) => {
        if (abierto) return;
        setAnchorEl(evento.currentTarget);
        setAbierto(true);
    }, [abierto]);

    const cerrar = useCallback(() => {
        setAnchorEl(null);
        setAbierto(false);
    }, []);

    const idPopper = `blackboard_${id}`;

    return (
        <>
            {/* Va en un <button> y no en un <span>: tabIndex solo puede
                usarse en elementos interactivos (regla de accesibilidad
                jsx-a11y/no-noninteractive-tabindex). De paso, al ser un
                botón también recibe foco al tocarlo, así el aviso se puede
                ver en móvil, donde no existe el hover. */}
            <button
                type="button"
                aria-controls={idPopper}
                aria-expanded={abierto}
                aria-label="Materia impartida en Blackboard"
                onFocus={abrir}
                onBlur={cerrar}
                onMouseOver={abrir}
                onMouseLeave={cerrar}
                style={{
                    display: 'inline-flex',
                    padding: 0,
                    border: 'none',
                    background: 'none',
                    cursor: 'help',
                    borderRadius: 4,
                    lineHeight: 0
                }}
            >
                <img
                    src={LOGO_BLACKBOARD}
                    alt=""
                    style={{ width: 18, height: 18, borderRadius: 4, flexShrink: 0, display: 'block' }}
                />
            </button>

            <Popper
                id={idPopper}
                role="alert"
                // aria-live es necesario con hover: sin él, role="alert"
                // impide que el lector de pantalla anuncie el contenido.
                aria-live="polite"
                open={abierto}
                arrow
                anchorEl={anchorEl}
                placement="top"
            >
                <Typography style={{ fontSize: 13, maxWidth: '15rem' }}>
                    Materia impartida en la plataforma Blackboard
                </Typography>
            </Popper>
        </>
    );
};
DistintivoBlackboard.propTypes = { id: PropTypes.string };

// Quita los decimales de más sin alterar el valor cuando ya es exacto:
// 92.63 -> 92.63 ; 75.4233333 -> 75.42 ; 95 -> 95
const recortarDecimales = (n, maximo = 2) => {
    const x = Number(n);
    if (!Number.isFinite(x)) return n;
    return Number(x.toFixed(maximo));
};

const porcentaje = (parte, total) =>
    total > 0 ? Math.round((Number(parte) / Number(total)) * 100) : 0;

// Todas las materias cuentan: las que no tienen calificación valen 0.
// Sin redondear: se conservan los decimales tal como llegan del pipeline.
// Solo se recorta la cola de los decimales periódicos (55 + 84.52 + 86.75
// entre 3 daría 75.42333333...).
const promedioDe = (cursos) => {
    if (cursos.length === 0) return 0;
    const suma = cursos.reduce((acc, c) => acc + Number(c.calificacion || 0), 0);
    return recortarDecimales(suma / cursos.length);
};

// Los cursos vienen del pipeline de desempeño académico.
const DesempenoTab = ({ cursos = [] }) => {
    // La tarjeta muestra únicamente el periodo actual (el que aparece en el
    // encabezado), así que no hay selector: se toma el periodo más reciente
    // de los cursos que devuelve el pipeline.
    const periodos = [...new Set(cursos.map((c) => c.periodo).filter(Boolean))].sort().reverse();
    const periodoActivo = periodos[0] || '';

    const delPeriodo = periodoActivo
        ? cursos.filter((c) => c.periodo === periodoActivo)
        : cursos;

    const promedio = promedioDe(delPeriodo);
    const asistidas = delPeriodo.reduce((acc, c) => acc + c.asistencias, 0);
    const registros = delPeriodo.reduce((acc, c) => acc + c.registros, 0);
    const asistenciaGlobal = porcentaje(asistidas, registros);

    const th = {
        textAlign: 'left',
        padding: '10px 16px',
        fontSize: 10,
        letterSpacing: '0.07em',
        textTransform: 'uppercase',
        color: COLORES.verdeTexto,
        fontWeight: 700,
        background: '#F3F7F4',
        borderBottom: `1px solid ${COLORES.linea}`
    };
    const td = {
        padding: '14px 16px',
        fontSize: 13,
        borderBottom: `1px solid ${COLORES.linea}`,
        verticalAlign: 'middle'
    };

    return (
        <div>
            {/* Encabezado de la sección */}
            <div
                style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-end',
                    gap: 16,
                    flexWrap: 'wrap',
                    marginBottom: '1rem'
                }}
            >
                <div>
                    <Typography
                        style={{
                            fontSize: 11,
                            letterSpacing: '0.08em',
                            textTransform: 'uppercase',
                            color: COLORES.verdeTexto,
                            fontWeight: 600
                        }}
                    >
                        Desempeño académico
                    </Typography>
                    <Typography style={{ fontSize: 22, fontWeight: 700, color: COLORES.verde }}>
                        Calificaciones y asistencia por curso
                    </Typography>
                    <Typography style={{ fontSize: 13, color: COLORES.textoSuave }}>
                        Resultados parciales registrados a la fecha
                        {periodoActivo ? ` · periodo ${periodoLegible(periodoActivo)}` : ''}.
                    </Typography>
                </div>

            </div>

            {/* Cifras del periodo */}
            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
                    gap: '1rem',
                    marginBottom: '1rem'
                }}
            >
                <Estadistica
                    etiqueta="Promedio del periodo"
                    detalle="Calificación parcial"
                    valor={promedio == null ? '—' : promedio}
                    color={COLORES.verdeTexto}
                />
                <Estadistica
                    etiqueta="Cursos inscritos"
                    detalle="Periodo actual"
                    valor={delPeriodo.length}
                    color={COLORES.verde}
                />
                <Estadistica
                    etiqueta="Asistencia acumulada"
                    detalle={`${asistidas} de ${registros} registros`}
                    valor={asistenciaGlobal}
                    sufijo="%"
                    color={COLORES.verde}
                />
            </div>

            {/* Tabla de cursos */}
            {delPeriodo.length === 0 ? (
                <Panel>
                    <Typography style={{ fontSize: 13, color: COLORES.textoSuave }}>
                        No hay cursos registrados para este periodo.
                    </Typography>
                </Panel>
            ) : (
            <Panel sinPadding estilo={{ overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto' }}>
                    <table
                        style={{
                            width: '100%',
                            borderCollapse: 'collapse',
                            minWidth: 720,
                            // Con layout fijo los porcentajes mandan; si no, la
                            // primera columna se queda con todo el sobrante y
                            // las demás se apelmazan a la derecha.
                            tableLayout: 'fixed'
                        }}
                    >
                        <thead>
                            <tr>
                                <th style={{ ...th, width: '34%' }}>Curso</th>
                                <th style={{ ...th, textAlign: 'center', width: '11%' }}>Créditos</th>
                                <th style={{ ...th, textAlign: 'center', width: '16%' }}>Calificación</th>
                                <th style={{ ...th, width: '25%' }}>Asistencia</th>
                                <th style={{ ...th, textAlign: 'center', width: '14%' }}>Estado</th>
                            </tr>
                        </thead>
                        <tbody>
                            {delPeriodo.map((curso) => {
                                const pct = porcentaje(curso.asistencias, curso.registros);
                                const atencion = pct < UMBRAL_ASISTENCIA;
                                return (
                                    <tr key={curso.clave}>
                                        <td style={td}>
                                            <div style={{ display: 'flex', gap: 12 }}>
                                                <span
                                                    style={{
                                                        width: 4,
                                                        borderRadius: 4,
                                                        background: curso.color,
                                                        flexShrink: 0
                                                    }}
                                                />
                                                <div style={{ minWidth: 0 }}>
                                                    <div style={{ fontSize: 10, color: COLORES.textoSuave, fontWeight: 600 }}>
                                                        {curso.clave}
                                                    </div>
                                                    <div
                                                        style={{
                                                            fontWeight: 700,
                                                            color: COLORES.verde,
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: 6
                                                        }}
                                                    >
                                                        {curso.nombre}
                                                        {curso.blackboard
                                                            ? <DistintivoBlackboard id={String(curso.clave)} />
                                                            : null}
                                                    </div>
                                                    {curso.horario ? (
                                                        <div style={{ fontSize: 11, color: COLORES.textoSuave, marginTop: 2 }}>
                                                            {curso.horario}
                                                        </div>
                                                    ) : null}
                                                </div>
                                            </div>
                                        </td>

                                        <td style={{ ...td, textAlign: 'center' }}>
                                            <span style={{ fontSize: 16, fontWeight: 700, color: COLORES.verde }}>
                                                {curso.creditos}
                                            </span>
                                        </td>

                                        <td style={{ ...td, textAlign: 'center' }}>
                                            <span style={{ fontSize: 19, fontWeight: 700, color: COLORES.texto }}>
                                                {curso.calificacion}
                                            </span>
                                            <span style={{ fontSize: 11, color: COLORES.textoSuave }}>/100</span>
                                        </td>

                                        <td style={td}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                                                <span style={{ fontWeight: 700, color: COLORES.texto }}>
                                                    {curso.asistencias}/{curso.registros}
                                                </span>
                                                <span style={{ color: COLORES.textoSuave }}>{pct}%</span>
                                            </div>
                                            <div style={{ marginTop: 5 }}>
                                                <Barra porcentaje={pct} color={curso.color} />
                                            </div>
                                            <div style={{ fontSize: 10, color: COLORES.textoSuave, marginTop: 3 }}>
                                                asistencias
                                            </div>
                                        </td>

                                        <td style={{ ...td, textAlign: 'center' }}>
                                            {atencion ? (
                                                <Insignia fondo={COLORES.ambarFondo} color={COLORES.ambar}>
                                                    Atención
                                                </Insignia>
                                            ) : (
                                                <Insignia>En curso</Insignia>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </Panel>
            )}

            <Typography style={{ fontSize: 11, color: COLORES.textoSuave, marginTop: 12 }}>
                Las calificaciones y asistencias son parciales y pueden cambiar conforme el personal
                docente actualice la información.
            </Typography>
        </div>
    );
};

DesempenoTab.propTypes = { cursos: PropTypes.array };

export default DesempenoTab;
