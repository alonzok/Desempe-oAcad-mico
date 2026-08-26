import { makeStyles } from '@ellucian/react-design-system/core';

const useStyles = makeStyles()(() => ({
    studentCard: {
        padding: '20px',
        borderRadius: '12px',
        backgroundColor: '#fff',
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
        border: '1px solid #e8e8e8',
    },
    studentInfo: {
        display: 'flex',
        alignItems: 'flex-start',
        gap: '16px',
    },
    avatarContainer: {
        position: 'relative',
        textAlign: 'center',
    },
    avatar: {
        width: '80px',
        height: '80px',
        borderRadius: '50%',
        border: '3px solid #1b5e20',
    },
    activeChip: {
        backgroundColor: '#e8f5e9',
        color: '#2e7d32',
        fontSize: '10px',
        fontWeight: 600,
        padding: '2px 8px',
        borderRadius: '12px',
        marginTop: '6px',
        display: 'inline-block',
        textTransform: 'uppercase',
    },
    studentLabel: {
        color: '#2e7d32',
        fontSize: '11px',
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
        marginBottom: '4px',
    },
    studentName: {
        fontSize: '18px',
        fontWeight: 700,
        color: '#1a1a1a',
        marginBottom: '2px',
    },
    studentCareer: {
        fontSize: '13px',
        color: '#555',
        marginBottom: '2px',
    },
    studentFaculty: {
        fontSize: '13px',
        fontWeight: 600,
        color: '#1b5e20',
        marginBottom: '12px',
    },
    studentMeta: {
        display: 'flex',
        gap: '24px',
        marginTop: '8px',
    },
    metaItem: {
        textAlign: 'center',
    },
    metaLabel: {
        fontSize: '10px',
        color: '#888',
        textTransform: 'uppercase',
        fontWeight: 600,
    },
    metaValue: {
        fontSize: '13px',
        fontWeight: 600,
        color: '#333',
    },
    credentialLink: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        marginTop: '16px',
        padding: '10px 14px',
        border: '1px solid #e0e0e0',
        borderRadius: '8px',
        cursor: 'pointer',
        '&:hover': {
            backgroundColor: '#f5f5f5',
        },
    },
    credentialIcon: {
        width: '24px',
        height: '24px',
        backgroundColor: '#1b5e20',
        borderRadius: '4px',
    },
    credentialText: {
        flex: 1,
    },
    credentialTitle: {
        fontSize: '13px',
        fontWeight: 600,
        color: '#333',
    },
    credentialSubtitle: {
        fontSize: '11px',
        color: '#888',
    },
    actionArrow: {
        color: '#ccc',
        fontSize: '16px',
    },
}));

const StudentCard = () => {
    const { classes } = useStyles();
    return (
        <div className={classes.studentCard}>
            <div className={classes.studentInfo}>
                <div className={classes.avatarContainer}>
                    <div className={classes.avatar} style={{ backgroundColor: '#ddd' }} />
                    <div className={classes.activeChip}>ACTIVA</div>
                </div>
                <div>
                    <div className={classes.studentLabel}>ESTUDIANTE</div>
                    <div className={classes.studentName}>Mariana García López</div>
                    <div className={classes.studentCareer}>Lic. en Actividad Física y Deporte</div>
                    <div className={classes.studentFaculty}>Facultad de Deportes</div>
                </div>
            </div>
            <div className={classes.studentMeta}>
                <div className={classes.metaItem}>
                    <div className={classes.metaLabel}>MATRÍCULA</div>
                    <div className={classes.metaValue}>01234567</div>
                </div>
                <div className={classes.metaItem}>
                    <div className={classes.metaLabel}>CAMPUS</div>
                    <div className={classes.metaValue}>Tijuana</div>
                </div>
                <div className={classes.metaItem}>
                    <div className={classes.metaLabel}>SEMESTRE</div>
                    <div className={classes.metaValue}>1°</div>
                </div>
            </div>
            <div className={classes.credentialLink}>
                <div className={classes.credentialIcon} />
                <div className={classes.credentialText}>
                    <div className={classes.credentialTitle}>Ver credencial digital</div>
                    <div className={classes.credentialSubtitle}>Acceso seguro con código QR</div>
                </div>
                <span className={classes.actionArrow}>›</span>
            </div>
        </div>
    );
};

export default StudentCard;
