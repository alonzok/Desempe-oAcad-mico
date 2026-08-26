module.exports = {
    name: 'DesemAcademico',
    publisher: 'Akuang',
    cards: [{
        type: 'DesemAcademicoCard',
        source: './src/cards/DesemAcademicoCard',
        title: 'DesemAcademico Card',
        displayCardType: 'DesemAcademico Card',
        description: 'Tarjeta para Desempeño Académico',
        pageRoute: {
            route: '/',
            excludeClickSelectors: ['a']
        }
    }],
    page: {
        source: './src/page/router.jsx',
        applyCardRoles: true
    }
};