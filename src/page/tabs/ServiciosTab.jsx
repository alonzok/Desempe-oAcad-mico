import { Typography } from '@ellucian/react-design-system/core';
import { Panel, Rotulo } from '../components/UI';
import { COLORES, SERVICIOS } from '../../data/datosDemo';

const ServiciosTab = () => (
    <div>
        <Rotulo>Servicios</Rotulo>
        <Typography style={{ fontSize: 22, fontWeight: 700, color: COLORES.texto, marginBottom: 4 }}>
            Servicios para estudiantes
        </Typography>
        <Typography style={{ fontSize: 13, color: COLORES.textoSuave, marginBottom: '1rem' }}>
            Accesos rápidos a los trámites y apoyos disponibles.
        </Typography>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
            {SERVICIOS.map((servicio) => (
                <Panel key={servicio.titulo}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                        <div style={{ minWidth: 0 }}>
                            <Typography style={{ fontSize: 15, fontWeight: 700, color: COLORES.texto }}>
                                {servicio.titulo}
                            </Typography>
                            <Typography style={{ fontSize: 12, color: COLORES.textoSuave, marginTop: 2 }}>
                                {servicio.detalle}
                            </Typography>
                        </div>
                        <span style={{ color: COLORES.verde, fontSize: 18 }}>›</span>
                    </div>
                </Panel>
            ))}
        </div>
    </div>
);

export default ServiciosTab;
