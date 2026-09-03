import PropTypes from 'prop-types';
import { CircularProgress, Typography } from '@ellucian/react-design-system/core';

// ────────────────────────────────────────────────────────────────────
// Indicador de carga (mismo patrón que la tarjeta de NRC).
//
// Se usa como capa encima del contenido: mientras `activo` es true,
// atenúa lo que hay debajo y muestra el spinner con un texto opcional.
//
// Uso:
//   <div style={{ position: 'relative' }}>
//       <LoadingOverlay activo={cargando} texto="Cargando historial..." />
//       ...contenido...
//   </div>
// ────────────────────────────────────────────────────────────────────
const LoadingOverlay = ({ activo, texto, minAlto }) => {
    if (!activo) return null;

    return (
        <div
            aria-busy="true"
            aria-live="polite"
            style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                minHeight: minAlto,
                zIndex: 10,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 12,
                backgroundColor: 'rgba(255, 255, 255, 0.72)'
            }}
        >
            <CircularProgress aria-label={texto || 'Cargando'} aria-valuetext={texto || 'Cargando'} />
            {texto ? (
                <Typography style={{ fontSize: 13, color: '#4A4A4A' }}>{texto}</Typography>
            ) : null}
        </div>
    );
};

LoadingOverlay.propTypes = {
    activo: PropTypes.bool,
    texto: PropTypes.string,
    minAlto: PropTypes.number
};

export default LoadingOverlay;
