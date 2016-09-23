(function ()
{
    'use strict';

    angular
        .module('app.stock')
        .controller('StockSelectorController', StockSelectorController);

    /** @ngInject */
    function StockSelectorController(DTOptionsBuilder, DTColumnBuilder, msApi, $compile, $scope, $filter, $timeout, $log)
    {
        var vm = this;
        $log.info('controller');

        vm.dtOptions = DTOptionsBuilder.fromFnPromise(
            function() {
                return msApi.resolve('stock-financial@filter', getFilters());
            })
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
                        api.search(event.target.value).draw();
                    });
                }
            });

        vm.dtColumns = [
            DTColumnBuilder.newColumn('Symbol').withTitle('Symbol'),
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

        // Private Methods
        //////////
        function getFilters() {
            return {
                currentQuarterEPSGrowth: vm.currentQuarterEPSGrowth,
                lastQuarterEPSGrowth: vm.lastQuarterEPSGrowth,
                currentAnnualEPSGrowth: vm.currentAnnualEPSGrowth,
                lastAnnualEPSGrowth: vm.lastAnnualEPSGrowth,
                currentAnnualROE: vm.currentAnnualROE
            };
        }

        function reloadStock() {
            vm.dtInstance.reloadData(function() {
                $log.info('table reload');
            }, true);
        }

        function renderDataColumn(data, type) {
            if (type == 'display') {
                if (data < 0) {
                    return '<div class="red-500-fg">(' + $filter('number')(data, 2) + ')</div>';
                } else {
                    return $filter('number')(data, 2);
                }
            }
            return data;
        }

        function renderEditColumn(data, type, full, meta) {
            return '<md-button class="edit-button md-icon-button"'
                + ' ng-click="vm.gotoProductDetail(product.id)" '
                + ' aria-label="Stock Details" translate translate-attr-aria-label="EC.PRODUCT_DETAILS">'
                + ' <md-icon md-font-icon="icon-pencil" class="s16"></md-icon>'
                + '</md-button>';
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
