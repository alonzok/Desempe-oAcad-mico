// ────────────────────────────────────────────────────────────────────
// HORARIO SEMANAL (datos hardcodeados por ahora)
//
// El pipeline del alumno todavía no manda horarios de clase. Mientras
// tanto la pestaña se arma con las materias de abajo.
//
// IMPORTANTE: aquí NO hay fechas. El horario es "día de la semana +
// hora", igual que se espera del pipeline; la pestaña calcula las
// fechas reales de la semana que se esté viendo. Así, el día que llegue
// el pipeline, solo cambia el origen de CLASES_HORARIO y nada más.
// ────────────────────────────────────────────────────────────────────

// Días de la semana. Esto es ESTRUCTURA, no datos de demostración: la
// POSICIÓN en el arreglo es el desplazamiento en días desde el lunes
// (lunes = 0, martes = 1, …), así que no se debe reordenar.
//
// Sábado y domingo están marcados como opcionales: la tabla solo los
// dibuja si alguna materia tiene clase ese día.
export const DIAS_SEMANA = [
    { id: 'lunes', nombre: 'Lunes' },
    { id: 'martes', nombre: 'Martes' },
    { id: 'miercoles', nombre: 'Miércoles' },
    { id: 'jueves', nombre: 'Jueves' },
    { id: 'viernes', nombre: 'Viernes' },
    { id: 'sabado', nombre: 'Sábado', opcional: true },
    { id: 'domingo', nombre: 'Domingo', opcional: true }
];

// Horario que dibuja la tabla cuando no hay ninguna clase de la cual
// deducirlo. Con clases, el rango sale solo de la más temprana a la más
// tardía.
export const RANGO_HORAS_RESPALDO = { inicio: 7, fin: 21 };

// Tipo de hora que manda el pipeline. Solo pinta la TIRA IZQUIERDA de la
// tarjeta; el color del resto de la tarjeta lo sigue decidiendo la materia.
// Son tres tonos distintos en matiz, no solo en claridad, para que se
// distingan también en una pantalla mala o en escala de grises.
export const TIPOS_CLASE = {
    HC: { etiqueta: 'Hora clase', color: '#2E7D5B' },
    HT: { etiqueta: 'Hora taller', color: '#B4690E' },
    HL: { etiqueta: 'Hora laboratorio', color: '#3A6EA5' }
};

// Tipo que se usa cuando el pipeline manda uno que no está en la tabla.
export const TIPO_RESPALDO = { etiqueta: 'Sin tipo', color: '#8A8A8A' };

// El pipeline todavía no manda aula ni edificio. El campo se conserva en la
// tarjeta para no perder el diseño, con un texto que deja claro que el dato
// aún no llega en lugar de inventar un aula.
export const LUGAR_PENDIENTE = 'Aula por asignar';

// Materias del periodo. Cada una trae sus sesiones de la semana.
//
// - "dia" usa los id de DIAS_SEMANA (se aceptan acentos y mayúsculas).
// - "inicio" y "fin" son horas decimales de 24 h: 14 = 14:00 y
//   14.5 = 14:30, por si el pipeline manda clases de 50 minutos.
// - El color de cada materia NO se define aquí: se calcula solo a
//   partir de la clave (ver horarioSelectors.js).
export const CLASES_HORARIO = [
    {
        clave: 'AFD-101',
        materia: 'Comunicación Oral y Escrita',
        profesor: 'Dra. Laura Méndez',
        lugar: 'Aula 204 · Edificio 11B',
        sesiones: [
            { dia: 'lunes', inicio: 14, fin: 16 },
            { dia: 'miercoles', inicio: 14, fin: 16 }
        ]
    },
    {
        clave: 'AFD-102',
        materia: 'Morfo-fisiología',
        profesor: 'Dra. Ana Torres',
        lugar: 'Laboratorio 3',
        sesiones: [
            { dia: 'martes', inicio: 14, fin: 16 },
            { dia: 'jueves', inicio: 14, fin: 16 }
        ]
    },
    {
        clave: 'AFD-103',
        materia: 'Acondicionamiento Físico I',
        profesor: 'Mtro. Jorge Ramos',
        lugar: 'Gimnasio universitario',
        sesiones: [
            { dia: 'martes', inicio: 16, fin: 17 },
            { dia: 'jueves', inicio: 16, fin: 17 }
        ]
    },
    {
        clave: 'AFD-104',
        materia: 'Responsabilidad Social',
        profesor: 'Mtro. Daniel Ruiz',
        lugar: 'Aula 108 · Edificio 7',
        sesiones: [{ dia: 'lunes', inicio: 16, fin: 17 }]
    },
    {
        clave: 'AFD-105',
        materia: 'Habilidades del Pensamiento',
        profesor: 'Dra. Silvia Ortega',
        lugar: 'Aula 12 · Edificio 11B',
        sesiones: [{ dia: 'lunes', inicio: 18, fin: 19 }]
    },
    {
        clave: 'AFD-106',
        materia: 'Recreación, Ocio y Tiempo Libre',
        profesor: 'Mtro. Luis Vega',
        lugar: 'Cancha techada',
        sesiones: [{ dia: 'lunes', inicio: 20, fin: 21 }]
    },
    {
        clave: 'AFD-107',
        materia: 'Antecedentes Pedagógicos',
        profesor: 'Mtra. Rosa Medina',
        lugar: 'Aula 302 · Edificio 11B',
        sesiones: [{ dia: 'miercoles', inicio: 18, fin: 20 }]
    }
];
