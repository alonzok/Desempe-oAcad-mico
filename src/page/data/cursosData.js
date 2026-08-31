/* global URLSearchParams */

export const cursosData = [
    {
        id: 'AFD-101',
        nombre: 'Comunicación Oral y Escrita',
        horario: 'Lun y Mié · 14:00-16:00',
        calificacion: 89,
        asistencia: { asistidas: 18, total: 24, porcentaje: 75 },
        estado: 'En curso',
        color: '#2e7d32',
    },
    {
        id: 'AFD-102',
        nombre: 'Morfo-fisiología',
        horario: 'Mar y Jue · 14:00-16:00',
        calificacion: 92,
        asistencia: { asistidas: 20, total: 24, porcentaje: 83 },
        estado: 'En curso',
        color: '#2e7d32',
    },
    {
        id: 'AFD-103',
        nombre: 'Acondicionamiento Físico I',
        horario: 'Mar y Jue · 16:00-18:00',
        calificacion: 95,
        asistencia: { asistidas: 21, total: 24, porcentaje: 88 },
        estado: 'En curso',
        color: '#2e7d32',
    },
    {
        id: 'AFD-104',
        nombre: 'Responsabilidad Social',
        horario: 'Lun · 16:00-18:00',
        calificacion: 90,
        asistencia: { asistidas: 12, total: 16, porcentaje: 75 },
        estado: 'En curso',
        color: '#2e7d32',
    },
    {
        id: 'AFD-105',
        nombre: 'Desarrollo de Habilidades del Pensamiento',
        horario: 'Lun · 18:00-20:00',
        calificacion: 87,
        asistencia: { asistidas: 10, total: 16, porcentaje: 63 },
        estado: 'En curso',
        color: '#f57c00',
    },
    {
        id: 'AFD-106',
        nombre: 'Recreación, Ocio y Tiempo Libre',
        horario: 'Lun · 20:00-22:00',
        calificacion: 94,
        asistencia: { asistidas: 11, total: 16, porcentaje: 69 },
        estado: 'En curso',
        color: '#2e7d32',
    },
    {
        id: 'AFD-107',
        nombre: 'Antecedentes Pedagógicos de la Cultura Física',
        horario: 'Mié · 18:00-21:00',
        calificacion: 88,
        asistencia: { asistidas: 5, total: 24, porcentaje: 21 },
        estado: 'Atención',
        color: '#d32f2f',
    },
];

// export const accionesPrioritarias = [
//     {
//         dia: '1',
//         mes: 'SEPT',
//         titulo: 'Entrega pendiente Biblioteca',
//         subtitulo: 'Fundamentos de Comunicación',
//     },
//     {
//         dia: '22',
//         mes: 'AGO',
//         titulo: 'Asesoría académica',
//         subtitulo: 'Edificio 11B · 10:00 h',
//     },
//     {
//         dia: '24',
//         mes: 'AGO',
//         titulo: 'Pago próximo',
//         subtitulo: 'Fecha límite de colegiatura',
//     },
// ];

/**
 * Transforma la respuesta cruda del pipeline en { estudiante, programas }.
 */
export function parseRespuestaPipeline(respuesta) {
    if (Array.isArray(respuesta))
        return respuesta[0]
    return respuesta
}


export async function fetchDesempAcadPipeline({ authenticatedEthosFetch, pipeline, cardId }) {
    // export async function fetchHistorialPipeline({ authenticatedEthosFetch, bannerId, pipeline, cardId }) {
    const cardIdParameter = new URLSearchParams({ cardId }).toString();
    const resourcePath = `${pipeline}?${cardIdParameter}`;
    const response = await authenticatedEthosFetch(resourcePath, {
        method: 'GET',
        headers: { 'Content-type': 'application/json', 'Accept': 'application/json' }
    });
    if (response && response.status === 200) {
        const text = await response.text();
        if (!text.trim()) {
            console.log("Empty response");
            return;
        } else {
            const json = await JSON.parse(text)
            // eslint-disable-next-line no-console
            console.log('[Historial] Respuesta del pipeline:', json);
            return json;
        }
    }

    throw new Error('La matrícula no existe.');
}

export async function fetchAdeudosPipeline({ authenticatedEthosFetch, pipeline, cardId }) {
    // export async function fetchHistorialPipeline({ authenticatedEthosFetch, bannerId, pipeline, cardId }) {
    const cardIdParameter = new URLSearchParams({ cardId }).toString();
    const resourcePath = `${pipeline}?${cardIdParameter}`;
    const response = await authenticatedEthosFetch(resourcePath, {
        method: 'GET',
        headers: { 'Content-type': 'application/json', 'Accept': 'application/json' }
    });
    if (response && response.status === 200) {
        const text = await response.text();
        if (!text.trim()) {
            console.log("Empty response");
            return;
        } else {
            const json = await JSON.parse(text)
            // eslint-disable-next-line no-console
            console.log('[Historial] Respuesta del pipeline:', json);
            return json;
        }
    }

    throw new Error('La matrícula no existe.');
}

export async function fetchDesempAcad({ authenticatedEthosFetch, pipeline, cardId } = {}) {
    if (!authenticatedEthosFetch || !pipeline) {
        throw new Error('No se configuró el pipeline para el Desempeño Académico o falta el acceso a Ethos.');
    }
    const respuesta = await fetchDesempAcadPipeline({ authenticatedEthosFetch, pipeline, cardId });
    return parseRespuestaPipeline(respuesta);
}

export async function fetchAdeudos({ authenticatedEthosFetch, pipeline, cardId } = {}) {
    if (!authenticatedEthosFetch || !pipeline) {
        throw new Error('No se configuró el pipeline para los Adeudos o falta el acceso a Ethos.');
    }
    const respuesta = await fetchAdeudosPipeline({ authenticatedEthosFetch, pipeline, cardId });
    return respuesta;
}