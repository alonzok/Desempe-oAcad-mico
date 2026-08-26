import { useState } from 'react';
import { makeStyles } from '@ellucian/react-design-system/core';
import { usePageControl } from '@ellucian/experience-extension-utils';

import Header from './components/Header';
import TabsNav from './components/TabsNav';
import StudentCard from './components/StudentCard';
import PerformanceCard from './components/PerformanceCard';
import ActionsCard from './components/ActionsCard';
import AcademicSection from './components/AcademicSection';

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
    const [periodoSeleccionado, setPeriodoSeleccionado] = useState('2026-2');
    const [tabActiva, setTabActiva] = useState(0);

    setPageTitle('Desempeño Académico');

    return (
        <div className={classes.root}>
            <Header />
            <TabsNav tabActiva={tabActiva} setTabActiva={setTabActiva} />

            <div className={classes.mainGrid}>
                <StudentCard />
                <PerformanceCard />
                <ActionsCard />
            </div>

            <AcademicSection
                periodoSeleccionado={periodoSeleccionado}
                setPeriodoSeleccionado={setPeriodoSeleccionado}
            />
        </div>
    );
};

export default HomePage;
