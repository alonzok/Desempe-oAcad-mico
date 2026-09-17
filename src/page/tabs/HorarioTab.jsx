import { useState, useEffect, useMemo } from 'react';
import { Typography } from '@ellucian/react-design-system/core';
import { Rotulo } from '../components/UI';
import { COLORES } from '../../data/datosDemo';
import { useEstilosAnimacion, TRANSICION, sinMovimiento } from '../components/animaciones';
import { CLASES_HORARIO, TIPOS_CLASE, TIPO_RESPALDO } from '../../data/horarioDemo';
import {
    lunesDeLaSemana,
    sumarDias,
    mismoDia,
    fechaCorta,
    horaTexto,
    coloresDeMaterias,
    sesionesDeSemana,
    proximaSesion,
    diasVisibles,
    repartirSolapes,
    rangoDeHoras,
    textoRestante,
    detalleDeSesion,
    rangoDeSemana
} from '../horarioSelectors';

// ────────────────────────────────────────────────────────────────────
// Pestaña "Horario"
//
// Las materias todavía son fijas (src/data/horarioDemo.js), pero la
// pestaña ya NO lo es: las fechas salen de la semana real, el tiempo
// que falta para la clase se calcula contra el reloj, y el color de
// cada materia se genera solo a partir de su clave.
//
// El día que exista el pipeline, lo único que cambia es de dónde sale
// CLASES_HORARIO.
// ────────────────────────────────────────────────────────────────────

// Alto de una hora de clase, en px. De aquí sale toda la escala de la
// tabla: una clase de hora y media mide 1.5 veces esto.
const ALTO_HORA = 74;
const ALTO_ENCABEZADO = 52;
const ANCHO_COLUMNA_HORAS = 64;
const ANCHO_MINIMO_DIA = 132;

// Cada cuánto se vuelve a leer el reloj (ms). Con medio minuto basta:
// el contador se mueve de minuto en minuto.
const REFRESCO_RELOJ = 30000;

// Cuántas semanas hacia atrás y hacia adelante ofrece el menú.
const SEMANAS_EN_EL_MENU = 8;

// Debajo de este alto ya no cabe el nombre del profesor en la tarjeta.
// Alturas aproximadas de cada renglón de la tarjeta. Sirven para decidir
// QUÉ CABE en el alto que le toca a la sesión: una clase de 59 minutos mide
// 67 px y ahí no entran el nombre, el aula y el docente. Antes se dibujaban
// los cuatro renglones siempre y el sobrante quedaba cortado por el
// overflow de la tarjeta.
const PADDING_TARJETA = 14;
const ALTO_NRC = 13;
const ALTO_MATERIA = 15;
const ALTO_DATO = 16;

// Por debajo de este alto no caben ni el NRC sobre el nombre: la tarjeta
// pasa a un solo renglón con los dos juntos.
const ALTO_COMPACTA = 46;

// Cuántas horas se ven sin desplazar. El resto queda a un scroll dentro de
// la tabla, con los encabezados de los días fijos arriba.
const HORAS_VISIBLES = 8;

const IconoCalendario = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect x="3" y="5" width="18" height="16" rx="3" stroke="#FFFFFF" strokeWidth="1.6" />
        <path d="M3 10h18" stroke="#FFFFFF" strokeWidth="1.6" />
        <path d="M8 3v4M16 3v4" stroke="#FFFFFF" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
);

// ── Menú de semanas ──────────────────────────────────────────────────
const ControlSemana = ({ desplazamiento, onCambiar, lunesActual, totalDias }) => {
    const opciones = [];
    for (let i = -SEMANAS_EN_EL_MENU; i <= SEMANAS_EN_EL_MENU; i += 1) {
        const lunes = sumarDias(lunesActual, i * 7);
        opciones.push({
            valor: i,
            texto: `${rangoDeSemana(lunes, totalDias)}${i === 0 ? ' · esta semana' : ''}`
        });
    }

    const estiloFlecha = {
        width: 32,
        height: 32,
        borderRadius: 8,
        border: `1px solid ${COLORES.linea}`,
        background: '#FFFFFF',
        color: COLORES.verde,
        fontSize: 16,
        lineHeight: 1,
        cursor: 'pointer',
        flexShrink: 0
    };

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <button
                type="button"
                onClick={() => onCambiar(desplazamiento - 1)}
                style={estiloFlecha}
                aria-label="Semana anterior"
            >
                ‹
            </button>

            <select
                value={desplazamiento}
                onChange={(e) => onCambiar(Number(e.target.value))}
                aria-label="Semana"
                style={{
                    border: `1px solid ${COLORES.linea}`,
                    borderRadius: 8,
                    padding: '7px 10px',
                    fontSize: 13,
                    fontWeight: 600,
                    color: COLORES.texto,
                    background: '#FFFFFF',
                    cursor: 'pointer',
                    minWidth: 190
                }}
            >
                {opciones.map((o) => (
                    <option key={o.valor} value={o.valor}>
                        {o.texto}
                    </option>
                ))}
            </select>

            <button
                type="button"
                onClick={() => onCambiar(desplazamiento + 1)}
                style={estiloFlecha}
                aria-label="Semana siguiente"
            >
                ›
            </button>

            {desplazamiento !== 0 ? (
                <button
                    type="button"
                    onClick={() => onCambiar(0)}
                    style={{
                        border: `1px solid ${COLORES.verde}`,
                        background: 'none',
                        color: COLORES.verde,
                        borderRadius: 8,
                        padding: '7px 14px',
                        fontSize: 13,
                        fontWeight: 700,
                        cursor: 'pointer'
                    }}
                >
                    Hoy
                </button>
            ) : null}
        </div>
    );
};

const colorDeLaPildora = (restante) => {
    if (restante === 'En curso') return { background: '#FFFFFF', color: COLORES.verde };
    if (restante === 'Ya terminó') return { background: 'rgba(255,255,255,0.18)', color: '#FFFFFF' };
    return { background: COLORES.oro, color: '#FFFFFF' };
};

// ── Barra verde: próxima clase o materia seleccionada ────────────────
const BarraDestacado = ({ item, ahora, esSeleccion, onVerProxima }) => {
    const { classes } = useEstilosAnimacion();

    // Lo que hay en pantalla ahora mismo. Se guarda aparte del prop para que
    // el contenido anterior siga montado mientras sale: si se cambiara al
    // instante, lo que se vería salir ya sería la materia nueva.
    const [mostrado, setMostrado] = useState({ item, esSeleccion });
    const [fase, setFase] = useState('quieto');

    // La identidad incluye esSeleccion porque la misma sesión se ve distinta
    // según se llegue a ella por selección o como próxima clase.
    const claveNueva = `${item ? item.id : ''}|${esSeleccion}`;
    const claveMostrada = `${mostrado.item ? mostrado.item.id : ''}|${mostrado.esSeleccion}`;

    useEffect(() => {
        if (claveNueva === claveMostrada) return undefined;

        // Sin materia antes o después no hay intercambio que animar: el
        // recuadro pasa a su mensaje vacío, o sale de él.
        if (sinMovimiento() || !mostrado.item || !item) {
            setMostrado({ item, esSeleccion });
            return undefined;
        }

        setFase('saliendo');
        const reloj = window.setTimeout(() => {
            setMostrado({ item, esSeleccion });
            setFase('entrando');
        }, TRANSICION.cabecera.salida);
        return () => window.clearTimeout(reloj);
    }, [claveNueva, claveMostrada, item, esSeleccion, mostrado.item]);

    useEffect(() => {
        if (fase !== 'entrando') return undefined;
        const reloj = window.setTimeout(() => setFase('quieto'), TRANSICION.cabecera.entrada);
        return () => window.clearTimeout(reloj);
    }, [fase]);

    // Solo se anima el contenido que cambia de una materia a otra. El fondo
    // verde, el recuadro del icono y la estructura se quedan quietos.
    const claseContenido = fase === 'saliendo'
        ? classes.salidaCabecera
        : (fase === 'entrando' ? classes.entradaCabecera : undefined);

    const visible = mostrado.item;
    const visibleEsSeleccion = mostrado.esSeleccion;

    if (!visible) {
        return (
            <div
                style={{
                    background: COLORES.verde,
                    borderRadius: 14,
                    padding: '16px 20px',
                    marginBottom: '1.25rem'
                }}
            >
                <Typography style={{ fontSize: 15, fontWeight: 700, color: '#FFFFFF' }}>
                    No hay clases programadas.
                </Typography>
            </div>
        );
    }

    // El reloj sigue corriendo sobre la materia que se está mostrando, así
    // que la píldora se mantiene al día aunque el prop ya sea otra.
    const restante = textoRestante(visible.inicio, visible.fin, ahora);

    // La píldora cambia de color según el estado: en curso resalta en
    // blanco, una clase que ya pasó se apaga, y lo demás va en oro.
    const estiloPildora = colorDeLaPildora(restante);

    return (
        <div
            style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 16,
                flexWrap: 'wrap',
                background: COLORES.verde,
                borderRadius: 14,
                padding: '16px 20px',
                marginBottom: '1.25rem'
            }}
        >
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
                <div
                    style={{
                        width: 40,
                        height: 40,
                        borderRadius: 10,
                        background: 'rgba(255,255,255,0.15)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                    }}
                >
                    <IconoCalendario />
                </div>

                <div className={claseContenido} style={{ minWidth: 0 }}>
                    <Typography
                        style={{
                            fontSize: 10,
                            letterSpacing: '0.08em',
                            textTransform: 'uppercase',
                            color: '#FFFFFF',
                            fontWeight: 700
                        }}
                    >
                        {visibleEsSeleccion ? 'Materia seleccionada' : 'Próxima clase'}
                        {visible.clase.clave ? ` · ${visible.clase.clave}` : ''}
                    </Typography>
                    <Typography style={{ fontSize: 16, fontWeight: 700, color: '#FFFFFF' }}>
                        {visible.clase.materia}
                    </Typography>
                    <Typography style={{ fontSize: 12, color: '#FFFFFF' }}>
                        {detalleDeSesion(visible, ahora)}
                    </Typography>
                    {visible.clase.profesor ? (
                        <Typography style={{ fontSize: 12, color: '#FFFFFF' }}>
                            {
                            visible.clase.profesor.map((docente, i) => {
                                if(visible.clase.profesor.length-1 == i)
                                    return docente
                                return docente+", "
                            })
                            }
                        </Typography>
                    ) : null}
                </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                {visibleEsSeleccion ? (
                    <button
                        type="button"
                        onClick={onVerProxima}
                        style={{
                            background: 'none',
                            border: '1px solid rgba(255,255,255,0.45)',
                            color: '#FFFFFF',
                            borderRadius: 999,
                            padding: '6px 14px',
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: 'pointer',
                            whiteSpace: 'nowrap'
                        }}
                    >
                        Ver próxima clase
                    </button>
                ) : null}

                {/* El botón "Ver próxima clase" queda fuera de la animación
                    a propósito: solo la píldora cambia de una materia a otra. */}
                <span
                    className={claseContenido}
                    style={{
                        ...estiloPildora,
                        fontSize: 12,
                        fontWeight: 700,
                        padding: '6px 16px',
                        borderRadius: 999,
                        whiteSpace: 'nowrap'
                    }}
                >
                    {restante}
                </span>
            </div>
        </div>
    );
};

// Por si una materia llegara sin clave ni nombre y se quedara sin color.
const COLOR_RESPALDO = {
    borde: COLORES.verdeTexto,
    fondo: COLORES.verdeClaro,
    fondoActivo: '#D7E9DE',
    texto: COLORES.verde
};

// ── Tarjeta de una clase dentro de la tabla ──────────────────────────
const TarjetaClase = ({ item, color = COLOR_RESPALDO, rangoInicio, seleccionada, mismaMateria, onSeleccionar, columna = 0, columnas = 1 }) => {
    const { classes } = useEstilosAnimacion();
    const duracion = Math.max(0.5, item.sesion.fin - item.sesion.inicio);
    const alto = duracion * ALTO_HORA - 6;

    // Con una sola materia en ese hueco el resultado es el de siempre: todo
    // el ancho menos los 4 px de cada lado. Si dos se encima, cada una toma
    // su fracción en vez de que la segunda tape a la primera.
    const anchoColumna = 100 / columnas;

    // La tira de la izquierda indica el TIPO de hora (clase, taller o
    // laboratorio). El color de la tarjeta lo sigue poniendo la materia.
    const tipo = TIPOS_CLASE[item.clase.tipo] || TIPO_RESPALDO;

    // Qué renglones caben en el alto de esta sesión. Se van restando de
    // arriba abajo y lo que no alcanza no se dibuja, en vez de dibujarlo y
    // que quede cortado.
    const compacta = alto < ALTO_COMPACTA;
    const libreTrasNrc = alto - PADDING_TARJETA - ALTO_NRC;
    const lineasMateria = libreTrasNrc >= 2 * ALTO_MATERIA + ALTO_DATO ? 2 : 1;
    const libreTrasMateria = libreTrasNrc - lineasMateria * ALTO_MATERIA;
    const mostrarLugar = libreTrasMateria >= ALTO_DATO;
    const mostrarProfesor = libreTrasMateria - (mostrarLugar ? ALTO_DATO : 0) >= ALTO_DATO;

    return (
        <button
            type="button"
            onClick={() => onSeleccionar(item)}
            aria-pressed={seleccionada}
            className={[classes.opcionHover, seleccionada ? classes.opcionSeleccionada : '']
                .filter(Boolean)
                .join(' ')}
            style={{
                // El color del anillo de hover y de selección lo pone cada
                // materia: las clases lo leen de aquí.
                '--da-borde': color.borde,
                position: 'absolute',
                top: (item.sesion.inicio - rangoInicio) * ALTO_HORA + 3,
                left: `calc(${columna * anchoColumna}% + 4px)`,
                width: `calc(${anchoColumna}% - 8px)`,
                height: alto,
                margin: 0,
                textAlign: 'left',
                font: 'inherit',
                cursor: 'pointer',
                borderRadius: 8,
                border: 'none',
                borderLeft: `3px solid ${tipo.color}`,
                background: seleccionada || mismaMateria ? color.fondoActivo : color.fondo,
                padding: compacta ? '3px 8px' : '7px 10px',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
            }}
        >
            {compacta ? (
                // Sesiones muy cortas: NRC y nombre en un solo renglón, con
                // puntos suspensivos si no alcanza el ancho.
                <span
                    style={{
                        display: 'flex',
                        alignItems: 'baseline',
                        gap: 6,
                        minWidth: 0,
                        overflow: 'hidden'
                    }}
                >
                    <span style={{ fontSize: 10, fontWeight: 700, color: color.texto, flexShrink: 0 }}>
                        {item.clase.nrc || item.clase.clave}
                    </span>
                    <span
                        style={{
                            fontSize: 11,
                            fontWeight: 700,
                            color: COLORES.texto,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                        }}
                    >
                        {item.clase.materia}
                    </span>
                </span>
            ) : (
                <span style={{ display: 'block', minWidth: 0 }}>
                    <span
                        style={{
                            display: 'block',
                            fontSize: 10,
                            fontWeight: 700,
                            color: color.texto,
                            letterSpacing: '0.04em'
                        }}
                    >
                        {item.clase.nrc || item.clase.clave}
                    </span>
                    <span
                        style={{
                            // Recorte por líneas: un nombre largo se queda en
                            // una o dos líneas según lo que quepa, en vez de
                            // empujar al resto fuera de la tarjeta.
                            display: '-webkit-box',
                            WebkitLineClamp: lineasMateria,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                            fontSize: 12,
                            fontWeight: 700,
                            color: COLORES.texto,
                            lineHeight: 1.25
                        }}
                    >
                        {item.clase.materia}
                    </span>
                    {mostrarLugar ? (
                        <span style={{ display: 'block', fontSize: 10, color: COLORES.textoSuave, marginTop: 2 }}>
                            Edificio: {item.clase.lugar.edificio} - Salón: {item.clase.lugar.salon}
                        </span>
                    ) : null}
                </span>
            )}

            {mostrarProfesor ? (
                <span
                    style={{
                        display: 'block',
                        fontSize: 11,
                        color: COLORES.textoSuave,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                    }}
                >
                    {item.clase.profesor[0]}
                </span>
            ) : null}
        </button>
    );
};

// ── Tabla semanal ─────────────────────────────────────────────────────
const TablaHorario = ({ dias, horas, rango, sesiones, lunesVisible, colores, ahora, seleccion, onSeleccionar }) => {
    const altoCuerpo = horas.length * ALTO_HORA;
    const horaAhora = ahora.getHours() + ahora.getMinutes() / 60;

    // Con jornadas largas (de las 7:00 a las 23:00 son 16 renglones y más de
    // 1200 px) la tabla se desplaza por dentro en vez de estirar la página.
    // Solo se limita cuando de verdad sobran horas.
    const conScroll = horas.length > HORAS_VISIBLES;
    const altoMaximo = ALTO_ENCABEZADO + HORAS_VISIBLES * ALTO_HORA;

    // Los encabezados se quedan pegados arriba al desplazar. Van por encima
    // de la línea de "ahora" (z-index 2) y de la tarjeta seleccionada (3).
    const encabezadoFijo = conScroll
        ? { position: 'sticky', top: 0, zIndex: 4 }
        : null;

    return (
        <div
            style={{
                display: 'flex',
                border: `1px solid ${COLORES.linea}`,
                borderRadius: 12,
                // En horizontal sigue recortando, que es lo que mantiene las
                // esquinas redondeadas; el desplazamiento lateral lo maneja
                // el contenedor de afuera.
                overflow: conScroll ? 'hidden auto' : 'hidden',
                maxHeight: conScroll ? altoMaximo : undefined,
                minWidth: ANCHO_COLUMNA_HORAS + dias.length * ANCHO_MINIMO_DIA
            }}
        >
            {/* Columna de horas */}
            <div style={{ width: ANCHO_COLUMNA_HORAS, flexShrink: 0, background: '#FCFCFC' }}>
                <div
                    style={{
                        height: ALTO_ENCABEZADO,
                        borderBottom: `1px solid ${COLORES.linea}`,
                        background: '#FAFAFA',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        ...encabezadoFijo
                    }}
                >
                    <Typography
                        style={{
                            fontSize: 11,
                            fontWeight: 700,
                            color: COLORES.textoSuave,
                            letterSpacing: '0.06em',
                            textTransform: 'uppercase'
                        }}
                    >
                        Hora
                    </Typography>
                </div>

                <div style={{ position: 'relative', height: altoCuerpo }}>
                    {horas.map((hora, i) => (
                        <div
                            key={`hora-${hora}`}
                            style={{
                                position: 'absolute',
                                top: i * ALTO_HORA,
                                left: 0,
                                right: 0,
                                height: ALTO_HORA,
                                borderTop: i === 0 ? 'none' : `1px solid ${COLORES.linea}`,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                        >
                            <Typography style={{ fontSize: 11, fontWeight: 600, color: COLORES.textoSuave }}>
                                {horaTexto(hora)}
                            </Typography>
                        </div>
                    ))}
                </div>
            </div>

            {/* Una columna por día. Se usa dia.indice (posición real en
                la semana), no la posición en el arreglo: si el sábado no
                se dibuja, las dos dejan de coincidir. */}
            {dias.map((dia) => {
                const fechaDia = sumarDias(lunesVisible, dia.indice);
                const esHoy = mismoDia(fechaDia, ahora);
                const delDia = sesiones.filter((s) => s.diaIndice === dia.indice);
                // Si dos materias caen en el mismo hueco se reparten el ancho
                // de la columna en lugar de taparse.
                const reparto = repartirSolapes(delDia);

                return (
                    <div
                        key={dia.id}
                        style={{
                            flex: 1,
                            minWidth: ANCHO_MINIMO_DIA,
                            borderLeft: `1px solid ${COLORES.linea}`
                        }}
                    >
                        <div
                            style={{
                                height: ALTO_ENCABEZADO,
                                borderBottom: `1px solid ${COLORES.linea}`,
                                background: esHoy ? COLORES.verdeClaro : '#FAFAFA',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                ...encabezadoFijo
                            }}
                        >
                            <Typography
                                style={{
                                    fontSize: 12,
                                    fontWeight: 700,
                                    color: esHoy ? COLORES.verde : COLORES.texto
                                }}
                            >
                                {dia.nombre}
                            </Typography>
                            <Typography
                                style={{
                                    fontSize: 10,
                                    letterSpacing: '0.04em',
                                    color: esHoy ? COLORES.verdeTexto : COLORES.textoSuave,
                                    fontWeight: esHoy ? 700 : 400
                                }}
                            >
                                {fechaCorta(fechaDia)}
                            </Typography>
                        </div>

                        <div style={{ position: 'relative', height: altoCuerpo }}>
                            {/* líneas de la cuadrícula */}
                            {horas.map((hora, i) => (
                                <div
                                    key={`linea-${dia.id}-${hora}`}
                                    style={{
                                        position: 'absolute',
                                        top: i * ALTO_HORA,
                                        left: 0,
                                        right: 0,
                                        height: ALTO_HORA,
                                        borderTop: i === 0 ? 'none' : `1px solid ${COLORES.linea}`
                                    }}
                                />
                            ))}

                            {/* marca de la hora actual, solo en el día de hoy */}
                            {esHoy && horaAhora >= rango.inicio && horaAhora <= rango.fin ? (
                                <div
                                    style={{
                                        position: 'absolute',
                                        top: (horaAhora - rango.inicio) * ALTO_HORA,
                                        left: 0,
                                        right: 0,
                                        height: 0,
                                        borderTop: `2px solid ${COLORES.oro}`,
                                        zIndex: 2
                                    }}
                                >
                                    <span
                                        style={{
                                            position: 'absolute',
                                            left: -3,
                                            top: -4,
                                            width: 7,
                                            height: 7,
                                            borderRadius: '50%',
                                            background: COLORES.oro,
                                            display: 'block'
                                        }}
                                    />
                                </div>
                            ) : null}

                            {/* clases del día */}
                            {delDia.map((item) => {
                                const hueco = reparto[item.id] || { columna: 0, columnas: 1 };
                                const claveColor = item.clase.colorClave || item.clase.clave || item.clase.materia;
                                return (
                                    <TarjetaClase
                                        key={item.id}
                                        item={item}
                                        color={colores[claveColor]}
                                        rangoInicio={rango.inicio}
                                        seleccionada={seleccion ? seleccion.id === item.id : false}
                                        mismaMateria={
                                            seleccion ? seleccion.clase.materia === item.clase.materia : false
                                        }
                                        onSeleccionar={onSeleccionar}
                                        columna={hueco.columna}
                                        columnas={hueco.columnas}
                                    />
                                );
                            })}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

// ── Pestaña completa ──────────────────────────────────────────────────
const HorarioTab = ({ estudiante = {}, periodoActual, clases }) => {
    // Las materias vienen del pipeline. Mientras no traiga el bloque de
    // horario se usan las de ejemplo, y el pie de la pestaña lo advierte.
    const delPipeline = Array.isArray(clases) && clases.length > 0;
    const materias = delPipeline ? clases : CLASES_HORARIO;
    // Reloj: de aquí salen las fechas de la semana y el tiempo que falta
    // para la clase, así que se refresca solo.
    const [ahora, setAhora] = useState(() => new Date());
    useEffect(() => {
        const id = setInterval(() => setAhora(new Date()), REFRESCO_RELOJ);
        return () => clearInterval(id);
    }, []);

    // Semana que se está viendo (0 = la de hoy).
    const [desplazamiento, setDesplazamiento] = useState(0);

    // Sesión que el usuario tocó en la tabla. Si no hay ninguna, la
    // barra verde muestra la próxima clase.
    const [seleccionId, setSeleccionId] = useState(null);

    const dias = useMemo(() => diasVisibles(materias), [materias]);
    const rango = useMemo(() => rangoDeHoras(materias), [materias]);
    const colores = useMemo(() => coloresDeMaterias(materias), [materias]);

    const horas = useMemo(() => {
        const lista = [];
        for (let h = rango.inicio; h < rango.fin; h += 1) lista.push(h);
        return lista;
    }, [rango]);

    // La fecha se calcula, no viene en los datos: el lunes de la semana
    // que se está viendo manda sobre todo lo demás.
    const lunesActual = useMemo(() => lunesDeLaSemana(ahora), [ahora]);
    const lunesVisible = useMemo(
        () => sumarDias(lunesActual, desplazamiento * 7),
        [lunesActual, desplazamiento]
    );

    const sesiones = useMemo(
        () => sesionesDeSemana(materias, lunesVisible),
        [materias, lunesVisible]
    );

    // Próxima clase: se busca siempre desde HOY, no desde la semana que
    // se esté viendo. Si el usuario se va a ver marzo, la próxima clase
    // sigue siendo la de esta tarde.
    const proxima = useMemo(() => proximaSesion(materias, ahora), [materias, ahora]);

    const seleccion = useMemo(
        () => sesiones.find((s) => s.id === seleccionId) || null,
        [sesiones, seleccionId]
    );

    const destacado = seleccion || proxima;

    const alSeleccionar = (item) => {
        // Volver a tocar la misma clase la deselecciona.
        setSeleccionId((actual) => (actual === item.id ? null : item.id));
    };

    return (
        <div>
            <div
                style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-end',
                    gap: 16,
                    flexWrap: 'wrap',
                    marginBottom: '1.25rem'
                }}
            >
                <div style={{ minWidth: 0 }}>
                    <Rotulo color={COLORES.verdeTexto}>Mi agenda académica</Rotulo>
                    <Typography style={{ fontSize: 22, fontWeight: 700, color: COLORES.texto, marginBottom: 4 }}>
                        Horario semanal
                    </Typography>
                    <Typography style={{ fontSize: 13, color: COLORES.textoSuave }}>
                        {[
                            periodoActual ? `Periodo ${periodoActual}` : null,
                            estudiante.facultad,
                            estudiante.campus ? `Campus ${estudiante.campus}` : null
                        ]
                            .filter(Boolean)
                            .join(' · ')}
                    </Typography>
                </div>

                <ControlSemana
                    desplazamiento={desplazamiento}
                    onCambiar={setDesplazamiento}
                    lunesActual={lunesActual}
                    totalDias={dias.length ? dias[dias.length - 1].indice + 1 : 5}
                />
            </div>

            <BarraDestacado
                item={destacado}
                ahora={ahora}
                esSeleccion={Boolean(seleccion)}
                onVerProxima={() => setSeleccionId(null)}
            />

            {/* La tabla puede ser más ancha que el panel en pantallas
                chicas; el scroll horizontal aquí sí es aceptable (mismo
                criterio que las tablas del kardex y del NRC). */}
            <div style={{ overflowX: 'auto' }}>
                <TablaHorario
                    dias={dias}
                    horas={horas}
                    rango={rango}
                    sesiones={sesiones}
                    lunesVisible={lunesVisible}
                    colores={colores}
                    ahora={ahora}
                    seleccion={seleccion}
                    onSeleccionar={alSeleccionar}
                />
            </div>

            <div
                style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: 10,
                    marginTop: 12
                }}
            >
                {/* Qué significa el color de la tira izquierda de cada
                    tarjeta. El color de la tarjeta sigue siendo el de la
                    materia; esto solo explica el tipo de hora. */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                    {Object.keys(TIPOS_CLASE).map((codigo) => (
                        <span key={codigo} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                            <span
                                style={{
                                    display: 'inline-block',
                                    width: 3,
                                    height: 12,
                                    borderRadius: 2,
                                    background: TIPOS_CLASE[codigo].color
                                }}
                            />
                            <Typography style={{ fontSize: 11, color: COLORES.textoSuave }}>
                                {TIPOS_CLASE[codigo].etiqueta}
                            </Typography>
                        </span>
                    ))}
                </div>

                <Typography style={{ fontSize: 11, color: COLORES.textoSuave }}>
                    {delPipeline
                        ? 'Selecciona una materia para ver su detalle arriba.'
                        : 'Horario de ejemplo: el pipeline aún no manda horarios.'}
                </Typography>
            </div>
        </div>
    );
};

export default HorarioTab;
