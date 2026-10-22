/**
 * Capa de datos del Historial Académico.
 *
 * Consume el pipeline `x-get-bannerId-by-matricula-uabc`, que recibe la
 * matrícula y devuelve los programas del estudiante (licenciaturas y lenguas
 * extranjeras) con sus calificaciones.
 *
 * fetchHistorialAcademico(matricula) -> { estudiante, programas: [...] }
 * Cada `programa` tiene la forma { estudiante, plan, resumen, terminos, kardex }
 * para que la página y el PDF lo consuman.
 *
 * NOTA: el pipeline aún NO entrega los datos del PLAN (créditos totales, áreas
 * con créditos requeridos, malla completa). Esos se marcan como PLACEHOLDER y
 * se reemplazan cuando exista ese pipeline.
 */

// const MATRICULA_DEFAULT = '1125376';
// const MATRICULA_DEFAULT = '35809301';
const CALIF_MINIMA_APROBATORIA = 60;
// Lenguas Extranjeras califica en escala 0-10 (mínima aprobatoria 6).
const CALIF_MINIMA_LENGUAS = 6;


// ───────────────────────────────────────────────────────────────────────
// Helpers de transformación
// ───────────────────────────────────────────────────────────────────────
function aNumero(v) {
    if (v == null) return null;
    // Las calificaciones de texto se normalizan (" ac " -> "AC"): si no,
    // una AC con espacios o en minúsculas contaba como reprobada.
    if (typeof v === 'string') {
        v = v.trim();
        if (v === '') return null;
        if (isNaN(v)) return v.toUpperCase();
    }
    if(isNaN(v)) return v;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
}

function estadoDeCalificacion(calif, minima = CALIF_MINIMA_APROBATORIA) {
    if (calif == null) return 'en_curso';
    // AC = Acreditado (otorga créditos). SD = Sin derecho y NP = No
    // presentó no otorgan créditos, igual que cualquier otro código de texto.
    if(typeof calif == 'string') return calif == 'AC' ? 'aprobada' : 'reprobada';
    return calif >= minima ? 'aprobada' : 'reprobada';
}

// "NOF:00055-2025/2026" -> "00055-2025/2026". Solo se toma lo que va
// después de "NOF:"; si el código viene vacío o con otro formato se deja
// vacío, para no imprimir en un documento oficial un dato que no se
// reconoce.
function numeroDeOficio(codigo) {
    const texto = String(codigo || '').trim();
    const encontrado = texto.match(/^NOF:\s*(.+)$/i);
    return encontrado ? encontrado[1].trim() : '';
}

function mapMateria(m, minima = CALIF_MINIMA_APROBATORIA) {
    const calif = aNumero(m.Calificacion);
    // Una materia acreditada por equivalencia (Acreditacion = 'Y') siempre
    // cuenta como aprobada y suma sus créditos, sin importar la
    // calificación con la que llegue.
    const acreditada = String(m.Acreditacion || '').trim().toUpperCase() === 'Y';
    return {
        claveMateria: m['NúmeroCurso'],
        nombreMateria: m.NombreCurso,
        // Number(): si los créditos llegaran como texto ("6"), la suma
        // pegaría los textos ("0" + "6" + "8" -> "068") en vez de sumar.
        creditos: Number(m.Creditos) || 0,
        calificacion: calif,
        estado: acreditada ? 'aprobada' : estadoDeCalificacion(calif, minima),
        termino: m.Periodo,
        areaClave: m['ÁreaConocimiento'] || 'Sin área',
        subject: m.subject || '',
        fechaExamen: m.Fecha,
        etapa: m.etapa === 'EB' ? 'Etapa Básica' : m.etapa === 'ED' ? 'Etapa Disciplinaria' : m.etapa === 'ET' ? 'Etapa Terminal' : m.TipoMateria === 'Optativa' ? 'Etapa Optativa' : 'Sin Etapa',
        intento: m.Intento || 1,
        tipoMateria: m.TipoMateria || 'Obligatoria',
        // Materia acreditada por equivalencia: en el PDF de licenciatura se
        // marca "Equ" y se imprime el número de oficio.
        acreditada,
        oficio: numeroDeOficio(m.CodigoAcreditacion),
    };
}

// Áreas derivadas del kardex: créditos aprobados por área de conocimiento.
// creditosRequeridos queda como PLACEHOLDER (no viene del pipeline todavía).
function construirAreas(kardex) {
    // const map = {};
    // kardex.forEach((m) => {
    //     const a = m.areaClave;
    //     if (!map[a]) map[a] = { clave: a, nombre: a, creditosAprobados: 0 };
    //     if (m.estado === 'aprobada') map[a].creditosAprobados += m.creditos;
    // });

    //TO DO: Solución temporal para etapas de materias 
    // let basico = 'Básico'
    // let disciplinario = 'Disciplinario'
    // let terminal = 'Terminal'
    // let etapa = '';
    // const map = {};
    // kardex.forEach((m) => {
    //     if (!map[basico]) {
    //         etapa = basico;
    //     } else if (!map[disciplinario]) {
    //         etapa = disciplinario;
    //     } else {
    //         etapa = terminal;
    //     }
    //     map[etapa] = { clave: etapa, nombre: etapa, creditosAprobados: 0 };
    //     if (m.estado === 'aprobada') map[etapa].creditosAprobados += m.creditos;
    // });

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

// Orden cronológico de dos renglones de la misma materia: primero el
// periodo, luego el intento dentro del periodo (ordinario antes que
// extraordinario) y al final la fecha del examen.
function compararCronologico(a, b) {
    const periodo = String(a.termino || '').localeCompare(String(b.termino || ''));
    if (periodo !== 0) return periodo;
    const intento = (a.intento || 1) - (b.intento || 1);
    if (intento !== 0) return intento;
    return String(a.fechaExamen || '').localeCompare(String(b.fechaExamen || ''));
}

// "Materias" trae TODOS los renglones de cada materia: ordinario y
// extraordinario de un periodo, y los periodos en que se recursó. Aquí se
// deja UN renglón por materia, el que define su situación final:
//   - si la materia se aprobó alguna vez, el último renglón aprobado
//     (sus créditos ya se ganaron y no se pierden);
//   - si nunca se aprobó, el último renglón cronológico.
//
// Antes se conservaba el renglón con el Intento más alto, pero Intento se
// reinicia en cada periodo: un extraordinario reprobado (Intento 2) le
// ganaba a la aprobación de un periodo posterior (Intento 1), y con Intento
// igual se quedaba el primero que llegaba. Así una materia aprobada al
// recursarla se contaba como reprobada y sus créditos no se sumaban.
function dedupeFinales(materias) {
    const map = {};
    materias.forEach((m) => {
        const k = m.claveMateria;
        const actual = map[k];
        if (!actual) {
            map[k] = m;
            return;
        }
        const nuevaAprobada = m.estado === 'aprobada';
        const actualAprobada = actual.estado === 'aprobada';
        if (nuevaAprobada !== actualAprobada) {
            if (nuevaAprobada) map[k] = m;
            return;
        }
        if (compararCronologico(m, actual) > 0) map[k] = m;
    });
    return Object.values(map);
}

// Prácticas profesionales: se reconocen por su área de conocimiento o por
// su subject (PPPL), que es como llegan en todos los programas vistos.
function esPracticaProfesional(m) {
    const area = String(m.areaClave || '').trim().toLowerCase();
    const subject = String(m.subject || '').trim().toUpperCase();
    return area === 'prácticas profesionales' || subject === 'PPPL';
}

// Resumen de prácticas profesionales de UN programa.
//
// Los créditos requeridos vienen del pipeline (resumenEtapas.PP). Los
// cursados se calculan con las materias de prácticas aprobadas del kardex
// de ese mismo programa: UABC las registra a veces con AC y a veces con
// calificación, y las dos cuentan si son aprobatorias. Así cada carrera
// muestra las suyas aunque el alumno tenga más de una (el pipeline
// reportaba 0 cursados en una carrera con la práctica acreditada).
// Si el programa no trae ninguna materia de prácticas, se respeta lo que
// mande el pipeline.
function resumenPracticas(ppPipeline, kardex) {
    // Sin PP del pipeline, los requeridos quedan sin dato (null) en lugar de
    // inventar un 0: la página y el PDF muestran "-" en ese lugar.
    const base = ppPipeline || { etapa: 'PP', creditosRequeridos: null, creditosCursados: 0, porcentaje: null };
    const practicas = kardex.filter(esPracticaProfesional);
    if (!practicas.length) return ppPipeline;

    const creditosCursados = practicas
        .filter((m) => m.estado === 'aprobada')
        .reduce((suma, m) => suma + (m.creditos || 0), 0);
    const requeridos = Number(base.creditosRequeridos) || 0;
    return {
        ...base,
        creditosCursados,
        porcentaje: requeridos ? Math.round((creditosCursados / requeridos) * 10000) / 100 : base.porcentaje
    };
}

// Texto limpio de un campo del pipeline ('' si no viene).
function textoDe(valor) {
    return valor == null ? '' : String(valor).trim();
}

// Matrícula que trae un objeto del pipeline. Acepta el nombre con o sin
// acento y en cualquier combinación de mayúsculas ("Matricula",
// "matricula", "Matrícula", "MATRICULA"), porque cada pipeline la ha
// nombrado a su manera.
function matriculaDe(objeto) {
    if (!objeto || typeof objeto !== 'object') return '';
    const llave = Object.keys(objeto).find((k) => (
        k.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase() === 'matricula'
    ));
    return llave ? textoDe(objeto[llave]) : '';
}

function construirPrograma(prog, nivel, nombre, matricula) {
    // Lenguas usa escala 0-10; el resto (licenciatura) 0-100.
    const minimaAprobatoria = /lenguas/i.test(nivel || '') ? CALIF_MINIMA_LENGUAS : CALIF_MINIMA_APROBATORIA;
    let creditosObligatorios = 0;
    let creditosOptativos = 0;

    if ('creditosObligatoriosPrograma' in prog)
        creditosObligatorios = Number(prog.creditosObligatoriosPrograma) || 0
    if ('creditosOptativosPrograma' in prog)
        creditosOptativos = Number(prog.creditosOptativosPrograma) || 0
    const calif = prog.Calificaciones || {};
    const periodos = Object.keys(calif).sort();

    const kardexTodos = [];
    const terminos = [];
    periodos.forEach((per) => {
        const bloque = calif[per] || {};
        // real: PromedioPeriodo | ejemplo editor: PromedioGeneral
        const promPer = bloque.PromedioPeriodo != null ? bloque.PromedioPeriodo : bloque.PromedioGeneral;
        if (promPer != null) {
            terminos.push({ termino: per, promedio: promPer });
        }
        // real: Materias (todos los intentos) | ejemplo editor: MateriasFinales
        const lista = quickSort(bloque.Materias) || quickSort(bloque.MateriasFinales) || [];
        lista.forEach((m) => kardexTodos.push(mapMateria(m, minimaAprobatoria)));
    });

    const kardex = dedupeFinales(kardexTodos);

    // Promedio general OFICIAL: a nivel de programa (real). Si no, último periodo.
    const ultimo = periodos.length ? calif[periodos[periodos.length - 1]] : null;
    let promedioGeneral = null;
    if (prog.PromedioGeneral != null) {
        promedioGeneral = prog.PromedioGeneral;
    } else if (ultimo) {
        promedioGeneral = ultimo.PromedioPeriodo != null ? ultimo.PromedioPeriodo
            : (ultimo.PromedioGeneral != null ? ultimo.PromedioGeneral : null);
    }
    let promedioPonderado = null;
    if (prog.PromedioPonderado != null) {
        promedioPonderado = prog.PromedioPonderado;
    }

    const codigo = prog.programCode || prog.Programa || prog.ProgramaCode || '';

    return {
        id: `${nivel}__${codigo}`,
        nivel,
        etiqueta: { titulo: nivel, subtitulo: prog.Programa || codigo },
        estudiante: {
            nombre,
            // La matrícula que se buscó o, si no hay (versión sin input, que
            // no la manda al pipeline), la que trae la respuesta.
            matricula: matricula || matriculaDe(prog),
            // Estatus del alumno en este programa (Activo, Egresado, Baja…),
            // tal como lo manda el pipeline.
            estatus: textoDe(prog.Estatus),
            bannerId: prog.id,
            programa: prog.Programa,
            facultad: prog.Facultad,
            campus: limpiarNoUsar(prog.Campus),
            terminoIngreso: prog.Admision,
            planClave: codigo,
            periodoDescr: prog.PlanDeEstudios
        },
        plan: {
            creditosTotales: Number(creditosObligatorios) + Number(creditosOptativos), // PLACEHOLDER
            creditosObligatorios: creditosObligatorios,
            creditosOptativos: creditosOptativos,
            creditosOblitagoriosCursados: prog.CreditosObligatoriosCursados || prog.CreditosObligatorios || 0,
            creditosOptativosCursados: prog.CreditosOptativosCursados || prog.CreditosOptativos || 0,
            areas: construirAreas(kardex), // requeridos = PLACEHOLDER
            materias: [] // malla no disponible aún
        },
        resumen: { promedioGeneral, promedioPonderado },
        // Sin resumenEtapas del pipeline no se arma uno parcial: la página
        // lee EB, ED y ET de ese mismo objeto y un resumen con solo PP la
        // haría tronar.
        resumenEtapas: prog.resumenEtapas
            ? { ...prog.resumenEtapas, PP: resumenPracticas(prog.resumenEtapas.PP, kardex) }
            : prog.resumenEtapas,
        terminos,
        kardex,
        kardexCompleto: kardexTodos
    };
}


/**
 * Junta el contenido de TODOS los mensajes de una respuesta del pipeline.
 *
 * El pipeline manda un mensaje por programa dentro de data[]: un alumno con
 * dos licenciaturas, o con tronco común y licenciatura, trae data[0] y
 * data[1]. Antes solo se leía data[0] y el resto se descartaba sin aviso.
 *
 * Acepta también los formatos sin sobre (el arreglo directo o un objeto
 * suelto) y descarta lo que no sea objeto, como el texto
 * "Estudiante sin datos".
 */
// Saca los objetos de cualquier nivel de arreglos anidados:
// [[a], [b, [c]]] -> [a, b, c]
function aplanar(valor) {
    return Array.isArray(valor) ? valor.flatMap(aplanar) : [valor];
}

function contenidoDeRespuesta(respuesta) {
    let elementos;
    if (respuesta && Array.isArray(respuesta.data)) {
        elementos = respuesta.data.flatMap((bloque) => {
            const contenido = bloque && bloque.payload;
            return contenido == null ? [] : aplanar(contenido);
        });
    } else {
        elementos = respuesta == null ? [] : aplanar(respuesta);
    }
    // El pipeline ha mandado los programas sueltos, en un arreglo y cada
    // uno dentro de su propio arreglo ([[programa], [programa]]). Se
    // aplanan todos los niveles para que un arreglo nunca se tome por un
    // programa: no tendría "nivel" y la página tronaría al leerlo.
    return elementos.filter((elemento) => elemento && typeof elemento === 'object');
}

function contruirProgramaLenguas(respuesta, matricula) {
    // Solo cuentan los mensajes que traen cursos: uno con la lista vacía se
    // ignora, igual que antes cuando Programa llegaba vacío.
    const mensajes = contenidoDeRespuesta(respuesta)
        .filter((m) => Array.isArray(m.Programa) && m.Programa.length > 0);
    if (!mensajes.length) return { programas: [] };

    // Lenguas usa escala 0-10; el resto (licenciatura) 0-100.
    // Los cursos de todos los mensajes van a la misma pestaña de Lenguas,
    // donde ya se agrupan por idioma.
    const kardexTodos = [];
    mensajes.forEach((mensaje) => {
        mensaje.Programa.forEach((curso) => kardexTodos.push(mapMateria(curso, CALIF_MINIMA_LENGUAS)));
    });
    const kardex = dedupeFinales(kardexTodos);

    const primero = mensajes[0];
    return {
        programas: [{
            estudiante: {
                nombre: primero.Nombre,
                // La buscada o, si no hay, la que trae el pipeline (en el
                // mensaje o en sus cursos).
                matricula: matricula || matriculaDe(primero) || matriculaDe(primero.Programa[0]),
                estatus: textoDe(primero.Estatus),
                campus: primero.Programa[0].Facultad
            },
            id: `Lenguas Extranjera`,
            nivel: 'LENGUAS EXTRANJERA',
            etiqueta: { titulo: 'Lengua Extranjera', subtitulo: 'Lengua Extranjera' },
            kardex,
            kardexCompleto: kardexTodos
        }]
    };

}


/**
 * Transforma la respuesta cruda del pipeline en { estudiante, programas }.
 */
export function parseRespuestaPipeline(respuesta, matricula, nivelPorDefecto) {
    // Todos los mensajes de la respuesta, no solo el primero: cada programa
    // (licenciatura, tronco común, maestría) puede llegar en su propio
    // mensaje dentro de data[].
    const mensajes = contenidoDeRespuesta(respuesta);
    if (!mensajes.length) return { estudiante: { matricula }, programas: [] };

    const programas = [];
    // Los datos del alumno son los mismos en todos los mensajes.
    const nombre = mensajes[0].Nombre || '';
    const bannerId = mensajes[0].id || '';

    mensajes.forEach((mensaje) => {
        if (mensaje.resultado) {
            // Formato ANTERIOR: objeto agrupado por nivel.
            const resultado = mensaje.resultado || {};
            Object.keys(resultado).forEach((nivel) => {
                (resultado[nivel] || []).forEach((prog) => {
                    programas.push(construirPrograma(prog, nivel, mensaje.Nombre || nombre, matricula || matriculaDe(mensaje)));
                });
            });
            return;
        }

        // Formato ACTUAL: cada mensaje es un programa.
        let nivel = '';
        switch (mensaje.nivel) {
            case 'PO':
                nivel = 'POSGRADO';
                break;
            case 'LI':
                nivel = 'LICENCIATURA';
                break;
            default:
                // Si el mensaje no trae nivel se usa el del pipeline que lo
                // mandó; sin nivel la página no sabe qué mostrar y tronaba.
                nivel = mensaje.nivel || nivelPorDefecto || 'SIN NIVEL';
                break;
        }
        programas.push(construirPrograma(mensaje, nivel, nombre, matricula));
    });

    return { estudiante: { nombre, bannerId, matricula }, programas };
}

const quickSort = (array) => {
    // Un periodo sin Materias (o con null) no debe tirar todo el programa:
    // se regresa null para que el llamador use la siguiente opción o [].
    if (!Array.isArray(array)) {
        return null;
    }
    if (array.length <= 1) {
        return array;
    }

    let pivot = array[0];
    let leftArr = [];
    let rightArr = [];

    for (let i = 1; i < array.length; i++) {
        if (array[i].NombreCurso < pivot.NombreCurso) {
            leftArr.push(array[i]);
        } else {
            rightArr.push(array[i]);
        }
    }

    return [...quickSort(leftArr), pivot, ...quickSort(rightArr)];
};


// ───────────────────────────────────────────────────────────────────────
// Errores de los pipelines
//
// Una respuesta distinta de 200 (por ejemplo, un 500 cuando el alumno no
// tiene información de posgrado) es un fallo de ESE pipeline, no prueba de
// que el alumno no exista. El error lleva el área y el estado HTTP para que
// la página decida qué mostrar y para poder diagnosticarlo en la consola.
// ───────────────────────────────────────────────────────────────────────
export const AREAS_HISTORIAL = {
    licenciatura: 'Licenciatura',
    posgrado: 'Posgrado',
    lenguas: 'Lenguas Extranjeras'
};

// Tiempo máximo de espera por pipeline. La página espera a los tres antes
// de mostrar algo: sin límite, un pipeline que nunca responde la dejaba
// cargando para siempre. Al vencerse cuenta como error de esa área y se
// muestran las demás.
const TIEMPO_LIMITE_MS = 30000;

function conTiempoLimite(promesa, area) {
    let temporizador;
    const limite = new Promise((resolve, reject) => {
        temporizador = setTimeout(() => {
            const error = new Error(
                `El pipeline de ${AREAS_HISTORIAL[area] || area} no respondió en ${TIEMPO_LIMITE_MS / 1000} segundos.`
            );
            error.area = area;
            error.status = null;
            reject(error);
        }, TIEMPO_LIMITE_MS);
    });
    return Promise.race([promesa, limite]).finally(() => clearTimeout(temporizador));
}

function errorDePipeline(area, response, resourcePath) {
    const status = response ? response.status : null;
    const error = new Error(
        `El pipeline de ${AREAS_HISTORIAL[area] || area} respondió ${status == null ? 'sin respuesta' : status}.`
    );
    error.area = area;
    error.status = status;
    error.ruta = resourcePath;
    return error;
}

/* Obtiene el historial. */

export async function fetchHistorialPipeline({ authenticatedEthosFetch, pipeline, cardId, matricula }) {
    const cardIdParameter = new URLSearchParams({ cardId }).toString();
    const matriculaParameter = new URLSearchParams({ matricula }).toString();
    const resourcePath = `${pipeline}?${cardIdParameter}&${matriculaParameter}`;

    const response = await authenticatedEthosFetch(resourcePath, {
        method: 'GET',
        headers: { 'Content-type': 'application/json', 'Accept': 'application/json' }
    });
    if (response && response.status === 200) {
        const text = await response.text();
        if (!text.trim()) {
            // console.log("Empty response");
            return;
        } else {
            const json = await JSON.parse(text)
            // eslint-disable-next-line no-console
            // console.log('[Historial] Respuesta del pipeline:', json);
            return json;
        }
    }
    throw errorDePipeline('licenciatura', response, resourcePath);
}

export async function fetchHistorialPosgradoPipeline({ authenticatedEthosFetch, pipeline, cardId, matricula }) {
    // export async function fetchHistorialPipeline({ authenticatedEthosFetch, bannerId, pipeline, cardId }) {
    const cardIdParameter = new URLSearchParams({ cardId }).toString();
    const matriculaParameter = new URLSearchParams({ matricula }).toString();
    const resourcePath = `${pipeline}?${cardIdParameter}&${matriculaParameter}`;
    const response = await authenticatedEthosFetch(resourcePath, {
        method: 'GET',
        headers: { 'Content-type': 'application/json', 'Accept': 'application/json' }
    });
    if (response && response.status === 200) {
        const text = await response.text();
        if (!text.trim()) {
            // console.log("Empty response");
            return;
        } else {
            const json = await JSON.parse(text)
            // eslint-disable-next-line no-console
            // console.log('[Historial] Respuesta del pipeline:', json);
            return json;
        }
    }
    throw errorDePipeline('posgrado', response, resourcePath);
}

export async function fetchHistorialLenguasPipeline({ authenticatedEthosFetch, pipeline, cardId, matricula }) {
    // export async function fetchHistorialPipeline({ authenticatedEthosFetch, bannerId, pipeline, cardId }) {
    const cardIdParameter = new URLSearchParams({ cardId }).toString();
    const matriculaParameter = new URLSearchParams({ matricula }).toString();
    const resourcePath = `${pipeline}?${cardIdParameter}&${matriculaParameter}`;
    const response = await authenticatedEthosFetch(resourcePath, {
        method: 'GET',
        headers: { 'Content-type': 'application/json', 'Accept': 'application/json' }
    });
    if (response && response.status === 200) {
        const text = await response.text();
        if (!text.trim()) {
            // console.log("Empty response");
            return;
        } else {
            const json = await JSON.parse(text)
            // eslint-disable-next-line no-console
            // console.log('[Historial] Respuesta del pipeline:', json);
            return json;
        }
    }
    throw errorDePipeline('lenguas', response, resourcePath);
}

/**
 * Obtiene el historial usando authenticatedEthosFetch + pipeline (datos REALES).
 * Si falta alguno, lanza un error. parseRespuestaPipeline es la misma.
 */
export async function fetchHistorialAcademico({ authenticatedEthosFetch, pipeline, cardId, matricula } = {}) {
    // export async function fetchHistorialAcademico({ authenticatedEthosFetch, pipeline, cardId, bannerId = MATRICULA_DEFAULT } = {}) {
    if (!authenticatedEthosFetch || !pipeline) {
        throw new Error('No se configuró el pipeline del historial (historialPipeline) o falta el acceso a Ethos.');
    }
    const respuesta = await conTiempoLimite(fetchHistorialPipeline({ authenticatedEthosFetch, pipeline, cardId, matricula }), 'licenciatura');
    return parseRespuestaPipeline(respuesta, undefined, 'LICENCIATURA');
    // const respuesta = await fetchHistorialPipeline({ authenticatedEthosFetch, bannerId, pipeline, cardId });
    // return parseRespuestaPipeline(respuesta, bannerId);
}

export async function fetchHistorialAcademicoPosgrado({ authenticatedEthosFetch, pipeline, cardId, matricula } = {}) {
    // export async function fetchHistorialAcademico({ authenticatedEthosFetch, pipeline, cardId, bannerId = MATRICULA_DEFAULT } = {}) {
    if (!authenticatedEthosFetch || !pipeline) {
        throw new Error('No se configuró el pipeline del historial (historialPipeline) o falta el acceso a Ethos.');
    }
    const respuesta = await conTiempoLimite(fetchHistorialPosgradoPipeline({ authenticatedEthosFetch, pipeline, cardId, matricula }), 'posgrado');
    return parseRespuestaPipeline(respuesta, undefined, 'POSGRADO');
    // const respuesta = await fetchHistorialPipeline({ authenticatedEthosFetch, bannerId, pipeline, cardId });
    // return parseRespuestaPipeline(respuesta, bannerId);
}

export async function fetchHistorialAcademicoLenguas({ authenticatedEthosFetch, pipeline, cardId, matricula } = {}) {
    // export async function fetchHistorialAcademico({ authenticatedEthosFetch, pipeline, cardId, bannerId = MATRICULA_DEFAULT } = {}) {
    if (!authenticatedEthosFetch || !pipeline) {
        throw new Error('No se configuró el pipeline del historial (historialPipeline) o falta el acceso a Ethos.');
    }
    const respuesta = await conTiempoLimite(fetchHistorialLenguasPipeline({ authenticatedEthosFetch, pipeline, cardId, matricula }), 'lenguas');

    return contruirProgramaLenguas(respuesta);
    // const respuesta = await fetchHistorialPipeline({ authenticatedEthosFetch, bannerId, pipeline, cardId });
    // return parseRespuestaPipeline(respuesta, bannerId);
}

/**
 * Junta los resultados de los tres pipelines (licenciatura, posgrado y
 * lenguas) sin que el fallo de uno tire a los demás.
 *
 * Recibe lo que regresa Promise.allSettled para cada área y devuelve:
 *   programas  -> los programas de las áreas que respondieron bien, en el
 *                 mismo orden de siempre: posgrado, licenciatura, lenguas.
 *   errores    -> una entrada por área que falló (servidor, red,
 *                 configuración o respuesta ilegible), con su estado HTTP.
 *   sinDatos   -> áreas que respondieron bien pero sin información.
 *
 * Que un área no tenga datos o falle NO significa que el alumno no exista:
 * eso solo lo puede concluir la página cuando ninguna área falló y
 * ninguna trajo información.
 */
export function combinarHistoriales({ licenciatura, posgrado, lenguas }) {
    const programas = [];
    const errores = [];
    const sinDatos = [];

    const revisar = (area, resultado, agregar) => {
        if (!resultado || resultado.status !== 'fulfilled') {
            const causa = resultado ? resultado.reason : null;
            errores.push({
                area,
                nombre: AREAS_HISTORIAL[area] || area,
                status: causa && causa.status != null ? causa.status : null,
                mensaje: (causa && causa.message) || 'Error desconocido',
                causa
            });
            return;
        }
        const lista = (resultado.value && Array.isArray(resultado.value.programas))
            ? resultado.value.programas
            : [];
        if (!lista.length) {
            sinDatos.push(area);
            return;
        }
        agregar(lista);
    };

    revisar('licenciatura', licenciatura, (lista) => lista.forEach((p) => programas.push(p)));
    // Posgrado va antes que licenciatura (se insertaba con unshift; se
    // conserva igual para no cambiar el orden de las pestañas).
    revisar('posgrado', posgrado, (lista) => lista.forEach((p) => programas.unshift(p)));
    revisar('lenguas', lenguas, (lista) => lista.forEach((p) => programas.push(p)));

    return { programas, errores, sinDatos };
}

export { CALIF_MINIMA_APROBATORIA, CALIF_MINIMA_LENGUAS };
