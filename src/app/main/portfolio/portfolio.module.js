(function ()
{
    'use strict';

    angular
        .module('app.portfolio', [])
        .config(config);

    /** @ngInject */
    function config($stateProvider, msApiProvider, msNavigationServiceProvider)
    {
        // State
        $stateProvider
            .state('app.watch-list', {
                url    : '/watch-list',
                views  : {
                    'content@app': {
                        templateUrl: 'app/main/portfolio/watch-list/watch-list.html',
                        controller : 'WatchListController as vm'
                    }
                },
                data   : {
                    'requireAuthentication': true
                }
            })
            .state('app.stock-monitor', {
                url    : '/stock-monitor/:symbol',
                views  : {
                    'content@app': {
                        templateUrl: 'app/main/portfolio/stock-monitor/stock-monitor.html',
                        controller : 'StockMonitorController as vm'
                    }
                },
                data   : {
                    'requireAuthentication': true
                },
                resolve  : {
                    Stock: function(msApi, $stateParams)
                    {
                        var symbol = $stateParams.symbol;
                        return msApi.resolve('stock-portfolio@get', {symbol: symbol});
                    }
                }
            });

        // Api
        msApiProvider.setBaseUrl('api/v1/');
        msApiProvider.register('watchList', ['portfolio/watchlist']);
        msApiProvider.register('stock-portfolio', [
            'portfolio/stock/:symbol',
            {symbol: '@symbol'}
        ]);
        msApiProvider.register('update', ['portfolio/update']);

        // Navigation
        msNavigationServiceProvider.saveItem('stocks.watch-list', {
            title    : 'Watch List',
            icon     : 'icon-heart',
            state    : 'app.watch-list',
            /*stateParams: {
             'param1': 'page'
             },*/
            weight   : 1
        });
    }
})();
