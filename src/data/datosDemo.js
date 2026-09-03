// ────────────────────────────────────────────────────────────────────
// DATOS DE DEMOSTRACIÓN (hardcodeados)
//
// Todo lo de este archivo es provisional y está aquí para armar la
// interfaz mientras se definen los pipelines correspondientes.
//
// EXCEPCIÓN: la pestaña "Historia académica" NO usa este archivo; esa sí
// consulta datos reales de Banner/Ethos a través de src/data/historialData.js
// con la matrícula configurada en MATRICULA_DEFAULT.
// ────────────────────────────────────────────────────────────────────

// Paleta institucional usada en toda la extensión.
export const COLORES = {
    verde: '#0F5C3F',
    verdeClaro: '#E8F3EC',
    verdeTexto: '#0B7A4B',
    oro: '#C4982D',
    ambar: '#B45309',
    ambarFondo: '#FEF3C7',
    azul: '#1D4ED8',
    azulFondo: '#DBEAFE',
    texto: '#1F2937',
    textoSuave: '#6B7280',
    linea: '#E5E7EB',
    fondo: '#FAF8F3'
};

export const PERIODO_ACTUAL = '2026-2';

// ── Estudiante ──────────────────────────────────────────────────────
export const ESTUDIANTE = {
    nombre: 'Mariana García López',
    saludo: 'Mariana',
    matricula: '01234567',
    programa: 'Lic. en Actividad Física y Deporte',
    // Respaldo: campus y facultad ya vienen del pipeline; esto solo se usa
    // si no llegara la respuesta.
    facultad: 'Facultad de Deportes',
    campus: 'Tijuana',
    semestre: '6°',
    estatus: 'ACTIVA',
    // Sin foto: se muestran las iniciales.
    foto: null
};




// Porcentaje de asistencia a partir del cual el curso se marca en "Atención".
export const UMBRAL_ASISTENCIA = 40;

// ── Credencial digital ──────────────────────────────────────────────
export const CREDENCIAL = {
    vigencia: '31/12/2026',
    folio: 'UABC-2026-01234567',
    leyenda: 'Presenta este código en biblioteca, laboratorios y accesos.'
};

// ── Servicios ───────────────────────────────────────────────────────
export const SERVICIOS = [
    { titulo: 'Biblioteca', detalle: 'Préstamos y renovaciones en línea' },
    { titulo: 'Servicio médico', detalle: 'Citas y seguimiento en el campus' },
    { titulo: 'Actividades deportivas', detalle: 'Inscripción a talleres y torneos' },
    { titulo: 'Becas y apoyos', detalle: 'Convocatorias vigentes y estatus' },
    { titulo: 'Constancias', detalle: 'Solicitud de documentos oficiales' },
    { titulo: 'Bolsa de trabajo', detalle: 'Vacantes y prácticas profesionales' }
];

// ── Escala de desempeño (0-100) ─────────────────────────────────────
// Etiqueta y mensaje que se muestran en "Desempeño actual" según el
// promedio. Se evalúan de mayor a menor: gana el primer rango cuyo
// mínimo alcance el promedio. Editar aquí para cambiar los cortes.
export const RANGOS_DESEMPENO = [
    { min: 95, etiqueta: 'Excelente', titulo: 'Desempeño excelente', color: 'verde' },
    { min: 90, etiqueta: 'Sobresaliente', titulo: 'Vas muy bien', color: 'verde' },
    { min: 80, etiqueta: 'Notable', titulo: 'Vas por buen camino', color: 'verde' },
    { min: 70, etiqueta: 'Regular', titulo: 'Vas bien, puedes subir', color: 'ambar' },
    { min: 60, etiqueta: 'Suficiente', titulo: 'Vas justo de calificación', color: 'ambar' },
    { min: 0, etiqueta: 'En riesgo', titulo: 'Requiere atención', color: 'rojo' }
];

// Cuando todavía no hay ninguna calificación registrada.
export const DESEMPENO_SIN_DATOS = {
    etiqueta: 'En curso',
    titulo: 'Aún sin calificaciones',
    color: 'gris'
};
