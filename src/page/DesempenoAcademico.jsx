import { useState, useEffect } from 'react';
import { Typography } from '@ellucian/react-design-system/core';
import { useData, useCardInfo } from '@ellucian/experience-extension-utils';
import ResumenTab from './tabs/ResumenTab';
import CredencialTab from './tabs/CredencialTab';
import ServiciosTab from './tabs/ServiciosTab';
import HistorialAcademico from './HistorialAcademico';
import { COLORES, ESTUDIANTE, PERIODO_ACTUAL } from '../data/datosDemo';
import { fetchResumen } from '../data/resumenData';

const TABS = [
    { id: 'resumen', label: 'Resumen' },
    { id: 'credencial', label: 'Credencial' },
    { id: 'historia', label: 'Historia académica' },
    { id: 'servicios', label: 'Servicios' }
];

// El pipeline manda el nombre en mayúsculas; se pasa a formato de título.
const capitalizar = (texto) =>
    String(texto || '')
        .toLowerCase()
        .split(' ')
        .map((p) => (p ? p[0].toUpperCase() + p.slice(1) : p))
        .join(' ');

// 202610 -> 2026-1 (mismos cortes que el kardex oficial)
const periodoLegible = (cod) => {
    const m = String(cod || '').match(/^(\d{4})(\d{2})$/);
    if (!m) return String(cod || '');
    const n = parseInt(m[2], 10);
    const ciclo = n >= 40 ? n - 35 : (n % 10 === 0 ? n / 10 : n);
    return `${m[1]}-${ciclo}`;
};

const iniciales = (nombre) =>
    String(nombre || '')
        .split(' ')
        .slice(0, 2)
        .map((x) => x[0])
        .join('')
        .toUpperCase();

// Escudo oficial de la UABC (PNG incrustado en base64: sin archivos externos).
const ESCUDO_UABC = 'data:image/png;base64,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';
const Escudo = () => (
    <img src={ESCUDO_UABC} alt="Universidad Autónoma de Baja California" style={{ height: 58, width: 'auto', display: 'block' }} />
);

const DesempenoAcademico = () => {
    const [tab, setTab] = useState('resumen');

    // Los datos del resumen se cargan UNA vez aquí (y no en cada pestaña):
    // el encabezado, el periodo, el resumen y la credencial los comparten.
    const { authenticatedEthosFetch } = useData();
    const { cardConfiguration, cardId } = useCardInfo();
    const [datos, setDatos] = useState(null);
    const [cargando, setCargando] = useState(true);

    useEffect(() => {
        let cancelado = false;
        setCargando(true);

        fetchResumen({
            authenticatedEthosFetch,
            cardId,
            pipelines: {
                desempeno: cardConfiguration?.desempenoPipeline,
                adeudos: cardConfiguration?.adeudosPipeline
            }
        })
            .then((d) => { if (!cancelado) setDatos(d); })
            .catch(() => { if (!cancelado) setDatos({ desempeno: null, adeudos: null, errores: [] }); })
            .finally(() => { if (!cancelado) setCargando(false); });

        return () => { cancelado = true; };
    }, [authenticatedEthosFetch, cardConfiguration, cardId]);

    const cursos = (datos && datos.desempeno && datos.desempeno.cursos) || [];
    const adeudos = (datos && datos.adeudos) || [];
    const delPipeline = (datos && datos.desempeno && datos.desempeno.estudiante) || {};
    const programa = (datos && datos.desempeno && datos.desempeno.programa) || {};

    // Nombre y matrícula reales; el resto sigue siendo de demostración.
    const estudiante = {
        nombre: capitalizar(delPipeline.nombre) || ESTUDIANTE.nombre,
        // El pipeline ya manda los nombres de pila y los apellidos por
        // separado, así que no hay que deducirlos del nombre completo.
        primerNombre: capitalizar(delPipeline.primerNombre),
        apellidos: capitalizar(delPipeline.apellidos),
        matricula: delPipeline.matricula || ESTUDIANTE.matricula,
        programa: programa.nombre || ESTUDIANTE.programa,
        // Campus y facultad ya vienen del pipeline (en el programa).
        facultad: programa.facultad || ESTUDIANTE.facultad,
        campus: programa.campus || ESTUDIANTE.campus,
        // El semestre sigue sin venir en ningún pipeline.
        semestre: ESTUDIANTE.semestre,
        estatus: ESTUDIANTE.estatus
    };

    // Periodo vigente: ahora lo manda el pipeline a nivel alumno.
    const periodoActual = delPipeline.periodo
        ? periodoLegible(delPipeline.periodo)
        : PERIODO_ACTUAL;


    // Pestañas ya visitadas. Una pestaña se monta la PRIMERA vez que se abre
    // (por eso el pipeline del historial no se llama al entrar a la página) y
    // a partir de ahí se mantiene montada, solo oculta. Así "Historia
    // académica" conserva sus datos y no vuelve a consultar el pipeline cada
    // vez que se regresa a ella.
    const [visitadas, setVisitadas] = useState({ resumen: true });

    const abrirTab = (id) => {
        setTab(id);
        setVisitadas((prev) => (prev[id] ? prev : { ...prev, [id]: true }));
    };

    const contenidoPorTab = {
        resumen: (
            <ResumenTab
                onCambiarTab={abrirTab}
                estudiante={estudiante}
                cursos={cursos}
                adeudos={adeudos}
                programa={programa}
                cargando={cargando}
            />
        ),
        credencial: <CredencialTab estudiante={estudiante} />,
        historia: <HistorialAcademico />,
        servicios: <ServiciosTab />
    };

    return (
        <div style={{ background: COLORES.fondo, minHeight: '100%', padding: '1.25rem' }}>
            {/* ── Encabezado ── */}
            <div
                style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    gap: 16,
                    flexWrap: 'wrap',
                    marginBottom: '1.25rem'
                }}
            >
                <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                    <Escudo />
                    <div>
                        <Typography
                            style={{
                                fontSize: 11,
                                letterSpacing: '0.08em',
                                textTransform: 'uppercase',
                                color: COLORES.verde,
                                fontWeight: 700
                            }}
                        >
                            Universidad Autónoma de Baja California
                        </Typography>
                        <Typography style={{ fontSize: 30, fontWeight: 700, color: COLORES.texto, lineHeight: 1.15 }}>
                            Hola, {estudiante.primerNombre || ESTUDIANTE.saludo}
                        </Typography>
                        <Typography style={{ fontSize: 13, color: COLORES.textoSuave }}>
                            Tu vida universitaria, clara y en un solo lugar.
                        </Typography>
                    </div>
                </div>

                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        border: `1px solid ${COLORES.linea}`,
                        borderRadius: 999,
                        padding: '6px 8px 6px 16px',
                        background: '#FFFFFF'
                    }}
                >
                    <Typography style={{ fontSize: 13, fontWeight: 600, color: COLORES.texto }}>
                        {[estudiante.primerNombre, estudiante.apellidos.split(' ')[0]].filter(Boolean).join(' ')}
                    </Typography>
                    <span
                        style={{
                            width: 30,
                            height: 30,
                            borderRadius: '50%',
                            background: COLORES.verdeClaro,
                            color: COLORES.verde,
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 12,
                            fontWeight: 700
                        }}
                    >
                        {iniciales(`${estudiante.primerNombre} ${estudiante.apellidos}`)}
                    </span>
                </div>
            </div>

            {/* ── Panel blanco: pestañas + contenido (como en el diseño) ── */}
            <div
                style={{
                    background: '#FFFFFF',
                    border: `1px solid ${COLORES.linea}`,
                    borderRadius: 18,
                    // El aire de ARRIBA lo da este padding y el de ABAJO el
                    // marginBottom del chip: así queda centrado entre el borde
                    // de la tarjeta y la línea que cierra las pestañas.
                    padding: '10px 1.5rem 1.5rem'
                }}
            >
            {/* ── Pestañas ── */}
            <div
                style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 16,
                    flexWrap: 'wrap',
                    borderBottom: `1px solid ${COLORES.linea}`,
                    marginBottom: '1.5rem'
                }}
            >
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {TABS.map((t) => {
                        const activa = t.id === tab;
                        return (
                            <button
                                key={t.id}
                                type="button"
                                onClick={() => abrirTab(t.id)}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    borderBottom: `3px solid ${activa ? COLORES.oro : 'transparent'}`,
                                    padding: '10px 14px',
                                    cursor: 'pointer',
                                    fontSize: 14,
                                    fontWeight: activa ? 700 : 500,
                                    color: activa ? COLORES.verde : COLORES.textoSuave
                                }}
                            >
                                {t.label}
                            </button>
                        );
                    })}
                </div>

                {/* Periodo real del pipeline (antes estaba fijo en 2026-2). */}
                <span
                    style={{
                        background: COLORES.verde,
                        color: '#FFFFFF',
                        borderRadius: 999,
                        padding: '9px 22px',
                        fontSize: 15,
                        fontWeight: 700,
                        letterSpacing: '0.02em',
                        marginBottom: 9,
                        boxShadow: '0 1px 3px rgba(15,92,63,0.25)'
                    }}
                >
                    Periodo {periodoActual || '—'}
                </span>
            </div>

            {/* ── Contenido de la pestaña ── */}
            {TABS.filter((t) => visitadas[t.id]).map((t) => (
                <div key={t.id} style={{ display: t.id === tab ? 'block' : 'none' }}>
                    {contenidoPorTab[t.id]}
                </div>
            ))}
            </div>

            <Typography
                style={{
                    fontSize: 11,
                    color: COLORES.textoSuave,
                    textAlign: 'center',
                    marginTop: '1.5rem'
                }}
            >
                Información personal protegida.
            </Typography>
        </div>
    );
};

export default DesempenoAcademico;
