(function () {
    'use strict';

    angular
        .module('app.stock')
        .controller('StockMarketController', StockMarketController);

    /** @ngInject */
    function StockMarketController($scope, $sce, $log) {
        var vm = this;

        // Variables
        //////////
        vm.dowURL = generateTradingViewWidget('INDEX:DOWI');
        vm.sp500URL = generateTradingViewWidget('INDEX:SPX');
        vm.nasdaqURL = generateTradingViewWidget('INDEX:IUXX');
        vm.russelURL = generateTradingViewWidget('INDEX:IUX');

        // Methods
        //////////

        // Private Methods
        //////////
        function generateTradingViewWidget(symbol) {
            var url = 'https://www.tradingview.com/widgetembed/?symbol=' +
                symbol +
                '&interval=D&hidesidetoolbar=0&symboledit=0&saveimage=1&toolbarbg=f1f3f6&' +
                'studies=BB@tv-basicstudies%1FMACD@tv-basicstudies%1FRSI@tv-basicstudies' +
                '&hideideas=1&theme=Light&style=1&timezone=exchange&studies_overrides=%7B%7D&overrides=%7B%7D' +
                '&enabled_features=%5B%5D&disabled_features=%5B%5D&locale=en' +
                '&utm_source=www.tradingview.com&utm_medium=widget&utm_campaign=chart&utm_term=' +
                symbol;

            return $sce.trustAsResourceUrl(url);
        }

    }
})();
