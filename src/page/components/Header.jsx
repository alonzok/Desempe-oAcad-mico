import { makeStyles, Typography } from '@ellucian/react-design-system/core';

const useStyles = makeStyles()(() => ({
    header: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '24px',
        padding: '16px 24px',
        backgroundColor: '#1b5e20',
        borderRadius: '8px',
        color: '#fff',
    },
    headerLeft: {
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
    },
    universityLogo: {
        width: '48px',
        height: '48px',
        borderRadius: '50%',
        backgroundColor: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        color: '#fff',
    },
    headerSubtitle: {
        color: '#c8e6c9',
        fontSize: '14px',
    },
    universityName: {
        color: '#fdd835',
        fontSize: '12px',
        fontStyle: 'italic',
        marginBottom: '4px',
    },
    headerRight: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
    },
    userBadge: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        backgroundColor: 'rgba(255,255,255,0.15)',
        padding: '6px 12px',
        borderRadius: '20px',
    },
}));

const Header = () => {
    const { classes } = useStyles();

    return (
        <div className={classes.header}>
            <div className={classes.headerLeft}>
                <div className={classes.universityLogo}>
                    <span style={{ fontSize: '20px' }}>🏛️</span>
                </div>
                <div>
                    <div className={classes.universityName}>Universidad Autónoma de Baja California</div>
                    <Typography variant="h3" className={classes.headerTitle}>
                        Hola, Mariana
                    </Typography>
                    <div className={classes.headerSubtitle}>Tu vida universitaria, clara y en un solo lugar.</div>
                </div>
            </div>
            <div className={classes.headerRight}>
                <div className={classes.userBadge}>
                    <span style={{ fontSize: '14px', color: '#fff' }}>Mariana García</span>
                    <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        backgroundColor: '#c8e6c9',
                    }} />
                </div>
            </div>
        </div>
    );
};

export default Header;
