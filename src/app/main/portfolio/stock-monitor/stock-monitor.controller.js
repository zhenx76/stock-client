(function ()
{
    'use strict';

    angular
        .module('app.portfolio')
        .controller('StockMonitorController', StockMonitorController);

    /** @ngInject */
    function StockMonitorController(Stock, StockQuotes, DTOptionsBuilder, DTColumnBuilder, $scope, $q, $compile, $filter, $mdDialog, $mdMedia, PortfolioService, $sce, $log) {
        var vm = this;

        // Variables
        //////////
        vm.stockInfo = Stock.info;
        vm.currentQuarterlyEPS = getCurrentQuarterlyEPS();
        vm.lastQuarterlyEPS = getLastQuarterlyEPS();
        vm.currentQuarterlyEPSGrowth = getCurrentQuarterlyEPSGrowth();
        vm.currentQuarterlyEPSTrend = (vm.currentQuarterlyEPSGrowth >= 0) ? 'icon-trending-up' : 'icon-trending-down';
        vm.lastQuarterlyEPSGrowth = getLastQuarterlyEPSGrowth();
        vm.currentAnnualEPS = getCurrentAnnualEPS();
        vm.lastAnnualEPS = getLastAnnualEPS();
        vm.currentAnnualEPSGrowth = getCurrentAnnualEPSGrowth();
        vm.currentAnnualEPSTrend = (vm.currentAnnualEPSGrowth >= 0) ? 'icon-trending-up' : 'icon-trending-down';
        vm.currentQuarterlyROE = getCurrentQuarterlyROE();
        vm.lastQuarterlyROE = getLastQuarterlyROE();
        vm.currentAnnualROE = getCurrentAnnualROE();
        vm.lastAnnualROE = getLastAnnualROE();
        vm.lastAnnualEPSGrowth = getLastAnnualEPSGrowth();
        vm.quaterlyRevenueUnit = getQuarterlyRevenueUnit();
        vm.annualRevenueUnit = getAnnualRevenueUnit();
        vm.chartingURL = 'http://stockcharts.com/h-sc/ui?s=' + Stock.info.Symbol + '&p=W&b=5';
        vm.yahooFinanceURL = 'http://finance.yahoo.com/quote/' + Stock.info.Symbol;
        vm.tradingViewWidget = getTradingViewWidgetURL();
        vm.optionPutCallRatioImg = getPutCallRatioURL();
        vm.optionOpenInterestImg = getOpenInterestURL();
        vm.isFavoriteStock = false;

        vm.quarterlyChart = {
            columns: [
                {
                    id    : 'x',
                    values: getQuarters()
                },
                {
                    id    : 'eps',
                    name  : 'EPS',
                    color : 'red',
                    values: getQuarterlyEPS(),
                    type  : 'line'
                },
                {
                    id    : 'revenue',
                    name  : 'Revenue',
                    color : 'blue',
                    values: getQuarterlyRevenue(),
                    type  : 'line'
                }
            ]
        };

        vm.annualChart = {
            columns: [
                {
                    id    : 'x',
                    values: getYears()
                },
                {
                    id    : 'eps',
                    name  : 'EPS',
                    color : 'red',
                    values: getAnnualEPS(),
                    type  : 'line'
                },
                {
                    id    : 'revenue',
                    name  : 'Revenue',
                    color : 'blue',
                    values: getAnnualRevenue(),
                    type  : 'line'
                }
            ]
        };

        var stockHoldingInfo = {};

        initUserData(Stock.userData);

        vm.dtInstance = {};
        vm.dtOptions = DTOptionsBuilder.fromFnPromise(function () {
                return $q.when(vm.stockTransactions);
            })
            .withDOM('<"top"f>r<"#dt-title.secondary-text">Bt<"bottom"<"left"<"length"l>><"right"<"info"i><"pagination"p>>>')
            .withPaginationType('simple')
            .withOption('lengthMenu', [5, 10, 15, 20])
            .withOption('pageLength', 5)
            .withOption('autoWidth', false)
            .withOption('responsive', true)
            .withOption('ordering', false)
            .withOption('searching', false)
            .withOption('createdRow', function (row) {
                // Recompiling so we can bind Angular directive to the DT
                $compile(angular.element(row).contents())($scope);
            })
            .withOption('initComplete', function () {
                document.querySelector('#dt-title').textContent = 'Transactions';
            })
            .withButtons([{
                text: 'Add New Transaction',
                key: '1',
                action: function (e, dt, node, config) {
                    displayTransactionDialog(e);
                }
            }]);

        vm.dtColumns = [
            DTColumnBuilder.newColumn('action').withTitle('Action'),
            DTColumnBuilder.newColumn('price').withTitle('Price').renderWith(function(data) {
                return $filter('currency')(data, '$', 2)
            }),
            DTColumnBuilder.newColumn('shares').withTitle('Shares').renderWith(function(data) {
                return $filter('number')(data, 2);
            }),
            DTColumnBuilder.newColumn('datetime').withTitle('Date/Time').renderWith(function(data) {
                return $filter('date')(data);
            })
        ];

        getQuotes();

        // Methods
        //////////

        $scope.$on('stockQuotesService::newQuotes', function() {
            getQuotes();
        });

        function getQuotes() {
            var symbol = vm.stockInfo.Symbol;
            var snapshot = StockQuotes.getQuotes([symbol]);
            if (snapshot.hasOwnProperty(symbol)) {
                vm.snapShot = snapshot[symbol];
            }
        }

        vm.hasStockHoldings = function() {
            return ('holdings' in stockHoldingInfo)
                && stockHoldingInfo.holdings
                && (stockHoldingInfo.holdings.length > 0);
        };

        vm.toggleWatchList = function() {
            if (vm.isFavoriteStock) {
                PortfolioService.removeFavoriteStock(vm.stockInfo.Symbol).then(function() {
                    vm.isFavoriteStock = false;
                });
            } else {
                PortfolioService.addFavoriteStock(vm.stockInfo.Symbol).then(function() {
                    vm.isFavoriteStock = true;
                });
            }
        };

        // Private Methods
        //////////
        function initUserData(userData) {
            // Stock Holding Variables
            stockHoldingInfo = userData || {};
            vm.stockHoldingChart = getStockHoldingChartData();
            vm.nextPriceTarget = getNextPriceTargets();
            vm.stockTransactions = getStockTransactions();

            // Check if it's in watch list
            PortfolioService.isFavoriteStock(vm.stockInfo.Symbol).then(function (result) {
                vm.isFavoriteStock = result;
            });
        }

        function getTradingViewWidgetURL() {
            var url = 'https://www.tradingview.com/widgetembed/?symbol=' +
                vm.stockInfo.Symbol +
                '&interval=D&symboledit=0&saveimage=1&toolbarbg=f1f3f6' +
                '&details=1&calendar=1&hotlist=1&news=1&newsvendors=headlines' +
                '&studies=BB@tv-basicstudies%1FMACD@tv-basicstudies%1FRSI@tv-basicstudies' +
                '&hideideas=1&theme=Light&style=1&timezone=exchange&studies_overrides=%7B%7D&overrides=%7B%7D' +
                '&enabled_features=%5B%5D&disabled_features=%5B%5D&locale=en' +
                '&utm_source=www.tradingview.com&utm_medium=widget&utm_campaign=chart&utm_term=' +
                vm.stockInfo.Symbol;

            return $sce.trustAsResourceUrl(url);
        }

        function getPutCallRatioURL() {
            var url = 'http://www.optionistics.com/f/inset.pl?vol=0&stk=1&isopt=0&symbol=' +
                vm.stockInfo.Symbol +
                '&pc=1&numdays=63';

            return $sce.trustAsResourceUrl(url);
        }

        function getOpenInterestURL() {
            var url = 'http://www.optionistics.com/f/inset.pl?vol=1&stk=1&isopt=0&symbol=' +
                vm.stockInfo.Symbol +
                '&pc=1&numdays=63';

            return $sce.trustAsResourceUrl(url);
        }

        function getStockHoldingChartData() {
            var phases = [];
            var holdings = [];

            if (!('holdings' in stockHoldingInfo)) {
                return null;
            }

            for (var i = 0, j = 0; i < stockHoldingInfo.holdings.length; i++) {
                if (i == 0) {
                    phases[0] = stockHoldingInfo.holdings[0].phase;
                    holdings[0] = stockHoldingInfo.holdings[0].shares;
                } else {
                    if (stockHoldingInfo.holdings[i].phase == phases[j]) {
                        holdings[j] += stockHoldingInfo.holdings[i].shares;
                    } else {
                        j++;
                        phases[j] = stockHoldingInfo.holdings[i].phase;
                        holdings[j] = stockHoldingInfo.holdings[i].shares;
                    }
                }
            }

            return {
                data   : {
                    labels: phases,
                    series: [holdings]
                },
                options: {
                    reverseData      : true,
                    horizontalBars   : true,
                    axisY            : {
                        offset: 100
                    },
                    onlyInteger      : true
                }
            };
        }

        function getStockTransactions() {
            var transactions = stockHoldingInfo.transactions || [];
            transactions.forEach(function(transaction) {
                var datetime = new Date(transaction.datetime);
                if (isNaN(Date.parse(datetime))) {
                    datetime = null;
                }
                transaction.datetime = datetime;
            });
            return transactions;
        }

        function getNextPriceTargets() {
            if (stockHoldingInfo.nextPriceTarget) {
                var target = stockHoldingInfo.nextPriceTarget;
                return {
                    price: (target.price) ? ('$' + target.price.toFixed(2)) : 'No Buy',
                    shares: (target.shares) ? target.shares.toFixed(2) : 'Maximized',
                    sellAt: '$' + target.profitPrice.toFixed(2),
                    stopLoss: '$' + target.stopLossPrice.toFixed(2)
                };
            } else {
                return {
                    price: 'N/A',
                    shares: 'N/A',
                    sellAt: 'N/A',
                    stopLoss: 'N/A'
                };
            }
        }

        function displayTransactionDialog(ev) {
            var useFullScreen = $mdMedia('sm') || $mdMedia('xs');

            $mdDialog.show({
                    locals: {stockInfo: vm.stockInfo},
                    controller: DialogController,
                    templateUrl: 'app/main/portfolio/stock-monitor/stock-transaction-dialog.html',
                    parent: angular.element(document.body),
                    targetEvent: ev,
                    clickOutsideToClose: true,
                    fullscreen: useFullScreen
                })
                .then(function (userData) {
                    if (userData) {
                        initUserData(userData);
                        vm.dtInstance.reloadData();
                    }
                }, function () {
                    // Dialog cancelled. Do nothing
                });

            $scope.$watch(function() {
                return $mdMedia('xs') || $mdMedia('sm');
            }, function(wantsFullScreen) {
                $scope.customFullscreen = (wantsFullScreen === true);
            });
        }

        function getCurrentQuarterlyEPS() {
            return Stock.quarterlyRecords[Stock.quarterlyRecords.length-1]["EPS (Diluted)"];
        }

        function getLastQuarterlyEPS() {
            if (Stock.quarterlyRecords.length > 1) {
                return Stock.quarterlyRecords[Stock.quarterlyRecords.length-2]["EPS (Diluted)"];
            } else {
                return null;
            }
        }

        function getCurrentQuarterlyEPSGrowth() {
            var cur = Stock.quarterlyRecords.length - 1;
            if (cur >= 4) {
                var eps_c = Stock.quarterlyRecords[cur]["EPS (Diluted)"];
                var eps_p = Stock.quarterlyRecords[cur - 4]["EPS (Diluted)"];
                return ((eps_c - eps_p) * 100)/Math.abs(eps_p);
            } else {
                return null;
            }
        }

        function getLastQuarterlyEPSGrowth() {
            if (Stock.quarterlyRecords.length > 1) {
                var cur = Stock.quarterlyRecords.length - 2;
                if (cur >= 4) {
                    var eps_c = Stock.quarterlyRecords[cur]["EPS (Diluted)"];
                    var eps_p = Stock.quarterlyRecords[cur - 4]["EPS (Diluted)"];
                    return ((eps_c - eps_p) * 100) / Math.abs(eps_p);
                }
            }

            return null;
        }

        function getCurrentAnnualEPS() {
            return Stock.annualRecords[Stock.annualRecords.length-1]["EPS (Diluted)"];
        }

        function getLastAnnualEPS() {
            if (Stock.annualRecords.length > 1) {
                return Stock.annualRecords[Stock.annualRecords.length-2]["EPS (Diluted)"];
            } else {
                return null;
            }
        }

        function getCurrentAnnualEPSGrowth() {
            var cur = Stock.annualRecords.length - 1;
            if (cur >= 1) {
                var eps_c = Stock.annualRecords[cur]["EPS (Diluted)"];
                var eps_p = Stock.annualRecords[cur - 1]["EPS (Diluted)"];
                return ((eps_c - eps_p) * 100)/Math.abs(eps_p);
            } else {
                return null;
            }
        }

        function getLastAnnualEPSGrowth() {
            if (Stock.annualRecords.length > 1) {
                var cur = Stock.annualRecords.length - 2;
                if (cur >= 1) {
                    var eps_c = Stock.annualRecords[cur]["EPS (Diluted)"];
                    var eps_p = Stock.annualRecords[cur - 1]["EPS (Diluted)"];
                    return ((eps_c - eps_p) * 100) / Math.abs(eps_p);
                }
            }

            return null;
        }

        function getCurrentQuarterlyROE() {
            var record = Stock.quarterlyRecords[Stock.quarterlyRecords.length-1];
            var netIncome = record['Net Income'];
            var equity = record['Total Equity'];

            return (netIncome * 100)/equity;
        }

        function getLastQuarterlyROE() {
            if (Stock.quarterlyRecords.length > 1) {
                var record = Stock.quarterlyRecords[Stock.quarterlyRecords.length-2];
                var netIncome = record['Net Income'];
                var equity = record['Total Equity'];

                return (netIncome * 100)/equity;
            } else {
                return null;
            }
        }

        function getCurrentAnnualROE() {
            var record = Stock.annualRecords[Stock.annualRecords.length-1];
            var netIncome = record['Net Income'];
            var equity = record['Total Equity'];

            return (netIncome * 100)/equity;
        }

        function getLastAnnualROE() {
            if (Stock.annualRecords.length > 1) {
                var record = Stock.quarterlyRecords[Stock.annualRecords.length-2];
                var netIncome = record['Net Income'];
                var equity = record['Total Equity'];

                return (netIncome * 100)/equity;
            } else {
                return null;
            }
        }

        function getQuarters() {
            var quarters = '';
            Stock.quarterlyRecords.forEach(function(record) {
                quarters += record.Quarter + ',';
            });
            return quarters.slice(0, -1);
        }

        function getYears() {
            var years = '';
            Stock.annualRecords.forEach(function(record) {
                years += record.Year + ',';
            });
            return years.slice(0, -1);
        }

        function getQuarterlyEPS() {
            var eps = '';
            Stock.quarterlyRecords.forEach(function(record) {
                eps += record['EPS (Diluted)'] + ',';
            });
            return eps.slice(0, -1);
        }

        function getAnnualEPS() {
            var eps = '';
            Stock.annualRecords.forEach(function(record) {
                eps += record['EPS (Diluted)'] + ',';
            });
            return eps.slice(0, -1);
        }

        function getQuarterlyRevenue() {
            var revenue = '';

            Stock.quarterlyRecords.forEach(function(record) {
                var num = record.Revenue || 0;
                var unit = getQuarterlyRevenueUnit();

                if (unit == 'B') {
                    num = (num / 1000000000);
                } else if (unit == 'M') {
                    num = (num / 1000000);
                } else if (unit == 'K') {
                    num = (num / 1000);
                }

                revenue += num.toFixed(2) + ',';
            });

            return revenue.slice(0, -1);
        }

        function getAnnualRevenue() {
            var revenue = '';

            Stock.annualRecords.forEach(function(record) {
                var num = record.Revenue || 0;
                var unit = getAnnualRevenueUnit();

                if (unit == 'B') {
                    num = (num / 1000000000);
                } else if (unit == 'M') {
                    num = (num / 1000000);
                } else if (unit == 'K') {
                    num = (num / 1000);
                }

                revenue += num.toFixed(2) + ',';
            });

            return revenue.slice(0, -1);
        }

        function getQuarterlyRevenueUnit() {
            var unit ='';

            var min = Number.MAX_VALUE;
            Stock.quarterlyRecords.forEach(function(record) {
                min = Math.min(min, record.Revenue);
            });

            if (min < 0) {
                min = -min;
            }

            if (min >= 1000000000) {
                unit = 'B';
            } else if (min >= 1000000) {
                unit = 'M';
            } else if (min >= 1000) {
                unit = 'K';
            }

            return unit;
        }

        function getAnnualRevenueUnit() {
            var unit ='';

            var min = Number.MAX_VALUE;
            Stock.annualRecords.forEach(function(record) {
                min = Math.min(min, record.Revenue);
            });

            if (min < 0) {
                min = -min;
            }

            if (min >= 1000000000) {
                unit = 'B';
            } else if (min >= 1000000) {
                unit = 'M';
            } else if (min >= 1000) {
                unit = 'K';
            }

            return unit;
        }

        function getQuarterlyROE() {
            var roe = '';

            Stock.quarterlyRecords.forEach(function(record) {
                var netIncome = record['Net Income'];
                var equity = record['Total Equity'];
                var val = netIncome/equity;

                roe += val.toFixed(2) + ',';
            });

            return roe.slice(0, -1);
        }

        function getAnnualROE() {
            var roe = '';

            Stock.annualRecords.forEach(function(record) {
                var netIncome = record['Net Income'];
                var equity = record['Total Equity'];
                var val = netIncome/equity;

                roe += val.toFixed(2) + ',';
            });

            return roe.slice(0, -1);
        }

    }

    function DialogController($scope, $mdDialog, $log, msApi, stockInfo) {
        $scope.transaction = {'symbol' : stockInfo.Symbol};
        $scope.actions = ['BUY', 'SELL'];

        $scope.hide = function() {
            $mdDialog.hide();
        };

        $scope.cancel = function() {
            $mdDialog.cancel();
        };

        $scope.discard = function() {
            $mdDialog.cancel();
        };

        $scope.save = function() {
            msApi.resolve('update@save', $scope.transaction).then(function(result) {
                if (result.success) {
                    $mdDialog.hide(result.data);
                } else {
                    $mdDialog.cancel();
                }
            }).catch(function() {
                $mdDialog.cancel();
            });
        };
    }

})();
