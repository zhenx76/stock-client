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
        .constant('AUTH_EVENTS', {
            notAuthenticated: 'auth-not-authenticated'
        })
        .config(config)
        .service('AuthService', authService)
        .factory('AuthInterceptor', authInterceptor)
        .run(run);

    /** @ngInject */
    function config(msApiProvider, $httpProvider)
    {
        // Register authentication API
        msApiProvider.setBaseUrl('api/v1/');
        msApiProvider.register('signup', ['signup']);
        msApiProvider.register('authenticate', ['authenticate']);
        msApiProvider.register('memberinfo', ['memberinfo']);

        // Push AuthInterceptor to broadcast a global event
        // if we encounter a 401 response, which means
        // we are not authenticated anymore for some reasons.
        $httpProvider.interceptors.push('AuthInterceptor');
    }

    /** @ngInject */
    function authService($window, $http, $q, $log, msApi) {
        var LOCAL_TOKEN_KEY = 'userTokenKey';
        var isAuthenticated = false;
        var authToken;
        var username = '';
        var memberInfo = undefined;

        function loadUserCredentials() {
            try {
                if ($window.Storage) {
                    var token = $window.localStorage.getItem(LOCAL_TOKEN_KEY);
                    if (token) {
                        useCredentials(token);
                    }
                }
            } catch (error) {
                $log.error(error.message);
            }
        }

        function storeUserCredentials(token) {
            try {
                if ($window.Storage) {
                    $window.localStorage.setItem(LOCAL_TOKEN_KEY, token);
                    useCredentials(token);
                }
            } catch (error) {
                $log.error(error.message);
            }
        }

        function useCredentials(token) {
            isAuthenticated = true;

            // Retrieve user name and authToken from token
            var parts = token.split('.');
            username = parts.shift();
            authToken = parts.join('.');

            // Set the token as header for your requests!
            $http.defaults.headers.common.Authorization = authToken;
        }

        function destroyUserCredentials() {
            authToken = undefined;
            isAuthenticated = false;
            username = '';
            memberInfo = undefined;
            $http.defaults.headers.common.Authorization = undefined;
            if ($window.Storage) {
                $window.localStorage.removeItem(LOCAL_TOKEN_KEY);
            }
        }

        var register = function(user) {
            return $q(function(resolve, reject) {
                msApi.resolve('signup@save', user).then(function(result) {
                    if (result.success) {
                        resolve(result.msg);
                    } else {
                        reject(result.msg);
                    }
                });
            });
        };

        var login = function(user) {
            return $q(function(resolve, reject) {
                msApi.resolve('authenticate@save', user).then(function(result) {
                    if (result.success) {
                        // Encode username and auth token
                        storeUserCredentials(user.username + '.' + result.token);
                        resolve(result.msg);
                    } else {
                        reject(result.msg);
                    }
                });
            });
        };

        var logout = function() {
            destroyUserCredentials();
        };

        var getMemberInfo = function() {
            return $q(function(resolve, reject) {
                if (isAuthenticated && !!memberInfo) {
                    resolve(memberInfo);
                } else {
                    msApi.resolve('memberinfo@get').then(function(result) {
                        if (result.success) {
                            // save a reference to memberInfo
                            memberInfo = result.msg;
                            resolve(memberInfo);
                        } else {
                            memberInfo = undefined;
                            reject(result.msg);
                        }
                    });
                }
            });
        };

        loadUserCredentials();

        return {
            login: login,
            register: register,
            logout: logout,
            isAuthenticated: function() { return isAuthenticated; },
            getUserName: function() { return username; },
            getMemberInfo: getMemberInfo
        };
    }

    /** @ngInject */
    function authInterceptor($rootScope, $q, AUTH_EVENTS) {
        return {
            responseError: function (response) {
                $rootScope.$broadcast({
                    401: AUTH_EVENTS.notAuthenticated
                }[response.status], response);
                return $q.reject(response);
            }
        };
    }

    /** @ngInject */
    function run($rootScope, $state, AuthService) {
        // Catch the stateChangeStart which will be triggered whenever we change routes,
        // or when the user tries to somehow change the URL.
        // In that case we check for our authentication, and if the user is not authenticated
        // we prevent this event and go back to login!
        $rootScope.$on('$stateChangeStart', function (event, next, nextParams, fromState) {
            if ('data' in next && 'requireAuthentication' in next.data) {
                if (next.data.requireAuthentication && !AuthService.isAuthenticated()) {
                    event.preventDefault();
                    $state.go('app.users_login');
                }
            }
        });
    }
})();
