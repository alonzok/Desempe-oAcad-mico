import { makeStyles } from '@ellucian/react-design-system/core';

// ────────────────────────────────────────────────────────────────────
// Animaciones compartidas: entrada escalonada y esqueleto de carga.
//
// Todos los números viven aquí. Si mañana se quiere más lento, más sutil
// o sin movimiento, se cambia en un solo lugar y aplica igual a la
// tarjeta del tablero y a la página.
//
// Por qué makeStyles y no estilos en línea: las media queries no existen
// en el atributo style, y `prefers-reduced-motion` es una media query.
// Sin ella, quien configuró su sistema para reducir movimiento vería la
// animación de todas formas.
// ────────────────────────────────────────────────────────────────────

export const ENTRADA = {
    // Píxeles que sube cada bloque al entrar.
    desplazamiento: 8,
    // Lo que tarda cada bloque.
    duracion: 260,
    // Espera entre un bloque y el siguiente. Con cuatro bloques, la
    // secuencia completa cierra en 3 * 70 + 260 = 470 ms.
    desfase: 70,
    // Arranca rápido y frena suave. Sin rebote: el rebote llama la
    // atención sobre la animación en lugar de sobre el contenido.
    curva: 'cubic-bezier(0.22, 0.61, 0.36, 1)'
};

// El turno de cada bloque viaja como variable CSS, así basta con una
// regla para todos en lugar de una por bloque.
//
//   <div className={clases.bloque} style={orden(2)}>
//
// Se pasa como texto a propósito: React le agrega "px" a los números en
// algunas propiedades, y aquí lo que se necesita es el número pelón.
export const orden = (turno) => ({ '--da-orden': String(turno) });

// ── Transición al cambiar de programa ───────────────────────────────
// El contenido que depende del programa sale hacia la izquierda, se
// actualizan los datos y el nuevo entra desde la derecha.
//
// El desplazamiento es de 24 px y no del ancho completo a propósito: 24 px
// es justo el padding lateral del panel blanco, así que el contenido llega
// al borde del panel y no se asoma fuera. Con el 100% del ancho (lo que
// hace Animate.css) aparecería scroll horizontal durante la transición.
export const TRANSICION = {
    desplazamiento: 24,
    salida: 160,
    // Lo que tarda la entrada completa: el último de los tres bloques
    // arranca a los 2 desfases y dura lo mismo que la entrada normal.
    get entradaTotal() {
        return 2 * ENTRADA.desfase + ENTRADA.duracion;
    },
    // Al salir acelera (ease-in): el contenido "se va". Al entrar usa la
    // misma curva que el resto para que se sienta de la misma familia.
    curvaSalida: 'cubic-bezier(0.4, 0, 1, 1)',

    // La cabecera verde del horario cambia de materia con el mismo gesto,
    // pero más corto: es un intercambio de texto dentro de un recuadro que
    // no se mueve, no un cambio de sección completa.
    cabecera: { salida: 140, entrada: 200 }
};

// ── Microinteracciones de una opción seleccionable ──────────────────
// Las comparten las materias del horario y los botones de programa del
// Resumen: mismo lenguaje, un solo lugar donde ajustarlo.
// El scale de la seleccionada tiene que caber en el hueco que ya existe
// entre tarjetas: van con left/right de 4 px y 3 px arriba y abajo. Con
// 1.02, una tarjeta de 124x68 crece 1.24 px por lado y 0.68 px arriba y
// abajo, así que no toca a sus vecinas ni la recorta el overflow de la
// tabla. Con 1.03 ya serían 1.86 px, todavía dentro, pero se nota más el
// zoom y por eso se quedó en 1.02.
export const TARJETA = {
    escalaSeleccionada: 1.02,
    hover: 200,
    seleccion: 240
};

// ── Navbar ──────────────────────────────────────────────────────────
// Aquí el protagonista es el tamaño, no el brillo: crece al pasar el
// mouse y se hunde un poco al presionar. El subrayado es UNO SOLO que
// viaja de una pestaña a otra, por eso su posición se mide y se anima con
// transform en lugar de pintar un borde por pestaña.
export const NAVBAR = {
    // Cuánto se levanta la opción al pasar el mouse y cuánto se hunde al
    // presionar. Es desplazamiento, no escala: escalar texto lo deja
    // borroso, porque el navegador lo rasteriza a su tamaño real y luego
    // estira ese mapa de píxeles. El realce que sí crece es el fondo, que
    // no lleva letra y puede escalarse sin perder nitidez.
    levanta: 2,
    hunde: 1,
    escalaRealce: 0.88,
    transicion: 180,
    subrayado: 280,
    altoSubrayado: 3
};

// Quien pidió menos movimiento no ve transición: los datos cambian y ya.
export const sinMovimiento = () =>
    typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export const useEstilosAnimacion = makeStyles()({
    // Bloque que aparece deslizándose un poco hacia arriba.
    bloque: {
        '@keyframes daEntrada': {
            from: { opacity: 0, transform: `translateY(${ENTRADA.desplazamiento}px)` },
            to: { opacity: 1, transform: 'none' }
        },
        // 'both' mantiene el estado inicial durante la espera: sin esto,
        // el bloque se vería completo y de golpe desaparecería para
        // volver a entrar.
        animation: `daEntrada ${ENTRADA.duracion}ms ${ENTRADA.curva} both`,
        animationDelay: `calc(var(--da-orden, 0) * ${ENTRADA.desfase}ms)`,
        '@media (prefers-reduced-motion: reduce)': {
            animation: 'none',
            opacity: 1,
            transform: 'none'
        }
    },

    // Salida hacia la izquierda del contenido del programa anterior.
    salidaIzquierda: {
        '@keyframes daSalidaIzquierda': {
            from: { opacity: 1, transform: 'none' },
            to: { opacity: 0, transform: `translateX(-${TRANSICION.desplazamiento}px)` }
        },
        animation: `daSalidaIzquierda ${TRANSICION.salida}ms ${TRANSICION.curvaSalida} both`,
        // Mientras sale ya no se puede tocar: lo que muestra es el programa
        // anterior, no el que se acaba de pedir.
        pointerEvents: 'none',
        '@media (prefers-reduced-motion: reduce)': {
            animation: 'none',
            opacity: 1,
            transform: 'none'
        }
    },

    // Entrada desde la derecha del contenido del programa nuevo. Conserva
    // el escalonado: cada zona entra en su turno, con el mismo desfase.
    entradaDerecha: {
        '@keyframes daEntradaDerecha': {
            from: { opacity: 0, transform: `translateX(${TRANSICION.desplazamiento}px)` },
            to: { opacity: 1, transform: 'none' }
        },
        animation: `daEntradaDerecha ${ENTRADA.duracion}ms ${ENTRADA.curva} both`,
        animationDelay: `calc(var(--da-orden, 0) * ${ENTRADA.desfase}ms)`,
        '@media (prefers-reduced-motion: reduce)': {
            animation: 'none',
            opacity: 1,
            transform: 'none'
        }
    },

    // Cabecera verde del horario: mismo gesto que el cambio de programa,
    // con una duración más corta. Reutiliza los @keyframes declarados
    // arriba en salidaIzquierda y entradaDerecha.
    salidaCabecera: {
        animation: `daSalidaIzquierda ${TRANSICION.cabecera.salida}ms ${TRANSICION.curvaSalida} both`,
        pointerEvents: 'none',
        '@media (prefers-reduced-motion: reduce)': {
            animation: 'none',
            opacity: 1,
            transform: 'none'
        }
    },

    entradaCabecera: {
        animation: `daEntradaDerecha ${TRANSICION.cabecera.entrada}ms ${ENTRADA.curva} both`,
        '@media (prefers-reduced-motion: reduce)': {
            animation: 'none',
            opacity: 1,
            transform: 'none'
        }
    },

    // ── Tarjeta del horario ─────────────────────────────────────────
    // Hover: "esto se puede tocar". Un anillo del color de la materia y
    // una sombra corta; nada de movimiento ni de tamaño, para no empujar
    // a las vecinas. El color sale de --da-borde, que la tarjeta pone en
    // línea porque cada materia tiene el suyo.
    opcionHover: {
        transition: [
            `box-shadow ${TARJETA.hover}ms ease-out`,
            `filter ${TARJETA.hover}ms ease-out`,
            `transform ${TARJETA.seleccion}ms ${ENTRADA.curva}`
        ].join(', '),
        '&:hover': {
            // La sombra se queda en 4 px de difuminado: es justo el hueco
            // que hay hasta el borde de la tabla, que recorta por tener
            // overflow hidden para sus esquinas redondeadas.
            boxShadow: '0 0 0 1px var(--da-borde, rgba(0,0,0,0.12)), 0 1px 4px rgba(17, 60, 40, 0.14)',
            filter: 'brightness(1.03)'
        },
        '&:focus-visible': {
            boxShadow: '0 0 0 2px var(--da-borde, rgba(0,0,0,0.35))'
        },
        '@media (prefers-reduced-motion: reduce)': {
            transition: 'none'
        }
    },

    // Seleccionada: "esta es la que estoy consultando". Anillo más marcado
    // y un crecimiento apenas perceptible. Va después de opcionHover a
    // propósito: al declararse más abajo, sus reglas de hover ganan y los
    // dos efectos no se suman.
    opcionSeleccionada: {
        transform: `scale(${TARJETA.escalaSeleccionada})`,
        // Por encima de las vecinas, para que el crecimiento no quede
        // tapado por la de al lado. La tarjeta del horario ya va absoluta y
        // su position en línea gana; el botón de programa necesita este
        // relative para que el z-index tenga efecto.
        position: 'relative',
        zIndex: 3,
        boxShadow: '0 0 0 2px var(--da-borde, rgba(0,0,0,0.35)), 0 2px 6px rgba(17, 60, 40, 0.16)',
        '&:hover': {
            transform: `scale(${TARJETA.escalaSeleccionada})`,
            boxShadow: '0 0 0 2px var(--da-borde, rgba(0,0,0,0.35)), 0 2px 6px rgba(17, 60, 40, 0.16)',
            filter: 'brightness(1.03)'
        },
        // Sin movimiento: el anillo de 2 px basta para reconocer cuál está
        // seleccionada, así que se pierde el scale y no la información.
        '@media (prefers-reduced-motion: reduce)': {
            transform: 'none',
            '&:hover': { transform: 'none' }
        }
    },

    // Opción del navbar: hundido al presionar. El crecimiento al pasar el
    // mouse va en la clase de abajo, porque solo aplica a las inactivas.
    opcionNavbar: {
        position: 'relative',
        transition: `transform ${NAVBAR.transicion}ms ${ENTRADA.curva}`,

        // Realce detrás del texto. El bottom deja libres los 3 px del
        // subrayado para que el fondo no se le encime.
        '&::before': {
            content: '""',
            position: 'absolute',
            top: 2,
            left: 2,
            right: 2,
            bottom: 5,
            borderRadius: 8,
            background: 'var(--da-realce, rgba(15, 92, 63, 0.08))',
            opacity: 0,
            transform: `scale(${NAVBAR.escalaRealce})`,
            transition: [
                `opacity ${NAVBAR.transicion}ms ${ENTRADA.curva}`,
                `transform ${NAVBAR.transicion}ms ${ENTRADA.curva}`
            ].join(', '),
            pointerEvents: 'none',
            zIndex: -1
        },

        '&:active': { transform: `translateY(${NAVBAR.hunde}px)` },

        '@media (prefers-reduced-motion: reduce)': {
            transition: 'none',
            '&::before': { transition: 'none', transform: 'none' },
            '&:hover': { transform: 'none' },
            '&:active': { transform: 'none' }
        }
    },

    // La pestaña activa no reacciona al mouse: el subrayado no la acompaña
    // y el texto se despegaría de su propia línea.
    opcionNavbarInactiva: {
        '&:hover': { transform: `translateY(-${NAVBAR.levanta}px)` },
        '&:hover::before': { opacity: 1, transform: 'scale(1)' },
        '@media (prefers-reduced-motion: reduce)': {
            '&:hover': { transform: 'none' },
            '&:hover::before': { transform: 'none' }
        }
    },

    // El subrayado que viaja. Se posiciona con transform para que el
    // desplazamiento no recalcule el layout de la barra.
    subrayadoNavbar: {
        position: 'absolute',
        top: 0,
        left: 0,
        height: NAVBAR.altoSubrayado,
        borderRadius: '2px 2px 0 0',
        pointerEvents: 'none',
        transition: [
            `transform ${NAVBAR.subrayado}ms ${ENTRADA.curva}`,
            `width ${NAVBAR.subrayado}ms ${ENTRADA.curva}`
        ].join(', '),
        '@media (prefers-reduced-motion: reduce)': {
            transition: 'none'
        }
    },

    // Bloque gris que ocupa el lugar de un dato mientras carga.
    hueso: {
        '@keyframes daLatido': {
            from: { opacity: 0.45 },
            to: { opacity: 0.9 }
        },
        backgroundColor: '#D8DEE3',
        borderRadius: 6,
        animation: 'daLatido 1100ms ease-in-out infinite alternate',
        '@media (prefers-reduced-motion: reduce)': {
            animation: 'none',
            opacity: 0.7
        }
    }
});
