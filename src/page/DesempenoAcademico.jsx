import { useState, useEffect, useLayoutEffect, useRef } from 'react';
import {
    Typography,
    Button,
    Box,
    CircularProgress
} from '@ellucian/react-design-system/core';
import { useData, useCardInfo } from '@ellucian/experience-extension-utils';
import { useParams, useHistory } from 'react-router-dom';
import ResumenTab from './tabs/ResumenTab';
import HorarioTab from './tabs/HorarioTab';
import CredencialTab from './tabs/CredencialTab';
import ServiciosTab from './tabs/ServiciosTab';
import HistorialAcademico from './HistorialAcademico';
import { COLORES, ESTUDIANTE, PERIODO_ACTUAL } from '../data/datosDemo';
import { fetchResumen } from '../data/resumenData';
import { Home as HomeIcon } from '@ellucian/ds-icons/lib';
import escudoUabc from './escudo-uabc.png';
import { useEstilosAnimacion, NAVBAR } from './components/animaciones';

// URL del inicio de Experience (cambiar para producción).
const URL_INICIO = 'https://experience-test.elluciancloud.com/uabcsaastest/';
// Reglas de validación de la matrícula (igual que la tarjeta).
const MIN_DIGITOS = 6;
const MAX_DIGITOS = 10;

const TABS = [
    { id: 'resumen', label: 'Resumen' },
    { id: 'horario', label: 'Horario' },
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
const Escudo = () => (
    <img src={escudoUabc} alt="Universidad Autónoma de Baja California" style={{ height: 58, width: 'auto', display: 'block' }} />
);

// Navega al inicio del tenant.
// try/catch por si en algún entorno se restringe.
const irAlInicio = () => {
    try {
        window.top.location.href = URL_INICIO;
    } catch {
        window.location.href = URL_INICIO;
    }
};

// Barra superior derecha: "Tarjeta" vuelve a la búsqueda de matrícula (dentro
// de la página) e "Inicio" regresa al home del tenant de Experience.
const BotonesNav = () => {
    const history = useHistory();
    return (
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginBottom: 12 }}>
            <Button color="secondary" size="small" onClick={() => history.push('/HistorialAcademico')}>
                Tarjeta
            </Button>
            <Button color="secondary" size="small" startIcon={<HomeIcon />} onClick={irAlInicio}>
                Inicio
            </Button>
        </div>
    );
};

// Pantalla de búsqueda (la "tarjeta" dentro de la página): input de matrícula
// con validación + botón para ver el historial.
const BuscarMatricula = () => {
    const history = useHistory();
    const [matricula, setMatricula] = useState('');
    const [tocado, setTocado] = useState(false);
    const valida = matricula.length >= MIN_DIGITOS && matricula.length <= MAX_DIGITOS;
    const mostrarError = tocado && matricula.length > 0 && !valida;
    const onChange = (e) => setMatricula(e.target.value.replace(/\D/g, '').slice(0, MAX_DIGITOS));
    const buscar = () => {
        setTocado(true);
        if (!valida) return;
        history.push(`/DesempenoAcademico/${matricula}`);
    };
    return (
        <Box sx={{ p: 3 }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
                <Button color="secondary" size="small" startIcon={<HomeIcon />} onClick={irAlInicio}>
                    Inicio
                </Button>
            </div>
            <Typography variant="h4" style={{ marginBottom: 8 }}>Desempeño Académico</Typography>
            <Typography style={{ marginBottom: 16, color: '#6E6E6E' }}>
                Ingresa la matrícula del estudiante para ver su Desempeño Académico.
            </Typography>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                <input
                    type="text"
                    inputMode="numeric"
                    value={matricula}
                    onChange={onChange}
                    onBlur={() => setTocado(true)}
                    onKeyDown={(e) => { if (e.key === 'Enter') buscar(); }}
                    placeholder="Matrícula"
                    aria-label="Matrícula"
                    maxLength={MAX_DIGITOS}
                    style={{
                        padding: '8px 12px',
                        border: `1px solid ${mostrarError ? '#C0392B' : '#C9CDD2'}`,
                        borderRadius: 8,
                        fontSize: 14,
                        width: 200
                    }}
                />
                <Button onClick={buscar} disabled={!valida}>Ver Desempeño Académico</Button>
            </div>
            {mostrarError ? (
                <Typography style={{ color: '#C0392B', fontSize: 12, marginTop: 6 }}>
                    La matrícula debe tener entre {MIN_DIGITOS} y {MAX_DIGITOS} dígitos.
                </Typography>
            ) : null}
        </Box>
    );
};

const DesempenoAcademico = () => {
    const [tab, setTab] = useState('resumen');

    // Los datos del resumen se cargan UNA vez aquí (y no en cada pestaña):
    // el encabezado, el periodo, el resumen y la credencial los comparten.
    const { classes: clasesAnim } = useEstilosAnimacion();
    const { authenticatedEthosFetch } = useData();

    // Subrayado único que viaja entre pestañas. Antes cada botón pintaba su
    // propio borde inferior y el indicador se teletransportaba; ahora se
    // mide la pestaña activa y una sola barra se desplaza hasta ella.
    const barraTabs = useRef(null);
    const refsTab = useRef({});
    const [subrayado, setSubrayado] = useState(null);

    useLayoutEffect(() => {
        const medir = () => {
            const boton = refsTab.current[tab];
            if (!boton) return;
            // offsetLeft/offsetTop son relativos al contenedor, que va en
            // position relative. Se mide también el alto porque las pestañas
            // se reparten en dos renglones en pantallas angostas.
            setSubrayado({
                x: boton.offsetLeft,
                y: boton.offsetTop + boton.offsetHeight - NAVBAR.altoSubrayado,
                ancho: boton.offsetWidth
            });
        };

        medir();

        const nodo = barraTabs.current;
        const Observador = window.ResizeObserver;
        if (!nodo || !Observador) {
            window.addEventListener('resize', medir);
            return () => window.removeEventListener('resize', medir);
        }
        // Se remide cuando la barra cambia de tamaño: al reacomodarse en dos
        // renglones el subrayado tiene que seguir a su pestaña.
        const observador = new Observador(medir);
        observador.observe(nodo);
        return () => observador.disconnect();
    }, [tab]);

    // Los datos del resumen se cargan UNA vez aquí (y no en cada pestaña):
    // el encabezado, el periodo, el resumen y la credencial los comparten.
    const { cardConfiguration, cardId } = useCardInfo();
    const { matricula: matriculaParam } = useParams();
    const [datos, setDatos] = useState(null);
    const [cargando, setCargando] = useState(true);

    // Pestañas ya visitadas. Una pestaña se monta la PRIMERA vez que se abre
    // (por eso el pipeline del historial no se llama al entrar a la página) y
    // a partir de ahí se mantiene montada, solo oculta. Así "Historia
    // académica" conserva sus datos y no vuelve a consultar el pipeline cada
    // vez que se regresa a ella.
    const [visitadas, setVisitadas] = useState({ resumen: true });

    useEffect(() => {
        setDatos(null);
        let cancelado = false;
        setCargando(true);

        fetchResumen({
            authenticatedEthosFetch,
            cardId,
            pipelines: {
                desempeno: cardConfiguration?.desempenoPipeline,
                adeudos: cardConfiguration?.adeudosPipeline,
                horario: cardConfiguration?.horarioPipeline
            },
            matricula: matriculaParam
        })
            .then((d) => { if (!cancelado) setDatos(d); })
            .catch((e) => {
                if (cancelado) return;
                // fetchResumen solo lanza cuando no hay acceso a Ethos: en
                // ese caso fallan las dos secciones. El motivo se conserva
                // para que el Resumen pueda avisar en pantalla en lugar de
                // quedarse con los datos de ejemplo sin explicación.
                console.error('[Resumen] No se pudo consultar el pipeline:', e);
                const mensaje = (e && e.message) || 'Error desconocido';
                setDatos({
                    desempeno: null,
                    adeudos: null,
                    horario: null,
                    errores: [
                        { seccion: 'desempeno', mensaje },
                        { seccion: 'adeudos', mensaje },
                        { seccion: 'horario', mensaje }
                    ]
                });
            })
            .finally(() => { if (!cancelado) setCargando(false); });

        return () => { cancelado = true; };
    }, [authenticatedEthosFetch, cardConfiguration, cardId, matriculaParam]);

    if (!matriculaParam) {
        return <BuscarMatricula />;
    }

    if (datos?.desempeno == null && datos?.adeudos == null) {
        return (
            <Box sx={{ p: 3 }}>
                <BotonesNav />
                <CircularProgress aria-label={'Cargando'} aria-valuetext={'Cargando'} />
                <Typography>
                    {`Cargando datos...`}
                </Typography>
            </Box>
        );
    }

    // Programas del alumno. Puede cursar más de uno a la vez; cada uno trae
    // sus propias materias, ya separadas por llave en el parseo.
    const programas = (datos && datos.desempeno && datos.desempeno.programas) || [];
    // Horario semanal: llega con las materias de todos los planes juntas.
    const horario = (datos && datos.horario) || [];
    const adeudos = (datos && datos.adeudos) || [];
    const delPipeline = (datos && datos.desempeno && datos.desempeno.estudiante) || {};
    const programa = (datos && datos.desempeno && datos.desempeno.programa) || {};

    // Secciones cuyo pipeline no respondió. Cada una se pide por separado,
    // así que puede fallar una y funcionar la otra.
    const errores = (datos && datos.errores) || [];

    // Un campo faltante se trata distinto según la causa:
    //   - el pipeline FALLÓ  -> se muestra el dato de ejemplo, siempre
    //     acompañado del aviso que explica que no es del alumno.
    //   - el pipeline RESPONDIÓ pero el campo no vino -> no se inventa nada.
    //     Antes caía al respaldo de demostración y se veía una carrera falsa
    //     como si fuera real, sin ningún aviso.
    const falloDesempeno = errores.some((e) => e.seccion === 'desempeno');
    const pendiente = cargando ? '' : '—';
    const dato = (valor, demo) => valor || (falloDesempeno ? demo : pendiente);
    const cursos = (datos && datos.desempeno && datos.desempeno.cursos) || [];

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

    const abrirTab = (id) => {
        setTab(id);
        setVisitadas((prev) => (prev[id] ? prev : { ...prev, [id]: true }));
    };

    const contenidoPorTab = {
        resumen: (
            <ResumenTab
                estudiante={estudiante}
                adeudos={adeudos}
                programas={programas}
                cargando={cargando}
                errores={errores}
                matricula={matriculaParam}
            />
        ),
        horario: <HorarioTab estudiante={estudiante} periodoActual={periodoActual} clases={horario} />,
        credencial: <CredencialTab estudiante={estudiante} />,
        historia: <HistorialAcademico />,
        servicios: <ServiciosTab />
    };

    return (
        <div style={{ background: COLORES.fondo, minHeight: '100%', padding: '1.25rem' }}>
            <BotonesNav />
                <div>
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

                        {/* Nombre y iniciales del alumno, a la derecha del saludo. */}
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
                            <div ref={barraTabs} style={{ display: 'flex', gap: 4, flexWrap: 'wrap', position: 'relative' }}>
                                {TABS.map((t) => {
                                    const activa = t.id === tab;
                                    return (
                                        <button
                                            key={t.id}
                                            ref={(nodo) => { refsTab.current[t.id] = nodo; }}
                                            type="button"
                                            onClick={() => abrirTab(t.id)}
                                            className={[
                                                clasesAnim.opcionNavbar,
                                                activa ? '' : clasesAnim.opcionNavbarInactiva
                                            ].filter(Boolean).join(' ')}
                                            style={{
                                                // Color del realce que aparece detrás
                                                // del texto al pasar el mouse.
                                                '--da-realce': COLORES.verdeClaro,
                                                background: 'none',
                                                border: 'none',
                                                // El borde se queda transparente en todas: el
                                                // oro lo pinta el subrayado que viaja. Sin él
                                                // los botones perderían 3 px de alto.
                                                borderBottom: '3px solid transparent',
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

                                {subrayado ? (
                                    <span
                                        aria-hidden="true"
                                        className={clasesAnim.subrayadoNavbar}
                                        style={{
                                            background: COLORES.oro,
                                            width: subrayado.ancho,
                                            transform: `translate(${subrayado.x}px, ${subrayado.y}px)`
                                        }}
                                    />
                                ) : null}
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
        </div>
    );
};

export default DesempenoAcademico;
