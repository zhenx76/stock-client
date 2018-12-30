(function ()
{
    'use strict';

    angular
        .module('app.quotes', ['ngWebSocket'])
        .factory('StockQuotes', stockQuotesService);

    /** @ngInject */
    function stockQuotesService($websocket, $location, $rootScope, $log) {
        var quotes = {};
        var id;
        var url = 'wss://' + $location.host() + ':' + 8443 + '/websocket';

        // Open a WebSocket connection
        $log.info('StockQuoteServer: connecting to ' + url);
        var dataStream = $websocket(url);

        dataStream.onOpen(function(message) {
            try {
                $log.info('StockQuoteServer: connected to quote server: ' + url);
            } catch (err) {
                $log.error('StockQuoteServer: invalid parameters ' + err.message);
            }
        });

        dataStream.onMessage(function(message) {
            try {
                var data = JSON.parse(message.data);
                if (data.hasOwnProperty('id')) {
                    $log.info('StockQuoteServer: id = ' + data.id);
                    return;
                }

                var snapshot = data;
                for (var symbol in snapshot) {
                    if (snapshot.hasOwnProperty(symbol)) {
                        var q = snapshot[symbol];
                        if (q.hasOwnProperty('price') &&
                            q.hasOwnProperty('change') &&
                            q.hasOwnProperty('changeInPercent')) {
                            // Valid quotes. Save it
                            quotes[symbol] = q;
                        }
                    }
                }

                // Broadcast new quotes event
                $rootScope.$broadcast('stockQuotesService::newQuotes');

            } catch (err) {
                $log.error('StockQuoteServer: invalid parameters ' + err.message);
            }
        });

        var requestQuotes = function(symbols) {
            var snapshot = {};
            var missingSymbols = [];

            for (var i = 0; i < symbols.length; i++) {
                var symbol = symbols[i];
                if (quotes.hasOwnProperty(symbol)) {
                    snapshot[symbol] = quotes[symbol];
                } else {
                    missingSymbols.push(symbol);
                }
            }

            if (missingSymbols.length) {
                // Ask to receive quotes from the missing symbols
                var message = JSON.stringify({
                    action: 'ADD',
                    symbols: missingSymbols
                });

                dataStream.send(message);
            }

            return snapshot;
        };

        return {
            getQuotes: requestQuotes
        }
    }
})();
