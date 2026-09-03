import { Typography } from '@ellucian/react-design-system/core';
import { Panel, Rotulo } from '../components/UI';
import CredencialDigital from '../components/CredencialDigital';
import { COLORES } from '../../data/datosDemo';

// ────────────────────────────────────────────────────────────────────
// Enlace a la extensión CredencialDigital (CGIB)
//
// La credencial ya se muestra embebida arriba, así que este enlace es
// solo una salida alterna: abre la extensión original, por si el usuario
// prefiere verla a pantalla completa.
//
// El SDK no permite abrir la página de otra extensión con navigateToPage,
// por eso se navega la ventana superior (la página vive en un iframe).
// La ruta incluye el tenant y el id de la tarjeta: hay que cambiarla al
// pasar de pruebas a producción.
// ────────────────────────────────────────────────────────────────────
const URL_CREDENCIAL_DIGITAL =
    'https://experience-test.elluciancloud.com/uabcsaastest/page/001G000000oSiUpIAK/CGIB/CredencialDigital/CredencialDigitalCard/Home';

const abrirEnPantallaCompleta = () => {
    if (!URL_CREDENCIAL_DIGITAL) return;
    try {
        window.top.location.href = URL_CREDENCIAL_DIGITAL;
    } catch {
        window.location.href = URL_CREDENCIAL_DIGITAL;
    }
};

const CredencialTab = () => (
    <div>
        {/* Credencial oficial embebida. */}
        <CredencialDigital />

        <Panel estilo={{ marginTop: '1rem' }}>
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 16,
                    flexWrap: 'wrap'
                }}
            >
                <div style={{ minWidth: 0 }}>
                    <Rotulo color={COLORES.verdeTexto}>Credencial digital</Rotulo>
                    <Typography style={{ fontSize: 13, color: COLORES.textoSuave, lineHeight: 1.5 }}>
                        Preséntala en biblioteca, laboratorios y accesos del campus.
                    </Typography>
                </div>

                <button
                    type="button"
                    onClick={abrirEnPantallaCompleta}
                    style={{
                        background: 'none',
                        border: `1px solid ${COLORES.verde}`,
                        color: COLORES.verde,
                        borderRadius: 8,
                        padding: '10px 18px',
                        fontSize: 13,
                        fontWeight: 700,
                        cursor: 'pointer',
                        whiteSpace: 'nowrap'
                    }}
                >
                    Ver en pantalla completa
                </button>
            </div>
        </Panel>
    </div>
);

export default CredencialTab;
