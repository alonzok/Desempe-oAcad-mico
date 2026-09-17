import { useEffect, useRef, useState } from 'react';
import { Typography } from '@ellucian/react-design-system/core';
import { Rotulo, Anillo, Barra, Insignia } from '../components/UI';
import DesempenoSeccion from './DesempenoTab';
import { COLORES, RANGOS_DESEMPENO, DESEMPENO_SIN_DATOS } from '../../data/datosDemo';
import LoadingOverlay from '../components/LoadingOverlay';
import { useEstilosAnimacion, orden, TRANSICION, sinMovimiento } from '../components/animaciones';

const iniciales = (nombre) =>
    String(nombre || '')
        .split(' ')
        .slice(0, 2)
        .map((x) => x[0])
        .join('')
        .toUpperCase();

// ── Selector de programa ────────────────────────────────────────────
// Un alumno puede cursar varios programas a la vez. Cada programa trae su
// Llave y sus materias vienen amarradas a esa misma llave, así que cambiar
// de botón solo cambia cuál de los bloques ya cargados se muestra: no se
// vuelve a consultar el pipeline.
const SelectorProgramas = ({ programas = [], activo = 0, onCambiar, clases = {} }) => {
    if (programas.length < 2) return null;

    return (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 18 }}>
            {programas.map((p, i) => {
                const seleccionado = i === activo;
                return (
                    <button
                        key={p.llave || p.clave || i}
                        type="button"
                        aria-pressed={seleccionado}
                        onClick={() => onCambiar && onCambiar(i)}
                        // Mismas clases que las materias del horario: brillo
                        // suave al pasar el mouse, crecimiento apenas
                        // perceptible en el seleccionado.
                        className={[clases.opcionHover, seleccionado ? clases.opcionSeleccionada : '']
                            .filter(Boolean)
                            .join(' ')}
                        style={{
                            // Color del anillo de hover, como en el horario.
                            '--da-borde': COLORES.verde,
                            // Crecen hasta llenar el renglón y se apilan solas
                            // en pantallas angostas.
                            flex: '1 1 190px',
                            minHeight: 48,
                            textAlign: 'left',
                            font: 'inherit',
                            cursor: 'pointer',
                            borderRadius: 10,
                            padding: '8px 14px',
                            border: `1px solid ${seleccionado ? COLORES.verde : COLORES.linea}`,
                            background: seleccionado ? COLORES.verdeClaro : '#FFFFFF',
                            // Sin seleccionar no se declara: un 'none' en línea
                            // ganaría sobre la sombra de hover de la clase.
                            boxShadow: seleccionado ? `inset 0 0 0 1px ${COLORES.verde}` : undefined
                        }}
                    >
                        <span style={{
                            display: 'block',
                            fontSize: 13,
                            fontWeight: seleccionado ? 700 : 600,
                            color: seleccionado ? COLORES.verde : COLORES.texto
                        }}>
                            {/* Sin "Nombre programa" queda la clave, que es lo
                                único que identifica al programa. */}
                            {p.nombre || p.clave || `Programa ${i + 1}`}
                        </span>
                        <span style={{ display: 'block', fontSize: 11, color: COLORES.textoSuave }}>
                            {p.nombre ? p.clave : 'Sin nombre de programa'}
                        </span>
                    </button>
                );
            })}
        </div>
    );
};

// ── Ficha del estudiante ────────────────────────────────────────────
const FichaEstudiante = ({ estudiante, programas = [], programaActivo = 0, onCambiarPrograma, zona = {}, clases = {} }) => (
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
                {/* Programa y facultad cambian con el programa; el nombre
                    y la matrícula no, por eso se animan solo estas líneas. */}
                <div className={zona.clase} style={zona.estilo}>
                    <Typography style={{ fontSize: 13, color: COLORES.texto, marginTop: 4 }}>
                        {estudiante.programa}
                    </Typography>
                    <Typography style={{ fontSize: 13, color: COLORES.verdeTexto, fontWeight: 600 }}>
                        {estudiante.facultad}
                    </Typography>
                </div>

                <div style={{ display: 'flex', gap: 22, marginTop: 14, flexWrap: 'wrap' }}>
                    {[
                        // El tercer valor marca si el dato depende del programa.
                        ['Matrícula', estudiante.matricula, false],
                        ['Campus', estudiante.campus, true]
                    ].map(([etiqueta, valor, cambia]) => (
                        <div key={etiqueta}>
                            {/* El rótulo dice siempre lo mismo, así que se queda
                                quieto igual que MATRÍCULA. Lo único
                                que entra y sale es el dato. */}
                            <Typography style={{ fontSize: 10, letterSpacing: '0.06em', textTransform: 'uppercase', color: COLORES.textoSuave, fontWeight: 600 }}>
                                {etiqueta}
                            </Typography>
                            <Typography
                                className={cambia ? zona.clase : undefined}
                                style={{ fontSize: 14, fontWeight: 700, color: COLORES.verde, ...(cambia ? zona.estilo : null) }}
                            >
                                {valor}
                            </Typography>
                        </div>
                    ))}
                </div>
            </div>
        </div>


        {/* Antes aquí iba el acceso a la credencial digital; ahora se
            llega a ella solo por su pestaña. En su lugar, cuando el alumno
            cursa más de un programa, van los botones para cambiar entre
            ellos. Con un solo programa no se muestra nada. */}
        <SelectorProgramas
            programas={programas}
            activo={programaActivo}
            onCambiar={onCambiarPrograma}
            clases={clases}
        />
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

const DesempenoActual = ({ resumen, zona = {} }) => {
    const { promedio, asistencia, avance, creditos, creditosCursados, creditosTotales, titulo, etiqueta, color } = resumen;
    // Si hay avance del plan se muestra ese; si no, la asistencia.
    const hayAvance = avance != null;
    const colorEtiqueta = COLOR_RANGO[color] || COLOR_RANGO.gris;

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                {/* "Desempeño actual" no cambia con el programa: se queda
                    fijo mientras el resto de la columna entra y sale. */}
                <Rotulo color={COLORES.verdeTexto}>Desempeño actual</Rotulo>
                <span className={zona.clase} style={zona.estilo}>
                    <Insignia fondo={colorEtiqueta.bg} color={colorEtiqueta.fg}>{etiqueta}</Insignia>
                </span>
            </div>

            <div className={zona.clase} style={zona.estilo}>
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
                        <Typography style={{ fontSize: 12, color: COLORES.textoSuave, marginTop: 4 }}>Promedio General</Typography>
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
        </div>
    );
};

// ── Aviso de pipeline caído ─────────────────────────────────────────
// Cada sección del resumen viene de un pipeline distinto y se consultan por
// separado: uno puede fallar mientras el otro responde bien. Por eso el
// aviso es por sección y no uno solo para toda la página.
const AVISOS = {
    desempeno: 'No se pudo consultar el pipeline de desempeño. La información mostrada es de ejemplo y no corresponde al estudiante.',
    adeudos: 'No se pudo consultar el pipeline de adeudos pendientes. La lista de adeudos no está disponible.'
};

const AvisoPipeline = ({ errores = [], matricula }) => {
    if (!errores.length) return null;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: '1.25rem' }}>
            {errores.map((error) => (
                <div
                    key={error.seccion}
                    role="alert"
                    style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 10,
                        background: COLORES.ambarFondo,
                        borderLeft: `3px solid ${COLORES.oro}`,
                        borderRadius: 10,
                        padding: '11px 14px'
                    }}
                >
                    <span aria-hidden="true" style={{ color: COLORES.ambar, fontWeight: 700, lineHeight: 1.4 }}>!</span>
                    <Typography style={{ fontSize: 12.5, fontWeight: 600, color: COLORES.ambar, lineHeight: 1.4 }}>
                        No se encontró información para el estudiante con matrícula {matricula}. Verifíque la matrícula y vuelve a intentar.
                    </Typography>
                </div>
            ))}
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

const AccionesPrioritarias = ({ adeudos = [], falloPipeline = false }) => {
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
                    {/* Si el pipeline falló, la lista llega vacía: decir que
                        no hay adeudos sería afirmar algo que no se sabe. */}
                    {falloPipeline
                        ? 'No se pudo consultar la lista de adeudos.'
                        : 'No tienes adeudos pendientes.'}
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

const ResumenTab = ({ estudiante, resumen, adeudos, falloAdeudos, programas, programaActivo, onCambiarPrograma, bloque, zonaFicha, zonaDesempeno, zonaDesempenoInterior, clases }) => (
    <div
        style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))',
            // 'stretch': las columnas toman el alto de la más alta, así las
            // líneas divisorias miden lo mismo sin importar cuánto contenido
            // tenga cada una ('start' las dejaba del largo de su contenido).
            alignItems: 'stretch',
            rowGap: '1.5rem'
        }}
    >
        <div className={bloque} style={{ ...columna(true), ...orden(0) }}>
            <FichaEstudiante
                estudiante={estudiante}
                programas={programas}
                programaActivo={programaActivo}
                onCambiarPrograma={onCambiarPrograma}
                zona={zonaFicha}
                clases={clases}
            />
        </div>
        <div className={zonaDesempeno.clase} style={{ ...columna(false), ...zonaDesempeno.estilo }}>
            <DesempenoActual resumen={resumen} zona={zonaDesempenoInterior} />
        </div>
        <div className={bloque} style={{ ...columna(false), paddingRight: 0, ...orden(2) }}>
            <AccionesPrioritarias adeudos={adeudos} falloPipeline={falloAdeudos} />
        </div>
    </div>
);

// Calcula las cifras a partir de los datos del pipeline.
//
// El promedio y el avance en créditos ahora son OFICIALES: vienen en el
// bloque de programa del alumno. Si por alguna razón no llegan, se calculan
// con los cursos del periodo (las materias sin calificación cuentan como 0).
function calcularResumen(cursos, programa = {}) {
    // Solo el promedio OFICIAL del programa. Se muestra tal como llega, sin
    // redondear (trae decimales: 92.63). Si el programa no lo trae se deja
    // en null y la pantalla pone "—": el promedio de las materias del
    // periodo es otro dato y ponerlo aquí haría pasar uno por el otro.
    const promedio = programa.promedio != null ? programa.promedio : null;

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
const ResumenCompleto = ({ estudiante, adeudos = [], programas = [], cargando, errores = [], matricula }) => {
    const refDesempeno = useRef(null);
    const { classes: clasesAnim } = useEstilosAnimacion();
    const falloAdeudos = errores.some((e) => e.seccion === 'adeudos');

    // Programa que se está viendo. Arranca en el primero del arreglo.
    const [indicePrograma, setIndicePrograma] = useState(0);
    // Transición al cambiar de programa: 'saliendo' mientras el contenido
    // del programa anterior se va hacia la izquierda, 'entrando' mientras
    // el nuevo llega desde la derecha.
    const [fase, setFase] = useState('quieto');
    // Programa al que se va a cambiar. Se guarda aparte porque los datos no
    // deben cambiar hasta que termine la salida: si cambiaran de inmediato,
    // lo que se vería salir sería ya el contenido nuevo.
    const [pendiente, setPendiente] = useState(null);
    // Una vez que hubo transición, la entrada inicial ya no vuelve a
    // aplicarse: reponer esa clase la dispararía de nuevo y el bloque
    // entraría dos veces, primero desde la derecha y luego desde abajo.
    const [yaTransiciono, setYaTransiciono] = useState(false);
    // Si la respuesta llega o cambia y el índice se queda fuera de rango,
    // se vuelve al primero en lugar de quedarse sin programa.
    const activo = indicePrograma < programas.length ? indicePrograma : 0;

    const cambiarPrograma = (indice) => {
        // Durante la transición se ignoran más toques: encimar dos
        // transiciones deja bloques a medio camino.
        if (indice === activo || fase !== 'quieto') return;

        if (sinMovimiento()) {
            setIndicePrograma(indice);
            return;
        }
        setPendiente(indice);
        setYaTransiciono(true);
        setFase('saliendo');
    };

    useEffect(() => {
        if (fase === 'quieto') return undefined;

        if (fase === 'saliendo') {
            const reloj = window.setTimeout(() => {
                // Los datos cambian justo cuando el contenido anterior
                // terminó de salir, con esas zonas ya invisibles.
                setIndicePrograma((previo) => (pendiente == null ? previo : pendiente));
                setPendiente(null);
                setFase('entrando');
            }, TRANSICION.salida);
            return () => window.clearTimeout(reloj);
        }

        const reloj = window.setTimeout(() => setFase('quieto'), TRANSICION.entradaTotal);
        return () => window.clearTimeout(reloj);
    }, [fase, pendiente]);

    const programa = programas[activo] || {};
    const cursos = programa.cursos || [];
    const resumen = calcularResumen(cursos, programa);

    // La ficha muestra los datos del programa que se está viendo: el nombre,
    // la facultad y el campus cambian junto con las materias.
    const fichaEstudiante = {
        ...estudiante,
        programa: programa.nombre || programa.clave || '',
        facultad: programa.facultad || '',
        campus: programa.campus || ''
    };

    // Mientras carga se muestra SOLO el indicador. Antes era una capa encima
    // de un contenido que ya estaba montado; así, al quitarse el velo no
    // había nada que animar, porque nada acababa de aparecer.
    if (cargando) {
        return (
            <div style={{ position: 'relative', minHeight: 320 }}>
                <LoadingOverlay activo texto="Cargando información del estudiante..." />
            </div>
        );
    }

    // Si alguna sección falló, el contenido entra de golpe junto con el
    // aviso: una mala noticia no se presenta con coreografía.
    const bloque = errores.length ? undefined : clasesAnim.bloque;

    // Las tres zonas que dependen del programa. Fuera de la transición manda
    // la entrada inicial escalonada, que no se toca; durante el cambio de
    // programa salen juntas hacia la izquierda y vuelven desde la derecha,
    // cada una en su turno para conservar el escalonado.
    const zona = (turno, ordenInicial, claseBase) => {
        if (fase === 'saliendo') return { clase: clasesAnim.salidaIzquierda };
        if (fase === 'entrando') return { clase: clasesAnim.entradaDerecha, estilo: orden(turno) };
        if (yaTransiciono) return {};
        return { clase: claseBase, estilo: ordenInicial == null ? undefined : orden(ordenInicial) };
    };

    const zonaFicha = zona(0, null, undefined);
    const zonaMaterias = zona(2, 3, bloque);

    // La columna de desempeño mantiene la entrada inicial escalonada, pero
    // durante el cambio de programa la animación se aplica ADENTRO: así el
    // rótulo "Desempeño actual", que no cambia, se queda quieto.
    const zonaDesempeno = fase === 'quieto' && !yaTransiciono
        ? { clase: bloque, estilo: orden(1) }
        : {};
    const zonaDesempenoInterior = zona(1, null, undefined);

    // El resaltado del botón sigue al dedo de inmediato, sin esperar a que
    // termine la salida.
    const seleccionVisible = pendiente == null ? activo : pendiente;

    return (
        <div style={{ position: 'relative' }}>

            {
                errores.length >0 ?
                    <AvisoPipeline
                        errores={errores}
                        matricula={matricula}
                    />
                    :
                    <ResumenTab
                        estudiante={fichaEstudiante}
                        resumen={resumen}
                        adeudos={adeudos}
                        falloAdeudos={falloAdeudos}
                        programas={programas}
                        programaActivo={seleccionVisible}
                        onCambiarPrograma={cambiarPrograma}
                        bloque={bloque}
                        zonaFicha={zonaFicha}
                        zonaDesempeno={zonaDesempeno}
                        zonaDesempenoInterior={zonaDesempenoInterior}
                        clases={clasesAnim}
                    />
            }


            <div
                ref={refDesempeno}
                style={{
                    borderTop: `1px solid ${COLORES.linea}`,
                    marginTop: '1.75rem',
                    paddingTop: '1.75rem'
                }}
            >
                {/* La llave fuerza el remontaje al cambiar de programa, que es
                    lo que dispara la animación de nuevo. De paso reinicia los
                    filtros de la sección, que eran del programa anterior. */}
                <div
                    key={programa.llave || activo}
                    className={zonaMaterias.clase}
                    style={zonaMaterias.estilo}
                >
                    <DesempenoSeccion cursos={cursos} />
                </div>
            </div>
        </div>
    );
};

export default ResumenCompleto;
