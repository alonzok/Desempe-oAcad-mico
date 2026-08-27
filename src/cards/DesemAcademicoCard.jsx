import {
    Button,
    Typography,
    makeStyles
} from '@ellucian/react-design-system/core';
import { useCardControl } from '@ellucian/experience-extension-utils';

const useStyles = makeStyles()({
    root: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '1.25rem',
        gap: 10
    },
    avatar: {
        width: 56,
        height: 56,
        borderRadius: '50%',
        background: '#E6F4EC',
        color: '#1D7A4E',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 22,
        fontWeight: 700
    },
    desc: { color: '#6E6E6E', fontSize: 13, maxWidth: 240 }
});

const DesemAcademicoCard = () => {
    const { classes } = useStyles();
    const { navigateToPage } = useCardControl();

    return (
        <div className={classes.root}>
            <div className={classes.avatar}>HA</div>
            <Typography variant="h4" style={{ margin: 0 }}>
                Desempeño Académico
            </Typography>
            <Typography className={classes.desc}>
                Consulta tu desempeño durante el semestre
            </Typography>
            <Button onClick={() => navigateToPage({ route: '/' })}>
                Ver desempeño académico
            </Button>
        </div>
    );
};

export default DesemAcademicoCard;
