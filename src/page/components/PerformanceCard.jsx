import { makeStyles } from '@ellucian/react-design-system/core';
import CircularProgress from './CircularProgress';

const useStyles = makeStyles()(() => ({
    performanceCard: {
        padding: '20px',
        borderRadius: '12px',
        backgroundColor: '#fff',
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
        border: '1px solid #e8e8e8',
    },
    performanceHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: '4px',
    },
    performanceLabel: {
        fontSize: '11px',
        color: '#888',
        textTransform: 'uppercase',
        fontWeight: 600,
        letterSpacing: '0.5px',
    },
    regularBadge: {
        backgroundColor: '#e8f5e9',
        color: '#2e7d32',
        fontSize: '11px',
        fontWeight: 600,
        padding: '3px 10px',
        borderRadius: '12px',
        border: '1px solid #c8e6c9',
    },
    performanceTitle: {
        fontSize: '16px',
        fontWeight: 700,
        color: '#333',
        marginBottom: '16px',
    },
    performanceStats: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-around',
        gap: '20px',
    },
    mainStat: {
        textAlign: 'center',
    },
    bigNumber: {
        fontSize: '48px',
        fontWeight: 700,
        color: '#1a1a1a',
        lineHeight: 1,
    },
    bigNumberSuffix: {
        fontSize: '18px',
        color: '#999',
        fontWeight: 400,
    },
    statLabel: {
        fontSize: '12px',
        color: '#888',
        marginTop: '4px',
    },
    creditsStat: {
        textAlign: 'center',
    },
    creditsNumber: {
        fontSize: '36px',
        fontWeight: 700,
        color: '#1a1a1a',
        lineHeight: 1,
    },
    creditsSuffix: {
        fontSize: '13px',
        color: '#888',
        display: 'block',
    },
    improvementNote: {
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        marginTop: '16px',
        fontSize: '12px',
        color: '#666',
    },
    improvementArrow: {
        color: '#2e7d32',
        fontWeight: 700,
    },
    exploreLink: {
        marginTop: '12px',
        fontSize: '13px',
        color: '#1b5e20',
        fontWeight: 600,
        cursor: 'pointer',
        '&:hover': {
            textDecoration: 'underline',
        },
    },
}));

const PerformanceCard = ({ datos }) => {
    const { classes } = useStyles();

    const cursosKey = Object.keys(datos.DatosAsistencias)
    let sumaCalificacion = 0;
    let promedio = 0;
    let creditosCursando = 0;
    cursosKey.forEach((cursoKey) => {
        sumaCalificacion += Number(datos.DatosAsistencias[cursoKey].Calificacion)
        creditosCursando += Number(datos.DatosAsistencias[cursoKey].Creditos)
    })
    promedio = parseFloat(sumaCalificacion / cursosKey.length).toFixed(2)


    return (
        <div className={classes.performanceCard}>
            <div className={classes.performanceHeader}>
                <div className={classes.performanceLabel}>DESEMPEÑO ACTUAL</div>
                <span className={classes.regularBadge}>Regular</span>
            </div>
            <div className={classes.performanceTitle}>Vas por buen camino</div>
            <div className={classes.performanceStats}>
                <div className={classes.mainStat}>
                    <span className={classes.bigNumber}>{promedio}</span>
                    <span className={classes.bigNumberSuffix}>/100</span>
                    <div className={classes.statLabel}>Promedio</div>
                </div>
                <CircularProgress percentage={84} />
                <div className={classes.creditsStat}>
                    <span className={classes.creditsNumber}>{creditosCursando}</span>
                    <span className={classes.creditsSuffix}>Créditos</span>
                    <div className={classes.statLabel}>Cursando</div>
                </div>
            </div>
        </div>
    );
};

export default PerformanceCard;
