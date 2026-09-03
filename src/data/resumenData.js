/* global URLSearchParams */
/**
 * Capa de datos de la pestaña Resumen.
 *
 * Consume dos pipelines, ambos por matrícula:
 *   - Desempeño académico (get-desempenoacademico): calificaciones y
 *     asistencia por curso del periodo.
 *   - Adeudos pendientes  (get-adeudos-pendientes): alimenta la sección
 *     "Acciones prioritarias".
 *
 * Se piden EN PARALELO y de forma independiente: si uno falla, el otro se
 * sigue mostrando.
 */

// import { MATRICULA_DEFAULT } from './historialData';
const MATRICULA_DEFAULT = 1182457;

// ── Utilidades comunes ─────────────────────────────────────────────────
function aNumero(v) {
    if (v == null || v === '') return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
}

// Extrae el contenido de la envoltura de Ethos.
// Según la versión del pipeline los datos vienen dentro de data[0].payload
// o directamente en data[0], así que se aceptan ambas formas.
function sacarPayload(respuesta) {
    const primero = respuesta && respuesta.data && respuesta.data[0];
    if (primero && primero.payload !== undefined) return primero.payload;
    if (primero) return primero;
    return respuesta;
}

async function pedir({ authenticatedEthosFetch, pipeline, cardId, matricula }) {
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
    
    console.error('[Resumen] El pipeline respondió', response ? response.status : 'sin respuesta',
        '| ruta:', resourcePath, '| detalle:', detalle);
    throw new Error(`Error del pipeline: ${response ? response.status : 'sin respuesta'}`);
}

// ── Desempeño académico ────────────────────────────────────────────────
// Colores para la barra de cada curso (se asignan por posición).
const COLORES_CURSO = ['#2F6FED', '#7C3AED', '#9333EA', '#16A34A', '#EA580C', '#DC2626', '#0D9488'];

// El pipeline manda Dias y Horarios como arreglos paralelos.
function armarHorario(dias, horarios) {
    const d = Array.isArray(dias) ? dias : [];
    const h = Array.isArray(horarios) ? horarios : [];
    const total = Math.max(d.length, h.length);
    const partes = [];
    for (let i = 0; i < total; i++) {
        const dia = d[i] || '';
        const hora = h[i] || '';
        if (dia && hora) partes.push(`${dia} · ${hora}`);
        else if (dia || hora) partes.push(dia || hora);
    }
    return partes.join('  |  ');
}

/**
 * Formato ACTUAL del pipeline:
 *   [{
 *     DatosEstudiante: [{ Nombre, Matricula, programas: [{ Programa,
 *        "Nombre programa", "Creditos totales", "Creditos cursados", Promedio }] }],
 *     DatosAsistencias: { "<crn>": { Asistencias, Inasistencias, Curso,
 *        Calificacion, Creditos, Blackboard } }
 *   }]
 *
 * Respecto al formato anterior: el alumno y sus programas se movieron a
 * DatosEstudiante, las materias a DatosAsistencias, se agregó Blackboard y
 * se quitaron Periodo, Programa, Sesiones, Dias y Horarios de cada materia.
 * Se sigue aceptando el formato viejo por si alguna instancia no se ha
 * actualizado.
 */
export function parseDesempeno(respuesta) {
    const payload = sacarPayload(respuesta);
    const registro = Array.isArray(payload) ? payload[0] : payload;
    if (!registro) return { estudiante: {}, programa: {}, cursos: [] };

    // Formato nuevo: los datos del alumno vienen anidados.
    const datosEstudiante = Array.isArray(registro.DatosEstudiante)
        ? registro.DatosEstudiante[0]
        : (registro.DatosEstudiante || registro);

    const resultado = registro.DatosAsistencias || registro.resultado || {};

    // Programa del alumno: trae el avance oficial en créditos y el promedio.
    const progCrudo = (datosEstudiante.programas && datosEstudiante.programas[0]) || {};
    const programa = {
        clave: progCrudo.Programa || '',
        nombre: progCrudo['Nombre programa'] || '',
        // Campus y facultad llegan a nivel de programa (antes eran datos
        // de demostración).
        campus: progCrudo.Campus || '',
        facultad: progCrudo.Facultad || '',
        creditosTotales: aNumero(progCrudo['Creditos totales']) || 0,
        creditosCursados: aNumero(progCrudo['Creditos cursados']) || 0,
        promedio: aNumero(progCrudo.Promedio)
    };

    const cursos = Object.keys(resultado).map((clave, i) => {
        const c = resultado[clave] || {};
        const asistencias = aNumero(c.Asistencias) || 0;
        const inasistencias = aNumero(c.Inasistencias) || 0;
        // "Registros" = sesiones con asistencia ya tomada. Es el denominador
        // correcto para el porcentaje: usar el total de sesiones del curso
        // castigaría al alumno por clases que todavía no ocurren.
        const registros = asistencias + inasistencias;

        return {
            clave,
            nombre: c.Curso || '',
            // El programa ya no viene por materia: se toma el del alumno.
            programa: programa.nombre || c.Programa || '',
            periodo: c.Periodo || '',
            // "Y" = la materia se imparte en Blackboard.
            blackboard: String(c.Blackboard || '').trim().toUpperCase() === 'Y',
            // Una materia sin calificación registrada cuenta como 0:
            // se muestra 0/100 y entra al promedio.
            calificacion: aNumero(c.Calificacion) == null ? 0 : aNumero(c.Calificacion),
            creditos: aNumero(c.Creditos) || 0,
            asistencias,
            inasistencias,
            registros,
            sesiones: aNumero(c.Sesiones) || 0,
            horario: armarHorario(c.Dias, c.Horarios),
            color: COLORES_CURSO[i % COLORES_CURSO.length]
        };
    });

    // El pipeline ahora manda NombreCorto (los nombres de pila). Los
    // apellidos se obtienen quitando esa parte del nombre completo, lo que
    // funciona incluso con apellidos compuestos ("DE LA CRUZ").
    const nombreCompleto = datosEstudiante.Nombre || '';
    const nombreCorto = datosEstudiante.NombreCorto || '';
    const apellidos = nombreCorto
        ? nombreCompleto.replace(nombreCorto, '').trim()
        : nombreCompleto.split(/\s+/).slice(0, 2).join(' ');
    const primerNombre = (nombreCorto || nombreCompleto).trim().split(/\s+/)[0] || '';

    return {
        estudiante: {
            nombre: nombreCompleto,
            nombreCorto,
            apellidos,
            primerNombre,
            matricula: datosEstudiante.Matricula || '',
            // Periodo vigente del alumno (antes venía por materia).
            periodo: datosEstudiante.Periodo || ''
        },
        programa,
        cursos
    };
}

// ── Adeudos pendientes ─────────────────────────────────────────────────
export function parseAdeudos(respuesta) {
    const payload = sacarPayload(respuesta);
    const lista = Array.isArray(payload) ? payload : [];

    return lista.map((a) => ({
        tipo: a.TipoAdeudo || 'Adeudo',
        razon: a.RazonAdeudo || '',
        fecha: a.FechaInicioAdeudo || null,
        monto: aNumero(a.Monto) || 0
    }));
}

// ── Carga combinada ────────────────────────────────────────────────────
export async function fetchResumen({
    authenticatedEthosFetch,
    pipelines = {},
    cardId,
    matricula = MATRICULA_DEFAULT
} = {}) {
    if (!authenticatedEthosFetch) {
        throw new Error('Falta el acceso a Ethos (authenticatedEthosFetch).');
    }

    const tareas = [
        { clave: 'desempeno', pipeline: pipelines.desempeno, parse: parseDesempeno },
        { clave: 'adeudos', pipeline: pipelines.adeudos, parse: parseAdeudos }
    ];

    const resultados = await Promise.allSettled(
        tareas.map((t) => (t.pipeline
            ? pedir({ authenticatedEthosFetch, pipeline: t.pipeline, cardId, matricula })
            : Promise.reject(new Error(`No se configuró el pipeline de ${t.clave}`))))
    );

    const salida = { desempeno: null, adeudos: null, errores: [] };

    resultados.forEach((res, i) => {
        const tarea = tareas[i];
        if (res.status === 'fulfilled') {
            salida[tarea.clave] = tarea.parse(res.value);
        } else {
            salida.errores.push({
                seccion: tarea.clave,
                mensaje: (res.reason && res.reason.message) || 'Error desconocido'
            });
        }
    });

    return salida;
}
