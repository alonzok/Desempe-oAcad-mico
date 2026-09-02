import { makeStyles } from '@ellucian/react-design-system/core';
// import { cursosData } from '../data/cursosData';
import iconoBlackboard from '../assets/blackboard.png';

const useStyles = makeStyles()(() => ({
    academicSection: {
        marginTop: '8px',
    },
    sectionHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: '8px',
    },
    sectionLabel: {
        fontSize: '11px',
        color: '#888',
        textTransform: 'uppercase',
        fontWeight: 600,
        letterSpacing: '0.5px',
    },
    sectionTitle: {
        fontSize: '20px',
        fontWeight: 700,
        color: '#1a1a1a',
        marginBottom: '4px',
    },
    sectionSubtitle: {
        fontSize: '13px',
        color: '#888',
    },
    periodSelector: {
        textAlign: 'right',
    },
    periodLabel: {
        fontSize: '12px',
        color: '#888',
        marginBottom: '4px',
    },
    summaryCards: {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr 1fr',
        gap: '16px',
        marginTop: '16px',
        marginBottom: '24px',
    },
    summaryCard: {
        padding: '16px 20px',
        borderRadius: '8px',
        border: '1px solid #e8e8e8',
        backgroundColor: '#fff',
    },
    summaryLabel: {
        fontSize: '12px',
        color: '#888',
        marginBottom: '2px',
    },
    summarySublabel: {
        fontSize: '11px',
        color: '#aaa',
    },
    summaryValue: {
        fontSize: '36px',
        fontWeight: 700,
        color: '#1a1a1a',
        lineHeight: 1.2,
    },
    summaryPercent: {
        fontSize: '28px',
        fontWeight: 700,
        color: '#1a1a1a',
    },
    summaryPercentSymbol: {
        fontSize: '20px',
    },
    summarySmall: {
        fontSize: '12px',
        color: '#888',
    },
    coursesTable: {
        width: '100%',
        backgroundColor: '#fff',
        borderRadius: '8px',
        border: '1px solid #e8e8e8',
        overflow: 'hidden',
    },
    tableHeader: {
        backgroundColor: '#fafafa',
    },
    tableHeaderCell: {
        fontSize: '10px',
        fontWeight: 700,
        color: '#888',
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
        padding: '12px 16px',
        borderBottom: '1px solid #e8e8e8',
    },
    tableRow: {
        borderBottom: '1px solid #f5f5f5',
        '&:last-child': {
            borderBottom: 'none',
        },
    },
    courseCell: {
        padding: '14px 16px',
        verticalAlign: 'top',
    },
    courseIndicator: {
        width: '8px',
        height: '8px',
        borderRadius: '50%',
        display: 'inline-block',
        marginRight: '10px',
    },
    courseCode: {
        fontSize: '11px',
        color: '#aaa',
        display: 'block',
    },
    courseName: {
        fontSize: '14px',
        fontWeight: 600,
        color: '#333',
    },
    courseSchedule: {
        fontSize: '11px',
        color: '#888',
        marginTop: '2px',
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
    },
    gradeValue: {
        fontSize: '24px',
        fontWeight: 700,
        color: '#333',
    },
    gradeSuffix: {
        fontSize: '14px',
        color: '#aaa',
    },
    attendanceContainer: {
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
    },
    attendanceText: {
        fontSize: '13px',
        fontWeight: 600,
        color: '#333',
    },
    attendancePercent: {
        fontSize: '12px',
        color: '#888',
    },
    progressBar: {
        height: '6px',
        borderRadius: '3px',
        backgroundColor: '#e0e0e0',
        overflow: 'hidden',
        width: '120px',
    },
    progressFill: {
        height: '100%',
        borderRadius: '3px',
        transition: 'width 0.3s ease',
    },
    progressGreen: {
        backgroundColor: '#2e7d32',
    },
    progressOrange: {
        backgroundColor: '#f57c00',
    },
    progressRed: {
        backgroundColor: '#d32f2f',
    },
    attendanceLabel: {
        fontSize: '10px',
        color: '#aaa',
    },
    statusBadge: {
        fontSize: '11px',
        fontWeight: 600,
        padding: '3px 10px',
        borderRadius: '12px',
    },
    statusDestacado: {
        backgroundColor: '#e8f5e9',
        color: '#2e7d32',
    },
    statusEsperado: {
        backgroundColor: '#e3f2fd',
        color: '#1565c0',
    },
    statusAtencion: {
        backgroundColor: '#fff3e0',
        color: '#e65100',
    },
    footer: {
        textAlign: 'center',
        padding: '16px',
        fontSize: '11px',
        color: '#aaa',
        marginTop: '16px',
    },
}));

const AcademicSection = ({ datos }) => {
    const { classes } = useStyles();
    const cursosKey = Object.keys(datos.DatosAsistencias)
    let sumaCalificacion = 0;
    let promedio = 0;
    let asistenciaTotales = 0;
    let faltasTotales = 0;
    let cursos = [];
    cursosKey.forEach((cursoKey) => {
        sumaCalificacion += Number(datos.DatosAsistencias[cursoKey].Calificacion)
        asistenciaTotales += Number(datos.DatosAsistencias[cursoKey].Asistencias)
        faltasTotales += Number(datos.DatosAsistencias[cursoKey].Inasistencias)
        datos.DatosAsistencias[cursoKey].id = cursoKey
        cursos.push(datos.DatosAsistencias[cursoKey])
    })
    promedio = parseFloat(sumaCalificacion / cursosKey.length).toFixed(2)
    let clasesTotales = asistenciaTotales + faltasTotales

    function getEstado(curso) {
        const calificacion = Number(curso.Calificacion);
        const asistencias = curso.Asistencias;
        const faltas = curso.Inasistencias;
        const porcentajeAsistencia = parseFloat(asistencias / (asistencias + faltas) * 100).toFixed(2);
        if (calificacion >= 80 && porcentajeAsistencia >= 80) {
            return { label: 'Destacado', className: classes.statusDestacado };
        }
        if (calificacion >= 60 && calificacion < 80 && porcentajeAsistencia >= 80) {
            return { label: 'Esperado', className: classes.statusEsperado };
        }
        return { label: 'Atención', className: classes.statusAtencion };
    }
    const getProgressColor = (porcentaje) => {
        if (porcentaje >= 75) return classes.progressGreen;
        if (porcentaje >= 50) return classes.progressOrange;
        return classes.progressRed;
    };


    return (
        <div className={classes.academicSection}>
            <div className={classes.sectionHeader}>
                <div>
                    <div className={classes.sectionLabel}>DESEMPEÑO ACADÉMICO</div>
                    <div className={classes.sectionTitle}>Calificaciones y asistencia por curso</div>
                    <div className={classes.sectionSubtitle}>Resultados parciales registrados a la fecha.</div>
                </div>
            </div>

            {/* Summary cards */}
            <div className={classes.summaryCards}>
                <div className={classes.summaryCard}>
                    <div className={classes.summaryLabel}>Cursos inscritos</div>
                    <div className={classes.summarySublabel}></div>
                    <div className={classes.summaryValue}>{cursosKey.length}</div>
                </div>
                <div className={classes.summaryCard}>
                    <div className={classes.summaryLabel}>Promedio del periodo</div>
                    <div className={classes.summarySublabel}>Calificación parcial</div>
                    <div className={classes.summaryValue}>{promedio}</div>
                </div>
                <div className={classes.summaryCard}>
                    <div className={classes.summaryLabel}>Asistencia acumulada</div>
                    <div className={classes.summarySmall}>{asistenciaTotales} de {clasesTotales} registros</div>
                    <div className={classes.summaryPercent}>
                        {parseFloat((asistenciaTotales / clasesTotales) * 100).toFixed(2)}<span className={classes.summaryPercentSymbol}>%</span>
                    </div>
                </div>
            </div>

            {/* Tabla de cursos */}
            <div className={classes.coursesTable}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr className={classes.tableHeader}>
                            <th className={classes.tableHeaderCell} style={{ textAlign: 'left' }}>CURSO</th>
                            <th className={classes.tableHeaderCell}>CRÉDITOS</th>
                            <th className={classes.tableHeaderCell}>CALIFICACIÓN</th>
                            <th className={classes.tableHeaderCell}>ASISTENCIA</th>
                            <th className={classes.tableHeaderCell}>ESTADO</th>
                        </tr>
                    </thead>
                    <tbody>
                        {cursos.map((curso) => (
                            <tr key={curso.id} className={classes.tableRow}>
                                <td className={classes.courseCell}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        {curso.id == 36302 ?
                                            <img
                                                src={iconoBlackboard}
                                                alt="Icono Blackboard"
                                                title="Cursos en BlackBoard"
                                                style={{ width: '24px', height: '24px', borderRadius: '4px' }}
                                            />
                                            :
                                            <span
                                                className={classes.courseIndicator}
                                                style={{ backgroundColor: "#e65100" }}
                                            />
                                        }

                                        <div>
                                            <span className={classes.courseCode}>{curso.id}</span>
                                            <div className={classes.courseName}>{curso.Curso}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className={classes.courseCell} style={{ textAlign: 'center' }}>
                                    <span className={classes.gradeValue}>{Number(curso.Creditos)}</span>
                                </td>
                                <td className={classes.courseCell} style={{ textAlign: 'center' }}>
                                    <span className={classes.gradeValue}>{Number(curso.Calificacion)}</span>
                                    <span className={classes.gradeSuffix}>/100</span>
                                </td>
                                <td className={classes.courseCell}>
                                    <div className={classes.attendanceContainer}>
                                        <div>
                                            <span className={classes.attendanceText}>
                                                {curso.Asistencias}/{curso.Asistencias + curso.Inasistencias}
                                            </span>
                                            <span className={classes.attendancePercent} style={{ marginLeft: '8px' }}>
                                                {parseFloat((curso.Asistencias / (curso.Asistencias + curso.Inasistencias)) * 100).toFixed(2)}%
                                            </span>
                                        </div>
                                        <div className={classes.progressBar}>
                                            <div
                                                className={`${classes.progressFill} ${getProgressColor(parseFloat((curso.Asistencias / curso.Asistencias + curso.Inasistencias) * 100).toFixed(2))}`}
                                                style={{ width: `${parseFloat((curso.Asistencias / (curso.Asistencias + curso.Inasistencias)) * 100).toFixed(2)}%` }}
                                            />
                                        </div>
                                        <div className={classes.attendanceLabel}>asistencia</div>
                                    </div>
                                </td>
                                <td className={classes.courseCell} style={{ textAlign: 'center' }}>
                                    <span className={`${classes.statusBadge} ${getEstado(curso).className}`}>
                                        {getEstado(curso).label}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Footer note */}
            <div className={classes.footer}>
                Las calificaciones y asistencias son parciales y pueden cambiar conforme el personal docente actualice la información.
                <br />
                <span style={{ marginTop: '8px', display: 'block' }}>
                    Información personal protegida · Última actualización: hoy, 10:24 h
                </span>
            </div>
        </div>
    );
};

export default AcademicSection;
