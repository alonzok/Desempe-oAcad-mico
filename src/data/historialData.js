/* global URLSearchParams */
/**
 * Capa de datos del Historial Académico.
 *
 * Consume TRES pipelines (uno por categoría), cada uno recibe la matrícula:
 *   - Licenciatura        (x-get-kardex-li)
 *   - Posgrado            (x-get-kardex-po)
 *   - Lenguas Extranjeras (x-get-kardex-le)
 *
 * Los tres se piden EN PARALELO y se combinan en una sola estructura. Si un
 * pipeline falla o no está configurado, los demás siguen funcionando: el
 * estudiante simplemente no verá esa pestaña.
 *
 * fetchHistorialAcademico(...) -> { estudiante, programas: [...], errores: [...] }
 * Cada `programa` conserva la forma { estudiante, plan, resumen, terminos,
 * kardex } para que la página y el PDF lo consuman sin cambios.
 *
 * FORMATOS (difieren entre sí):
 *   LI / PO -> payload = [ { Nombre, programaCode, Programa, Facultad, Campus,
 *                            nivel, PromedioGeneral, PromedioPonderado,
 *                            CreditosObligatorios, CreditosOptativos,
 *                            creditosObligatoriosPrograma, creditosOptativosPrograma,
 *                            Calificaciones{periodo:{PromedioPeriodo, Materias[]}},
 *                            resumenEtapas (solo LI) } ]
 *   LE      -> payload = { Nombre, Campus, Programa: [ ...materias planas... ] }
 *              (sin promedios ni periodos: se calculan aquí)
 */

const MATRICULA_DEFAULT = '1125376';
const CALIF_MINIMA_APROBATORIA = 60;
// Lenguas Extranjeras califica en escala 0-10 (mínima aprobatoria 6).
const CALIF_MINIMA_LENGUAS = 6;

// Nombres legibles para el código de nivel que manda el pipeline.
const NIVELES = {
    LI: 'Licenciatura',
    PO: 'Posgrado',
    LE: 'Lenguas Extranjeras'
};

// ───────────────────────────────────────────────────────────────────────
// Helpers de transformación
// ───────────────────────────────────────────────────────────────────────
function aNumero(v) {
    if (v == null || v === '') return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
}

function nivelLegible(nivel) {
    if (!nivel) return '';
    return NIVELES[String(nivel).toUpperCase()] || nivel;
}

function estadoDeCalificacion(calif, minima = CALIF_MINIMA_APROBATORIA) {
    if (calif == null) return 'en_curso';
    return calif >= minima ? 'aprobada' : 'reprobada';
}

function mapMateria(m, minima = CALIF_MINIMA_APROBATORIA) {
    const calif = aNumero(m.Calificacion);
    return {
        claveMateria: m['NúmeroCurso'],
        nombreMateria: m.NombreCurso,
        creditos: m.Creditos || 0,
        calificacion: calif,
        estado: estadoDeCalificacion(calif, minima),
        termino: m.Periodo,
        areaClave: m['ÁreaConocimiento'] || 'Sin área',
        fechaExamen: m.Fecha,
        etapa: m.etapa === 'EB' ? 'Etapa Básica'
            : m.etapa === 'ED' ? 'Etapa Disciplinaria'
                : m.etapa === 'ET' ? 'Etapa Terminal'
                    : m.TipoMateria === 'Optativa' ? 'Etapa Optativa' : 'Sin Etapa',
        intento: m.Intento || 1,
        tipoMateria: m.TipoMateria || 'Obligatoria'
    };
}

// Áreas derivadas del kardex: créditos aprobados por tipo de materia.
function construirAreas(kardex) {
    const map = {};
    kardex.forEach((m) => {
        const a = m.tipoMateria;
        if (!map[a]) map[a] = { clave: a, nombre: a, creditosAprobados: 0 };
        if (m.estado === 'aprobada') map[a].creditosAprobados += m.creditos;
    });

    return Object.values(map).map((a) => ({
        clave: a.clave,
        nombre: a.nombre,
        creditosRequeridos: a.creditosAprobados, // PLACEHOLDER
        creditosAprobados: a.creditosAprobados
    }));
}

function limpiarNoUsar(s) {
    return s ? String(s).replace(/\(no\s*usar\)/gi, '').trim() : s;
}

// "Materias" trae TODOS los intentos; deja una fila por curso
// (el intento más alto = la calificación final).
function dedupeFinales(materias) {
    const map = {};
    materias.forEach((m) => {
        const k = m.claveMateria;
        if (!map[k] || (m.intento || 0) > (map[k].intento || 0)) {
            map[k] = m;
        }
    });
    return Object.values(map);
}

function promedioDe(materias) {
    const conCalif = materias.filter((m) => m.calificacion != null);
    if (!conCalif.length) return null;
    const suma = conCalif.reduce((acc, m) => acc + m.calificacion, 0);
    return Math.round((suma / conCalif.length) * 100) / 100;
}

// ───────────────────────────────────────────────────────────────────────
// Licenciatura y Posgrado: programas con Calificaciones por periodo
// ───────────────────────────────────────────────────────────────────────
function construirPrograma(prog, nivelCrudo, nombre, matricula) {
    const nivel = nivelLegible(nivelCrudo || prog.nivel);
    // Lenguas usa escala 0-10; licenciatura y posgrado 0-100.
    const minimaAprobatoria = /lenguas/i.test(nivel) ? CALIF_MINIMA_LENGUAS : CALIF_MINIMA_APROBATORIA;

    // Créditos REQUERIDOS por el plan de estudios.
    const creditosObligatorios = aNumero(prog.creditosObligatoriosPrograma) || 0;
    const creditosOptativos = aNumero(prog.creditosOptativosPrograma) || 0;

    // Créditos CURSADOS (el pipeline nuevo los manda ya sumados).
    const obligatoriosCursados = aNumero(prog.CreditosObligatorios != null
        ? prog.CreditosObligatorios
        : prog.CreditosObligatoriosCursados) || 0;
    const optativosCursados = aNumero(prog.CreditosOptativos != null
        ? prog.CreditosOptativos
        : prog.CreditosOptativosCursados) || 0;

    const calif = prog.Calificaciones || {};
    const periodos = Object.keys(calif).sort();

    const kardexTodos = [];
    const terminos = [];
    periodos.forEach((per) => {
        const bloque = calif[per] || {};
        const promPer = bloque.PromedioPeriodo != null ? bloque.PromedioPeriodo : bloque.PromedioGeneral;
        if (promPer != null) {
            terminos.push({ termino: per, promedio: aNumero(promPer) });
        }
        const lista = bloque.Materias || bloque.MateriasFinales || [];
        lista.forEach((m) => kardexTodos.push(mapMateria(m, minimaAprobatoria)));
    });

    const kardex = dedupeFinales(kardexTodos);

    // Promedio general OFICIAL a nivel de programa; si no viene, el del último periodo.
    const ultimo = periodos.length ? calif[periodos[periodos.length - 1]] : null;
    let promedioGeneral = aNumero(prog.PromedioGeneral);
    if (promedioGeneral == null && ultimo) {
        promedioGeneral = aNumero(ultimo.PromedioPeriodo != null ? ultimo.PromedioPeriodo : ultimo.PromedioGeneral);
    }
    const promedioPonderado = aNumero(prog.PromedioPonderado);

    // El pipeline nuevo usa programaCode; se aceptan los nombres anteriores.
    const codigo = prog.programaCode || prog.programCode || prog.ProgramaCode || '';

    return {
        id: `${nivel}__${codigo}`,
        nivel,
        etiqueta: { titulo: nivel, subtitulo: prog.Programa || codigo },
        estudiante: {
            nombre,
            matricula,
            bannerId: prog.id,
            programa: codigo,
            nombrePrograma: prog.Programa || '',
            facultad: prog.Facultad,
            campus: limpiarNoUsar(prog.Campus),
            terminoIngreso: prog.Admision,
            planClave: codigo,
            periodoDescr: prog.programTerm
        },
        plan: {
            creditosTotales: creditosObligatorios + creditosOptativos,
            creditosObligatorios,
            creditosOptativos,
            creditosOblitagoriosCursados: obligatoriosCursados,
            creditosOptativosCursados: optativosCursados,
            areas: construirAreas(kardex),
            materias: [] // malla no disponible aún
        },
        resumen: { promedioGeneral, promedioPonderado },
        resumenEtapas: prog.resumenEtapas,
        terminos,
        kardex,
        kardexCompleto: kardexTodos
    };
}

// ───────────────────────────────────────────────────────────────────────
// Lenguas Extranjeras: lista PLANA de materias, sin promedios ni periodos.
// Se arma un solo programa y se calculan aquí el promedio y los periodos.
// ───────────────────────────────────────────────────────────────────────
function construirProgramaLenguas(materiasCrudas, nombre, matricula, campusPayload) {
    const lista = Array.isArray(materiasCrudas) ? materiasCrudas : [];
    const primera = lista[0] || {};

    const kardexTodos = lista.map((m) => mapMateria(m, CALIF_MINIMA_LENGUAS));
    const kardex = dedupeFinales(kardexTodos);

    // Periodos con su promedio, calculados a partir de las materias.
    const porPeriodo = {};
    kardex.forEach((m) => {
        if (!m.termino) return;
        if (!porPeriodo[m.termino]) porPeriodo[m.termino] = [];
        porPeriodo[m.termino].push(m);
    });
    const terminos = Object.keys(porPeriodo).sort().map((per) => ({
        termino: per,
        promedio: promedioDe(porPeriodo[per])
    }));

    const creditosCursados = kardex
        .filter((m) => m.estado === 'aprobada')
        .reduce((acc, m) => acc + (m.creditos || 0), 0);

    const nivel = NIVELES.LE;

    return {
        id: `${nivel}__LE`,
        nivel,
        etiqueta: { titulo: nivel, subtitulo: primera['ÁreaConocimiento'] || nivel },
        estudiante: {
            nombre: nombre || primera.Nombre || '',
            matricula: matricula || primera.Matricula || '',
            programa: primera.subject || 'LE',
            nombrePrograma: nivel,
            facultad: primera.Facultad,
            campus: limpiarNoUsar(campusPayload || primera.Campus),
            planClave: 'LE',
            periodoDescr: terminos.length ? terminos[terminos.length - 1].termino : ''
        },
        plan: {
            // Este pipeline no entrega plan de estudios.
            creditosTotales: 0,
            creditosObligatorios: 0,
            creditosOptativos: 0,
            creditosOblitagoriosCursados: creditosCursados,
            creditosOptativosCursados: 0,
            areas: construirAreas(kardex),
            materias: []
        },
        resumen: { promedioGeneral: promedioDe(kardex), promedioPonderado: null },
        resumenEtapas: undefined,
        terminos,
        kardex,
        kardexCompleto: kardexTodos
    };
}

// ───────────────────────────────────────────────────────────────────────
// Parseo de la respuesta de UN pipeline
// ───────────────────────────────────────────────────────────────────────
export function parseRespuestaPipeline(respuesta, matricula, categoria) {
    const payload = (respuesta && respuesta.data && respuesta.data[0] && respuesta.data[0].payload)
        ? respuesta.data[0].payload
        : respuesta;
    if (!payload) return { estudiante: { matricula }, programas: [] };

    const programas = [];
    let nombre = '';
    let bannerId = '';

    if (Array.isArray(payload)) {
        // Licenciatura / Posgrado: arreglo de programas.
        nombre = (payload[0] && payload[0].Nombre) || '';
        bannerId = (payload[0] && payload[0].id) || '';
        payload.forEach((prog) => {
            programas.push(construirPrograma(prog, prog.nivel || categoria, nombre, matricula));
        });
    } else if (Array.isArray(payload.Programa)) {
        // Lenguas Extranjeras: objeto con la lista plana de materias.
        nombre = payload.Nombre || (payload.Programa[0] && payload.Programa[0].Nombre) || '';
        programas.push(construirProgramaLenguas(payload.Programa, nombre, matricula, payload.Campus));
    } else if (payload.resultado) {
        // Formato ANTERIOR (un solo pipeline agrupado por nivel).
        nombre = payload.Nombre || '';
        bannerId = payload.id || '';
        const resultado = payload.resultado || {};
        Object.keys(resultado).forEach((nivel) => {
            (resultado[nivel] || []).forEach((prog) => {
                programas.push(construirPrograma(prog, nivel, nombre, matricula));
            });
        });
    }

    return { estudiante: { nombre, bannerId, matricula }, programas };
}

// ───────────────────────────────────────────────────────────────────────
// Llamada a un pipeline
// ───────────────────────────────────────────────────────────────────────
export async function fetchHistorialPipeline({ authenticatedEthosFetch, matricula, pipeline, cardId }) {
    const cardIdParameter = new URLSearchParams({ cardId }).toString();
    const matriculaParameter = new URLSearchParams({ matricula }).toString();
    const resourcePath = `${pipeline}?${cardIdParameter}&${matriculaParameter}`;

    const response = await authenticatedEthosFetch(resourcePath, {
        method: 'GET',
        headers: { 'Content-type': 'application/json', 'Accept': 'application/json' }
    });

    if (response && response.status === 200) {
        return response.json();
    }

    let detalle = '';
    try {
        detalle = await response.text();
    } catch {
        detalle = '(sin cuerpo)';
    }
    
    console.error(
        '[Historial] El pipeline respondió',
        response ? response.status : 'sin respuesta',
        '| ruta:', resourcePath,
        '| detalle:', detalle
    );
    throw new Error(`Error del pipeline historial: ${response ? response.status : 'sin respuesta'}`);
}

/**
 * Obtiene el historial COMPLETO combinando los tres pipelines.
 *
 * pipelines = { licenciatura, posgrado, lenguas }  (todos opcionales: se
 * consultan únicamente los que estén configurados).
 *
 * Devuelve { estudiante, programas, errores }. `errores` lista las categorías
 * que fallaron, para poder avisar sin tumbar toda la pantalla.
 */
export async function fetchHistorialAcademico({
    authenticatedEthosFetch,
    pipelines = {},
    cardId,
    matricula = MATRICULA_DEFAULT
} = {}) {
    if (!authenticatedEthosFetch) {
        throw new Error('Falta el acceso a Ethos (authenticatedEthosFetch).');
    }

    const categorias = [
        { clave: 'LI', etiqueta: 'Licenciatura', pipeline: pipelines.licenciatura },
        { clave: 'PO', etiqueta: 'Posgrado', pipeline: pipelines.posgrado },
        { clave: 'LE', etiqueta: 'Lenguas Extranjeras', pipeline: pipelines.lenguas }
    ].filter((c) => Boolean(c.pipeline));

    if (categorias.length === 0) {
        throw new Error('No se configuró ningún pipeline del historial académico.');
    }

    // En paralelo: cada categoría es independiente de las demás.
    const resultados = await Promise.allSettled(
        categorias.map((c) =>
            fetchHistorialPipeline({ authenticatedEthosFetch, matricula, pipeline: c.pipeline, cardId })
        )
    );

    const programas = [];
    const errores = [];
    let nombre = '';
    let bannerId = '';

    resultados.forEach((res, i) => {
        const categoria = categorias[i];
        if (res.status !== 'fulfilled') {
            errores.push({
                categoria: categoria.etiqueta,
                mensaje: (res.reason && res.reason.message) || 'Error desconocido'
            });
            return;
        }
        const parseado = parseRespuestaPipeline(res.value, matricula, categoria.clave);
        if (!nombre && parseado.estudiante && parseado.estudiante.nombre) {
            nombre = parseado.estudiante.nombre;
        }
        if (!bannerId && parseado.estudiante && parseado.estudiante.bannerId) {
            bannerId = parseado.estudiante.bannerId;
        }
        programas.push(...parseado.programas);
    });

    // Si TODOS fallaron, se propaga el error para mostrarlo en pantalla.
    if (programas.length === 0 && errores.length === categorias.length) {
        throw new Error(errores[0].mensaje);
    }

    return { estudiante: { nombre, bannerId, matricula }, programas, errores };
}

export { MATRICULA_DEFAULT, CALIF_MINIMA_APROBATORIA, CALIF_MINIMA_LENGUAS, NIVELES };
