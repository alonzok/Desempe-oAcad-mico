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

const tabs = ['Resumen', 'Credencial', 'Historia académica', 'Servicios'];

function periodoLegible(cod) {
    const s = String(cod || '');
    const m = s.match(/^(\d{4})(\d{2})$/);
    if (!m) return s;
    const ciclo = {
        '10': '1',
        '15': '4',
        '20': '2',
        '25': '5',
        '30': '3',
        '41': '6',
        '42': '7',
        '43': '8'
    }[m[2]] || String(parseInt(m[2], 10));
    return `${m[1]}-${ciclo}`;
}

const TabsNav = ({ tabActiva, setTabActiva, datos }) => {
    const { classes } = useStyles();
    const cursosKey = Object.keys(datos.resultado)
    const periodo = periodoLegible(datos.resultado[cursosKey[0]].Periodo)

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
                <span className={classes.periodoLabel}>Periodo {periodo}</span>
            </div>
        </div>
    );
};

export default TabsNav;
