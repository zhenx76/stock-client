(function ()
{
    'use strict';

    angular
        .module('app.portfolio', ['ngSanitize'])
        .config(config)
        .service('PortfolioService', portfolioService);

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
            .state('app.stock-positions', {
                url    : '/stock-positions',
                views  : {
                    'content@app': {
                        templateUrl: 'app/main/portfolio/stock-positions/stock-positions.html',
                        controller : 'StockPositionsController as vm'
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
        msApiProvider.register('positions', ['portfolio/positions']);
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

        msNavigationServiceProvider.saveItem('stocks.stock-positions', {
            title    : 'Positions',
            icon     : 'icon-bank',
            state    : 'app.stock-positions',
            /*stateParams: {
             'param1': 'page'
             },*/
            weight   : 1
        });
    }

    /** @ngInject */
    function portfolioService($q, $log, msApi, AuthService) {
        function removeFavoriteStock(symbol) {
            return $q(function(resolve, reject) {
                if (AuthService.isAuthenticated()) {
                    var user = undefined;
                    var i = 0;

                    AuthService.getMemberInfo()
                        .then(function (memberInfo) {
                            user = memberInfo;

                            for (i = 0; i < memberInfo.watch_list.length; i++) {
                                if (memberInfo.watch_list[i] == symbol) {
                                    break;
                                }
                            }

                            if (i == memberInfo.watch_list.length) {
                                // Symbol not in watch list. Do nothing
                                return $q.reject('cancel');
                            } else {
                                return msApi.resolve('watchList@delete', {symbol: symbol});
                            }
                        })
                        .then(function(result) {
                            if (result.success) {
                                // remove symbol from watch list
                                user.watch_list.splice(i, 1);
                                resolve();
                            } else {
                                return $q.reject(result.msg);
                            }
                        })
                        .catch(function (error) {
                            if (error != 'cancel') {
                                $log.error(error);
                            }
                            reject(error);
                        });
                } else {
                    reject('User not authenticated');
                }
            });
        }

        function addFavoriteStock(symbol) {
            return $q(function(resolve, reject) {
                if (AuthService.isAuthenticated()) {
                    var user = undefined;
                    AuthService.getMemberInfo()
                        .then(function(memberInfo) {
                            user = memberInfo;

                            for (var i = 0; i < memberInfo.watch_list.length; i++) {
                                if (memberInfo.watch_list[i] == symbol) {
                                    break;
                                }
                            }

                            if (i == memberInfo.watch_list.length) {
                                return msApi.resolve('watchList@save', {symbol: symbol});
                            } else {
                                // Already in watch list, no need to call server
                                return $q.reject('cancel');
                            }
                        })
                        .then(function(result) {
                            if (result.success) {
                                user.watch_list.push(symbol);
                                resolve();
                            } else {
                                return $q.reject(result.msg);
                            }
                        })
                        .catch(function(error) {
                            if (error != 'cancel') {
                                $log.error(error);
                            }
                            reject(error);
                        });
                } else {
                    reject('User not authenticated');
                }
            });
        }

        function isFavoriteStock(symbol) {
            return $q(function(resolve, reject) {
                if (AuthService.isAuthenticated()) {
                    var user = undefined;
                    AuthService.getMemberInfo()
                        .then(function (memberInfo) {
                            user = memberInfo;

                            for (var i = 0; i < memberInfo.watch_list.length; i++) {
                                if (memberInfo.watch_list[i] == symbol) {
                                    break;
                                }
                            }

                            if (i == memberInfo.watch_list.length) {
                                resolve(false);
                            } else {
                                // Already in watch list, no need to call server
                                resolve(true);
                            }
                        })
                        .catch(function (error) {
                            if (error != 'cancel') {
                                $log.error(error);
                            }
                            reject(error);
                        });
                } else {
                    reject('User not authenticated');
                }
            });
        }

        return {
            addFavoriteStock: addFavoriteStock,
            removeFavoriteStock: removeFavoriteStock,
            isFavoriteStock: isFavoriteStock
        };
    }
})();
