import { useState, useEffect, Component } from 'react';
import {
    Box,
    Card,
    Button,
    Typography,
    FixedSidebarLayout,
    makeStyles
} from '@ellucian/react-design-system/core';
import {
    fetchHistorialAcademico,
    fetchHistorialAcademicoPosgrado,
    fetchHistorialAcademicoLenguas,
    combinarHistoriales
} from '../data/historialData';
import {
    getAvanceCarrera,
    getKardexPorTermino,
    getResumen,
    getTrayectoria,
    CALIF_MINIMA_APROBATORIA
} from './historialSelectors';
import AnilloProgreso from './components/AnilloProgreso';
import BarraProgreso from './components/BarraProgreso';
import { useParams } from 'react-router-dom';
import TrayectoriaPromedio from './components/TrayectoriaPromedio';
import { useEsAngosto } from './components/useMedidas';
import { generarKardexEtapasPdf, generarKardexPeriodoPosgradoPdf } from './generarKardexPdf';
import { useData, useCardInfo, useUserInfo } from '@ellucian/experience-extension-utils';
import LenguasExtranjeras from './LenguasExtranjeras';
import LoadingOverlay from './components/LoadingOverlay';

// URL del inicio de Experience (cambiar para producción).
const ACENTO = '#1D9E75';

const ESTADO_ESTILO = {
    aprobada: { bg: '#E6F4EC', fg: '#1D7A4E', label: 'Aprobada' },
    reprobada: { bg: '#FBE9E7', fg: '#C0392B', label: 'Reprobada' },
    en_curso: { bg: '#E7F0FB', fg: '#1F6FB2', label: 'En curso' }
};

const useStyles = makeStyles()({
    root: { padding: '1rem' },
    // En teléfono el padding lateral se quita: aquí solo servía para
    // restarle ancho al contenido.
    rootAngosto: { padding: '0.25rem 0' },
    tabs: { display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 },
    tab: {
        border: '1px solid #E1E4E7',
        borderRadius: 10,
        background: '#FFFFFF',
        padding: '8px 14px',
        cursor: 'pointer',
        textAlign: 'left',
        font: 'inherit',
        minWidth: 150
    },
    // Ancho completo y alto de 48 px: blanco cómodo para el dedo.
    tabAngosto: { flex: '1 1 100%', minWidth: 0, minHeight: 48 },
    tabActivo: { borderColor: ACENTO, boxShadow: `inset 0 -3px 0 ${ACENTO}`, background: '#F3FBF7' },
    sidebarCard: { padding: '1.1rem', textAlign: 'center' },
    sectionCard: { padding: '1rem 1.1rem' },
    mainStack: { display: 'flex', flexDirection: 'column', gap: '1rem' }
});

const periodoLegible = (periodo) => {
    const s = String(periodo || '');
    const m = s.match(/^(\d{4})(\d{2})$/);
    if (!m) return s;
    const ciclo = {
        '10': '1',
        '15': '4',
        '20': '2',
        '25': '5',
        '30': '3',
        '41': '6',
        '42': '7',
        '43': '8'
    }[m[2]] || String(parseInt(m[2], 10));
    return `${m[1]}-${ciclo}`;
};

// "cursados/requeridos" de una etapa o del plan. El dato que no llegue se
// muestra como "-" ("10/-"), y si faltan los dos, un solo "-".
// resumenEtapas siempre llega, pero puede venir vacío o sin alguna etapa
// (EB, ED, ET, PP): antes eso tumbaba la página completa.
const sinDato = (valor) => valor == null || valor === '';
const creditosDe = (cursados, requeridos) => {
    if (sinDato(cursados) && sinDato(requeridos)) return '-';
    return `${sinDato(cursados) ? '-' : cursados}/${sinDato(requeridos) ? '-' : requeridos}`;
};

// ── Leyenda de intento ──────────────────────────────────────────────
// "Intento N" solo desde la segunda vez que se cursa la materia (contando
// periodos), y "(Ext)" en el renglón del extraordinario. Una materia
// cursada una sola vez, en ordinario, no lleva nada.
const LeyendaIntento = ({ materia }) => {
    const partes = [];
    if (materia.vezCursada > 1) partes.push(`Intento ${materia.vezCursada}`);
    if (materia.extraordinario) partes.push('(Ext)');
    if (!partes.length) return null;

    return (
        <span
            style={{
                display: 'inline-block',
                marginLeft: 6,
                fontSize: 10,
                fontWeight: 600,
                padding: '1px 6px',
                borderRadius: 6,
                background: '#FFF4E0',
                color: '#9A5B00',
                whiteSpace: 'nowrap',
                verticalAlign: 'middle'
            }}
        >
            {partes.join(' ')}
        </span>
    );
};

// ── Materias de un periodo, en lista ────────────────────────────────
// En teléfono la tabla de cuatro columnas obliga a desplazar de lado para
// leer la calificación, que es justo el dato que se busca. Apilada, cada
// materia se lee completa sin mover nada.
const ListaMaterias = ({ materias = [] }) => (
    <div>
        {materias.map((m, idx) => {
            const estado = ESTADO_ESTILO[m.estado] || ESTADO_ESTILO.en_curso;
            return (
                <div
                    key={`${m.claveMateria}-${idx}`}
                    style={{ borderTop: '1px solid #F0F0F0', padding: '10px 12px' }}
                >
                    <div style={{ fontSize: 13, lineHeight: 1.35 }}>
                        {m.nombreMateria}
                        <LeyendaIntento materia={m} />
                    </div>
                    <div style={{ fontSize: 11, color: '#9A9A9A', marginTop: 1 }}>{m.claveMateria}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 7, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 6, background: estado.bg, color: estado.fg }}>
                            {estado.label}
                        </span>
                        <span style={{ fontSize: 12, color: '#6E6E6E' }}>{m.creditos} cr</span>
                        <span style={{ fontSize: 12, color: '#6E6E6E' }}>
                            Calif. {m.calificacion != null ? m.calificacion : '—'}
                        </span>
                    </div>
                </div>
            );
        })}
    </div>
);

// ── Estatus del alumno ───────────────────────────────────────────────
// Se muestra el texto tal como lo manda el pipeline. El color solo ayuda a
// leerlo de un vistazo; un estatus que no se reconoce queda en gris.
const colorDeEstatus = (estatus) => {
    const texto = String(estatus || '').toLowerCase();
    if (texto.includes('baja')) return { bg: '#FBE9E7', fg: '#C0392B' };
    if (texto.includes('egres') || texto.includes('titulad')) return { bg: '#E7F0FB', fg: '#1F6FB2' };
    if (texto.includes('activ') || texto.includes('inscrit') || texto.includes('vigente')) return { bg: '#E6F4EC', fg: '#1D7A4E' };
    return { bg: '#F0F0F0', fg: '#4A4A4A' };
};

const EstatusAlumno = ({ estatus }) => {
    if (!estatus) return null;
    const c = colorDeEstatus(estatus);
    return (
        <div style={{ marginBottom: 14 }}>
            <span
                style={{
                    display: 'inline-block',
                    background: c.bg,
                    color: c.fg,
                    borderRadius: 999,
                    padding: '3px 12px',
                    fontSize: 13,
                    fontWeight: 600
                }}
            >
                {estatus}
            </span>
        </div>
    );
};

// ── Aviso de áreas que no se pudieron consultar ─────────────────────
// Un pipeline que falla (por ejemplo, un 500 de posgrado) no oculta los
// programas que sí llegaron: se muestran y aquí se avisa qué área faltó.
const AvisoErrores = ({ errores, completo = false }) => {
    if (!errores || !errores.length) return null;
    const nombres = errores.map((e) => e.nombre).join(', ');
    return (
        <div
            role="alert"
            style={{
                background: '#FDECEA',
                border: '1px solid #F5C6C0',
                color: '#8A2A1F',
                borderRadius: 8,
                padding: '8px 12px',
                fontSize: 12,
                margin: completo ? '12px 0 0' : '0 0 14px'
            }}
        >
            {completo
                ? `Áreas que no respondieron: ${nombres}.`
                : `No se pudo consultar la información de ${nombres}. Se muestran los datos que sí se obtuvieron; vuelve a intentar más tarde.`}
        </div>
    );
};

// ── Acomodo de la ficha del alumno y el contenido ───────────────────
// En pantalla ancha la ficha va en la barra lateral, igual que siempre. En
// teléfono esa barra reservaba su ancho aunque no cupiera y empujaba el
// contenido fuera de la pantalla (cortaba las tarjetas de créditos y el
// kardex por la derecha), así que ahí se apila: ficha arriba y contenido
// debajo.
const Acomodo = ({ angosto, sidebar, children }) => {
    if (angosto) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {sidebar}
                {children}
            </div>
        );
    }
    // position="sticky": con la ficha fija (el valor por defecto), si era
    // más alta que la pantalla su parte de abajo (el botón del PDF) quedaba
    // fuera y no había forma de alcanzarla. Con sticky sube con la página
    // hasta el borde superior y desde ahí se queda en su lugar.
    return <FixedSidebarLayout sidebar={sidebar} position="sticky">{children}</FixedSidebarLayout>;
};

// ── Límite de errores ────────────────────────────────────────────────
// Si algo falla al dibujar (un dato con forma inesperada), se muestra un
// aviso en lugar de dejar la página en blanco, y el error queda en la
// consola para diagnosticarlo.

const HistorialAcademico = () => {
    const { classes } = useStyles();
    const { authenticatedEthosFetch } = useData();
    const { cardConfiguration, cardId } = useCardInfo();
    const { firstName } = useUserInfo();
    const { matricula: matriculaParam } = useParams();
    // Acomodo para teléfono: una sola columna, ficha arriba y el detalle de
    // materias como lista en vez de tabla.
    const angosto = useEsAngosto();

    const [data, setData] = useState(null);
    const [error, setError] = useState(null);
    const [tab, setTab] = useState(0);
    const [terminosAbiertos, setTerminosAbiertos] = useState({});

    const abrirUltimoTermino = (programa) => {
        const pt = getKardexPorTermino(programa);
        if (pt.length) setTerminosAbiertos({ [pt[pt.length - 1].termino]: true });
        else setTerminosAbiertos({});
    };

    useEffect(() => {
        setData(null);
        setError(null);
        let cancelado = false;
        const cargarHistorial = async () => {
            // Cada pipeline se resuelve por separado: allSettled espera a
            // los tres y entrega el resultado de cada uno, haya fallado o
            // no. Antes cada solicitud tenía su propio .catch que marcaba
            // el error de TODA la página en cuanto una fallaba (un 500 de
            // posgrado ocultaba licenciatura y lenguas), y luego leía
            // .programas de un null y el resto de la carga se cortaba.
            const [licenciatura, posgrado, lenguas] = await Promise.allSettled([
                fetchHistorialAcademico({
                    authenticatedEthosFetch,
                    pipeline: cardConfiguration?.historialPipelineLicenciatura,
                    cardId,
                    matricula: matriculaParam
                }),
                fetchHistorialAcademicoPosgrado({
                    authenticatedEthosFetch,
                    pipeline: cardConfiguration?.historialPipelinePosgrado,
                    cardId,
                    matricula: matriculaParam
                }),
                fetchHistorialAcademicoLenguas({
                    authenticatedEthosFetch,
                    pipeline: cardConfiguration?.historialPipelineLenguas,
                    cardId,
                    matricula: matriculaParam
                })
            ]);
            if (cancelado) return;

            const historial = combinarHistoriales({ licenciatura, posgrado, lenguas });

            // Los fallos de cada área se avisan en la página (AvisoErrores)
            // con su estado HTTP; no se repiten en la consola.
            setData(historial);
        };

        cargarHistorial().catch((e) => {
            // Solo llega aquí un error al combinar los datos, no de los
            // pipelines (esos ya vienen dentro de allSettled).
            console.error('[Historial] Error al procesar el historial:', e);
            if (!cancelado) setError(e?.message || 'No se pudo cargar el historial');
        });

        return () => {
            cancelado = true;
        };
    }, [
        authenticatedEthosFetch,
        cardConfiguration,
        cardId,
        matriculaParam
    ]);
    if (error) {
        return (
            <Box sx={{ p: 3 }}>
                <Typography variant="h4">Ocurrió un error</Typography>
                <Typography>{error}</Typography>
            </Box>
        );
    }

    if (!data) {
        return (
            <div style={{ position: 'relative', minHeight: 320 }}>
                <LoadingOverlay activo texto="Cargando historial académico..." />
            </div>
        );
    }

    if (!data.programas.length) {
        return (
            <Box sx={{ p: 3 }}>
                <Typography>No se encontraron programas para esta matrícula.</Typography>
            </Box>
        );
    }

    const programa = data.programas[Math.min(tab, data.programas.length - 1)];
    const esLenguas = /lenguas/i.test(programa.nivel || '');
    const nivelMayus = String(programa.nivel || '').toUpperCase();
    const est = programa.estudiante;
    const avance = getAvanceCarrera(programa);
    const resumen = getResumen(programa);
    const trayectoria = getTrayectoria(programa);
    const porTermino = getKardexPorTermino(programa);
    // Créditos aprobados por área 
    const creditosCumplidos = [{
        nombre: "Obligatorios",
        creditos: programa.plan.creditosOblitagoriosCursados
    },
    {
        nombre: "Optativos",
        creditos: programa.plan.creditosOptativosCursados
    }
    ]
    const promedio = resumen.promedioGeneral;
    const promedioPonderado = resumen.promedioPonderado

    const iniciales = (est.nombre || firstName)
        .split(' ')
        .slice(0, 2)
        .map((s) => s[0])
        .join('')
        .toUpperCase();

    const cambiarTab = (i) => {
        setTab(i);
        abrirUltimoTermino(data.programas[i]);
    };

    const toggleTermino = (t) =>
        setTerminosAbiertos((prev) => ({ ...prev, [t]: !prev[t] }));

    // Datos de la gráfica de trayectoria. El dibujo lo hace
    // TrayectoriaPromedio, que se mide contra su contenedor.
    const trayectoriaGrafica = trayectoria.map((t) => ({
        clave: t.termino,
        etiqueta: periodoLegible(t.termino),
        promedio: t.promedio
    }));

    const sidebar = (
        <Card className={classes.sidebarCard}>
            <div
                style={{
                    width: 60, height: 60, borderRadius: '50%', background: '#E7F0FB',
                    color: '#1F6FB2', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 600, fontSize: 20, margin: '0 auto 10px'
                }}
            >
                {iniciales}
            </div>
            <Typography variant="h4" style={{ margin: 0 }}>{est.nombre || firstName}</Typography>
            <Typography style={{ color: '#6E6E6E', fontSize: 16, marginTop: 2 }}>{est.facultad}</Typography>
            <Typography style={{ color: '#9A9A9A', fontSize: 16, marginBottom: est.estatus ? 8 : 14 }}>
                {est.programa}{est.matricula ? ` · Mat. ${est.matricula}` : ''}
            </Typography>
            <EstatusAlumno estatus={est.estatus} />

            <div style={{ margin: '6px 0 12px', display: 'flex', justifyContent: 'space-around' }}>
                <div>
                    <AnilloProgreso porcentaje={promedio || 0} valor={promedio ?? '—'} etiqueta="Prom. Arit." />
                </div>
                {
                    nivelMayus != 'LICENCIATURA' &&
                    <div>
                        <AnilloProgreso porcentaje={promedioPonderado || 0} valor={promedioPonderado ?? '—'} etiqueta="Prom. Pond." />
                    </div>
                }

            </div>

            <div style={{ display: 'flex', justifyContent: 'space-around', borderTop: '1px solid #EEEEEE', paddingTop: 12 }}>
                <div>
                    <div style={{ fontSize: 20, fontWeight: 600 }}>{avance.creditosAprobados}</div>
                    <div style={{ fontSize: 11, color: '#6E6E6E' }}>créditos cursados</div>
                </div>
                <div>
                    <div style={{ fontSize: 20, fontWeight: 600 }}>{resumen.materiasAprobadas}</div>
                    <div style={{ fontSize: 11, color: '#6E6E6E' }}>Materias Aprobadas</div>
                </div>
            </div>

            {
                nivelMayus == 'LICENCIATURA' &&
                <div>
                    <Button onClick={() => generarKardexEtapasPdf(programa)} style={{ marginTop: 16, width: '100%' }}>
                        Descargar kardex por Etapas (PDF)
                    </Button>
                </div>
            }
            {
                nivelMayus != 'LICENCIATURA' &&
                <div>
                    <Button onClick={() => generarKardexPeriodoPosgradoPdf(programa)} style={{ width: '100%' }}>
                        Descargar kardex por Periodos (PDF)
                    </Button>
                </div>


            }
        </Card>
    );

    return (
        <div className={angosto ? classes.rootAngosto : classes.root}>
            {/* Tabs por programa */}
            <div className={classes.tabs}>
                {data.programas.map((p, i) => (
                    <button
                        key={p.id}
                        type="button"
                        onClick={() => cambiarTab(i)}
                        className={[
                            classes.tab,
                            angosto ? classes.tabAngosto : '',
                            i === tab ? classes.tabActivo : ''
                        ].filter(Boolean).join(' ')}
                    >
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{p.etiqueta.subtitulo}</div>
                        <div style={{ fontSize: 11, color: '#6E6E6E' }}>{p.etiqueta.titulo}</div>
                    </button>
                ))}
            </div>

            {/* Áreas que no se pudieron consultar: se avisa sin bloquear
                los programas que sí cargaron. */}
            <AvisoErrores errores={data.errores} />

            {esLenguas ? (
                <LenguasExtranjeras programa={programa} />
            ) : (
                <>
                    <Acomodo angosto={angosto} sidebar={sidebar}>
                        <div className={classes.mainStack}>
                            {/* Resumen */}
                            {/* Máximo 3 columnas, como siempre. Cada campo mide
                                al menos 150 px (o todo el ancho, si hay menos):
                                cuando ya no caben 3, auto-fill baja a 2 y luego a
                                1 columna en lugar de salirse del panel, que es lo
                                que pasaba con 'repeat(3, minmax(150px, 1fr))'. */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(max(min(150px, 100%), calc((100% - 24px) / 3)), 1fr))', gap: 12 }}>
                                {
                                    nivelMayus == 'LICENCIATURA' &&
                                    <div style={{ background: '#F4F6F8', borderRadius: 8, padding: '0.8rem 0.9rem' }}>
                                        <div style={{ fontSize: 13, color: '#6E6E6E' }}>Créditos Básicos</div>
                                        <div style={{ fontSize: 24, fontWeight: 600, marginTop: 2 }}>{creditosDe(programa.resumenEtapas?.EB?.creditosCursados, programa.resumenEtapas?.EB?.creditosRequeridos)}</div>
                                    </div>
                                }
                                {
                                    nivelMayus == 'LICENCIATURA' &&
                                    <div style={{ background: '#F4F6F8', borderRadius: 8, padding: '0.8rem 0.9rem' }}>
                                        <div style={{ fontSize: 13, color: '#6E6E6E' }}>Créditos Disciplinarios</div>
                                        <div style={{ fontSize: 24, fontWeight: 600, marginTop: 2 }}>{creditosDe(programa.resumenEtapas?.ED?.creditosCursados, programa.resumenEtapas?.ED?.creditosRequeridos)}</div>
                                    </div>
                                }
                                {
                                    nivelMayus == 'LICENCIATURA' &&
                                    <div style={{ background: '#F4F6F8', borderRadius: 8, padding: '0.8rem 0.9rem' }}>
                                        <div style={{ fontSize: 13, color: '#6E6E6E' }}>Créditos Terminales</div>
                                        <div style={{ fontSize: 24, fontWeight: 600, marginTop: 2 }}>{creditosDe(programa.resumenEtapas?.ET?.creditosCursados, programa.resumenEtapas?.ET?.creditosRequeridos)}</div>
                                    </div>
                                }
                                <div style={{ background: '#F4F6F8', borderRadius: 8, padding: '0.8rem 0.9rem' }}>
                                    <div style={{ fontSize: 13, color: '#6E6E6E' }}>Créditos Obligatorios</div>
                                    <div style={{ fontSize: 24, fontWeight: 600, marginTop: 2 }}>{creditosDe(programa.plan?.creditosOblitagoriosCursados, programa.plan?.creditosObligatorios)}</div>
                                </div>
                                <div style={{ background: '#F4F6F8', borderRadius: 8, padding: '0.8rem 0.9rem' }}>
                                    <div style={{ fontSize: 13, color: '#6E6E6E' }}>Créditos Optativos</div>
                                    <div style={{ fontSize: 24, fontWeight: 600, marginTop: 2 }}>{creditosDe(programa.plan?.creditosOptativosCursados, programa.plan?.creditosOptativos)}</div>
                                </div>

                                {
                                    nivelMayus == 'LICENCIATURA' &&
                                    <div style={{ background: '#F4F6F8', borderRadius: 8, padding: '0.8rem 0.9rem' }}>
                                        <div style={{ fontSize: 13, color: '#6E6E6E' }}>Prácticas Profesionales</div>
                                        <div style={{ fontSize: 24, fontWeight: 600, marginTop: 2 }}>{creditosDe(programa.resumenEtapas?.PP?.creditosCursados, programa.resumenEtapas?.PP?.creditosRequeridos)}</div>
                                    </div>
                                }
                                {/* <div style={{ background: '#F4F6F8', borderRadius: 8, padding: '0.8rem 0.9rem' }}>
                                        <div style={{ fontSize: 13, color: '#6E6E6E' }}>Promedio general</div>
                                        <div style={{ fontSize: 24, fontWeight: 600, marginTop: 2 }}>{promedio ?? '—'}</div>
                                    </div>
                                    <div style={{ background: '#F4F6F8', borderRadius: 8, padding: '0.8rem 0.9rem' }}>
                                        <div style={{ fontSize: 13, color: '#6E6E6E' }}>Materias aprobadas</div>
                                        <div style={{ fontSize: 24, fontWeight: 600, marginTop: 2 }}>
                                            {resumen.materiasAprobadas}
                                            {resumen.materiasEnCurso ? (
                                                <span style={{ fontSize: 13, color: '#1F6FB2' }}> +{resumen.materiasEnCurso} en curso</span>
                                            ) : null}
                                        </div>
                                    </div> */}
                            </div>

                            {/* Trayectoria de promedio */}
                            <Card className={classes.sectionCard}>
                                <Typography style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>
                                    Trayectoria de promedio por periodo
                                </Typography>
                                <TrayectoriaPromedio
                                    datos={trayectoriaGrafica}
                                    minima={CALIF_MINIMA_APROBATORIA}
                                    angosto={angosto}
                                />
                            </Card>

                            {/* Créditos cumplidos */}
                            <Card className={classes.sectionCard}>
                                <Typography style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>
                                    Créditos Cumplidos
                                </Typography>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
                                    {creditosCumplidos.map((a) => (
                                        <div key={a.nombre}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                                                <span>{a.nombre}</span>
                                                <span style={{ color: '#6E6E6E' }}>{a.creditos} créditos</span>
                                            </div>
                                            <BarraProgreso porcentaje={Number(a.creditos) / Number((a.nombre === "Obligatorios") ? programa.plan.creditosObligatorios : programa.plan.creditosOptativos) * 100} />
                                        </div>
                                    ))}
                                </div>
                            </Card>

                            {/* Kardex por periodo */}
                            <Card className={classes.sectionCard}>
                                <Typography style={{ fontSize: 14, fontWeight: 600, marginBottom: 10 }}>
                                    Kardex por periodo
                                </Typography>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    {porTermino.map((grupo) => {
                                        const abierto = !!terminosAbiertos[grupo.termino];
                                        return (
                                            <div key={grupo.termino} style={{ border: '1px solid #ECECEC', borderRadius: 8, overflow: 'hidden' }}>
                                                <button
                                                    type="button"
                                                    onClick={() => toggleTermino(grupo.termino)}
                                                    style={{
                                                        width: '100%',
                                                        display: 'flex',
                                                        // En angosto los dos textos no caben en una línea:
                                                        // se apilan y el botón gana alto para el dedo.
                                                        flexDirection: angosto ? 'column' : 'row',
                                                        alignItems: angosto ? 'flex-start' : 'center',
                                                        justifyContent: 'space-between',
                                                        gap: angosto ? 2 : 0,
                                                        minHeight: angosto ? 48 : undefined,
                                                        textAlign: 'left',
                                                        padding: angosto ? '11px 12px' : '10px 12px',
                                                        background: '#FAFAFA', border: 'none', cursor: 'pointer', font: 'inherit'
                                                    }}
                                                >
                                                    <span style={{ fontWeight: 600, fontSize: 13 }}>
                                                        {abierto ? '▾' : '▸'} Periodo {periodoLegible(grupo.termino)}
                                                    </span>
                                                    <span style={{ fontSize: 12, color: '#6E6E6E' }}>
                                                        {grupo.promedio != null ? `Promedio ${grupo.promedio}` : 'En curso'} · {grupo.creditos} cr
                                                    </span>
                                                </button>

                                                {abierto && angosto ? (
                                                    <ListaMaterias materias={grupo.materias} />
                                                ) : null}

                                                {abierto && !angosto ? (
                                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                                                        <thead>
                                                            <tr style={{ color: '#6E6E6E', textAlign: 'left' }}>
                                                                <th style={{ fontWeight: 400, padding: '6px 12px' }}>Materia</th>
                                                                <th style={{ fontWeight: 400, width: 48, textAlign: 'center' }}>Cr.</th>
                                                                <th style={{ fontWeight: 400, width: 56, textAlign: 'center' }}>Calif.</th>
                                                                <th style={{ fontWeight: 400, width: 96, textAlign: 'right', paddingRight: 12 }}>Estado</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {grupo.materias.map((m, idx) => {
                                                                const e = ESTADO_ESTILO[m.estado] || ESTADO_ESTILO.en_curso;
                                                                return (
                                                                    <tr key={`${m.claveMateria}-${idx}`} style={{ borderTop: '1px solid #F0F0F0' }}>
                                                                        <td style={{ padding: '7px 12px' }}>
                                                                            <span style={{ color: '#9A9A9A' }}>{m.claveMateria}</span> {m.nombreMateria}
                                                                            <LeyendaIntento materia={m} />
                                                                        </td>
                                                                        <td style={{ textAlign: 'center' }}>{m.creditos}</td>
                                                                        <td style={{ textAlign: 'center' }}>{m.calificacion != null ? m.calificacion : '—'}</td>
                                                                        <td style={{ textAlign: 'right', paddingRight: 12 }}>
                                                                            <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 6, background: e.bg, color: e.fg }}>
                                                                                {e.label}
                                                                            </span>
                                                                        </td>
                                                                    </tr>
                                                                );
                                                            })}
                                                        </tbody>
                                                    </table>
                                                ) : null}
                                            </div>
                                        );
                                    })}
                                </div>
                            </Card>
                        </div>
                    </Acomodo>
                </>
            )}
        </div>
    );
};

export default HistorialAcademico;
