import { makeStyles } from '@ellucian/react-design-system/core';
// import { accionesPrioritarias } from '../data/cursosData';

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
    debtLabel:{
        color: '#ff0000'
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

function getDia(fecha) {
    let fechaAcortado = String(fecha).split("T")[0];
    return fechaAcortado.split("-")[2]
}

function getMes(fecha) {
    let fechaAcortado = String(fecha).split("T")[0];
    let mes = fechaAcortado.split("-")[1];
    let mesString = "";
    switch (mes) {
        case "01":
            mesString = "ENE";
            break;
        case "02":
            mesString = "FEB";
            break;
        case "03":
            mesString = "MAR";
            break;
        case "04":
            mesString = "ABR";
            break;
        case "05":
            mesString = "MAY";
            break;
        case "06":
            mesString = "JUN";
            break;
        case "07":
            mesString = "JUL";
            break;
        case "08":
            mesString = "AGO";
            break;
        case "09":
            mesString = "SEPT";
            break;
        case "10":
            mesString = "OCT";
            break;
        case "11":
            mesString = "NOV";
            break;
        default:
            mesString = "DIC"
            break;
    }

    return mesString;
}

const ActionsCard = ({ datos }) => {
    const { classes } = useStyles();
    console.log(datos)

    return (
        <div className={classes.actionsCard}>
            <div className={classes.actionsHeader}>
                <div>
                    <div className={classes.actionsLabel}>LO SIGUIENTE PARA TI</div>
                    <div className={classes.actionsTitle}>Acciones prioritarias</div>
                </div>
                <div className={classes.actionsBadge}>{datos.length}</div>
            </div>
            {datos.map((accion, idx) => (
                <div key={idx} className={classes.actionItem}>
                    <div className={classes.actionDate}>
                        <div className={classes.actionDay}>{getDia(accion.FechaInicioAdeudo)}</div>
                        <div className={classes.actionMonth}>{getMes(accion.FechaInicioAdeudo)}</div>
                    </div>
                    <div className={classes.actionContent}>
                        <div className={classes.actionTitle}>{accion.TipoAdeudo}</div>
                        <div className={classes.actionSubtitle}>{accion.RazonAdeudo}</div>
                    </div>
                    <div className={classes.debtLabel}>
                        {accion.Monto == '0' ? "" : `$${accion.Monto} pesos`}
                    </div>
                </div>
            ))}
        </div>
    );
};

export default ActionsCard;
