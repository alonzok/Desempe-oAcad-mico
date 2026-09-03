/**
 * Selectores del Historial Académico. Funciones PURAS que calculan lo que la
 * UI necesita. El PROMEDIO no se recalcula (es oficial de Banner).
 */

export const CALIF_MINIMA_APROBATORIA = 60;

export const esAprobada = (calificacion) =>
    typeof calificacion === 'number' && calificacion >= CALIF_MINIMA_APROBATORIA;

export function getAvanceCarrera(data) {
    const creditosAprobados = (data?.kardex || [])
        .filter((m) => m.estado === 'aprobada')
        .reduce((sum, m) => sum + (m.creditos || 0), 0);
    const creditosTotales = data?.plan?.creditosTotales || 0;
    const porcentaje = creditosTotales
        ? Math.round((creditosAprobados / creditosTotales) * 100)
        : 0;
    return { creditosAprobados, creditosTotales, porcentaje };
}

export function getAvancePorArea(data) {
    const kardex = data?.kardex || [];
    return (data?.plan?.areas || []).map((area) => {
        const creditosAprobados = kardex
            .filter((m) => m.areaClave === area.clave && m.estado === 'aprobada')
            .reduce((sum, m) => sum + (m.creditos || 0), 0);
        const porcentaje = area.creditosRequeridos
            ? Math.min(100, Math.round((creditosAprobados / area.creditosRequeridos) * 100))
            : 0;
        return {
            clave: area.clave,
            nombre: area.nombre,
            creditosRequeridos: area.creditosRequeridos,
            creditosAprobados,
            porcentaje
        };
    });
}

export function getKardexPorTermino(data) {
    const kardex = data?.kardex || [];
    const promedioPorTermino = Object.fromEntries(
        (data?.terminos || []).map((t) => [t.termino, t.promedio])
    );
    const grupos = {};
    for (const materia of kardex) {
        if (!grupos[materia.termino]) grupos[materia.termino] = [];
        grupos[materia.termino].push(materia);
    }
    return Object.keys(grupos)
        .sort()
        .map((termino) => {
            const materias = grupos[termino];
            const creditos = materias.reduce((sum, m) => sum + (m.creditos || 0), 0);
            return {
                termino,
                promedio: promedioPorTermino[termino] ?? null,
                creditos,
                materias
            };
        });
}

export function getResumen(data) {
    const kardex = data?.kardex || [];
    const materiasAprobadas = kardex.filter((m) => m.estado === 'aprobada').length;
    const materiasEnCurso = kardex.filter((m) => m.estado === 'en_curso').length;
    const materiasReprobadas = kardex.filter((m) => m.estado === 'reprobada').length;
    const creditosEnCurso = kardex
        .filter((m) => m.estado === 'en_curso')
        .reduce((sum, m) => sum + (m.creditos || 0), 0);
    return {
        promedioGeneral: data?.resumen?.promedioGeneral ?? null,
        promedioPonderado: data?.resumen?.promedioPonderado ?? 0,
        materiasAprobadas,
        materiasEnCurso,
        materiasReprobadas,
        creditosEnCurso
    };
}

export function getMateriasFaltantes(data) {
    const kardex = data?.kardex || [];
    const aprobadas = new Set(
        kardex.filter((m) => m.estado === 'aprobada').map((m) => m.claveMateria)
    );
    const enCurso = new Set(
        kardex.filter((m) => m.estado === 'en_curso').map((m) => m.claveMateria)
    );
    const nombreArea = Object.fromEntries(
        (data?.plan?.areas || []).map((a) => [a.clave, a.nombre])
    );
    return (data?.plan?.materias || [])
        .filter((m) => !aprobadas.has(m.claveMateria))
        .map((m) => ({
            ...m,
            areaNombre: nombreArea[m.areaClave] || m.areaClave,
            enCurso: enCurso.has(m.claveMateria)
        }))
        .sort((a, b) =>
            a.areaClave === b.areaClave
                ? a.claveMateria.localeCompare(b.claveMateria)
                : a.areaClave.localeCompare(b.areaClave)
        );
}

export function getTrayectoria(data) {
    return (data?.terminos || []).map((t) => ({
        termino: t.termino,
        promedio: t.promedio
    }));
}
