(function ()
{
    'use strict';

    angular
        .module('app.users', [
            'app.users.register',
            'app.users.login',
            'app.users.forgot-password',
            'app.users.lock',
            'app.users.reset-password'
        ])
        .config(config)
        .factory('loginSession', loginSessionService);

    /** @ngInject */
    function config(msApiProvider)
    {
        // Register authentication API
        msApiProvider.setBaseUrl('auth/');
        msApiProvider.register('signup', ['signup']);
        msApiProvider.register('login', ['login']);
        msApiProvider.register('logout', ['logout']);
        msApiProvider.register('user_profile', ['user']);
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
