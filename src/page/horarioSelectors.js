// ────────────────────────────────────────────────────────────────────
// Funciones puras de la pestaña "Horario"
//
// Mismo criterio que historialSelectors.js: aquí no hay React ni
// estado, solo cálculo. Todo lo que necesitan entra por parámetro, así
// que se pueden probar solas y no cambian cuando el horario deje de
// ser hardcodeado y venga de un pipeline.
// ────────────────────────────────────────────────────────────────────

import { DIAS_SEMANA, RANGO_HORAS_RESPALDO } from '../data/horarioDemo';

export const MESES_CORTOS = [
    'ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN',
    'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'
];

const MS_POR_DIA = 86400000;

// ── Fechas ──────────────────────────────────────────────────────────

// Copia de la fecha a las 00:00, para comparar días sin la hora.
export const soloFecha = (fecha) =>
    new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());

export const sumarDias = (fecha, dias) => {
    const d = soloFecha(fecha);
    d.setDate(d.getDate() + dias);
    return d;
};

// Lunes de la semana a la que pertenece la fecha. getDay() devuelve 0
// para el domingo, que en el calendario escolar cuenta como el CIERRE
// de la semana, no como su inicio: por eso el domingo retrocede 6 días.
export const lunesDeLaSemana = (fecha) => {
    const d = soloFecha(fecha);
    const diaSemana = d.getDay();
    return sumarDias(d, diaSemana === 0 ? -6 : 1 - diaSemana);
};

export const mismoDia = (a, b) =>
    a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate();

// 17 AGO
export const fechaCorta = (fecha) => `${fecha.getDate()} ${MESES_CORTOS[fecha.getMonth()]}`;

// Hora decimal a texto: 14 -> "14:00", 14.5 -> "14:30".
export const horaTexto = (hora) => {
    const h = Math.floor(hora);
    const m = Math.round((hora - h) * 60);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

// Fecha (día) + hora decimal -> Date exacto.
export const fechaConHora = (dia, hora) => {
    const d = soloFecha(dia);
    d.setHours(Math.floor(hora), Math.round((hora % 1) * 60), 0, 0);
    return d;
};

// 'Miércoles', 'MIERCOLES' y 'miercoles' deben caer en el mismo día:
// el pipeline todavía no existe y no se sabe cómo los va a mandar.
const normalizar = (texto) =>
    String(texto || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim();

// Posición del día dentro de la semana (lunes = 0). -1 si no se reconoce.
export const indiceDeDia = (dia) => {
    const buscado = normalizar(dia);
    return DIAS_SEMANA.findIndex((d) => d.id === buscado);
};

// ── Color por materia ────────────────────────────────────────────────
//
// El color NO está hardcodeado por materia. Se toman todas las claves,
// se ordenan (para que el color no dependa del orden en que llegue la
// respuesta) y se reparte el círculo de tonos con el ángulo áureo:
// 137.5° entre una y otra. Con eso:
//   - la misma materia siempre recibe el mismo color;
//   - dos materias distintas nunca reciben el mismo;
//   - una materia nueva del pipeline toma su color sola, sin tocar
//     el código.
// La saturación y la luminosidad quedan fijas para que todos los tonos
// se lean igual de bien sobre blanco.
const ANGULO_AUREO = 137.508;

// De dónde arranca el círculo de tonos. Se empieza en el azul y no en
// el rojo: en una agenda, el rojo se lee como aviso o error.
const DESFASE_TONO = 205;

export const coloresDeMaterias = (clases = []) => {
    // colorClave agrupa por MATERIA: el taller y el laboratorio del mismo
    // curso comparten color, y lo que los distingue es la tira del tipo.
    const claves = [...new Set(clases.map((c) => c.colorClave || c.clave || c.materia))].sort();
    const mapa = {};

    claves.forEach((clave, i) => {
        const tono = Math.round((DESFASE_TONO + i * ANGULO_AUREO) % 360);
        mapa[clave] = {
            borde: `hsl(${tono}, 52%, 42%)`,
            fondo: `hsl(${tono}, 68%, 96%)`,
            fondoActivo: `hsl(${tono}, 62%, 90%)`,
            texto: `hsl(${tono}, 55%, 27%)`
        };
    });

    return mapa;
};

// ── Sesiones ─────────────────────────────────────────────────────────

// Convierte las materias en sesiones con fecha real, para la semana que
// arranca en el lunes recibido.
export const sesionesDeSemana = (clases = [], lunes) =>
    clases.flatMap((clase) =>
        (clase.sesiones || [])
            .map((sesion) => {
                const diaIndice = indiceDeDia(sesion.dia);
                if (diaIndice === -1) return null;

                const dia = sumarDias(lunes, diaIndice);
                return {
                    id: `${clase.clave}-${sesion.dia}-${sesion.inicio}`,
                    clase,
                    sesion,
                    diaIndice,
                    inicio: fechaConHora(dia, sesion.inicio),
                    fin: fechaConHora(dia, sesion.fin)
                };
            })
            .filter(Boolean)
    );

// Siguiente clase a partir de "ahora". Se busca en la semana actual y
// en la siguiente (por si ya no queda nada de aquí al domingo). Una
// clase en curso cuenta como la próxima: sigue siendo la que importa.
export const proximaSesion = (clases = [], ahora = new Date()) => {
    const lunes = lunesDeLaSemana(ahora);
    const candidatas = [
        ...sesionesDeSemana(clases, lunes),
        ...sesionesDeSemana(clases, sumarDias(lunes, 7))
    ]
        .filter((s) => s.fin > ahora)
        .sort((a, b) => a.inicio - b.inicio);

    return candidatas[0] || null;
};

// Días que se dibujan: siempre lunes a viernes, y el fin de semana
// solo si alguna materia tiene clase ese día.
//
// Cada día se devuelve con su "indice" ORIGINAL dentro de la semana
// (lunes = 0 … domingo = 6). Es importante conservarlo: si el sábado no
// se dibuja, la posición dentro de este arreglo ya no coincide con el
// desplazamiento en días desde el lunes, y las fechas saldrían movidas.
export const diasVisibles = (clases = []) => {
    const conClase = new Set(
        clases.flatMap((c) => (c.sesiones || []).map((s) => indiceDeDia(s.dia)))
    );

    // La semana nunca se muestra más corta que lunes a viernes, aunque las
    // clases lleguen solo hasta el miércoles, y crece hacia el fin de
    // semana SIN saltarse días: una clase el domingo obliga a dibujar
    // también el sábado, aunque esté vacío. Los días intermedios sin clase
    // se quedan en su lugar; compactarlos rompería la lectura de la
    // semana.
    const VIERNES = 4;
    const SABADO = 5;
    const DOMINGO = 6;

    let ultimo = VIERNES;
    if (conClase.has(DOMINGO)) ultimo = DOMINGO;
    else if (conClase.has(SABADO)) ultimo = SABADO;

    return DIAS_SEMANA
        .map((dia, indice) => ({ ...dia, indice }))
        .filter((dia) => dia.indice <= ultimo);
};

// ── Solapes ──────────────────────────────────────────────────────────
// Dos materias a la misma hora el mismo día no deben taparse. Se agrupan
// las sesiones que se encima con otra y el ancho de la columna se reparte
// entre ellas. Con una sola sesión el resultado es el de siempre: ocupa
// todo el ancho.
//
// Las sesiones deben venir ya filtradas por día.
export const repartirSolapes = (sesionesDelDia = []) => {
    const orden = [...sesionesDelDia].sort(
        (a, b) => a.sesion.inicio - b.sesion.inicio || a.sesion.fin - b.sesion.fin
    );

    const reparto = {};
    let grupo = [];
    let finDelGrupo = -Infinity;

    const cerrarGrupo = () => {
        grupo.forEach((sesion, columna) => {
            reparto[sesion.id] = { columna, columnas: grupo.length };
        });
        grupo = [];
        finDelGrupo = -Infinity;
    };

    orden.forEach((sesion) => {
        // Arranca después de que terminó todo el grupo anterior: no hay
        // solape y el grupo se puede cerrar.
        if (sesion.sesion.inicio >= finDelGrupo) cerrarGrupo();
        grupo.push(sesion);
        finDelGrupo = Math.max(finDelGrupo, sesion.sesion.fin);
    });
    cerrarGrupo();

    return reparto;
};

// Primera y última hora de la tabla, deducidas de las clases (así no
// sobran filas vacías arriba ni abajo).
export const rangoDeHoras = (clases = []) => {
    const sesiones = clases.flatMap((c) => c.sesiones || []);
    if (!sesiones.length) return RANGO_HORAS_RESPALDO;

    return {
        inicio: Math.floor(Math.min(...sesiones.map((s) => s.inicio))),
        fin: Math.ceil(Math.max(...sesiones.map((s) => s.fin)))
    };
};

// ── Textos ───────────────────────────────────────────────────────────

// Cuánto falta para una clase. Se usa tanto para la próxima clase como
// para la materia que el usuario seleccione (que puede estar en otra
// semana, o ya haber pasado).
export const textoRestante = (inicio, fin, ahora = new Date()) => {
    if (ahora >= fin) return 'Ya terminó';
    if (ahora >= inicio) return 'En curso';

    const minutos = Math.floor((inicio - ahora) / 60000);
    if (minutos < 1) return 'En menos de 1 min';
    if (minutos < 60) return `En ${minutos} min`;

    const horas = Math.floor(minutos / 60);
    const resto = minutos % 60;
    if (horas < 24) return resto ? `En ${horas} h ${resto} min` : `En ${horas} h`;

    // Con más de un día de por medio se cuenta por calendario, no por
    // horas: a las 22:00 del lunes, una clase del miércoles a las 8:00
    // está "en 2 días", aunque falten 34 horas.
    const dias = Math.round((soloFecha(inicio) - soloFecha(ahora)) / MS_POR_DIA);
    return dias === 1 ? 'Mañana' : `En ${dias} días`;
};

// "Hoy", "Mañana" o "Lunes 17 AGO".
export const etiquetaDeDia = (fecha, ahora = new Date()) => {
    if (mismoDia(fecha, ahora)) return 'Hoy';
    if (mismoDia(fecha, sumarDias(ahora, 1))) return 'Mañana';

    // getDay(): domingo = 0. DIAS_SEMANA empieza en lunes, de ahí el +6 % 7.
    const nombre = DIAS_SEMANA[(fecha.getDay() + 6) % 7].nombre;
    return `${nombre} ${fechaCorta(fecha)}`;
};

// Línea de detalle de una sesión: "Hoy · 14:00–16:00 · Aula 204".
export const detalleDeSesion = (item, ahora = new Date()) => {
    if (!item) return '';
    return [
        etiquetaDeDia(item.inicio, ahora),
        `${horaTexto(item.sesion.inicio)}–${horaTexto(item.sesion.fin)}`,
        `Edificio: ${item.clase.lugar.edificio} - Salón: ${item.clase.lugar.salon}`
    ]
        .filter(Boolean)
        .join(' · ');
};

// Rango de fechas de una semana, para el menú: "17 – 21 AGO".
export const rangoDeSemana = (lunes, totalDias) => {
    const ultimo = sumarDias(lunes, Math.max(0, totalDias - 1));
    const mismoMes = lunes.getMonth() === ultimo.getMonth();
    return mismoMes
        ? `${lunes.getDate()} – ${fechaCorta(ultimo)}`
        : `${fechaCorta(lunes)} – ${fechaCorta(ultimo)}`;
};
