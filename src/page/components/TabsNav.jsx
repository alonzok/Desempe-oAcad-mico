import { makeStyles } from '@ellucian/react-design-system/core';

const useStyles = makeStyles()(() => ({
    tabsContainer: {
        marginBottom: '24px',
        borderBottom: '1px solid #e0e0e0',
    },
    periodoLabel: {
        color: '#1b5e20',
        fontWeight: 600,
        fontSize: '14px',
    },
}));

const tabs = ['Resumen', 'Credencial', 'Desempeño', 'Historia académica', 'Servicios'];

const TabsNav = ({ tabActiva, setTabActiva }) => {
    const { classes } = useStyles();

    return (
        <div className={classes.tabsContainer}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: '24px' }} role="tablist">
                    {tabs.map((tab, i) => (
                        <span
                            key={tab}
                            role="tab"
                            tabIndex={0}
                            aria-selected={tabActiva === i}
                            onClick={() => setTabActiva(i)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    setTabActiva(i);
                                }
                            }}
                            style={{
                                padding: '12px 0',
                                fontSize: '14px',
                                fontWeight: tabActiva === i ? 600 : 400,
                                color: tabActiva === i ? '#333' : '#888',
                                borderBottom: tabActiva === i ? '2px solid #1b5e20' : '2px solid transparent',
                                cursor: 'pointer',
                            }}
                        >
                            {tab}
                        </span>
                    ))}
                </div>
                <span className={classes.periodoLabel}>Periodo 2026-2</span>
            </div>
        </div>
    );
};

export default TabsNav;
