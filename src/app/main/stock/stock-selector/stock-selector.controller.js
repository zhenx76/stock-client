(function ()
{
    'use strict';

    angular
        .module('app.stock')
        .controller('StockSelectorController', StockSelectorController);

    /** @ngInject */
    function StockSelectorController(DTOptionsBuilder, DTColumnBuilder, msApi, $state, $compile, $scope, $filter, $timeout, AuthService, StockQuotes, $q, $log)
    {
        var vm = this;

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

                        if (event.which == 13) { // Enter key pressed
                            matchSymbol(api, symbol);
                        }
                    });
                }
            });

        vm.dtColumns = [
            DTColumnBuilder.newColumn('Symbol').withTitle('Symbol'),
            DTColumnBuilder.newColumn('Price').withTitle('Price').renderWith(renderPriceColumn),
            DTColumnBuilder.newColumn('CurrentQuarterGrowth').withTitle('% EPS<br />(This Quarter)').renderWith(renderDataColumn),
            DTColumnBuilder.newColumn('PreviousQuarterGrowth').withTitle('% EPS<br />(Last Quarter)').renderWith(renderDataColumn),
            DTColumnBuilder.newColumn('CurrentAnnualGrowth').withTitle('% EPS<br />(This Year)').renderWith(renderDataColumn),
            DTColumnBuilder.newColumn('CurrentAnnualROE').withTitle('% ROE<br />(This Year)').renderWith(renderDataColumn),
            DTColumnBuilder.newColumn(null).withTitle('Details').notSortable().renderWith(renderEditColumn)
        ];

        vm.dtInstance = {};

        /*
        vm.dtOptions = {
            dom         : 'rt<"bottom"<"left"<"length"l>><"right"<"info"i><"pagination"p>>>',
            columnDefs  : [
                {
                    // Target the symbol column
                    targets: 0
                },
                {
                    // Target the price column
                    targets: 1,
                    type   : 'num'
                },
                {
                    // Target the EPS/ROE column
                    targets: [2,3,4],
                    type   : 'num',
                    render : function (data, type)
                    {
                        if (type == 'display')
                        {
                            if (data < 0) {
                                return '<div class="red-500-fg">(' + $filter('number')(data * 100, 2) + ')</div>';
                            } else {
                                return $filter('number')(data * 100, 2);
                            }
                        }
                        return data;
                    }
                },
                {
                    // Target the sales column
                    targets: 5,
                    type   : 'num',
                    render : function (data, type)
                    {
                        if (type == 'display')
                        {
                            return nFormatter(data);
                        }
                        return data;
                    }
                },
                {
                    // Target the P/E column
                    targets: 6,
                    type   : 'num',
                    render : function (data, type)
                    {
                        if (type == 'display')
                        {
                            if (data < 0) {
                                return '<div class="red-500-fg">(' + $filter('number')(data, 2) + ')</div>';
                            } else {
                                return $filter('number')(data, 2);
                            }
                        }
                        return data;
                    }
                }
            ],
            initComplete: function ()
            {
                var api = this.api(),
                    searchBox = angular.element('body').find('#stock-symbol-search');

                // Bind an external input as a table wide search box
                if ( searchBox.length > 0 )
                {
                    searchBox.on('keyup', function (event)
                    {
                        api.search(event.target.value).draw();
                    });
                }
            },
            pagingType  : 'simple',
            lengthMenu  : [10, 20, 30, 50, 100],
            pageLength  : 20,
            scrollY     : 'auto',
            responsive  : true
        };
        */

        // Variables
        //////////

        // Default stock filters
        vm.currentQuarterEPSGrowth = 25;
        vm.lastQuarterEPSGrowth = 20;
        vm.currentAnnualEPSGrowth = 20;
        vm.lastAnnualEPSGrowth = 15;
        vm.currentAnnualROE = 17;
        vm.filterSymbol = '';

        // Methods
        //////////
        var updateFilterPromise = null;

        vm.onFilterChange = function() {
            if (updateFilterPromise) {
                $timeout.cancel(updateFilterPromise);
            }

            updateFilterPromise = $timeout(function() {
                // update data table
                reloadStock();
            }, 1000); // delay 1 second to reduce server calls
        };

        vm.gotoStockDetail = function(symbol) {
            if (AuthService.isAuthenticated()) {
                $state.go('app.stock-monitor', {symbol: symbol});
            } else {
                $state.go('app.stock-financial', {symbol: symbol});
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
                dataTablePromise = msApi.resolve('stock-financial@filter', getFilters());
            }
            return dataTablePromise.then(function(Data) {
                // Request stock quotes from quote service
                var symbols = [];

                for (var i = 0; i < Data.length; i++) {
                    Data[i]['Price'] = {};
                    symbols.push(Data[i]['Symbol']);
                }

                var snapshot = StockQuotes.getQuotes(symbols);

                for (var symbol in snapshot) {
                    if (snapshot.hasOwnProperty(symbol)) {
                        for (i = 0; i < Data.length; i++) {
                            if (Data[i]['Symbol'] == symbol) {
                                Data[i]['Price'] = snapshot[symbol];
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

        function getFilters() {
            if (!!vm.filterSymbol) {
                return {symbol: vm.filterSymbol};
            } else {
                return {
                    currentQuarterEPSGrowth: vm.currentQuarterEPSGrowth,
                    lastQuarterEPSGrowth: vm.lastQuarterEPSGrowth,
                    currentAnnualEPSGrowth: vm.currentAnnualEPSGrowth,
                    lastAnnualEPSGrowth: vm.lastAnnualEPSGrowth,
                    currentAnnualROE: vm.currentAnnualROE
                };
            }
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

        function renderPriceColumn(data, type) {
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

        function renderEditColumn(data, type, full, meta) {
            var buttons = '<md-button class="edit-button md-icon-button"'
                + ' ng-click="vm.gotoStockDetail(\'' + data.Symbol +'\')" '
                + ' aria-label="Stock Details" translate translate-attr-aria-label="EC.PRODUCT_DETAILS">'
                + ' <md-icon md-font-icon="icon-open-in-app" class="s16"></md-icon>'
                + '</md-button>';

            buttons += '<md-button class="edit-button md-icon-button"'
                + ' ng-click="vm.addFavoriteStock(\'' + data.Symbol +'\')" '
                + ' aria-label="Stock Details" translate translate-attr-aria-label="EC.PRODUCT_DETAILS">'
                + ' <md-icon md-font-icon="icon-heart-box-outline" class="s16"></md-icon>'
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

        function matchSymbol(api, symbol) {
            var match = false;
            var newSymbol = symbol.toUpperCase();
            var oldSymbol = vm.filterSymbol;

            if (!!symbol) {
                api.data().each(function(row) {
                    if (row.Symbol == newSymbol) {
                        // Found a match, no need to fetch from server
                        match = true;
                    }
                });
            }

            vm.filterSymbol = newSymbol;

            if (!match && oldSymbol != newSymbol) {
                reloadStock();
            }
        }
    }
})();
