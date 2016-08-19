(function ()
{
    'use strict';

    angular
        .module('app.stock-selector')
        .controller('StockSelectorController', StockSelectorController);

    /** @ngInject */
    function StockSelectorController(StockData, $filter)
    {
        var vm = this;

        // Data
        vm.helloText = StockData.data.helloText;
        vm.stocks = StockData.data.stocks;

        vm.dtInstance = {};
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

        // Methods

        //////////

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
