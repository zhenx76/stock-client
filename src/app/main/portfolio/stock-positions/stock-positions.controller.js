(function ()
{
    'use strict';

    angular
        .module('app.portfolio')
        .controller('StockPositionsController', StockPositionsController);

    /** @ngInject */
    function StockPositionsController(DTOptionsBuilder, DTColumnBuilder, msApi, $state, $compile, $scope, $filter, $timeout, AuthService, StockQuotes, $q, $log)
    {
        var vm = this;

        // Variables
        //////////
        vm.dtOptions = DTOptionsBuilder.fromFnPromise(getDataTablePromise)
            .withDOM('rt<"bottom"<"left"<"length"l>><"right"<"info"i><"pagination"p>>>')
            .withPaginationType('simple')
            .withOption('lengthMenu', [5, 10, 15, 20])
            .withOption('pageLength', 10)
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
            DTColumnBuilder.newColumn('symbol').withTitle('Symbol'),
            DTColumnBuilder.newColumn('snapshot').withTitle('Price').renderWith(renderSnapshot),
            DTColumnBuilder.newColumn('totalShares').withTitle('Total Shares').renderWith(function(data) {
                return $filter('number')(data, 0);
            }),
            DTColumnBuilder.newColumn('phase').withTitle('Phase'),
            DTColumnBuilder.newColumn('nextPriceTarget').withTitle('Next Buy Point').renderWith(function(data) {
                return $filter('currency')(data, '$', 2)
            }),
            DTColumnBuilder.newColumn('profitPrice').withTitle('Profit Point').renderWith(function(data) {
                return $filter('currency')(data, '$', 2)
            }),
            DTColumnBuilder.newColumn('stopLossPrice').withTitle('Stop Loss Price').renderWith(function(data) {
                return $filter('currency')(data, '$', 2)
            }),
            DTColumnBuilder.newColumn(null).withTitle('Details').notSortable().renderWith(renderEditColumn)
        ];

        vm.dtInstance = {};

        // Methods
        //////////
        vm.gotoStockDetail = function(symbol) {
            $state.go('app.stock-monitor', {symbol: symbol});
        };

        // Private Methods
        //////////
        var dataTablePromise = null;

        $scope.$on('stockQuotesService::newQuotes', function() {
            refreshStock();
        });

        function getDataTablePromise() {
            if (!dataTablePromise) {
                dataTablePromise = msApi.resolve('positions@query');
            }
            return dataTablePromise.then(function(Data) {
                // Request stock quotes from quote service
                var symbols = [];

                for (var i = 0; i < Data.length; i++) {
                    Data[i]['snapshot'] = {};
                    symbols.push(Data[i]['symbol']);
                }

                var snapshot = StockQuotes.getQuotes(symbols);

                for (var symbol in snapshot) {
                    if (snapshot.hasOwnProperty(symbol)) {
                        for (i = 0; i < Data.length; i++) {
                            if (Data[i]['symbol'] == symbol) {
                                Data[i]['snapshot'] = snapshot[symbol];
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

        function renderEditColumn(data, type, full, meta) {
            var buttons = '<md-button class="edit-button md-icon-button"'
                + ' ng-click="vm.gotoStockDetail(\'' + data.symbol +'\')" '
                + ' aria-label="Stock Details">'
                + ' <md-icon md-font-icon="icon-open-in-app" class="s16"></md-icon>'
                + '</md-button>';

            return buttons;
        }

        function renderSnapshot(data, type) {
            if (type == 'display') {
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
    }
})();
