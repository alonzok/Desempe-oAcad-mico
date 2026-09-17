import { useCallback, useState } from 'react';
import PropTypes from 'prop-types';
import { Typography, Popper } from '@ellucian/react-design-system/core';
import { Panel, Estadistica, Barra, Insignia } from '../components/UI';
import { COLORES, UMBRAL_ASISTENCIA, UMBRAL_CALIFICACION } from '../../data/datosDemo';
import logoBlackboard from './logo-blackboard.png';

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
                    src={logoBlackboard}
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
                    etiqueta="Cursos inscritos"
                    detalle="Periodo actual"
                    valor={delPeriodo.length}
                    color={COLORES.verde}
                />
                <Estadistica
                    etiqueta="Promedio del periodo"
                    detalle="Calificación parcial"
                    valor={promedio == null ? '—' : promedio}
                    color={COLORES.verdeTexto}
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
                                <th style={{ ...th, width: '35%' }}>Curso</th>
                                <th style={{ ...th, textAlign: 'center', width: '10%' }}>Créditos</th>
                                <th style={{ ...th, paddingRight: '0px', textAlign: 'center', width: '10%' }}>Calificación</th>
                                <th style={{ ...th, paddingLeft: '0px', textAlign: 'center', width: '10%' }}>Estado</th>
                                <th style={{ ...th, width: '25%' }}>Asistencia</th>
                                <th style={{ ...th, textAlign: 'center', width: '10%' }}>Estado</th>
                            </tr>
                        </thead>
                        <tbody>
                            {delPeriodo.map((curso) => {
                                const pct = porcentaje(curso.asistencias, curso.registros);
                                const atencion = pct < UMBRAL_ASISTENCIA;
                                const atencionCalificacion = curso.calificacion < UMBRAL_CALIFICACION;
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

                                        <td style={{ ...td, paddingRight:'0px', textAlign: 'center' }}>
                                            <span style={{ fontSize: 19, fontWeight: 700, color: COLORES.texto }}>
                                                {curso.calificacion}
                                            </span>
                                            <span style={{ fontSize: 11, color: COLORES.textoSuave }}>/100</span>
                                        </td>

                                        <td style={{ ...td, paddingLeft: '0px ', textAlign: 'center' }}>
                                            {atencionCalificacion ? (
                                                <Insignia fondo={COLORES.ambarFondo} color={COLORES.ambar}>
                                                    Atención
                                                </Insignia>
                                            ) : (
                                                <Insignia>Esperado</Insignia>
                                            )}
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
                                                <Insignia>Esperado</Insignia>
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
