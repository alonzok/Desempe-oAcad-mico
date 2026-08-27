import { useState, useEffect } from 'react';
import { usePageControl, useCardInfo, useData } from '@ellucian/experience-extension-utils';
import {
    Box,
    Typography,
    makeStyles,
    CircularProgress,
} from '@ellucian/react-design-system/core';


import Header from './components/Header';
import TabsNav from './components/TabsNav';
import StudentCard from './components/StudentCard';
import PerformanceCard from './components/PerformanceCard';
import ActionsCard from './components/ActionsCard';
import AcademicSection from './components/AcademicSection';

import { fetchDesempAcad } from './data/cursosData';

const useStyles = makeStyles()((theme) => ({
    root: {
        padding: '24px',
        backgroundColor: '#f9fafb',
        minHeight: '100vh',
        fontFamily: theme?.typography?.fontFamily || '"Inter", "Helvetica", "Arial", sans-serif',
    },
    mainGrid: {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr 1fr',
        gap: '20px',
        marginBottom: '32px',
    },
}));

const HomePage = () => {
    const { classes } = useStyles();
    const { setPageTitle } = usePageControl();
    const { authenticatedEthosFetch } = useData();
    const { cardConfiguration, cardId } = useCardInfo();
    const [tabActiva, setTabActiva] = useState(0);
    const [data, setData] = useState(null);
    const [error, setError] = useState(null);

    setPageTitle('Desempeño Académico');

    useEffect(() => {
        setData(null);
        setError(null);
        let cancelado = false;
        const cargarHistorial = async () => {
            const [desemAcad] = await Promise.allSettled([
                fetchDesempAcad({
                    authenticatedEthosFetch,
                    pipeline: cardConfiguration?.DesemAcadPipeline,
                    cardId,
                }).catch((e) => {
                    if (!cancelado) {
                        setError(e?.message || 'No se pudo cargar el historial');
                    }
                    return null;
                }),
            ]);
            if (cancelado) return;
            let datos;

            if (desemAcad.status === 'fulfilled') {
                datos = desemAcad.value;
            }

            if (!datos) {
                setError('La matrícula no existe.')
            } else {
                setData(datos)
            }

        };

        cargarHistorial();

        return () => {
            cancelado = true;
        };
    }, [
        authenticatedEthosFetch,
        cardConfiguration,
        cardId,
    ]);

    if (error) {
        return (
            <Box sx={{ p: 3 }}>
                <Typography variant="h4">Ocurrió un error</Typography>
                <Typography>Vuelve a intentar más tarde, si el error persiste, contacte a soporte técnico</Typography>
            </Box>
        );
    }

    if (!data) {
        return (
            <div style={{ top: '50%', position: 'absolute', left: '45%', justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
                <Typography>Cargando Desempeño Académico... </Typography>
                <CircularProgress aria-label="Validation in progress" thickness="6" />
            </div>
        );
    }

    return (
        <div className={classes.root}>
            <Header
                datos={data}
            />
            <TabsNav 
                tabActiva={tabActiva} 
                setTabActiva={setTabActiva}
                datos={data}
            />

            <div className={classes.mainGrid}>
                <StudentCard
                    datos={data}
                />
                <PerformanceCard 
                    datos={data}
                />
                <ActionsCard />
            </div>

            <AcademicSection
                datos={data}
            />
        </div>
    );
};

export default HomePage;
