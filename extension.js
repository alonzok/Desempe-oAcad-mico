module.exports = {
    name: 'DesemAcademico',
    publisher: 'Akuang',
    cards: [{
        type: 'DesemAcademicoCard',
        source: './src/cards/DesemAcademicoCard',
        title: 'Desempeño Académico',
        displayCardType: 'DesemAcademico Card',
        description: 'Tarjeta para Desempeño Académico',
        pageRoute: {
            route: '/',
            excludeClickSelectors: ['a']
        },
        configuration: {
            client: [
                // Pipelines del historial académico: uno por categoría.
                // Se consultan en paralelo y se combinan en la pestaña
                // "Historia académica". Basta configurar los que apliquen.
                {
                    key: 'historialPipelineLicenciatura',
                    label: 'Pipeline kardex — Licenciatura',
                    type: 'text',
                    required: false
                },
                {
                    key: 'historialPipelinePosgrado',
                    label: 'Pipeline kardex — Posgrado',
                    type: 'text',
                    required: false
                },
                {
                    key: 'historialPipelineLenguas',
                    label: 'Pipeline kardex — Lenguas Extranjeras',
                    type: 'text',
                    required: false
                }
                ,{
                    // Pestaña Resumen: calificaciones y asistencia por curso.
                    key: 'desempenoPipeline',
                    label: 'Pipeline desempeño académico',
                    type: 'text',
                    required: false
                },
                {
                    // Pestaña Resumen: sección de adeudos pendientes.
                    key: 'adeudosPipeline',
                    label: 'Pipeline adeudos pendientes',
                    type: 'text',
                    required: false
                },
                {
                    // Pestaña Credencial: devuelve el correo institucional a
                    // partir del Banner ID; de ahí sale el usuario con el que
                    // se arma la credencial digital.
                    key: 'emailPipeline',
                    label: 'Pipeline correo institucional',
                    type: 'text',
                    required: false
                }
            ],
            server: [
                {
                    key: 'ethosApiKey',
                    label: 'Ethos API Key',
                    type: 'password',
                    required: true
                }
            ]
        }
    }],
    page: {
        source: './src/page/router.jsx',
        applyCardRoles: true
    }
};