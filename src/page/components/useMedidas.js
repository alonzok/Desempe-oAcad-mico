import { useEffect, useRef, useState } from 'react';

// ────────────────────────────────────────────────────────────────────
// Medidas del contenedor.
//
// La extensión corre dentro de un iframe de Experience, así que el ancho
// que importa es el del propio elemento y no el de la pantalla. Estos dos
// hooks devuelven esa medida real: uno para dibujar a escala 1:1 (sin
// estirar un viewBox fijo) y otro para decidir el acomodo en pantallas
// angostas.
// ────────────────────────────────────────────────────────────────────

// Ancho en píxeles del elemento al que se le pase la referencia.
export function useAnchoDe() {
    const ref = useRef(null);
    const [ancho, setAncho] = useState(0);

    useEffect(() => {
        const nodo = ref.current;
        if (!nodo) return undefined;

        const medir = () => setAncho(nodo.getBoundingClientRect().width);
        medir();

        // ResizeObserver detecta también los cambios que no vienen de un
        // resize de ventana (por ejemplo, al abrir un periodo del kardex,
        // que puede hacer aparecer la barra de scroll y robar ancho).
        const Observador = window.ResizeObserver;
        if (!Observador) {
            window.addEventListener('resize', medir);
            return () => window.removeEventListener('resize', medir);
        }
        const observador = new Observador(medir);
        observador.observe(nodo);
        return () => observador.disconnect();
    }, []);

    return [ref, ancho];
}

// true cuando la ventana no pasa del límite: teléfono, o el navegador en
// vista de dispositivo móvil.
export function useEsAngosto(limite = 720) {
    // Se resuelve ya en el primer render: si se arrancara en false, en un
    // teléfono se vería un parpadeo con el acomodo de escritorio.
    const [angosto, setAngosto] = useState(
        () => typeof window !== 'undefined'
            && typeof window.matchMedia === 'function'
            && window.matchMedia(`(max-width: ${limite}px)`).matches
    );

    useEffect(() => {
        const consulta = window.matchMedia(`(max-width: ${limite}px)`);
        const alCambiar = (evento) => setAngosto(evento.matches);

        setAngosto(consulta.matches);

        // addEventListener es lo actual; addListener sigue haciendo falta
        // en algunos navegadores de Android.
        if (consulta.addEventListener) {
            consulta.addEventListener('change', alCambiar);
            return () => consulta.removeEventListener('change', alCambiar);
        }
        consulta.addListener(alCambiar);
        return () => consulta.removeListener(alCambiar);
    }, [limite]);

    return angosto;
}
