import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * Generadores del kardex en PDF. Hay un formato por nivel, replicando los
 * documentos oficiales:
 *
 *   Licenciatura -> construirKardexPdf         (agrupado por ETAPA)
 *   Posgrado     -> construirKardexPeriodoPdf  (agrupado por PERIODO)
 *   Lenguas Ext. -> construirKardexLenguasPdf  (listado simple)
 *
 * Requiere: npm install jspdf jspdf-autotable
 */

// ─────────────────────────────────────────────────────────────────────────────
// Datos que el pipeline todavía no entrega. Editar aquí cuando existan.
// ─────────────────────────────────────────────────────────────────────────────
const PLACEHOLDERS = {
    coordinacion: 'COORDINACIÓN DE SERVICIOS ESTUDIANTILES Y GESTIÓN ESCOLAR',
    unidadAcademicaClave: '', // clave de la unidad académica
    programaNombre: '',       // respaldo: normalmente viene en est.nombrePrograma
    nombreAlumno: '',
    planEstudios: ''          // respaldo del plan de estudios
};

const NEGRO = [0, 0, 0];
const OLIVA = [150, 132, 66]; // reglas del formato de Lenguas Extranjeras

// ─────────────────────────────────────────────────────────────────────────────
// Utilidades
// ─────────────────────────────────────────────────────────────────────────────

// Convierte el código de periodo de Banner al formato del kardex oficial.
//
//   202410 -> 2024-1     202441 -> 2024-6
//   202420 -> 2024-2     202442 -> 2024-7
//   202430 -> 2024-3     202443 -> 2024-8
//
// Los códigos terminados en decena son los semestres (10=1, 20=2, 30=3).
// Los que empiezan con 4 son los periodos cortos y en el documento oficial
// se numeran a partir del 6, por eso se les resta 35.
function periodoLegible(cod) {
    const s = String(cod || '');
    const m = s.match(/^(\d{4})(\d{2})$/);
    if (!m) return s;
    const n = parseInt(m[2], 10);
    let ciclo;
    if (n >= 40) ciclo = n - 35;
    else if (n % 10 === 0) ciclo = n / 10;
    else ciclo = n;
    return `${m[1]}-${ciclo}`;
}

function fmtNum(n) {
    if (n == null || n === '') return '';
    const x = Number(n);
    if (Number.isNaN(x)) return String(n);
    return Number.isInteger(x) ? String(x) : String(Math.round(x * 100) / 100);
}

// 98.33 -> "98.33" con dos decimales, como en los formatos oficiales.
function fmtDecimal(n, decimales = 2) {
    const x = Number(n);
    if (n == null || n === '' || Number.isNaN(x)) return '';
    return x.toFixed(decimales);
}

// "2026-06-25" -> "2026 / 06 / 25" (formato del kardex de posgrado)
function fechaConBarras(iso) {
    const m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
    return m ? `${m[1]} / ${m[2]} / ${m[3]}` : '';
}

function horaActual() {
    return new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: true });
}

function fechaActual() {
    const d = new Date();
    return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
}

function numeroPagina(doc) {
    return doc.getCurrentPageInfo
        ? doc.getCurrentPageInfo().pageNumber
        : doc.internal.getCurrentPageInfo().pageNumber;
}

// Intentos extraordinarios = exámenes de regularización.
function totalRegularizacion(kardexCompleto) {
    return (kardexCompleto || []).filter((m) => (m.intento || 1) > 1).length;
}

// El pipeline manda el intento; el formato oficial muestra Ord / Ext.
function exaDeIntento(intento) {
    return (intento || 1) > 1 ? 'Ext' : 'Ord';
}

// ─────────────────────────────────────────────────────────────────────────────
// LICENCIATURA — agrupado por ETAPA
// ─────────────────────────────────────────────────────────────────────────────

// Orden oficial de las etapas. Se aceptan tanto las claves del pipeline
// (EB/ED/ET/PP) como el nombre ya legible.
const ETAPAS = [
    { claves: ['EB', 'ETAPA BÁSICA', 'ETAPA BASICA'], nombre: 'ETAPA BÁSICA' },
    { claves: ['ED', 'ETAPA DISCIPLINARIA'], nombre: 'ETAPA DISCIPLINARIA' },
    { claves: ['ET', 'ETAPA TERMINAL'], nombre: 'ETAPA TERMINAL' },
    { claves: ['EO', 'ETAPA OPTATIVA'], nombre: 'ETAPA OPTATIVA' },
    { claves: ['PP', 'PRÁCTICAS PROFESIONALES'], nombre: 'PRÁCTICAS PROFESIONALES' }
];

function nombreEtapa(materia) {
    const crudo = String(materia.etapa || '').trim().toUpperCase();
    const encontrada = ETAPAS.find((e) => e.claves.includes(crudo));
    if (encontrada) return encontrada.nombre;
    // Sin etapa en el pipeline: las optativas se separan por TipoMateria.
    if (String(materia.tipoMateria || '').toUpperCase() === 'OPTATIVA') return 'ETAPA OPTATIVA';
    return crudo || 'SIN ETAPA';
}

function agruparPorEtapa(kardex) {
    const map = {};
    const orden = [];
    kardex.forEach((m) => {
        const etapa = nombreEtapa(m);
        if (!map[etapa]) { map[etapa] = []; orden.push(etapa); }
        map[etapa].push(m);
    });

    // Se respeta el orden oficial y al final lo que no encaje.
    const oficiales = ETAPAS.map((e) => e.nombre).filter((n) => map[n]);
    const resto = orden.filter((n) => !oficiales.includes(n));

    return [...oficiales, ...resto].map((nombre) => ({ nombre, materias: map[nombre] }));
}

function totalesGrupo(materias) {
    const asig = materias.length;
    const aprob = materias.filter((m) => m.estado === 'aprobada').length;
    return { asig, aprob, diferencia: asig - aprob };
}

export function construirKardexPdf(programa) {
    const doc = new jsPDF({ unit: 'pt', format: 'letter' });
    const W = doc.internal.pageSize.getWidth();
    const M = 40;

    const est = programa.estudiante || {};
    const plan = programa.plan || {};
    const etapasResumen = programa.resumenEtapas || {};
    const kardex = (programa.kardexCompleto && programa.kardexCompleto.length)
        ? programa.kardexCompleto
        : (programa.kardex || []);
    const grupos = agruparPorEtapa(kardex);

    const hora = horaActual();
    const fecha = fechaActual();

    function encabezado() {
        doc.setTextColor(...NEGRO);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.text(hora, M, 32);
        doc.text(fecha, W - M, 32, { align: 'right' });
        doc.text(`PAG. ${numeroPagina(doc)}`, W - M, 62, { align: 'right' });

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(13);
        doc.text('UNIVERSIDAD AUTÓNOMA DE BAJA CALIFORNIA', W / 2, 36, { align: 'center' });
        doc.setFontSize(10);
        doc.text(PLACEHOLDERS.coordinacion, W / 2, 50, { align: 'center' });
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.text('HISTORIAL ACADÉMICO DEL ALUMNO', W / 2, 62, { align: 'center' });

        if (numeroPagina(doc) === 1) bloqueAlumno();
    }

    function bloqueAlumno() {
        const lx = M + 10;
        const vx = M + 210;
        let y = 108;
        doc.setFontSize(9);

        doc.setFont('helvetica', 'bold');
        doc.text('Unidad Académica:', lx, y);
        doc.text(String(est.facultad || '').toUpperCase(), vx, y);

        y += 15;
        doc.setFont('helvetica', 'bold');
        doc.text('Programa Educativo:', lx, y);
        doc.text(String(est.nombrePrograma || PLACEHOLDERS.programaNombre || ''), vx, y);

        y += 15;
        doc.setFont('helvetica', 'bold');
        doc.text('Matrícula:', lx, y);
        doc.text(String(est.matricula || ''), lx + 130, y);
        doc.setFont('helvetica', 'normal');
        doc.text(String(est.nombre || PLACEHOLDERS.nombreAlumno || ''), vx, y);

        doc.setFont('helvetica', 'bold');
        // Etiqueta y valor alineados a la derecha, con separación suficiente
        // para que no se encimen (antes se leía "Plan de Estudio2024-43").
        doc.text('Plan de Estudios:', W - M - 46, y, { align: 'right' });
        doc.text(
            periodoLegible(est.periodoDescr) || PLACEHOLDERS.planEstudios || '',
            W - M,
            y,
            { align: 'right' }
        );
    }

    const head = [[
        'Asignatura', 'Descripción', 'Créditos', 'Exa', 'Calif',
        'Fecha\nExa', 'Unidad\nExt', 'No.\nOficio', 'Periodo\nEstudio',
        'Total\nAsig', 'Total\nAprob', 'Dife-\nrencia', 'Número\nControl'
    ]];

    const body = [];
    grupos.forEach((grupo) => {
        body.push([{ content: grupo.nombre, colSpan: 13, styles: { fontStyle: 'bold' } }]);
        grupo.materias.forEach((m) => {
            body.push([
                String(m.claveMateria || ''),
                String(m.nombreMateria || ''),
                fmtNum(m.creditos),
                exaDeIntento(m.intento),
                m.calificacion == null ? '' : fmtNum(m.calificacion),
                m.fechaExamen || '',
                '', '', // Unidad Ext / No. Oficio: no vienen del pipeline
                periodoLegible(m.termino),
                '', '', '', ''
            ]);
        });
        const t = totalesGrupo(grupo.materias);
        body.push([
            { content: '', colSpan: 9 },
            String(t.asig), String(t.aprob), String(t.diferencia), ''
        ]);
    });

    autoTable(doc, {
        head,
        body,
        startY: 168,
        margin: { top: 80, left: M, right: M, bottom: 40 },
        theme: 'plain',
        styles: {
            font: 'helvetica',
            fontSize: 7.5,
            textColor: NEGRO,
            cellPadding: { top: 2.2, bottom: 2.2, left: 2, right: 2 },
            lineWidth: 0,
            valign: 'top'
        },
        headStyles: { fontStyle: 'bold', fontSize: 7.5, valign: 'bottom' },
        columnStyles: {
            // Los anchos suman 532 pt: el ancho útil de una hoja carta con
            // márgenes de 40. Si se cambia uno, hay que compensar en otro.
            0: { cellWidth: 44 },
            1: { cellWidth: 130 },
            2: { cellWidth: 34, halign: 'center' },
            3: { cellWidth: 26, halign: 'center' },
            4: { cellWidth: 28, halign: 'center' },
            5: { cellWidth: 46, halign: 'center' },
            6: { cellWidth: 30, halign: 'center' },
            7: { cellWidth: 30, halign: 'center' },
            8: { cellWidth: 42, halign: 'center' },
            9: { cellWidth: 30, halign: 'center' },
            10: { cellWidth: 30, halign: 'center' },
            11: { cellWidth: 30, halign: 'center' },
            12: { cellWidth: 32, halign: 'center' }
        },
        didParseCell: (data) => {
            // Renglón de ETAPA: una sola celda que ocupa toda la fila.
            if (data.row.raw.length === 1) {
                data.cell.styles.cellPadding = { top: 7, bottom: 2, left: 0, right: 0 };
            }
        },
        didDrawCell: (data) => {
            // Solo dos reglas: arriba y abajo del encabezado.
            if (data.section === 'head') {
                const { x, y, width, height } = data.cell;
                doc.setLineWidth(0.7);
                doc.setDrawColor(...NEGRO);
                doc.line(x, y, x + width, y);
                doc.line(x, y + height, x + width, y + height);
            }
        },
        didDrawPage: encabezado
    });

    // ── Cierre ──
    let y = (doc.lastAutoTable ? doc.lastAutoTable.finalY : 200) + 26;
    doc.setTextColor(...NEGRO);
    doc.setFontSize(9);

    doc.setFont('helvetica', 'bold');
    doc.text('El presente promedio es en base a las asignaturas aprobadas:', M, y);
    doc.setFont('helvetica', 'normal');
    doc.text(fmtDecimal(programa.resumen ? programa.resumen.promedioGeneral : null), M + 330, y);

    y += 17;
    doc.setFont('helvetica', 'bold');
    doc.text('Total de Exámenes de Regularización presentados:', M, y);
    doc.setFont('helvetica', 'normal');
    doc.text(String(totalRegularizacion(programa.kardexCompleto)), M + 330, y);

    // Prácticas profesionales: del resumen de etapas (PP).
    const pp = etapasResumen.PP || {};
    const req = [plan.creditosObligatorios || 0, plan.creditosOptativos || 0, pp.creditosRequeridos || 0];
    const cur = [plan.creditosOblitagoriosCursados || 0, plan.creditosOptativosCursados || 0, pp.creditosCursados || 0];
    const fal = req.map((r, i) => Math.max(0, r - cur[i]));

    y += 30;
    const cx = [M + 210, M + 330, M + 470];
    doc.setFont('helvetica', 'bold');
    ['Obligatorios', 'Optativos', 'Prácticas Profesionales'].forEach((t, i) => {
        doc.text(t, cx[i], y, { align: 'center' });
    });

    [['Créditos Requeridos:', req], ['Créditos Cursados:', cur], ['Créditos Faltantes:', fal]]
        .forEach(([etiqueta, valores]) => {
            y += 22;
            doc.setFont('helvetica', 'bold');
            doc.text(etiqueta, M, y);
            doc.setFont('helvetica', 'normal');
            valores.forEach((v, i) => doc.text(String(v), cx[i], y, { align: 'center' }));
        });

    return doc;
}

// ─────────────────────────────────────────────────────────────────────────────
// POSGRADO — agrupado por PERIODO
// ─────────────────────────────────────────────────────────────────────────────
function agruparPorPeriodo(kardex) {
    const map = {};
    kardex.forEach((m) => {
        const p = m.termino || '';
        if (!map[p]) map[p] = [];
        map[p].push(m);
    });
    return Object.keys(map).sort().map((p, i) => ({
        termino: p,
        indice: i + 1,
        materias: map[p]
    }));
}

function promedioGrupo(materias) {
    const conCalif = materias.filter((m) => m.calificacion != null);
    if (!conCalif.length) return null;
    return conCalif.reduce((acc, m) => acc + m.calificacion, 0) / conCalif.length;
}

export function construirKardexPeriodoPdf(programa) {
    const doc = new jsPDF({ unit: 'pt', format: 'letter' });
    const W = doc.internal.pageSize.getWidth();
    const M = 40;

    const est = programa.estudiante || {};
    const plan = programa.plan || {};
    const resumen = programa.resumen || {};
    const kardex = (programa.kardexCompleto && programa.kardexCompleto.length)
        ? programa.kardexCompleto
        : (programa.kardex || []);
    const periodos = agruparPorPeriodo(kardex);

    const fecha = fechaActual();

    function encabezado() {
        doc.setTextColor(...NEGRO);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.text(fecha, W - M, 32, { align: 'right' });

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(13);
        doc.text('UNIVERSIDAD AUTÓNOMA DE BAJA CALIFORNIA', W / 2, 36, { align: 'center' });
        doc.setFontSize(10);
        doc.text(PLACEHOLDERS.coordinacion, W / 2, 52, { align: 'center' });
        doc.setFontSize(9);
        doc.text('HISTORIAL ACADÉMICO DEL ALUMNO', W / 2, 66, { align: 'center' });

        // Regla que cierra el membrete.
        doc.setLineWidth(0.8);
        doc.setDrawColor(...NEGRO);
        doc.line(M, 78, W - M, 78);

        if (numeroPagina(doc) === 1) bloqueAlumno();
    }

    function bloqueAlumno() {
        const lx = M + 10;
        const vx = M + 170;
        let y = 108;
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');

        doc.text('UNID. ACAD.', lx, y);
        doc.text(String(est.facultad || '').toUpperCase(), vx, y);

        y += 15;
        doc.text('POSGRADO.', lx, y);
        doc.text(String(est.nombrePrograma || PLACEHOLDERS.programaNombre || '').toUpperCase(), vx, y);

        y += 15;
        doc.text(`MATRÍCULA.  ${est.matricula || ''}`, lx, y);
        doc.text(String(est.nombre || PLACEHOLDERS.nombreAlumno || '').toUpperCase(), vx, y);
        doc.text('Plan de Estudios:', W - M - 46, y, { align: 'right' });
        doc.text(
            periodoLegible(est.periodoDescr) || PLACEHOLDERS.planEstudios || '',
            W - M,
            y,
            { align: 'right' }
        );

        y += 15;
        doc.text('CVU.', lx, y);
    }

    const head = [[
        'CLAVE', 'NOMBRE DE LA UNIDAD DE APRENDIZAJE', 'EXA', 'CAL', 'CRED',
        'FECHA EXA.', 'PERIODO', 'TOTAL\nASIG.', 'TOTAL\nAPROB', 'DIFE-\nRENCIA', 'PROMEDIO'
    ]];

    const body = [];
    periodos.forEach((grupo) => {
        body.push([{ content: `Periodo:  ${grupo.indice}`, colSpan: 11, styles: { fontStyle: 'bold' } }]);
        grupo.materias.forEach((m) => {
            body.push([
                String(m.claveMateria || ''),
                String(m.nombreMateria || '').toUpperCase(),
                exaDeIntento(m.intento).toUpperCase(),
                m.calificacion == null ? '' : fmtNum(m.calificacion),
                fmtNum(m.creditos),
                fechaConBarras(m.fechaExamen),
                periodoLegible(m.termino),
                '', '', '', ''
            ]);
        });
        const t = totalesGrupo(grupo.materias);
        body.push([
            { content: '', colSpan: 7 },
            String(t.asig), String(t.aprob), String(t.diferencia),
            fmtDecimal(promedioGrupo(grupo.materias))
        ]);
    });

    autoTable(doc, {
        head,
        body,
        startY: 178,
        margin: { top: 92, left: M, right: M, bottom: 40 },
        theme: 'plain',
        styles: {
            font: 'helvetica',
            fontSize: 7,
            fontStyle: 'bold',
            textColor: NEGRO,
            cellPadding: { top: 2.4, bottom: 2.4, left: 2, right: 2 },
            lineWidth: 0,
            valign: 'top'
        },
        headStyles: { fontStyle: 'bold', fontSize: 7, valign: 'bottom' },
        columnStyles: {
            // Suman 532 pt (ancho útil de la hoja carta con márgenes de 40).
            0: { cellWidth: 40 },
            1: { cellWidth: 150 },
            2: { cellWidth: 28, halign: 'center' },
            3: { cellWidth: 26, halign: 'center' },
            4: { cellWidth: 30, halign: 'center' },
            5: { cellWidth: 60, halign: 'center' },
            6: { cellWidth: 44, halign: 'center' },
            7: { cellWidth: 36, halign: 'center' },
            8: { cellWidth: 36, halign: 'center' },
            9: { cellWidth: 36, halign: 'center' },
            10: { cellWidth: 46, halign: 'right' }
        },
        didParseCell: (data) => {
            if (data.row.raw.length === 1) {
                data.cell.styles.cellPadding = { top: 8, bottom: 3, left: 0, right: 0 };
            }
        },
        didDrawCell: (data) => {
            if (data.section === 'head') {
                const { x, y, width, height } = data.cell;
                doc.setLineWidth(0.7);
                doc.setDrawColor(...NEGRO);
                doc.line(x, y + height, x + width, y + height);
            }
        },
        didDrawPage: encabezado
    });

    // ── Cierre: créditos a la izquierda, promedios a la derecha ──
    let y = (doc.lastAutoTable ? doc.lastAutoTable.finalY : 200) + 40;
    doc.setTextColor(...NEGRO);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');

    const obligatorios = plan.creditosObligatorios || 0;
    const obligCursados = plan.creditosOblitagoriosCursados || 0;
    const optativos = plan.creditosOptativos || 0;
    const optCursados = plan.creditosOptativosCursados || 0;

    const filas = [
        ['TOTAL DE CRÉDITOS OBLIGATORIOS:', obligatorios],
        ['CRÉDITOS OBLIGATORIOS CURSADOS:', obligCursados],
        ['TOTAL DE CRÉDITOS OPTATIVOS:', optativos],
        ['CRÉDITOS OPTATIVOS CURSADOS:', optCursados],
        ['TOTAL DE CRÉDITOS DE CURSOS TUTORALES:', optativos],
        ['CRÉDITOS DE CURSOS TUTORALES CURSADOS:', optCursados],
        ['CRÉDITOS TRABAJO TERMINAL PENDIENTES', optativos]
    ];

    const yInicio = y;
    filas.forEach(([etiqueta, valor]) => {
        doc.text(etiqueta, M, y);
        doc.text(`${valor} CRÉDITOS`, M + 225, y);
        y += 22;
    });

    // Promedios en la columna derecha. La etiqueta va alineada a la derecha
    // con margen suficiente para no chocar con "NN CRÉDITOS" de la izquierda.
    const cxDer = W - M - 55;
    doc.text('PROMEDIO GENERAL:', cxDer, yInicio, { align: 'right' });
    doc.text(fmtDecimal(resumen.promedioGeneral), W - M, yInicio, { align: 'right' });
    doc.text('PROMEDIO PONDERADO:', cxDer, yInicio + 22, { align: 'right' });
    doc.text(fmtDecimal(resumen.promedioPonderado), W - M, yInicio + 22, { align: 'right' });

    return doc;
}

// ─────────────────────────────────────────────────────────────────────────────
// LENGUAS EXTRANJERAS — listado simple
// ─────────────────────────────────────────────────────────────────────────────
export function construirKardexLenguasPdf(programa) {
    const doc = new jsPDF({ unit: 'pt', format: 'letter' });
    const W = doc.internal.pageSize.getWidth();
    const H = doc.internal.pageSize.getHeight();
    const M = 40;

    const est = programa.estudiante || {};
    const kardex = [...(programa.kardex || [])].sort(
        (a, b) => String(a.termino).localeCompare(String(b.termino))
    );

    function encabezado() {
        doc.setTextColor(...NEGRO);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(13);
        doc.text('UNIVERSIDAD AUTÓNOMA DE BAJA CALIFORNIA', W / 2, 42, { align: 'center' });

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.text('HISTORIAL ACADÉMICO DEL ALUMNO', W - M, 74, { align: 'right' });

        // Regla oliva bajo el subtítulo, como en el formato de referencia.
        doc.setLineWidth(0.8);
        doc.setDrawColor(...OLIVA);
        doc.line(W / 2 + 20, 82, W - M, 82);

        if (numeroPagina(doc) === 1) bloqueAlumno();
    }

    function bloqueAlumno() {
        const lx = M + 8;
        const vx = M + 78;
        let y = 112;
        doc.setFontSize(9);

        doc.setFont('helvetica', 'bold');
        doc.text('Municipio:', lx, y);
        doc.text(String(est.facultad || '').toUpperCase(), vx, y);

        y += 16;
        doc.setFont('helvetica', 'bold');
        doc.text('Matrícula:', lx, y);
        doc.text(String(est.matricula || ''), vx, y);
        doc.setFont('helvetica', 'normal');
        doc.text(String(est.nombre || '').toUpperCase(), vx + 62, y);
    }

    function pie() {
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.5);
        doc.line(M, H - 46, W - M, H - 46);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(...NEGRO);
        doc.text(`${fechaActual()} ${horaActual()}`, M, H - 32);
        doc.text(`PAG. ${numeroPagina(doc)}`, W - M, H - 32, { align: 'right' });
    }

    // Lenguas Extranjeras no maneja etapas, ni créditos obligatorios y
    // optativos, ni ninguno de los apartados del kardex de licenciatura:
    // solo el curso con su calificación, créditos y periodo.
    const body = kardex.map((m) => [
        String(m.nombreMateria || ''),
        m.calificacion == null ? '' : fmtNum(m.calificacion),
        fmtNum(m.creditos),
        periodoLegible(m.termino)
    ]);

    autoTable(doc, {
        head: [['Curso', 'Calificación', 'Créditos', 'Período']],
        body,
        startY: 150,
        margin: { top: 100, left: M, right: M, bottom: 60 },
        theme: 'plain',
        styles: {
            font: 'helvetica',
            fontSize: 8,
            textColor: NEGRO,
            cellPadding: { top: 4, bottom: 4, left: 2, right: 2 },
            lineWidth: 0
        },
        headStyles: { fontStyle: 'bold', fontSize: 8 },
        columnStyles: {
            0: { cellWidth: 220 },
            1: { cellWidth: 100, halign: 'center' },
            2: { cellWidth: 90, halign: 'center' },
            3: { cellWidth: 122, halign: 'center' }
        },
        didDrawCell: (data) => {
            // Reglas oliva arriba y abajo del encabezado.
            if (data.section === 'head') {
                const { x, y, width, height } = data.cell;
                doc.setDrawColor(...OLIVA);
                doc.setLineWidth(0.7);
                doc.line(x, y, x + width, y);
                doc.line(x, y + height, x + width, y + height);
            }
        },
        didDrawPage: () => {
            encabezado();
            pie();
        }
    });

    return doc;
}

// ─────────────────────────────────────────────────────────────────────────────
// Descargas
// ─────────────────────────────────────────────────────────────────────────────
function guardar(doc, programa, prefijo) {
    const mat = (programa.estudiante && programa.estudiante.matricula) || 'kardex';
    doc.save(`${prefijo}-${mat}.pdf`);
}

export function generarKardexPdf(programa) {
    guardar(construirKardexPdf(programa), programa, 'historial-academico');
}

export function generarKardexPeriodoPdf(programa) {
    guardar(construirKardexPeriodoPdf(programa), programa, 'historial-academico');
}

export function generarKardexLenguasPdf(programa) {
    guardar(construirKardexLenguasPdf(programa), programa, 'lenguas-extranjeras');
}
