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

import { MATRICULA_DEFAULT } from './historialData';
import { LUGAR_PENDIENTE } from './horarioDemo';

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
    // eslint-disable-next-line no-console
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
 *     DatosEstudiante: [{ Nombre, NombreCorto, Periodo, Matricula,
 *        programas: [{ Programa, "Nombre programa", Campus, Facultad,
 *           "Creditos totales", "Creditos cursados", Promedio, Llave }] }],
 *     DatosAsistencias: { "<llave>": { "<crn>": { Asistencias, Inasistencias,
 *        Curso, Calificacion, Creditos, Blackboard, Llave } } }
 *   }]
 *
 * Un alumno puede cursar MÁS DE UN PROGRAMA a la vez. El campo Llave es el
 * que amarra cada programa con sus materias: el programa con Llave 1 tiene
 * sus materias en DatosAsistencias["1"].
 *
 * Se sigue aceptando el formato anterior, donde había un solo programa (sin
 * Llave) y DatosAsistencias venía directo por CRN.
 */

// Nombre del programa. Es la etiqueta de los botones cuando hay varios, así
// que se aceptan variantes de escritura: si llegara con otra capitalización
// el botón se quedaría sin texto y no habría ningún error visible.
const CLAVES_NOMBRE = [
    'Nombre programa', 'Nombre Programa', 'NombrePrograma',
    'nombre programa', 'nombrePrograma'
];

function nombreDePrograma(crudo) {
    const clave = CLAVES_NOMBRE.find((k) => crudo[k] != null && String(crudo[k]).trim() !== '');
    return clave ? String(crudo[clave]).trim() : '';
}

// Distingue una materia de un grupo de materias, para poder aceptar las dos
// formas de DatosAsistencias sin adivinar por el nombre de la clave.
function esCurso(valor) {
    return !!valor
        && typeof valor === 'object'
        && ('Curso' in valor || 'Calificacion' in valor || 'Asistencias' in valor);
}

function separarPorLlave(datosAsistencias) {
    const bruto = datosAsistencias || {};
    const porLlave = {};
    const sinLlave = {};

    Object.keys(bruto).forEach((clave) => {
        const valor = bruto[clave];
        if (esCurso(valor)) sinLlave[clave] = valor;              // formato viejo
        else if (valor && typeof valor === 'object') porLlave[clave] = valor;  // formato nuevo
    });

    return { porLlave, sinLlave };
}

function mapearCursos(mapa, nombrePrograma) {
    return Object.keys(mapa || {}).map((clave, i) => {
        const c = mapa[clave] || {};
        const asistencias = aNumero(c.Asistencias) || 0;
        const inasistencias = aNumero(c.Inasistencias) || 0;
        // "Registros" = sesiones con asistencia ya tomada. Es el denominador
        // correcto para el porcentaje: usar el total de sesiones del curso
        // castigaría al alumno por clases que todavía no ocurren.
        const registros = asistencias + inasistencias;

        return {
            clave,
            nombre: c.Curso || '',
            llave: c.Llave != null ? String(c.Llave) : '',
            programa: nombrePrograma || c.Programa || '',
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
}

// ── Horario semanal ─────────────────────────────────────────────────
// El pipeline manda un arreglo "Horario" al nivel del registro, con las
// materias de TODOS los planes juntas. Cada renglón es un tipo de hora de
// una materia: la misma materia puede aparecer dos veces, una como taller
// y otra como laboratorio, con NRC distinto.

// "07:00 - 07:59" -> { inicio: 7, fin: 7.983... }
// Se guarda en horas decimales porque es lo que la pestaña ya usa para
// colocar las tarjetas.
function aHoraDecimal(texto) {
    const m = String(texto || '').trim().match(/^(\d{1,2}):(\d{2})$/);
    if (!m) return null;
    const horas = Number(m[1]);
    const minutos = Number(m[2]);
    if (horas > 23 || minutos > 59) return null;
    return horas + minutos / 60;
}

function rangoDeTexto(texto) {
    const partes = String(texto || '').split('-');
    if (partes.length !== 2) return null;
    const inicio = aHoraDecimal(partes[0]);
    const fin = aHoraDecimal(partes[1]);
    if (inicio == null || fin == null || fin <= inicio) return null;
    return { inicio, fin };
}

// El pipeline manda "Apellido, Nombre"; en pantalla se lee al derecho.
// Se respeta el texto tal cual llega (incluidas las mayúsculas): solo se
// intercambian las dos mitades. Sin coma, se deja igual.
function docenteAlDerecho(texto) {
    const crudo = String(texto || '').trim();
    const coma = crudo.indexOf(',');
    if (coma === -1) return crudo;

    const apellidos = crudo.slice(0, coma).trim();
    const nombres = crudo.slice(coma + 1).trim();
    if (!apellidos || !nombres) return crudo;
    return `${nombres} ${apellidos}`;
}

function parseHorario(bruto) {
    console.log(bruto)
    if (!Array.isArray(bruto.Horario || bruto)) return [];
    const horarioBruto = bruto.Horario || bruto
    return horarioBruto.map((fila, i) => {
        const rango = rangoDeTexto(fila.Hora);
        const dias = Array.isArray(fila.Dias) ? fila.Dias : [];
        let docentes = []
        fila.Docentes.forEach(docente => {
            docentes.push(docenteAlDerecho(docente))
        })

        return {
            // El NRC identifica al renglón: es lo que se muestra en la
            // tarjeta y lo que distingue al taller del laboratorio de la
            // misma materia.
            nrc: fila.NRC != null ? String(fila.NRC) : '',
            // La clave del curso no siempre viene (los renglones de taller
            // y laboratorio llegan sin NumbCurso).
            clave: fila.NumbCurso != null ? String(fila.NumbCurso) : '',
            tipo: String(fila.Tipo || '').trim().toUpperCase(),
            materia: fila.Curso || '',
            // profesor: docenteAlDerecho(fila.Docentes[0]),
            profesor: docentes,
            // Aula y edificio todavía no vienen en el pipeline.
            lugar: {
                edificio: fila.Edificio || "Por Asignar",
                salon: fila.Salon || "Por Asignar",
            },
            // El color se reparte por MATERIA, no por NRC: el taller y el
            // laboratorio de un mismo curso comparten color y el tipo se
            // distingue por la tira de la izquierda.
            colorClave: fila.Curso || fila.NRC || `fila-${i}`,
            sesiones: rango
                ? dias.map((dia) => ({ dia, inicio: rango.inicio, fin: rango.fin }))
                : []
        };
    }).filter((clase) => clase.sesiones.length);
}

const PROGRAMA_VACIO = {
    llave: '',
    clave: '',
    nombre: '',
    campus: '',
    facultad: '',
    creditosTotales: 0,
    creditosCursados: 0,
    promedio: null,
    cursos: []
};

export function parseDesempeno(respuesta) {
    const payload = sacarPayload(respuesta);
    const registro = Array.isArray(payload) ? payload[0] : payload;
    if (!registro) return { estudiante: {}, programas: [], programa: { ...PROGRAMA_VACIO }, cursos: [], horario: [] };

    // Formato nuevo: los datos del alumno vienen anidados.
    const datosEstudiante = Array.isArray(registro.DatosEstudiante)
        ? registro.DatosEstudiante[0]
        : (registro.DatosEstudiante || registro);

    const { porLlave, sinLlave } = separarPorLlave(registro.DatosAsistencias || registro.resultado);

    const crudos = Array.isArray(datosEstudiante.programas) ? datosEstudiante.programas : [];

    const programas = crudos.map((crudo, i) => {
        const llave = crudo.Llave != null ? String(crudo.Llave) : '';
        const programa = {
            llave,
            clave: crudo.Programa || '',
            nombre: nombreDePrograma(crudo),
            // Campus y facultad son por programa: cambian al cambiar de uno
            // a otro.
            campus: crudo.Campus || '',
            facultad: crudo.Facultad || '',
            creditosTotales: aNumero(crudo['Creditos totales']) || 0,
            creditosCursados: aNumero(crudo['Creditos cursados']) || 0,
            // Sin promedio oficial se queda en null y la pantalla muestra
            // "—". No se sustituye por el promedio de las materias del
            // periodo, que es otro dato y confundiría los dos.
            promedio: aNumero(crudo.Promedio)
        };

        // Las materias del programa salen de su llave. En el formato viejo
        // no hay llave y todas las materias son del único programa.
        const mapa = (llave && porLlave[llave]) || (i === 0 ? sinLlave : {});
        programa.cursos = mapearCursos(mapa, programa.nombre);

        if (!programa.nombre) {
            console.warn('[Resumen] El programa', programa.clave || '(sin clave)',
                'llegó sin "Nombre programa": el botón se quedará sin etiqueta.');
        }
        if (llave && !porLlave[llave] && i > 0) {
            console.warn('[Resumen] No hay materias para la llave', llave,
                'del programa', programa.clave || '(sin clave)');
        }

        return programa;
    });

    // Respuesta sin bloque de programas pero con materias: se arma uno solo
    // para no perderlas.
    if (!programas.length && Object.keys(sinLlave).length) {
        programas.push({ ...PROGRAMA_VACIO, cursos: mapearCursos(sinLlave, '') });
    }

    // El pipeline ahora manda NombreCorto (los nombres de pila). Los
    // apellidos se obtienen quitando esa parte del nombre completo, lo que
    // funciona incluso con apellidos compuestos ("DE LA CRUZ").
    const nombreCompleto = datosEstudiante.Nombre || '';
    const nombreCorto = datosEstudiante.NombreCorto || '';
    const apellidos = nombreCorto
        ? nombreCompleto.replace(nombreCorto, '').trim()
        : nombreCompleto.split(/\s+/).slice(0, 2).join(' ');
    const primerNombre = (nombreCorto || nombreCompleto).trim().split(/\s+/)[0] || '';

    // "programa" y "cursos" son los del PRIMER programa: es con lo que abre
    // la pestaña y lo que sigue usando la tarjeta del tablero.
    const principal = programas[0] || { ...PROGRAMA_VACIO };

    // Horario semanal: viene con las materias de todos los planes juntas.
    // const horario = parseHorario(registro.Horario);

    return {
        // horario,
        estudiante: {
            nombre: nombreCompleto,
            nombreCorto,
            apellidos,
            primerNombre,
            matricula: datosEstudiante.Matricula || '',
            // Periodo vigente del alumno (antes venía por materia).
            periodo: datosEstudiante.Periodo || ''
        },
        programas,
        programa: principal,
        cursos: principal.cursos || []
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
        { clave: 'adeudos', pipeline: pipelines.adeudos, parse: parseAdeudos },
        { clave: 'horario', pipeline: pipelines.horario, parse: parseHorario }
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
