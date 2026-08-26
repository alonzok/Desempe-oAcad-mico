import { makeStyles } from '@ellucian/react-design-system/core';
import { accionesPrioritarias } from '../data/cursosData';

const useStyles = makeStyles()(() => ({
    actionsCard: {
        padding: '20px',
        borderRadius: '12px',
        backgroundColor: '#fff',
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
        border: '1px solid #e8e8e8',
    },
    actionsHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '16px',
    },
    actionsLabel: {
        fontSize: '11px',
        color: '#888',
        textTransform: 'uppercase',
        fontWeight: 600,
        letterSpacing: '0.5px',
    },
    actionsTitle: {
        fontSize: '16px',
        fontWeight: 700,
        color: '#333',
    },
    actionsBadge: {
        width: '24px',
        height: '24px',
        borderRadius: '50%',
        backgroundColor: '#1b5e20',
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '12px',
        fontWeight: 700,
    },
    actionItem: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '12px 0',
        borderBottom: '1px solid #f0f0f0',
    },
    actionDate: {
        textAlign: 'center',
        minWidth: '40px',
    },
    actionDay: {
        fontSize: '18px',
        fontWeight: 700,
        color: '#1b5e20',
    },
    actionMonth: {
        fontSize: '10px',
        color: '#888',
        textTransform: 'uppercase',
    },
    actionContent: {
        flex: 1,
    },
    actionTitle: {
        fontSize: '13px',
        fontWeight: 600,
        color: '#333',
    },
    actionSubtitle: {
        fontSize: '11px',
        color: '#888',
    },
    actionArrow: {
        color: '#ccc',
        fontSize: '16px',
    },
}));

const ActionsCard = () => {
    const { classes } = useStyles();

    return (
        <div className={classes.actionsCard}>
            <div className={classes.actionsHeader}>
                <div>
                    <div className={classes.actionsLabel}>LO SIGUIENTE PARA TI</div>
                    <div className={classes.actionsTitle}>Acciones prioritarias</div>
                </div>
                <div className={classes.actionsBadge}>{accionesPrioritarias.length}</div>
            </div>
            {accionesPrioritarias.map((accion, idx) => (
                <div key={idx} className={classes.actionItem}>
                    <div className={classes.actionDate}>
                        <div className={classes.actionDay}>{accion.dia}</div>
                        <div className={classes.actionMonth}>{accion.mes}</div>
                    </div>
                    <div className={classes.actionContent}>
                        <div className={classes.actionTitle}>{accion.titulo}</div>
                        <div className={classes.actionSubtitle}>{accion.subtitulo}</div>
                    </div>
                    <span className={classes.actionArrow}>›</span>
                </div>
            ))}
        </div>
    );
};

export default ActionsCard;
