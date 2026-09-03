import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import {
    Button,
    makeStyles
} from '@ellucian/react-design-system/core';
import { useCardControl, useData, useCardInfo } from '@ellucian/experience-extension-utils';
import { fetchResumen } from '../data/resumenData';
import { ESTUDIANTE } from '../data/datosDemo';

// ────────────────────────────────────────────────────────────────────
// IMPORTANTE — Configuración en TARJETAS (Ellucian Experience)
//
// En la PÁGINA, useCardInfo() sí entrega la configuración:
//     const { cardConfiguration } = useCardInfo();   // funciona
//
// En la TARJETA del tablero, en cambio, cardConfiguration llega UNDEFINED
// (se revisó también cardInfo.configuration y las props del componente:
// ninguna trae los valores). Por eso una tarjeta que necesite consultar un
// pipeline debe llevar el nombre del pipeline como constante de respaldo.
//
// Regla para futuras tarjetas:
//   1. Intentar leer la configuración (por si en alguna versión sí llega).
//   2. Si no llega, usar una constante con el nombre del pipeline.
//   3. Nunca dejar el error en silencio: registrar en consola la causa
//      (sin Ethos / sin pipeline / sin datos) o la tarjeta se queda vacía
//      sin explicación.
//
// Esto NO compromete la seguridad: la llamada sigue pasando por
// authenticatedEthosFetch con el token de Experience; el nombre del
// pipeline por sí solo no da acceso a nada.
// ────────────────────────────────────────────────────────────────────
const PIPELINE_DESEMPENO_POR_DEFECTO = 'get-desempenoacademico';

const VERDE = '#0F5C3F';
const VERDE_TEXTO = '#0B7A4B';
const VERDE_CLARO = '#E8F3EC';
const ORO = '#C4982D';

// El pipeline manda por separado los nombres de pila (NombreCorto) y, a
// partir de ellos, el parser deduce los apellidos. Se arma "Nombre Apellido"
// para que se lea natural en la credencial.
const nombreParaCredencial = (alumno = {}) => {
    const pila = String(alumno.primerNombre || '').trim();
    const apellido = String(alumno.apellidos || '').trim().split(/\s+/)[0] || '';
    const nombre = [pila, apellido].filter(Boolean).join(' ');
    const iniciales = nombre.split(' ').filter(Boolean).slice(0, 2)
        .map((x) => x[0]).join('').toUpperCase();
    return { nombre, iniciales };
};

const capitalizar = (texto) =>
    String(texto || '')
        .toLowerCase()
        .split(' ')
        .map((p) => (p ? p[0].toUpperCase() + p.slice(1) : p))
        .join(' ');

const useStyles = makeStyles()({
    card: {
        height: '100%',
        boxSizing: 'border-box',
        padding: '1rem',
        display: 'flex',
        flexDirection: 'column',
        gap: 14
    },
    // ── Credencial ──
    credencial: {
        border: `1px solid ${VERDE}`,
        borderRadius: 12,
        overflow: 'hidden',
        background: '#FFFFFF',
        // Ocupa el alto disponible de la tarjeta.
        flex: 1,
        display: 'flex',
        flexDirection: 'column'
    },
    banda: {
        background: VERDE,
        color: '#FFFFFF',
        borderBottom: `2px solid ${ORO}`,
        padding: '9px 12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8
    },
    bandaTitulo: {
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: '0.08em',
        textTransform: 'uppercase'
    },
    cuerpo: {
        padding: '14px',
        display: 'flex',
        gap: 14,
        flex: 1
    },
    foto: {
        width: 84,
        height: 104,
        borderRadius: 8,
        border: `1px solid ${VERDE_TEXTO}`,
        background: VERDE_CLARO,
        color: VERDE,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 30,
        fontWeight: 700,
        flexShrink: 0
    },
    datos: {
        minWidth: 0,
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        // Reparte los datos en el alto disponible.
        justifyContent: 'space-between',
        gap: 8
    },
    etiqueta: {
        fontSize: 9,
        letterSpacing: '0.09em',
        textTransform: 'uppercase',
        color: '#9A9A9A',
        fontWeight: 700,
        lineHeight: 1.1
    },
    valor: {
        fontSize: 13,
        fontWeight: 700,
        color: '#22303A',
        lineHeight: 1.25,
        overflow: 'hidden',
        textOverflow: 'ellipsis'
    },
    pie: {
        borderTop: `1px solid ${VERDE_CLARO}`,
        padding: '9px 14px 11px',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        gap: 10
    },
    matricula: {
        fontSize: 12,
        fontWeight: 700,
        color: VERDE,
        letterSpacing: '0.06em'
    },
    boton: {
        width: '100%'
    }
});

// Franja de código de barras, solo decorativa.
const CodigoBarras = () => {
    const barras = [3, 1, 2, 1, 1, 3, 1, 2, 2, 1, 3, 1, 1, 2, 1, 3, 2, 1, 1, 2, 3, 1];
    return (
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 26 }} aria-hidden="true">
            {barras.map((ancho, i) => (
                <span
                    key={i}
                    style={{
                        width: ancho,
                        height: '100%',
                        background: i % 3 === 0 ? VERDE : '#22303A',
                        opacity: i % 4 === 0 ? 0.75 : 1
                    }}
                />
            ))}
        </div>
    );
};

const Dato = ({ etiqueta, valor, classes }) => (
    <div>
        <div className={classes.etiqueta}>{etiqueta}</div>
        <div className={classes.valor}>{valor || '\u00A0'}</div>
    </div>
);
Dato.propTypes = { etiqueta: PropTypes.string, valor: PropTypes.string, classes: PropTypes.object };

const DesempenoAcademicoCard = (props) => {
    const { classes } = useStyles();
    const { navigateToPage } = useCardControl();
    const { authenticatedEthosFetch } = useData();
    const cardInfo = useCardInfo();

    // En la página la configuración llega como cardInfo.cardConfiguration,
    // pero en el contexto de la TARJETA puede venir con otro nombre o como
    // prop del componente. Se buscan todas las variantes conocidas.
    const cardConfiguration =
        cardInfo.cardConfiguration
        || cardInfo.configuration
        || props.cardConfiguration
        || props.configuration
        || (props.cardInfo && (props.cardInfo.cardConfiguration || props.cardInfo.configuration))
        || undefined;

    const cardId = cardInfo.cardId || props.cardId;

    const [datos, setDatos] = useState(null);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState(null);

    // La tarjeta del tablero también puede consultar pipelines. Aquí solo se
    // pide el de desempeño académico, que es el que trae los datos del alumno.
    useEffect(() => {
        let cancelado = false;
        const pipeline = cardConfiguration?.desempenoPipeline || PIPELINE_DESEMPENO_POR_DEFECTO;

        // Antes el fallo se quedaba en silencio y la credencial aparecía
        // vacía sin explicación. Ahora cada causa se distingue y se registra.
        if (!authenticatedEthosFetch) {
            console.error('[Credencial] No hay acceso a Ethos en el contexto de la tarjeta.');
            setError('sin-ethos');
            setCargando(false);
            return undefined;
        }
        if (!pipeline) {
            console.error(
                '[Credencial] Falta configurar "Pipeline desempeño académico" en esta tarjeta.',
                '\n  cardInfo:', cardInfo,
                '\n  llaves de cardInfo:', Object.keys(cardInfo || {}),
                '\n  props:', props,
                '\n  llaves de props:', Object.keys(props || {})
            );
            setError('sin-pipeline');
            setCargando(false);
            return undefined;
        }

        setCargando(true);
        setError(null);

        fetchResumen({ authenticatedEthosFetch, cardId, pipelines: { desempeno: pipeline } })
            .then((d) => {
                if (cancelado) return;
                if (!d.desempeno) {
                    const detalle = (d.errores || []).find((e) => e.seccion === 'desempeno');
                    console.error('[Credencial] El pipeline no devolvió datos:', detalle);
                    setError('sin-datos');
                }
                setDatos(d);
            })
            .catch((e) => {
                if (cancelado) return;
                console.error('[Credencial] Error al consultar el pipeline:', e);
                setError('error');
            })
            .finally(() => { if (!cancelado) setCargando(false); });

        return () => { cancelado = true; };
    }, [authenticatedEthosFetch, cardConfiguration, cardId]);

    const MENSAJES = {
        'sin-ethos': 'Sin acceso a Ethos',
        'sin-pipeline': 'Falta configurar el pipeline',
        'sin-datos': 'El pipeline no devolvió datos',
        error: 'No se pudieron cargar los datos'
    };

    const desempeno = (datos && datos.desempeno) || {};
    const alumno = desempeno.estudiante || {};
    const cursos = desempeno.cursos || [];
    const programa = desempeno.programa || {};

    const { nombre, iniciales } = nombreParaCredencial({
        primerNombre: capitalizar(alumno.primerNombre),
        apellidos: capitalizar(alumno.apellidos)
    });

    // Nombre, matrícula y carrera SIEMPRE del pipeline: si aún no llegan se
    // deja el espacio vacío en lugar de mostrar un nombre de ejemplo, para
    // que nunca se vea un dato que no es del alumno.
    const pendiente = cargando ? '' : '—';
    const credencial = {
        nombre: nombre || pendiente,
        iniciales: iniciales || '',
        matricula: alumno.matricula || pendiente,
        carrera: programa.nombre || (cursos[0] && cursos[0].programa) || pendiente,
        // Campus y facultad vienen del programa del alumno.
        facultad: programa.facultad || pendiente,
        campus: programa.campus || pendiente,
        // El semestre todavía no lo entrega ningún pipeline.
        semestre: ESTUDIANTE.semestre
    };

    return (
        <div className={classes.card}>
            <div className={classes.credencial}>
                <div className={classes.banda}>
                    <span className={classes.bandaTitulo}>UABC</span>
                    <span className={classes.bandaTitulo}>Credencial estudiantil</span>
                </div>

                <div className={classes.cuerpo}>
                    <div className={classes.foto}>{credencial.iniciales}</div>

                    <div className={classes.datos}>
                        <Dato etiqueta="Nombre" valor={credencial.nombre} classes={classes} />
                        <Dato etiqueta="Carrera" valor={credencial.carrera} classes={classes} />
                        <Dato etiqueta="Facultad" valor={credencial.facultad} classes={classes} />
                        <div style={{ display: 'flex', gap: 14 }}>
                            <Dato etiqueta="Campus" valor={credencial.campus} classes={classes} />
                            <Dato etiqueta="Semestre" valor={credencial.semestre} classes={classes} />
                        </div>
                    </div>
                </div>

                <div className={classes.pie}>
                    <CodigoBarras />
                    <span className={classes.matricula}>{credencial.matricula}</span>
                </div>

                {error ? (
                    <div
                        style={{
                            background: '#FEF3C7',
                            color: '#B45309',
                            fontSize: 11,
                            fontWeight: 600,
                            padding: '6px 14px',
                            textAlign: 'center'
                        }}
                    >
                        {MENSAJES[error]}
                    </div>
                ) : null}
            </div>

            <Button
                className={classes.boton}
                tabIndex={0}
                color="secondary"
                variant="contained"
                onClick={() => navigateToPage({ route: '/DesempenoAcademico' })}
                style={{ background: VERDE_TEXTO, color: '#FFFFFF' }}
            >
                Ver mi desempeño
            </Button>
        </div>
    );
};

DesempenoAcademicoCard.propTypes = {
    classes: PropTypes.object,
    data: PropTypes.object
};

export default DesempenoAcademicoCard;
