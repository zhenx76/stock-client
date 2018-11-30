(function ()
{
    'use strict';

    angular
        .module('app.portfolio')
        .controller('WatchListController', WatchListController);

    /** @ngInject */
    function WatchListController(DTOptionsBuilder, DTColumnBuilder, msApi, $state, $compile, $scope, $filter, $timeout, AuthService, StockQuotes, $q, $log)
    {
        var vm = this;

        // Variables
        //////////

        vm.dtOptions = DTOptionsBuilder.fromFnPromise(getDataTablePromise)
            .withDOM('rt<"bottom"<"left"<"length"l>><"right"<"info"i><"pagination"p>>>')
            .withPaginationType('simple')
            .withOption('lengthMenu', [10, 20, 50, 100])
            .withOption('pageLength', 20)
            .withOption('scrollY', 'auto')
            .withOption('responsive', true)
            .withOption('order', [[0, 'asc'], [1, 'desc']])
            .withOption('createdRow', function(row) {
                // Recompiling so we can bind Angular directive to the DT
                $compile(angular.element(row).contents())($scope);
            })
            .withOption('initComplete', function() {
                var api = this.api();
                var searchBox = angular.element('body').find('#stock-symbol-search');

                // Bind an external input as a table wide search box
                if (searchBox.length > 0) {
                    searchBox.on('keyup', function (event) {
                        var symbol = event.target.value;
                        api.search(symbol).draw();
                    });
                }
            });

        vm.dtColumns = [
            DTColumnBuilder.newColumn('Symbol').withTitle('Symbol'),
            DTColumnBuilder.newColumn('Snapshot').withTitle('Price').renderWith(renderSnapshot),
            DTColumnBuilder.newColumn('CurrentQuarterGrowth').withTitle('% EPS<br />(This Quarter)').renderWith(renderDataColumn),
            DTColumnBuilder.newColumn('PreviousQuarterGrowth').withTitle('% EPS<br />(Last Quarter)').renderWith(renderDataColumn),
            DTColumnBuilder.newColumn('CurrentAnnualGrowth').withTitle('% EPS<br />(This Year)').renderWith(renderDataColumn),
            DTColumnBuilder.newColumn('CurrentAnnualROE').withTitle('% ROE<br />(This Year)').renderWith(renderDataColumn),
            DTColumnBuilder.newColumn(null).withTitle('Details').notSortable().renderWith(renderEditColumn)
        ];

        vm.dtInstance = {};

        // Methods
        //////////
        var updateFilterPromise = null;

        vm.gotoStockDetail = function(symbol) {
            $state.go('app.stock-monitor', {symbol: symbol});
        };

        vm.removeFavoriteStock = function(symbol) {
            var user = undefined;
            var i = 0;
            if (AuthService.isAuthenticated()) {
                AuthService.getMemberInfo()
                    .then(function(memberInfo) {
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
                            reloadStock();
                        } else {
                            return $q.reject(result.msg);
                        }
                    })
                    .catch(function(error) {
                        if (error != 'cancel') {
                            $log.error(error);
                        }
                    });
            }
        };

        vm.addFavoriteStock = function(symbol) {
            var user = undefined;
            if (AuthService.isAuthenticated()) {
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
                        } else {
                            return $q.reject(result.msg);
                        }
                    })
                    .catch(function(error) {
                        if (error != 'cancel') {
                            $log.error(error);
                        }
                    });
            }
        };

        // Private Methods
        //////////

        var dataTablePromise = null;

        $scope.$on('stockQuotesService::newQuotes', function() {
            refreshStock();
        });

        function getDataTablePromise() {
            if (!dataTablePromise) {
                dataTablePromise = msApi.resolve('watchList@query');
            }
            return dataTablePromise.then(function(Data) {
                // Request stock quotes from quote service
                var symbols = [];

                for (var i = 0; i < Data.length; i++) {
                    Data[i]['Snapshot'] = {};
                    symbols.push(Data[i]['Symbol']);
                }

                var snapshot = StockQuotes.getQuotes(symbols);

                for (var symbol in snapshot) {
                    if (snapshot.hasOwnProperty(symbol)) {
                        for (i = 0; i < Data.length; i++) {
                            if (Data[i]['Symbol'] == symbol) {
                                Data[i]['Snapshot'] = snapshot[symbol];
                            }
                        }
                    }
                }

                return Data;
            });
        }

        // reload all the stock information including financial data
        function reloadStock() {
            dataTablePromise = null;
            refreshStock();
        }

        // only refresh the stock prices
        function refreshStock() {
            vm.dtInstance.reloadData(function() {
            }, true);
        }

        function renderSnapshot(data, type) {
            if (type == 'display') {
                if (isEmptyObject(data)) {
                    return '<div class="green-500-fg">&#8212</div>';
                }

                if (isNaN(data.price)) {
                    return '<div class="red-500-fg">(&#8212)</div>';
                }

                if (data.changeInPercent < 0) {
                    return '<div class="red-500-fg">' +
                        $filter('currency')(data.price, '$', 2) +
                        ' (' + $filter('number')(data.changeInPercent * 100, 2) + '%)</div>';
                } else {
                    return '<div class="green-800-fg">' +
                        $filter('currency')(data.price, '$', 2) +
                        ' (+' + $filter('number')(data.changeInPercent * 100, 2) + '%)</div>';
                }
            }
            return data;
        }

        function renderDataColumn(data, type) {
            if (type == 'display') {
                if (isNaN(data)) {
                    return '<div class="red-500-fg">(&#8212)</div>';
                }

                if (data < 0) {
                    return '<div class="red-500-fg">(' + $filter('number')(data, 2) + ')</div>';
                } else {
                    return $filter('number')(data, 2);
                }
            }
            return data;
        }

        function renderEditColumn(data, type, full, meta) {
            var buttons = '<md-button class="edit-button md-icon-button"'
                + ' ng-click="vm.gotoStockDetail(\'' + data.Symbol +'\')" '
                + ' aria-label="Stock Details">'
                + ' <md-icon md-font-icon="icon-open-in-app" class="s16"></md-icon>'
                + '</md-button>';

            buttons += '<md-button class="edit-button md-icon-button"'
                + ' ng-click="vm.removeFavoriteStock(\'' + data.Symbol +'\')" '
                + ' aria-label="Stock Details">'
                + ' <md-icon md-font-icon="icon-delete" class="s16"></md-icon>'
                + '</md-button>';

            return buttons;
        }

        // This should work in node.js and other ES5 compliant implementations.
        function isEmptyObject(obj) {
            return !Object.keys(obj).length;
        }

        function nFormatter(num) {
            var negative = false;
            var result;

            if (num < 0) {
                negative = true;
                num = -num;
            }

            if (num >= 1000000000) {
                result = (num / 1000000000).toFixed(1).replace(/\.0$/, '') + 'B';
            } else if (num >= 1000000) {
                result = (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
            } else if (num >= 1000) {
                result = (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
            }

            if (negative) {
                return '<div class="red-500-fg">(' + result + ')</div>';
            } else {
                return result;
            }
        }
    }
})();
