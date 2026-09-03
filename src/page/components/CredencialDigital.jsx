/* global URLSearchParams */
import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Typography } from '@ellucian/react-design-system/core';
import { useUserInfo, useCardInfo, useData } from '@ellucian/experience-extension-utils';
import LoadingOverlay from './LoadingOverlay';
import { COLORES } from '../../data/datosDemo';

/**
 * Credencial digital oficial.
 *
 * Adaptado de la extensión CredencialDigital (CGIB). La credencial NO se
 * dibuja aquí: es una página de la UABC que se muestra embebida. El flujo es:
 *
 *   1. El Banner ID sale de los roles del usuario (el que empieza con "A000").
 *   2. Con ese Banner ID se consulta el pipeline de correo institucional.
 *   3. Del correo se toma la parte antes de la arroba: ese es el usuario.
 *   4. Ese usuario se manda como parámetro a la página de la credencial.
 *
 * DIFERENCIAS respecto al original (a propósito):
 *   - Se quitó la clase "iframe" con position:absolute y left:-620px. Ese
 *     recorte estaba hecho para pegar la credencial a la izquierda en
 *     móviles; aquí sacaría el contenido fuera del panel de la pestaña.
 *   - No se toca document.body.style.overflow: el original lo ponía en
 *     "hidden" para toda la página, lo que dejaría sin scroll al resto de
 *     las pestañas de esta tarjeta.
 *   - No se usa setPageTitle: esta página ya tiene su propio encabezado.
 */

const URL_CREDENCIAL = 'https://devalumnos.uabc.mx/web/alumnos/credencial-digital';

// Alto visible de la credencial dentro de la pestaña.
const ALTO = 790;

// Escala del contenido embebido. En 1 se muestra a tamaño normal; con un
// valor menor (0.8, por ejemplo) se ve más contenido a costa de tamaño.
// El ancho del iframe se compensa solo, así que la credencial siempre
// queda alineada con el panel: no hacen falta posiciones negativas.
const ESCALA = 1;

const CredencialDigital = () => {
    const { roles } = useUserInfo();
    const { cardConfiguration, cardId } = useCardInfo();
    const { authenticatedEthosFetch } = useData();

    const [usuario, setUsuario] = useState('');
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState(null);

    // El Banner ID del usuario que abre la tarjeta viene entre sus roles.
    // No hay que pedirlo ni pasarlo: sale de la sesión de Experience.
    const bannerId = (roles || []).find((r) => String(r).startsWith('A000'));

    useEffect(() => {
        let cancelado = false;
        const pipeline = cardConfiguration?.emailPipeline;

        if (!bannerId) {
            
            console.error('[Credencial digital] Sin Banner ID en los roles:', roles);
            setError('No se encontró el Banner ID del usuario.');
            setCargando(false);
            return undefined;
        }
        if (!authenticatedEthosFetch || !pipeline) {
            setError('Falta configurar el pipeline del correo institucional.');
            setCargando(false);
            return undefined;
        }

        setCargando(true);
        setError(null);

        (async () => {
            try {
                const parametros = new URLSearchParams({ cardId }).toString();
                const parametroBanner = new URLSearchParams({ bannerId }).toString();
                const ruta = `${pipeline}?${parametros}&${parametroBanner}`;

                const respuesta = await authenticatedEthosFetch(ruta, {
                    method: 'GET',
                    headers: { 'Content-type': 'application/json', 'Accept': 'application/json' }
                });

                if (!respuesta || respuesta.status !== 200) {
                    throw new Error(`El pipeline respondió ${respuesta ? respuesta.status : 'sin respuesta'}`);
                }

                const datos = await respuesta.json();

                // El correo puede venir directo ({ emailUsuario }) o dentro
                // de la envoltura de Ethos ({ data: [{ payload }] }). Al
                // llamar por Experience suele llegar directo, pero se
                // aceptan ambas formas.
                const contenido = datos?.data?.[0]?.payload || datos?.payload || datos;
                const correo = contenido?.emailUsuario;
                const nombreUsuario = String(correo || '').split('@')[0];

                if (cancelado) return;
                if (!nombreUsuario) {
                    setError('El pipeline no devolvió el correo institucional.');
                    return;
                }
                setUsuario(nombreUsuario);
            } catch (e) {
                if (cancelado) return;
                
                console.error('[Credencial digital]', e);
                setError('No se pudo obtener la credencial.');
            } finally {
                if (!cancelado) setCargando(false);
            }
        })();

        return () => { cancelado = true; };
    }, [authenticatedEthosFetch, cardConfiguration, cardId, bannerId, roles]);

    if (error) {
        return (
            <div
                style={{
                    border: `1px solid ${COLORES.linea}`,
                    borderRadius: 12,
                    padding: '2rem',
                    textAlign: 'center'
                }}
            >
                <Typography style={{ fontSize: 14, color: COLORES.textoSuave }}>{error}</Typography>
            </div>
        );
    }

    return (
        <div
            style={{
                position: 'relative',
                width: '100%',
                height: ALTO,
                overflow: 'hidden',
                border: `1px solid ${COLORES.linea}`,
                borderRadius: 12,
                background: '#FFFFFF'
            }}
        >
            <LoadingOverlay activo={cargando} texto="Cargando credencial digital..." />

            {usuario ? (
                <iframe
                    src={`${URL_CREDENCIAL}?param1=${encodeURIComponent(usuario)}`}
                    title="Credencial digital"
                    scrolling="no"
                    style={{
                        // El ancho se agranda en la misma proporción en que se
                        // reduce la escala, así el contenido llena el panel
                        // exactamente y no hace falta desplazarlo.
                        width: `${100 / ESCALA}%`,
                        height: ALTO / ESCALA,
                        border: 'none',
                        display: 'block',
                        transform: `scale(${ESCALA})`,
                        transformOrigin: 'top left'
                    }}
                />
            ) : null}
        </div>
    );
};

CredencialDigital.propTypes = { data: PropTypes.object };

export default CredencialDigital;
