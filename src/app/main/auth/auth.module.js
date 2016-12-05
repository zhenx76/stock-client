(function ()
{
    'use strict';

    angular
        .module('app.auth', [
            'app.auth.register',
            'app.auth.login',
            'app.auth.forgot-password',
            'app.auth.lock',
            'app.auth.reset-password'
        ])
        .config(config)
        .factory('loginSession', loginSessionService);

    /** @ngInject */
    function config()
    {
        // Configurtion stuff goes here
    }

    /** @ngInject */
    function loginSessionService($window, $log)
    {
        return {
            getUser: function() {
                try {
                    if ($window.Storage) {
                        return $window.localStorage.getItem('username');
                    } else {
                        return null;
                    }
                } catch(error) {
                    $log.error(error.message);
                }
            },

            saveUser: function(username) {
                try {
                    if ($window.Storage) {
                        $window.localStorage.setItem('username', username);
                        return true;
                    } else {
                        return false;
                    }
                } catch (error) {
                    $log.error(error.message);
                }
            }
        }
    }

})();
