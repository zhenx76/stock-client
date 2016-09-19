(function ()
{
    'use strict';

    angular
        .module('app.stock-selector', [])
        .config(config);

    /** @ngInject */
    function config($stateProvider, $translatePartialLoaderProvider, msApiProvider, msNavigationServiceProvider)
    {
        // State
        $stateProvider
            .state('app.stock-selector', {
                url    : '/stock-selector',
                views  : {
                    'content@app': {
                        templateUrl: 'app/main/stock-selector/stock-selector.html',
                        controller : 'StockSelectorController as vm'
                    }
                }
            });

        // Translation
        $translatePartialLoaderProvider.addPart('app/main/stock-selector');

        // Api
        msApiProvider.setBaseUrl('api/v1/');
        msApiProvider.register('stock-financial', [
            'stock-financial',
            {},
            {filter: {method: 'POST', isArray: true}}
        ]);

        // Navigation
        msNavigationServiceProvider.saveItem('stocks', {
            title : 'STOCKS',
            group : true,
            weight: 1
        });

        msNavigationServiceProvider.saveItem('stocks.sample', {
            title    : 'Nasdaq',
            icon     : 'icon-tile-four',
            state    : 'app.stock-selector',
            /*stateParams: {
                'param1': 'page'
             },*/
            translate: 'STOCKS.NASDAQ_NAV',
            weight   : 1
        });
    }
})();
