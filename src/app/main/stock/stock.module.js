(function ()
{
    'use strict';

    angular
        .module('app.stock', ['ngSanitize'])
        .config(config);

    /** @ngInject */
    function config($stateProvider, $translatePartialLoaderProvider, msApiProvider, msNavigationServiceProvider)
    {
        // State
        $stateProvider
            .state('app.stock-market', {
                url    : '/stock-market',
                views  : {
                    'content@app': {
                        templateUrl: 'app/main/stock/stock-market/stock-market.html',
                        controller : 'StockMarketController as vm'
                    }
                }
            })
            .state('app.stock-selector', {
                url    : '/stock-selector',
                views  : {
                    'content@app': {
                        templateUrl: 'app/main/stock/stock-selector/stock-selector.html',
                        controller : 'StockSelectorController as vm'
                    }
                }
            })
            .state('app.stock-financial', {
                url    : '/stock/:symbol',
                views  : {
                    'content@app': {
                        templateUrl: 'app/main/stock/stock-financial/stock-financial.html',
                        controller : 'StockFinancialController as vm'
                    }
                },
                resolve  : {
                    Stock: function(msApi, $stateParams)
                    {
                        var symbol = $stateParams.symbol;
                        return msApi.resolve('stock@get', {symbol: symbol});
                    }
                }
            });

        // Translation
        $translatePartialLoaderProvider.addPart('app/main/stock/stock-selector');

        // Api
        msApiProvider.setBaseUrl('api/v1/');
        msApiProvider.register('stock-financial', [
            'stock-financial',
            {},
            {filter: {method: 'POST', isArray: true}}
        ]);
        msApiProvider.register('stock', [
            'stock/:symbol',
            {symbol: '@symbol'}
        ]);
        msApiProvider.register('watchList', ['portfolio/watchlist']);

        // Navigation
        msNavigationServiceProvider.saveItem('stocks', {
            title : 'STOCKS',
            group : true,
            weight: 1
        });

        msNavigationServiceProvider.saveItem('stocks.market', {
            title    : 'Stock Market',
            icon     : 'icon-tile-four',
            state    : 'app.stock-market',
            translate: 'STOCKS.MARKET',
            weight   : 1
        });

        msNavigationServiceProvider.saveItem('stocks.selector', {
            title    : 'Stock Screener',
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
