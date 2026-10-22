import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * Generador del kardex en PDF — formato OFICIAL UABC
 * (Historial Académico del Alumno). Requiere: npm install jspdf jspdf-autotable
 *
 * Datos REALES (del pipeline): asignatura (NúmeroCurso), descripción (NombreCurso),
 * créditos, calificación, periodo, promedio general, programa (código), facultad,
 * campus, intentos y área de conocimiento (se usa como agrupador tipo "ETAPA").
 */

const PLACEHOLDERS = {
    coordinacion: 'COORDINACIÓN DE SERVICIOS ESTUDIANTILES Y GESTIÓN ESCOLAR',
    unidadAcademicaClave: '', // clave de la unidad académica (ej. "120")
    programaNombre: '', // nombre del programa (el pipeline trae el código, no el nombre)
    planEstudios: '' // versión del plan de estudios (ej. "2015-2")
};

const AMARILLO = [206, 142, 0];
const NEGRO = [0, 0, 0];

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
function periodoLegible(cod) {
    const s = String(cod || '');
    const m = s.match(/^(\d{4})(\d{2})$/);
    if (!m) return s;
    const ciclo = {
        '10': '1',
        '15': '4',
        '20': '2',
        '25': '5',
        '30': '3',
        '41': '6',
        '42': '7',
        '43': '8'
    }[m[2]] || String(parseInt(m[2], 10));
    return `${m[1]}-${ciclo}`;
}

// Dato que no viene del pipeline (o llega vacío): se imprime "-" en lugar
// de dejar el hueco en blanco.
const SIN_DATO = '-';
function dato(valor) {
    const texto = valor == null ? '' : String(valor).trim();
    return texto || SIN_DATO;
}

// Créditos con su unidad, o "-" si el dato no llegó.
function creditos(n) {
    const texto = fmtNum(n);
    return texto === '' ? SIN_DATO : `${texto} CRÉDITOS`;
}

function fmtNum(n) {
    if (n == null || n === '') return '';
    const x = Number(n);
    if (Number.isNaN(x)) return String(n);
    return Number.isInteger(x) ? String(x) : String(Math.round(x * 100) / 100);
}

function exaDeIntento(intento) {
    return (intento || 1) > 1 ? 'Ext' : 'Ord';
}

// Agrupa las materias por área de conocimiento (se muestra como "ETAPA"),
// conservando el orden de aparición.
function agruparPorArea(kardex) {
    // Orden fijo requerido para las etapas. No siempre estarán todas,
    // pero las que existan deben respetar esta secuencia.
    const ORDEN_ETAPAS = ['Etapa Básica', 'Etapa Disciplinaria', 'Etapa Terminal', 'Etapa Optativa'];

    const map = {};
    const extras = [];
    kardex.forEach((m) => {
        const a = m.etapa || 'SIN ETAPA';
        if (!map[a]) {
            map[a] = [];
            // Registra las etapas no contempladas para colocarlas al final,
            // conservando su orden de aparición.
            if (!ORDEN_ETAPAS.includes(a)) {
                extras.push(a);
            }
        }
        map[a].push(m);
    });

    const orden = [...ORDEN_ETAPAS, ...extras].filter((a) => map[a]);

    // Dentro de cada etapa las materias van por clave (ID) de menor a
    // mayor; las etapas conservan su orden. Los renglones de una misma
    // materia (ordinario, extraordinario, recursada) quedan juntos y en el
    // orden en que llegaron, porque el ordenamiento es estable.
    return orden.map((a) => ({ nombre: a, materias: ordenarPorClave(map[a]) }));
}

// Ordena por clave de materia de menor a mayor. La clave llega como texto
// con ceros a la izquierda ("09843"), así que se compara como número; si
// alguna no es numérica se compara como texto.
function ordenarPorClave(materias) {
    return [...materias].sort((a, b) => {
        const na = Number(a.claveMateria);
        const nb = Number(b.claveMateria);
        if (Number.isFinite(na) && Number.isFinite(nb) && na !== nb) return na - nb;
        if (Number.isFinite(na) && Number.isFinite(nb)) return 0;
        return String(a.claveMateria || '').localeCompare(String(b.claveMateria || ''));
    });
}

function agruparPorTipoMateria(kardex) {
    const orden = [];
    const map = {};
    kardex.forEach((m) => {
        const a = m.tipoMateria || 'SIN TIPO';
        if (!map[a]) {
            map[a] = [];
            orden.push(a);
        }
        map[a].push(m);
    });
    orden.sort((a, b) => a.localeCompare(b));
    return orden.map((a) => ({ nombre: a, materias: map[a] }));
}

// Agrupa las materias por área de conocimiento (se muestra como "ETAPA"),
// conservando el orden de aparición.
function agruparPorPeriodo(kardex) {
    const orden = [];
    const map = {};

    kardex.forEach((m) => {
        const a = periodoLegible(m.termino) || 'SIN ÁREA';
        if (!map[a]) {
            map[a] = [];
            orden.push(a);
        }
        map[a].push(m);
    });
    return orden.map((a) => ({ nombre: a, materias: map[a] }));
}

// Totales por área basados en lo CURSADO (no en el plan, que no está disponible):
// Asig = asignaturas distintas cursadas, Aprob = distintas aprobadas, Dif = Asig - Aprob.
function totalesArea(materias) {
    const distintas = new Set();
    const aprobadas = new Set();
    materias.forEach((m) => {
        distintas.add(m.claveMateria);
        if (m.estado === 'aprobada') aprobadas.add(m.claveMateria);
    });
    const asig = distintas.size;
    const aprob = aprobadas.size;
    return { asig, aprob, diferencia: asig - aprob };
}

// Créditos cursados (aprobados), una vez por asignatura (su intento aprobado).
// function creditosCursados(kardex) {
//     const porClave = {};
//     kardex.forEach((m) => {
//         if (m.estado === 'aprobada') porClave[m.claveMateria] = m.creditos || 0;
//     });
//     return Object.values(porClave).reduce((a, b) => a + b, 0);
// }

// Exámenes de regularización ≈ intentos extraordinarios (intento > 1).
function totalRegularizacion(kardex) {
    return kardex.filter((m) => (m.intento || 1) > 1).length;
}

// Créditos faltantes de un concepto. Si falta alguno de los dos datos se
// deja vacío en lugar de imprimir una resta sin sentido.
function faltantes(requeridos, cursados) {
    if (requeridos == null || requeridos === '' || cursados == null || cursados === '') return '';
    const r = Number(requeridos);
    const c = Number(cursados);
    if (!Number.isFinite(r) || !Number.isFinite(c)) return '';
    return fmtNum(r - c);
}

// Tabla de créditos del pie del kardex de licenciatura:
// [concepto, obligatorios, optativos, prácticas profesionales].
//
// Cada columna sale de su propio dato del pipeline:
//   Obligatorios -> creditosObligatoriosPrograma / CreditosObligatorios
//   Optativos    -> creditosOptativosPrograma / CreditosOptativos
//   Prácticas    -> resumenEtapas.PP (creditosRequeridos / creditosCursados)
// Antes la columna de prácticas profesionales repetía los valores de
// optativos. Es el mismo dato de PP que ya muestra la tarjeta "Prácticas
// Profesionales" de la página.
function filasCreditosLicenciatura(programa) {
    const plan = programa.plan || {};
    const pp = (programa.resumenEtapas && programa.resumenEtapas.PP) || {};
    const conceptos = [
        { requeridos: plan.creditosObligatorios, cursados: plan.creditosOblitagoriosCursados },
        { requeridos: plan.creditosOptativos, cursados: plan.creditosOptativosCursados },
        { requeridos: pp.creditosRequeridos, cursados: pp.creditosCursados }
    ];
    return [
        ['Créditos Requeridos:', ...conceptos.map((c) => dato(fmtNum(c.requeridos)))],
        ['Créditos Cursados:', ...conceptos.map((c) => dato(fmtNum(c.cursados)))],
        ['Créditos Faltantes:', ...conceptos.map((c) => dato(faltantes(c.requeridos, c.cursados)))]
    ];
}

// ─────────────────────────────────────────────────────────────────────────────
// Construcción del documento
// ─────────────────────────────────────────────────────────────────────────────
export function construirKardexEtapasPdf(programa) {
    const doc = new jsPDF({ unit: 'pt', format: 'letter' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageMargin = 30;
    const est = programa.estudiante || {};
    const kardex = (programa.kardexCompleto && programa.kardexCompleto.length)
        ? programa.kardexCompleto
        : (programa.kardex || []);
    const areas = agruparPorArea(kardex);

    const ahora = new Date();
    const hora = ahora.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: true });
    const fecha = ahora.toLocaleDateString('es-MX');

    // ── Encabezado (se repite en cada página) ──
    function dibujarEncabezado() {
        const page = doc.getCurrentPageInfo
            ? doc.getCurrentPageInfo().pageNumber
            : doc.internal.getCurrentPageInfo().pageNumber;
        doc.setTextColor(...NEGRO);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.text(hora, pageMargin, 26);
        doc.text(fecha, pageWidth - pageMargin, 26, { align: 'right' });
        doc.text(`PAG. ${page}`, pageWidth - pageMargin, 56, { align: 'right' });

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.text('UNIVERSIDAD AUTÓNOMA DE BAJA CALIFORNIA', pageWidth / 2, 30, { align: 'center' });
        doc.setFontSize(9);
        doc.text(PLACEHOLDERS.coordinacion, pageWidth / 2, 44, { align: 'center' });
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.text('HISTORIAL ACADÉMICO DEL ALUMNO', pageWidth / 2, 56, { align: 'center' });

        if (page === 1) dibujarBloqueAlumno();
    }

    function dibujarBloqueAlumno() {
        const lx = pageMargin + 6;
        const vx = lx + 104;
        const nx = vx + 44;
        let y = 96;
        doc.setFontSize(8);

        doc.setFont('helvetica', 'bold');
        doc.text('Unidad Académica:', lx, y);
        doc.text(dato(PLACEHOLDERS.unidadAcademicaClave), vx, y);
        doc.text(dato(est.facultad).toUpperCase(), nx, y);

        y += 13;
        doc.setFont('helvetica', 'bold');
        doc.text('Programa Educativo:', lx, y);
        doc.text(dato(est.programa), nx, y);
        // doc.text(String(PLACEHOLDERS.programaNombre || '').toUpperCase(), nx, y);

        y += 13;
        doc.setFont('helvetica', 'bold');
        doc.text('Matrícula:', lx, y);
        doc.text(dato(est.matricula), vx, y);
        doc.setFont('helvetica', 'normal');
        doc.text(dato(est.nombre), nx, y);

        doc.setFont('helvetica', 'bold');
        doc.text('Plan de Estudios:', pageWidth - pageMargin - 96, y);
        doc.text(dato(periodoLegible(est.periodoDescr)), pageWidth - pageMargin, y, { align: 'right' });
    }

    // ── Cuerpo de la tabla ──
    const head = [[
        'Asignatura', 'Descripción', 'Créditos', 'Exa', 'Calif',
        'Fecha\nExa', 'Unidad\nExt', 'No.\nOficio', 'Periodo\nEstudio',
        'Total\nAsig', 'Total\nAprob', 'Dife-\nrencia', 'Número\nControl'
    ]];

    const body = [];
    areas.forEach((area) => {
        body.push([{ content: `${String(area.nombre).toUpperCase()}`, colSpan: 13 }]);
        area.materias.forEach((m) => {
            body.push([
                String(m.claveMateria || ''),
                String(m.nombreMateria || ''),
                fmtNum(m.creditos),
                // Acreditada por equivalencia: "Equ" en lugar de Ord o Ext.
                m.acreditada ? 'Equ' : exaDeIntento(m.intento),
                m.calificacion == null ? '' : fmtNum(m.calificacion),
                m.fechaExamen || '', // Fecha Exa (no disponible)
                '', // Unidad Ext
                m.acreditada ? (m.oficio || '') : '', // No. Oficio
                periodoLegible(m.termino),
                '', '', '', '' // totales + número control
            ]);
        });
        const tot = totalesArea(area.materias);
        body.push([
            { content: '', colSpan: 9 },
            String(tot.asig), String(tot.aprob), String(tot.diferencia), ''
        ]);
    });

    autoTable(doc, {
        head,
        body,
        startY: 150,
        margin: { top: 70, left: pageMargin, right: pageMargin, bottom: 40 },
        theme: 'plain',
        styles: {
            font: 'helvetica',
            fontSize: 7,
            textColor: NEGRO,
            cellPadding: { top: 1.4, bottom: 1.4, left: 2, right: 2 },
            lineWidth: 0,
            valign: 'top'
        },
        headStyles: { fontStyle: 'bold', fontSize: 7, valign: 'bottom', lineWidth: 0 },
        columnStyles: {
            0: { cellWidth: 40 },
            1: { cellWidth: 152 },
            2: { cellWidth: 32, halign: 'center' },
            // No. Oficio (7) se ensanchó para que el número de oficio de
            // una equivalencia ("00055-2025/2026") quepa en un renglón. Los
            // 26 pt salen de columnas con holgura (Exa, Calif, Fecha Exa y
            // Periodo), sin que su contenido ni su encabezado se partan. El
            // total sigue en 552 pt: márgenes y encabezados no se mueven.
            3: { cellWidth: 20, halign: 'center' },
            4: { cellWidth: 22, halign: 'center' },
            5: { cellWidth: 42, halign: 'center' },
            6: { cellWidth: 32, halign: 'center' },
            7: { cellWidth: 60, halign: 'center' },
            8: { cellWidth: 34, halign: 'center' },
            9: { cellWidth: 28, halign: 'center' },
            10: { cellWidth: 28, halign: 'center' },
            11: { cellWidth: 28, halign: 'center' },
            12: { cellWidth: 34, halign: 'center' }
        },
        didParseCell: (data) => {
            // Fila de "ETAPA": una sola celda
            if (data.row.raw.length === 1) {
                data.cell.styles.fontStyle = 'bold';
                data.cell.styles.fontSize = 7.5;
                data.cell.styles.cellPadding = { top: 6, bottom: 2, left: 0, right: 0 };
            }
        },
        didDrawCell: (data) => {
            // Reglas horizontales arriba y abajo del encabezado (sin líneas verticales).
            if (data.section === 'head') {
                const { x, y, width, height } = data.cell;
                doc.setLineWidth(0.7);
                doc.setDrawColor(...NEGRO);
                doc.line(x, y, x + width, y);
                doc.line(x, y + height, x + width, y + height);
            }
        },
        didDrawPage: dibujarEncabezado
    });

    // ── Pie: promedio, regularización y créditos ──
    let y = (doc.lastAutoTable ? doc.lastAutoTable.finalY : 150) + 22;

    doc.setTextColor(...NEGRO);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('El presente promedio es en base a las asignaturas aprobadas:', pageMargin, y);
    doc.setFont('helvetica', 'normal');
    doc.text(dato(fmtNum(programa.resumen ? programa.resumen.promedioGeneral : null)), pageMargin + 300, y);

    y += 14;
    doc.setFont('helvetica', 'bold');
    doc.text('Total de Exámenes de Regularización presentados:', pageMargin, y);
    doc.setFont('helvetica', 'normal');
    doc.text(String(totalRegularizacion(kardex)), pageMargin + 300, y);

    y += 24;
    const cx1 = pageMargin + 170;
    const cx2 = pageMargin + 270;
    const cx3 = pageMargin + 392;
    doc.setFont('helvetica', 'bold');
    doc.text('Obligatorios', cx1, y, { align: 'center' });
    doc.text('Optativos', cx2, y, { align: 'center' });
    doc.text('Prácticas Profesionales', cx3, y, { align: 'center' });

    const filas = filasCreditosLicenciatura(programa);
    filas.forEach((f) => {
        y += 16;
        doc.setFont('helvetica', 'bold');
        doc.text(f[0], pageMargin, y);
        doc.setFont('helvetica', 'normal');
        doc.text(f[1], cx1, y, { align: 'center' });
        doc.text(f[2], cx2, y, { align: 'center' });
        doc.text(f[3], cx3, y, { align: 'center' });
    });

    return doc;
}

export function construirKardexPeriodoPdf(programa) {
    const doc = new jsPDF({ unit: 'pt', format: 'letter' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageMargin = 30;
    const est = programa.estudiante || {};
    const kardex = (programa.kardexCompleto && programa.kardexCompleto.length)
        ? programa.kardexCompleto
        : (programa.kardex || []);
    const areas = agruparPorPeriodo(kardex);

    const ahora = new Date();
    const hora = ahora.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: true });
    const fecha = ahora.toLocaleDateString('es-MX');

    // ── Encabezado (se repite en cada página) ──
    function dibujarEncabezado() {
        const page = doc.getCurrentPageInfo
            ? doc.getCurrentPageInfo().pageNumber
            : doc.internal.getCurrentPageInfo().pageNumber;
        doc.setTextColor(...NEGRO);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.text(hora, pageMargin, 26);
        doc.text(fecha, pageWidth - pageMargin, 26, { align: 'right' });
        doc.text(`PAG. ${page}`, pageWidth - pageMargin, 56, { align: 'right' });

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.text('UNIVERSIDAD AUTÓNOMA DE BAJA CALIFORNIA', pageWidth / 2, 30, { align: 'center' });
        doc.setFontSize(9);
        doc.text(PLACEHOLDERS.coordinacion, pageWidth / 2, 44, { align: 'center' });
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.text('HISTORIAL ACADÉMICO DEL ALUMNO', pageWidth / 2, 56, { align: 'center' });

        if (page === 1) dibujarBloqueAlumno();
    }

    function dibujarBloqueAlumno() {
        const lx = pageMargin + 6;
        const vx = lx + 104;
        const nx = vx + 44;
        let y = 96;
        doc.setFontSize(8);

        doc.setFont('helvetica', 'bold');
        doc.text('Unidad Académica:', lx, y);
        doc.text(dato(PLACEHOLDERS.unidadAcademicaClave), vx, y);
        doc.text(dato(est.facultad).toUpperCase(), nx, y);

        y += 13;
        doc.setFont('helvetica', 'bold');
        doc.text('Programa Educativo:', lx, y);
        doc.text(dato(est.programa), vx, y);
        // El nombre del programa ya se imprime en este renglón; aquí iba un
        // segundo campo vacío (PLACEHOLDERS.programaNombre) que lo duplicaba.

        y += 13;
        doc.setFont('helvetica', 'bold');
        doc.text('Matrícula:', lx, y);
        doc.text(dato(est.matricula), vx, y);
        doc.setFont('helvetica', 'normal');
        doc.text(dato(est.nombre), nx, y);

        doc.setFont('helvetica', 'bold');
        doc.text('Plan de Estudios:', pageWidth - pageMargin - 96, y);
        doc.text(dato(periodoLegible(est.periodoDescr)), pageWidth - pageMargin, y, { align: 'right' });
    }

    // ── Cuerpo de la tabla ──
    const head = [[
        'Asignatura', 'Descripción', 'Créditos', 'Exa', 'Calif',
        'Fecha\nExa', 'Unidad\nExt', 'No.\nOficio', 'Periodo\nEstudio',
        'Total\nAsig', 'Total\nAprob', 'Dife-\nrencia', 'Número\nControl'
    ]];

    const body = [];
    areas.forEach((area) => {
        body.push([{ content: `${String(area.nombre).toUpperCase()}`, colSpan: 13 }]);
        area.materias.forEach((m) => {
            body.push([
                String(m.claveMateria || ''),
                String(m.nombreMateria || ''),
                fmtNum(m.creditos),
                // Acreditada por equivalencia: "Equ" en lugar de Ord o Ext.
                m.acreditada ? 'Equ' : exaDeIntento(m.intento),
                m.calificacion == null ? '' : fmtNum(m.calificacion),
                m.fechaExamen || '', // Fecha Exa (no disponible)
                '', // Unidad Ext
                m.acreditada ? (m.oficio || '') : '', // No. Oficio
                periodoLegible(m.termino),
                '', '', '', '' // totales + número control
            ]);
        });
        const tot = totalesArea(area.materias);
        body.push([
            { content: '', colSpan: 9 },
            String(tot.asig), String(tot.aprob), String(tot.diferencia), ''
        ]);
    });

    autoTable(doc, {
        head,
        body,
        startY: 150,
        margin: { top: 70, left: pageMargin, right: pageMargin, bottom: 40 },
        theme: 'plain',
        styles: {
            font: 'helvetica',
            fontSize: 7,
            textColor: NEGRO,
            cellPadding: { top: 1.4, bottom: 1.4, left: 2, right: 2 },
            lineWidth: 0,
            valign: 'top'
        },
        headStyles: { fontStyle: 'bold', fontSize: 7, valign: 'bottom', lineWidth: 0 },
        columnStyles: {
            0: { cellWidth: 40 },
            1: { cellWidth: 152 },
            2: { cellWidth: 32, halign: 'center' },
            // No. Oficio (7) se ensanchó para que el número de oficio de
            // una equivalencia ("00055-2025/2026") quepa en un renglón. Los
            // 26 pt salen de columnas con holgura (Exa, Calif, Fecha Exa y
            // Periodo), sin que su contenido ni su encabezado se partan. El
            // total sigue en 552 pt: márgenes y encabezados no se mueven.
            3: { cellWidth: 20, halign: 'center' },
            4: { cellWidth: 22, halign: 'center' },
            5: { cellWidth: 42, halign: 'center' },
            6: { cellWidth: 32, halign: 'center' },
            7: { cellWidth: 60, halign: 'center' },
            8: { cellWidth: 34, halign: 'center' },
            9: { cellWidth: 28, halign: 'center' },
            10: { cellWidth: 28, halign: 'center' },
            11: { cellWidth: 28, halign: 'center' },
            12: { cellWidth: 34, halign: 'center' }
        },
        didParseCell: (data) => {
            // Fila de "ETAPA": una sola celda
            if (data.row.raw.length === 1) {
                data.cell.styles.fontStyle = 'bold';
                data.cell.styles.fontSize = 7.5;
                data.cell.styles.cellPadding = { top: 6, bottom: 2, left: 0, right: 0 };
            }
        },
        didDrawCell: (data) => {
            // Reglas horizontales arriba y abajo del encabezado (sin líneas verticales).
            if (data.section === 'head') {
                const { x, y, width, height } = data.cell;
                doc.setLineWidth(0.7);
                doc.setDrawColor(...NEGRO);
                doc.line(x, y, x + width, y);
                doc.line(x, y + height, x + width, y + height);
            }
        },
        didDrawPage: dibujarEncabezado
    });

    // ── Pie: promedio, regularización y créditos ──
    let y = (doc.lastAutoTable ? doc.lastAutoTable.finalY : 150) + 22;

    doc.setTextColor(...NEGRO);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('El presente promedio es en base a las asignaturas aprobadas:', pageMargin, y);
    doc.setFont('helvetica', 'normal');
    doc.text(dato(fmtNum(programa.resumen ? programa.resumen.promedioGeneral : null)), pageMargin + 300, y);

    y += 14;
    doc.setFont('helvetica', 'bold');
    doc.text('Total de Exámenes de Regularización presentados:', pageMargin, y);
    doc.setFont('helvetica', 'normal');
    doc.text(String(totalRegularizacion(kardex)), pageMargin + 300, y);

    y += 24;
    const cx1 = pageMargin + 170;
    const cx2 = pageMargin + 270;
    const cx3 = pageMargin + 392;
    doc.setFont('helvetica', 'bold');
    doc.text('Obligatorios', cx1, y, { align: 'center' });
    doc.text('Optativos', cx2, y, { align: 'center' });
    doc.text('Prácticas Profesionales', cx3, y, { align: 'center' });

    const filas = filasCreditosLicenciatura(programa);
    filas.forEach((f) => {
        y += 16;
        doc.setFont('helvetica', 'bold');
        doc.text(f[0], pageMargin, y);
        doc.setFont('helvetica', 'normal');
        doc.text(f[1], cx1, y, { align: 'center' });
        doc.text(f[2], cx2, y, { align: 'center' });
        doc.text(f[3], cx3, y, { align: 'center' });
    });

    return doc;
}

export function construirKardexPeriodoPosgradoPdf(programa) {
    const doc = new jsPDF({ unit: 'pt', format: 'letter' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageMargin = 30;

    const est = programa.estudiante || {};
    const kardex = (programa.kardexCompleto && programa.kardexCompleto.length)
        ? programa.kardexCompleto
        : (programa.kardex || []);
    const areas = agruparPorPeriodo(kardex);

    const ahora = new Date();
    const fecha = ahora.toLocaleDateString('es-MX');

    // ── Encabezado (se repite en cada página) ──
    function dibujarEncabezado() {
        const page = doc.getCurrentPageInfo
            ? doc.getCurrentPageInfo().pageNumber
            : doc.internal.getCurrentPageInfo().pageNumber;
        doc.setTextColor(...NEGRO);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.text(fecha, pageWidth - pageMargin, 26, { align: 'right' });

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.text('UNIVERSIDAD AUTÓNOMA DE BAJA CALIFORNIA', pageWidth / 2, 30, { align: 'center' });
        doc.setFontSize(9);
        doc.text(PLACEHOLDERS.coordinacion, pageWidth / 2, 44, { align: 'center' });
        doc.setFontSize(8);
        doc.text('HISTORIAL ACADÉMICO DEL ALUMNO', pageWidth / 2, 56, { align: 'center' });

        doc.setLineWidth(0.7);
        doc.setDrawColor(...NEGRO);
        doc.line(pageMargin, 69, pageWidth - pageMargin, 69);

        if (page === 1) dibujarBloqueAlumno();
    }

    function dibujarBloqueAlumno() {
        const lx = pageMargin + 6;
        const vx = lx + 55;
        const nx = vx + 60;
        let y = 96;
        doc.setFontSize(8);

        doc.setFont('helvetica', 'bold');
        doc.text('UNID. ACAD.', lx, y);
        // doc.text(PLACEHOLDERS.unidadAcademicaClave, vx, y);
        doc.text(dato(est.facultad).toUpperCase(), nx, y);

        y += 13;
        doc.setFont('helvetica', 'bold');
        doc.text('POSGRADO.', lx, y);
        doc.text(dato(est.programa).toUpperCase(), nx, y);
        // doc.text(String(PLACEHOLDERS.programaNombre || '').toUpperCase(), nx, y);

        y += 13;
        doc.setFont('helvetica', 'bold');
        doc.text('MATRÍCULA.', lx, y);
        doc.text(dato(est.matricula), vx, y);
        doc.text(dato(est.nombre), nx, y);

        doc.text('Plan de Estudios:', pageWidth - pageMargin - 96, y);
        doc.text(dato(periodoLegible(est.periodoDescr)), pageWidth - pageMargin, y, { align: 'right' });

        y += 13;
        doc.setFont('helvetica', 'bold');
        doc.text('CVU.', lx, y);
        // El pipeline no manda el CVU.
        doc.text(SIN_DATO, vx, y);
    }

    // ── Cuerpo de la tabla ──
    const head = [[
        'CLAVE', 'NOMBRE DE LA UNIDAD DE APRENDIZAJE', 'EXA', 'CAL', 'CRED',
        'FECHA EXA.', 'PERIODO',
        'TOTAL\nASIG.', 'TOTAL\nAPROB', 'DIFE-\nRENCIA', 'PROMEDIO'
    ]];

    const body = [];
    areas.forEach((area, index) => {
        body.push([{ content: `Periodo:  ${index + 1}`, colSpan: 13 }]);
        area.materias.forEach((m) => {
            body.push([
                String(String(m.claveMateria).replace(/^0+/, '') || ''),
                String(m.nombreMateria || '').toUpperCase(),
                exaDeIntento(m.intento).toUpperCase(),
                m.calificacion == null ? '' : fmtNum(m.calificacion),
                fmtNum(m.creditos),
                (m.fechaExamen).replace(/\b-\b/g, " / ") || '', // Fecha Exa (no disponible)
                periodoLegible(m.termino),
                '', '', '', '' // totales + número control
            ]);
        });
        const tot = totalesArea(area.materias);
        body.push([
            { content: '', colSpan: 7 },
            String(tot.asig), String(tot.aprob), String(tot.diferencia), String((programa.terminos[index].promedio).toFixed(2))
        ]);
    });

    autoTable(doc, {
        head,
        body,
        startY: 150,
        margin: { top: 70, left: pageMargin, right: pageMargin, bottom: 40 },
        theme: 'plain',
        styles: {
            font: 'helvetica',
            fontStyle: 'bold',
            fontSize: 6,
            textColor: NEGRO,
            cellPadding: { top: 1.4, bottom: 1.4, left: 2, right: 2 },
            lineWidth: 0,
            valign: 'top'
        },
        headStyles: { fontStyle: 'bold', fontSize: 7, valign: 'bottom', lineWidth: 0 },
        columnStyles: {
            0: { cellWidth: 40 },
            1: { cellWidth: 152 },
            2: { cellWidth: 32 },
            3: { cellWidth: 26 },
            4: { cellWidth: 26 },
            5: { cellWidth: 46 },
            6: { cellWidth: 50 },
            7: { cellWidth: 50 },
            8: { cellWidth: 50 },
            9: { cellWidth: 50 },
            10: { cellWidth: 50 },
        },
        didParseCell: (data) => {
            // Fila de "ETAPA": una sola celda con colSpan 13.
            if (data.row.raw.length === 1) {
                data.cell.styles.fontStyle = 'bold';
                data.cell.styles.fontSize = 7.5;
                data.cell.styles.cellPadding = { top: 6, bottom: 2, left: 0, right: 0 };
            }
        },
        didDrawCell: (data) => {
            // Reglas horizontales arriba y abajo del encabezado (sin líneas verticales).
            if (data.section === 'head') {
                const { x, y, width, height } = data.cell;
                doc.setLineWidth(0.7);
                doc.setDrawColor(...NEGRO);
                doc.line(x, y, x + width, y);
                doc.line(x, y + height, x + width, y + height);
            }
        },
        didDrawPage: dibujarEncabezado
    });

    // ── Pie: promedio, regularización y créditos ──
    let y = (doc.lastAutoTable ? doc.lastAutoTable.finalY : 150) + 22;

    y += 24;
    const promedioXPoint = (pageWidth / 3) * 2;
    const cx1 = pageMargin + 205;

    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('PROMEDIO GENERAL: ', promedioXPoint, y);
    doc.text(dato(programa.resumen.promedioGeneral), promedioXPoint + 150, y);
    doc.text('PROMEDIO PONDERADO: ', promedioXPoint, y + 16);
    doc.text(dato(programa.resumen.promedioPonderado), promedioXPoint + 150, y + 16);


    const filas = [
        ['TOTAL DE CRÉDITOS OBLIGATORIOS:', creditos(programa.plan.creditosObligatorios)],
        ['CRÉDITOS OBLIGATORIOS CURSADOS:', creditos(programa.plan.creditosOblitagoriosCursados)],
        ['TOTAL DE CRÉDITOS OPTATIVOS:', creditos(programa.plan.creditosOptativos)],
        ['CRÉDITOS OPTATIVOS CURSADOS:', creditos(programa.plan.creditosOptativosCursados)],
        // El pipeline todavía no manda tutorales ni trabajo terminal. Antes
        // estos tres renglones repetían los optativos cursados.
        ['TOTAL DE CRÉDITOS DE CURSOS TUTORALES:', SIN_DATO],
        ['CRÉDITOS DE CURSOS TUTORALES CURSADOS:', SIN_DATO],
        ['CRÉDITOS TRABAJO TERMINAL PENDIENTES', SIN_DATO]
    ];
    filas.forEach((f) => {
        doc.text(f[0], pageMargin, y);
        doc.text(f[1], cx1, y);
        y += 16;
    });

    return doc;
}

export function construirKardexEtapaPosgradoPdf(programa) {
    const doc = new jsPDF({ unit: 'pt', format: 'letter' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageMargin = 30;

    const est = programa.estudiante || {};
    const kardex = (programa.kardexCompleto && programa.kardexCompleto.length)
        ? programa.kardexCompleto
        : (programa.kardex || []);
    const areas = agruparPorTipoMateria(kardex);

    const ahora = new Date();
    const fecha = ahora.toLocaleDateString('es-MX');

    // ── Encabezado (se repite en cada página) ──
    function dibujarEncabezado() {
        const page = doc.getCurrentPageInfo
            ? doc.getCurrentPageInfo().pageNumber
            : doc.internal.getCurrentPageInfo().pageNumber;
        doc.setTextColor(...NEGRO);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.text(fecha, pageWidth - pageMargin, 26, { align: 'right' });

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.text('UNIVERSIDAD AUTÓNOMA DE BAJA CALIFORNIA', pageWidth / 2, 30, { align: 'center' });
        doc.setFontSize(9);
        doc.text(PLACEHOLDERS.coordinacion, pageWidth / 2, 44, { align: 'center' });
        doc.setFontSize(8);
        doc.text('HISTORIAL ACADÉMICO DEL ALUMNO', pageWidth / 2, 56, { align: 'center' });

        doc.setLineWidth(0.7);
        doc.setDrawColor(...NEGRO);
        doc.line(pageMargin, 69, pageWidth - pageMargin, 69);

        if (page === 1) dibujarBloqueAlumno();
    }

    function dibujarBloqueAlumno() {
        const lx = pageMargin + 6;
        const vx = lx + 55;
        const nx = vx + 60;
        let y = 96;
        doc.setFontSize(8);

        doc.setFont('helvetica', 'bold');
        doc.text('UNID. ACAD.', lx, y);
        // doc.text(PLACEHOLDERS.unidadAcademicaClave, vx, y);
        doc.text(dato(est.facultad).toUpperCase(), nx, y);

        y += 13;
        doc.setFont('helvetica', 'bold');
        doc.text('POSGRADO.', lx, y);
        doc.text(dato(est.programa).toUpperCase(), nx, y);
        // doc.text(String(PLACEHOLDERS.programaNombre || '').toUpperCase(), nx, y);

        y += 13;
        doc.setFont('helvetica', 'bold');
        doc.text('MATRÍCULA.', lx, y);
        doc.text(dato(est.matricula), vx, y);
        doc.text(dato(est.nombre), nx, y);

        doc.text('Plan de Estudios:', pageWidth - pageMargin - 96, y);
        doc.text(dato(periodoLegible(est.periodoDescr)), pageWidth - pageMargin, y, { align: 'right' });

        y += 13;
        doc.setFont('helvetica', 'bold');
        doc.text('CVU.', lx, y);
        // El pipeline no manda el CVU.
        doc.text(SIN_DATO, vx, y);
    }

    // ── Cuerpo de la tabla ──
    const head = [[
        'CLAVE', 'NOMBRE DE LA UNIDAD DE APRENDIZAJE', 'EXA', 'CAL', 'CRED',
        'FECHA EXA.', 'PERIODO',
        'TOTAL\nASIG.', 'TOTAL\nAPROB', 'DIFE-\nRENCIA', 'PROMEDIO'
    ]];

    const body = [];
    areas.forEach((area, index) => {
        body.push([{ content: `${String(area.nombre).toUpperCase()}`, colSpan: 13 }]);
        area.materias.forEach((m) => {
            body.push([
                String(String(m.claveMateria).replace(/^0+/, '') || ''),
                String(m.nombreMateria || '').toUpperCase(),
                exaDeIntento(m.intento).toUpperCase(),
                m.calificacion == null ? '' : fmtNum(m.calificacion),
                fmtNum(m.creditos),
                (m.fechaExamen).replace(/\b-\b/g, " / ") || '', // Fecha Exa (no disponible)
                periodoLegible(m.termino),
                '', '', '', '' // totales + número control
            ]);
        });
        const tot = totalesArea(area.materias);
        body.push([
            { content: '', colSpan: 7 },
            String(tot.asig), String(tot.aprob), String(tot.diferencia), String((programa.terminos[index].promedio).toFixed(2))
        ]);
    });

    autoTable(doc, {
        head,
        body,
        startY: 150,
        margin: { top: 70, left: pageMargin, right: pageMargin, bottom: 40 },
        theme: 'plain',
        styles: {
            font: 'helvetica',
            fontStyle: 'bold',
            fontSize: 6,
            textColor: NEGRO,
            cellPadding: { top: 1.4, bottom: 1.4, left: 2, right: 2 },
            lineWidth: 0,
            valign: 'top'
        },
        headStyles: { fontStyle: 'bold', fontSize: 7, valign: 'bottom', lineWidth: 0 },
        columnStyles: {
            0: { cellWidth: 40 },
            1: { cellWidth: 152 },
            2: { cellWidth: 32 },
            3: { cellWidth: 26 },
            4: { cellWidth: 26 },
            5: { cellWidth: 46 },
            6: { cellWidth: 50 },
            7: { cellWidth: 50 },
            8: { cellWidth: 50 },
            9: { cellWidth: 50 },
            10: { cellWidth: 50 },
        },
        didParseCell: (data) => {
            // Fila de "ETAPA": una sola celda con colSpan 13.
            if (data.row.raw.length === 1) {
                data.cell.styles.fontStyle = 'bold';
                data.cell.styles.fontSize = 7.5;
                data.cell.styles.cellPadding = { top: 6, bottom: 2, left: 0, right: 0 };
            }
        },
        didDrawCell: (data) => {
            // Reglas horizontales arriba y abajo del encabezado (sin líneas verticales).
            if (data.section === 'head') {
                const { x, y, width, height } = data.cell;
                doc.setLineWidth(0.7);
                doc.setDrawColor(...NEGRO);
                doc.line(x, y, x + width, y);
                doc.line(x, y + height, x + width, y + height);
            }
        },
        didDrawPage: dibujarEncabezado
    });

    // ── Pie: promedio, regularización y créditos ──
    let y = (doc.lastAutoTable ? doc.lastAutoTable.finalY : 150) + 22;

    y += 24;
    const promedioXPoint = (pageWidth / 3) * 2;
    const cx1 = pageMargin + 205;

    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('PROMEDIO GENERAL: ', promedioXPoint, y);
    doc.text(dato(programa.resumen.promedioGeneral), promedioXPoint + 150, y);
    doc.text('PROMEDIO PONDERADO: ', promedioXPoint, y + 16);
    doc.text(dato(programa.resumen.promedioPonderado), promedioXPoint + 150, y + 16);


    const filas = [
        ['TOTAL DE CRÉDITOS OBLIGATORIOS:', creditos(programa.plan.creditosObligatorios)],
        ['CRÉDITOS OBLIGATORIOS CURSADOS:', creditos(programa.plan.creditosOblitagoriosCursados)],
        ['TOTAL DE CRÉDITOS OPTATIVOS:', creditos(programa.plan.creditosOptativos)],
        ['CRÉDITOS OPTATIVOS CURSADOS:', creditos(programa.plan.creditosOptativosCursados)],
        // El pipeline todavía no manda tutorales ni trabajo terminal. Antes
        // estos tres renglones repetían los optativos cursados.
        ['TOTAL DE CRÉDITOS DE CURSOS TUTORALES:', SIN_DATO],
        ['CRÉDITOS DE CURSOS TUTORALES CURSADOS:', SIN_DATO],
        ['CRÉDITOS TRABAJO TERMINAL PENDIENTES', SIN_DATO]
    ];
    filas.forEach((f) => {
        doc.text(f[0], pageMargin, y);
        doc.text(f[1], cx1, y);
        y += 16;
    });

    return doc;
}

export function construirKardexLenguaExtranjera(programa) {
    const doc = new jsPDF({ unit: 'pt', format: 'letter' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const pageMargin = 30;

    const est = programa.estudiante || {};
    const kardex = (programa.kardexCompleto && programa.kardexCompleto.length)
        ? programa.kardexCompleto
        : (programa.kardex || []);

    const ahora = new Date();
    const hora = ahora.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: true });
    const fecha = ahora.toLocaleDateString('es-MX');

    // ── Encabezado (se repite en cada página) ──
    function dibujarEncabezado() {
        const page = doc.getCurrentPageInfo
            ? doc.getCurrentPageInfo().pageNumber
            : doc.internal.getCurrentPageInfo().pageNumber;

        doc.setLineWidth(1);
        doc.setDrawColor(0, 121, 52);
        doc.line(0, pageHeight - 45, pageWidth, pageHeight - 45);

        doc.setTextColor(...NEGRO);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.text(fecha + " " + hora, pageMargin, pageHeight - 26);
        doc.text(`PAG. ${page}`, pageWidth - pageMargin, pageHeight - 26, { align: 'right' });

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.text('UNIVERSIDAD AUTÓNOMA DE BAJA CALIFORNIA', pageWidth / 2, 30, { align: 'center' });
        doc.setFont('helvetica', 'normal');

        doc.setLineWidth(1);
        doc.setDrawColor(0, 121, 52);
        doc.line((pageWidth / 6) * 4, 65, pageWidth, 65);
        doc.setFontSize(8);
        doc.text('HISTORIAL ACADÉMICO DEL ALUMNO', pageWidth - pageMargin, 56, { align: 'right' });

        if (page === 1) dibujarBloqueAlumno();
    }

    function dibujarBloqueAlumno() {
        const lx = pageMargin + 6;
        const vx = lx + 50;
        const nx = vx + 40;
        let y = 96;
        doc.setFontSize(8);

        doc.setFont('helvetica', 'bold');
        doc.text('Municipio:', lx, y);
        doc.text(dato(est.campus || PLACEHOLDERS.unidadAcademicaClave).toUpperCase(), vx, y);

        y += 13;
        doc.setFont('helvetica', 'bold');
        doc.text('Matrícula:', lx, y);
        doc.text(dato(est.matricula), vx, y);
        doc.setFont('helvetica', 'normal');
        doc.text(dato(est.nombre), nx, y);

    }

    // ── Cuerpo de la tabla ──
    const head = [[
        'Nivel', 'Calificación', 'Periodo', 'Fecha Inicio', 'Fecha Fin'
    ]];

    const body = [];

    kardex.forEach((idioma) => {
        body.push([
            String(idioma.nombreMateria || ''),
            fmtNum(idioma.calificacion),
            periodoLegible(idioma.termino),
            String(idioma.fechaExamen),
            String(idioma.fechaExamen)

        ])
    })

    // areas.forEach((area) => {
    //     body.push([{ content: `Periodo  ${String(area.nombre).toUpperCase()}`, colSpan: 13 }]);
    //     area.materias.forEach((m) => {
    //         body.push([
    //             String(m.claveMateria || ''),
    //             String(m.nombreMateria || ''),
    //             fmtNum(m.creditos),
    //             exaDeIntento(m.intento),
    //             m.calificacion == null ? '' : fmtNum(m.calificacion),
    //             m.fechaExamen || '', // Fecha Exa (no disponible)
    //             '', // Unidad Ext
    //             '', // No. Oficio
    //             periodoLegible(m.termino),
    //             '', '', '', '' // totales + número control
    //         ]);
    //     });
    //     const tot = totalesArea(area.materias);
    //     body.push([
    //         { content: '', colSpan: 9 },
    //         String(tot.asig), String(tot.aprob), String(tot.diferencia), ''
    //     ]);
    // });

    autoTable(doc, {
        head,
        body,
        startY: 120,
        margin: { top: 70, left: pageMargin, right: pageMargin, bottom: 40 },
        theme: 'plain',
        styles: {
            font: 'helvetica',
            fontSize: 7,
            textColor: NEGRO,
            cellPadding: { top: 1.4, bottom: 1.4, left: 2, right: 2 },
            lineWidth: 0,
            valign: 'top'
        },
        headStyles: { fontStyle: 'bold', fontSize: 7, valign: 'bottom', lineWidth: 0 },
        columnStyles: {
            0: { cellWidth: 184 },
            1: { cellWidth: 92 },
            2: { cellWidth: 92 },
            3: { cellWidth: 92 },
            4: { cellWidth: 92 },

        },
        didParseCell: (data) => {
            // Fila de "ETAPA": una sola celda con colSpan 13.
            if (data.row.raw.length === 1) {
                data.cell.styles.fontStyle = 'bold';
                data.cell.styles.fontSize = 7.5;
                data.cell.styles.cellPadding = { top: 6, bottom: 2, left: 0, right: 0 };
            }
        },
        didDrawCell: (data) => {
            // Reglas horizontales arriba y abajo del encabezado (sin líneas verticales).
            if (data.section === 'head') {
                const { x, y, width, height } = data.cell;
                doc.setLineWidth(1);
                doc.setDrawColor(...AMARILLO);
                doc.line(x, y, x + width, y);
                doc.line(x, y + height, x + width, y + height);
            }
        },
        didDrawPage: dibujarEncabezado
    });

    return doc;
}

export function generarKardexEtapasPdf(programa) {
    const doc = construirKardexEtapasPdf(programa);
    const mat = (programa.estudiante && programa.estudiante.matricula) || 'kardex';
    doc.save(`historial-academico-${mat}.pdf`);
}

export function generarKardexPeriodoPdf(programa) {
    const doc = construirKardexPeriodoPdf(programa);
    const mat = (programa.estudiante && programa.estudiante.matricula) || 'kardex';
    doc.save(`historial-academico-${mat}.pdf`);
}

export function generarKardexPeriodoPosgradoPdf(programa) {
    const doc = construirKardexPeriodoPosgradoPdf(programa);
    const mat = (programa.estudiante && programa.estudiante.matricula) || 'kardex';
    doc.save(`historial-academico-${mat}.pdf`);
}

export function generarKardexEtapaPosgradoPdf(programa) {
    const doc = construirKardexEtapaPosgradoPdf(programa);
    const mat = (programa.estudiante && programa.estudiante.matricula) || 'kardex';
    doc.save(`historial-academico-${mat}.pdf`);
}

export function generarKardexLenguaExtranjeraPdf(programa) {
    const doc = construirKardexLenguaExtranjera(programa);
    const mat = (programa.estudiante && programa.estudiante.matricula) || 'kardex';
    doc.save(`historial-academico-${mat}.pdf`);
}
