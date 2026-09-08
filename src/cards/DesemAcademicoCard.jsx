import { useState } from 'react';
import PropTypes from 'prop-types';
import {
    Button,
    makeStyles,
    Typography
} from '@ellucian/react-design-system/core';
import { useCardControl } from '@ellucian/experience-extension-utils';
// import { useCardControl, useData, useCardInfo } from '@ellucian/experience-extension-utils';
// import { fetchResumen } from '../data/resumenData';
// import { ESTUDIANTE } from '../data/datosDemo';

// ────────────────────────────────────────────────────────────────────
// IMPORTANTE — Configuración en TARJETAS (Ellucian Experience)
//
// En la PÁGINA, useCardInfo() sí entrega la configuración:
//     const { cardConfiguration } = useCardInfo();   // funciona
//
// En la TARJETA del tablero, en cambio, cardConfiguration llega UNDEFINED
// (se revisó también cardInfo.configuration y las props del componente:
// ninguna trae los valores). Por eso una tarjeta que necesite consultar un
// pipeline debe llevar el nombre del pipeline como constante de respaldo.
//
// Regla para futuras tarjetas:
//   1. Intentar leer la configuración (por si en alguna versión sí llega).
//   2. Si no llega, usar una constante con el nombre del pipeline.
//   3. Nunca dejar el error en silencio: registrar en consola la causa
//      (sin Ethos / sin pipeline / sin datos) o la tarjeta se queda vacía
//      sin explicación.
//
// Esto NO compromete la seguridad: la llamada sigue pasando por
// authenticatedEthosFetch con el token de Experience; el nombre del
// pipeline por sí solo no da acceso a nada.
// ────────────────────────────────────────────────────────────────────
// const PIPELINE_DESEMPENO_POR_DEFECTO = 'get-desempenoacademico';

// Reglas de validación de la matrícula.
const MIN_DIGITOS = 6;
const MAX_DIGITOS = 10;

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
    desc: { color: '#6E6E6E', fontSize: 13, maxWidth: 260 },
    input: {
        width: '100%',
        maxWidth: 240,
        padding: '8px 12px',
        border: '1px solid #C9CDD2',
        borderRadius: 8,
        fontSize: 14,
        textAlign: 'center',
        outline: 'none'
    },
    inputError: { borderColor: '#C0392B' },
    error: { color: '#C0392B', fontSize: 12, margin: 0 }
});

const Dato = ({ etiqueta, valor, classes }) => (
    <div>
        <div className={classes.etiqueta}>{etiqueta}</div>
        <div className={classes.valor}>{valor || '\u00A0'}</div>
    </div>
);
Dato.propTypes = { etiqueta: PropTypes.string, valor: PropTypes.string, classes: PropTypes.object };

const DesempenoAcademicoCard = () => {
    
    const { classes } = useStyles();
    const { navigateToPage } = useCardControl();
    const [matricula, setMatricula] = useState('');
    const [tocado, setTocado] = useState(false);

    const esValida = (m) => m.length >= MIN_DIGITOS && m.length <= MAX_DIGITOS;
    const valida = esValida(matricula);
    const mostrarError = tocado && matricula.length > 0 && !valida;

    const onChange = (e) => {
        // Solo dígitos, máximo MAX_DIGITOS caracteres
        const limpio = e.target.value.replace(/\D/g, '').slice(0, MAX_DIGITOS);
        setMatricula(limpio);
    };

    const abrir = () => {
        setTocado(true);
        if (!esValida(matricula)) return;
        navigateToPage({ route: `/DesempenoAcademico/${matricula}` });
    };

    return (
        <div className={classes.root}>
            <Typography variant="h4" style={{ margin: 0 }}>
                Desempeño Académico
            </Typography>
            <Typography className={classes.desc}>
                Ingresa la matrícula del estudiante para ver su Desempeño Académico.
            </Typography>
            <input
                className={`${classes.input} ${mostrarError ? classes.inputError : ''}`}
                type="text"
                inputMode="numeric"
                value={matricula}
                onChange={onChange}
                onBlur={() => setTocado(true)}
                onKeyDown={(e) => { if (e.key === 'Enter') abrir(); }}
                placeholder="Matrícula"
                aria-label="Matrícula"
                maxLength={MAX_DIGITOS}
            />
            {mostrarError ? (
                <Typography className={classes.error}>
                    La matrícula debe tener entre {MIN_DIGITOS} y {MAX_DIGITOS} dígitos.
                </Typography>
            ) : null}
            <Button onClick={abrir} disabled={!valida}>
                Ver Desempeño Académico
            </Button>
        </div>
    );
};

DesempenoAcademicoCard.propTypes = {
    classes: PropTypes.object,
    data: PropTypes.object
};

export default DesempenoAcademicoCard;
