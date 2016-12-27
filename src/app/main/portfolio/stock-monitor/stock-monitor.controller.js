(function ()
{
    'use strict';

    angular
        .module('app.portfolio')
        .controller('StockMonitorController', StockMonitorController);

    /** @ngInject */
    function StockMonitorController(Stock, $scope, DTOptionsBuilder, DTColumnBuilder, msApi, $log) {
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

        // Methods
        //////////

        // Private Methods
        //////////
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
                var num = record.Revenue;
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
                var num = record.Revenue;
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
})();
