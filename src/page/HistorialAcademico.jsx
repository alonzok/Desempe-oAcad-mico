import { useState, useEffect } from 'react';
import {
    Box,
    Card,
    Button,
    Typography,
    makeStyles,
    FixedSidebarLayout,
} from '@ellucian/react-design-system/core';
import { fetchHistorialAcademico } from '../data/historialData';
import {
    getAvanceCarrera,
    getKardexPorTermino,
    getResumen,
    getTrayectoria,
    CALIF_MINIMA_APROBATORIA
} from './historialSelectors';
import AnilloProgreso from './components/AnilloProgreso';
import LoadingOverlay from './components/LoadingOverlay';
import BarraProgreso from './components/BarraProgreso';
import { generarKardexPdf, generarKardexPeriodoPdf, generarKardexLenguasPdf } from './generarKardexPdf';
import { useData, useCardInfo, useUserInfo } from '@ellucian/experience-extension-utils';
import LenguasExtranjeras from './LenguasExtranjeras';

// URL del inicio de Experience (cambiar para producción).
const ACENTO = '#1D9E75';

const ESTADO_ESTILO = {
    aprobada: { bg: '#E6F4EC', fg: '#1D7A4E', label: 'Aprobada' },
    reprobada: { bg: '#FBE9E7', fg: '#C0392B', label: 'Reprobada' },
    en_curso: { bg: '#E7F0FB', fg: '#1F6FB2', label: 'En curso' }
};

const useStyles = makeStyles()({
    root: { padding: '1rem' },
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

const HistorialAcademico = () => {
    const { classes } = useStyles();
    const { authenticatedEthosFetch } = useData();
    const { cardConfiguration, cardId } = useCardInfo();
    const { firstName, roles } = useUserInfo();

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
        let cancelado = false;
        const bannerId = roles.findLast(role => role.startsWith("A"))
        console.log(bannerId)
        fetchHistorialAcademico({
            authenticatedEthosFetch,
            pipelines: {
                licenciatura: cardConfiguration?.historialPipelineLicenciatura,
                posgrado: cardConfiguration?.historialPipelinePosgrado,
                lenguas: cardConfiguration?.historialPipelineLenguas
            },
            cardId,
            // bannerId: bannerId
        })
            .then((d) => {
                if (cancelado) return;
                setData(d);
                setTab(0);
                if (d.programas.length) abrirUltimoTermino(d.programas[0]);
            })
            .catch((e) => {
                if (!cancelado) setError(e?.message || 'No se pudo cargar el historial');
            });
        return () => {
            cancelado = true;
        };
    }, [authenticatedEthosFetch, cardConfiguration, cardId]);

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

    // Gráfica de trayectoria
    const W = 460;
    const H = 110;
    const padX = 26;
    const padTop = 22;
    const padBottom = 26;
    const vMin = 50;
    const vMax = 100;
    const yDe = (v) => padTop + (1 - (v - vMin) / (vMax - vMin)) * (H - padTop - padBottom);
    const xDe = (i) =>
        trayectoria.length > 1 ? padX + (i * (W - 2 * padX)) / (trayectoria.length - 1) : W / 2;
    const puntos = trayectoria.map((t, i) => `${xDe(i).toFixed(1)},${yDe(t.promedio).toFixed(1)}`).join(' ');
    const yAprob = yDe(CALIF_MINIMA_APROBATORIA);

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
            {/* Se muestra el NOMBRE del programa educativo en lugar de su
                clave (antes decía, por ejemplo, "LI-10-0112"). */}
            <Typography style={{ color: '#6E6E6E', fontSize: 15, marginTop: 2 }}>
                {est.nombrePrograma || est.programa}
            </Typography>
            <Typography style={{ color: '#9A9A9A', fontSize: 15, marginBottom: 14 }}>
                Mat. {est.matricula}
            </Typography>

            <div style={{ margin: '6px 0 12px', display: 'flex', justifyContent: 'space-around' }}>
                <div>
                    <AnilloProgreso porcentaje={promedio || 0} valor={promedio ?? '—'} etiqueta="Prom. Arit." />
                </div>
                {
                    programa.nivel == 'Posgrado' &&
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

            {/* Cada nivel tiene su propio formato de kardex:
                  Licenciatura -> agrupado por etapas
                  Posgrado     -> agrupado por periodos
                  Lenguas      -> formato propio, simplificado */}
            <Button
                onClick={() => {
                    if (esLenguas) generarKardexLenguasPdf(programa);
                    else if (programa.nivel === 'Posgrado') generarKardexPeriodoPdf(programa);
                    else generarKardexPdf(programa);
                }}
                style={{ marginTop: 16, width: '100%' }}
            >
                Descargar kardex (PDF)
            </Button>
        </Card>
    );

    return (
        <div className={classes.root}>
            {/* Tabs por programa */}
            <div className={classes.tabs}>
                {data.programas.map((p, i) => (
                    <button
                        key={p.id}
                        type="button"
                        onClick={() => cambiarTab(i)}
                        className={`${classes.tab} ${i === tab ? classes.tabActivo : ''}`}
                    >
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{p.etiqueta.subtitulo}</div>
                        <div style={{ fontSize: 11, color: '#6E6E6E' }}>{p.etiqueta.titulo}</div>
                    </button>
                ))}
            </div>

            {esLenguas ? (
                <LenguasExtranjeras programa={programa} />
            ) : (
                <>
                    {/*
                        position="sticky": por defecto este componente usa
                        position:fixed, y con la página dentro de un iframe la
                        ficha del alumno se recortaba por abajo (no se
                        alcanzaba el botón del PDF) y se quedaba atorada al
                        subir. Con sticky acompaña el scroll correctamente.
                    */}
                    <FixedSidebarLayout sidebar={sidebar} position="sticky">
                        <div className={classes.mainStack}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                                {
                                    programa.nivel == 'Licenciatura' &&
                                    <div style={{ background: '#F4F6F8', borderRadius: 8, padding: '0.8rem 0.9rem' }}>
                                        <div style={{ fontSize: 13, color: '#6E6E6E' }}>Créditos Básicos</div>
                                        <div style={{ fontSize: 24, fontWeight: 600, marginTop: 2 }}>{programa.resumenEtapas?.EB.creditosCursados}/{programa.resumenEtapas?.EB.creditosRequeridos}</div>
                                    </div>
                                }
                                {
                                    programa.nivel == 'Licenciatura' &&
                                    <div style={{ background: '#F4F6F8', borderRadius: 8, padding: '0.8rem 0.9rem' }}>
                                        <div style={{ fontSize: 13, color: '#6E6E6E' }}>Créditos Disciplinarios</div>
                                        <div style={{ fontSize: 24, fontWeight: 600, marginTop: 2 }}>{programa.resumenEtapas?.ED.creditosCursados}/{programa.resumenEtapas?.ED.creditosRequeridos}</div>
                                    </div>
                                }
                                {
                                    programa.nivel == 'Licenciatura' &&
                                    <div style={{ background: '#F4F6F8', borderRadius: 8, padding: '0.8rem 0.9rem' }}>
                                        <div style={{ fontSize: 13, color: '#6E6E6E' }}>Créditos Terminales</div>
                                        <div style={{ fontSize: 24, fontWeight: 600, marginTop: 2 }}>{programa.resumenEtapas?.ET.creditosCursados}/{programa.resumenEtapas?.ET.creditosRequeridos}</div>
                                    </div>
                                }
                                <div style={{ background: '#F4F6F8', borderRadius: 8, padding: '0.8rem 0.9rem' }}>
                                    <div style={{ fontSize: 13, color: '#6E6E6E' }}>Créditos Obligatorios</div>
                                    <div style={{ fontSize: 24, fontWeight: 600, marginTop: 2 }}>{programa.plan.creditosOblitagoriosCursados}/{programa.plan.creditosObligatorios}</div>
                                </div>
                                <div style={{ background: '#F4F6F8', borderRadius: 8, padding: '0.8rem 0.9rem' }}>
                                    <div style={{ fontSize: 13, color: '#6E6E6E' }}>Créditos Optativos</div>
                                    <div style={{ fontSize: 24, fontWeight: 600, marginTop: 2 }}>{programa.plan.creditosOptativosCursados}/{programa.plan.creditosOptativos}</div>
                                </div>

                                {
                                    programa.nivel == 'Licenciatura' &&
                                    <div style={{ background: '#F4F6F8', borderRadius: 8, padding: '0.8rem 0.9rem' }}>
                                        <div style={{ fontSize: 13, color: '#6E6E6E' }}>Prácticas Profesionales</div>
                                        <div style={{ fontSize: 24, fontWeight: 600, marginTop: 2 }}>{programa.resumenEtapas?.PP.creditosCursados}/{programa.resumenEtapas?.PP.creditosRequeridos}</div>
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
                                <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} role="img" aria-label="Promedio por periodo">
                                    <line x1={padX} y1={yAprob} x2={W - padX} y2={yAprob} stroke="#D0D0D0" strokeWidth="1" strokeDasharray="4 4" />
                                    <text x={W - padX} y={yAprob - 3} textAnchor="end" style={{ fontSize: 10, fill: '#9A9A9A' }}>
                                        mínima ({CALIF_MINIMA_APROBATORIA})
                                    </text>
                                    {trayectoria.length > 1 ? (
                                        <polyline points={puntos} fill="none" stroke={ACENTO} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                                    ) : null}
                                    {trayectoria.map((t, i) => (
                                        <g key={t.termino}>
                                            <circle cx={xDe(i)} cy={yDe(t.promedio)} r="3.5" fill={ACENTO} />
                                            <text x={xDe(i)} y={yDe(t.promedio) - 8} textAnchor="middle" style={{ fontSize: 10, fill: '#2A2A2A', fontWeight: 500 }}>
                                                {t.promedio}
                                            </text>
                                            <text x={xDe(i)} y={H - 8} textAnchor="middle" style={{ fontSize: 10, fill: '#9A9A9A' }}>
                                                {periodoLegible(t.termino)}
                                            </text>
                                        </g>
                                    ))}
                                </svg>
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
                                                        width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                                        padding: '10px 12px', background: '#FAFAFA', border: 'none', cursor: 'pointer', font: 'inherit'
                                                    }}
                                                >
                                                    <span style={{ fontWeight: 600, fontSize: 13 }}>
                                                        {abierto ? '▾' : '▸'} Periodo {periodoLegible(grupo.termino)}
                                                    </span>
                                                    <span style={{ fontSize: 12, color: '#6E6E6E' }}>
                                                        {grupo.promedio != null ? `Promedio ${grupo.promedio}` : 'En curso'} · {grupo.creditos} cr
                                                    </span>
                                                </button>

                                                {abierto ? (
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
                    </FixedSidebarLayout>
                </>
            )}
        </div>
    );
};

export default HistorialAcademico;
