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
                {
                    key: 'DesemAcadPipeline',
                    label: 'Pipeline para obtener datos de desempeño académico',
                    type: 'text',
                    required: true
                },
                {
                    key: 'AdeudosPipeline',
                    label: 'Pipeline para obtener los adeudos del estudiante',
                    type: 'text',
                    required: true
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