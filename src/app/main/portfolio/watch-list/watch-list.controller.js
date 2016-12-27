(function ()
{
    'use strict';

    angular
        .module('app.portfolio')
        .controller('WatchListController', WatchListController);

    /** @ngInject */
    function WatchListController(DTOptionsBuilder, DTColumnBuilder, msApi, $state, $compile, $scope, $filter, $timeout, AuthService, $q, $log)
    {
        var vm = this;

        // Variables
        //////////

        vm.dtOptions = DTOptionsBuilder.fromFnPromise(
            function() {
                return msApi.resolve('watchList@query'); // Use $resource.query to get array data
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
                        var symbol = event.target.value;
                        api.search(symbol).draw();
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

        // Methods
        //////////
        var updateFilterPromise = null;

        vm.gotoStockDetail = function(symbol) {
            $state.go('app.stock-monitor', {symbol: symbol});
        };

        vm.removeFavoriteStock = function(symbol) {

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

        function reloadStock() {
            vm.dtInstance.reloadData(function() {
            }, true);
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
