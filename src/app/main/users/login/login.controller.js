(function ()
{
    'use strict';

    angular
        .module('app.users.login')
        .controller('LoginController', LoginController);

    /** @ngInject */
    function LoginController(AuthService, $state, $log)
    {
        var vm = this;

        // Data
        vm.form = {
            'username': '',
            'password': ''
        };
        vm.serverMessage = false;
        vm.errorMessage = false;

        // Methods
        vm.submitForm = function() {
            AuthService.login(vm.form)
                .then(function(result) {
                    vm.serverMessage = result;
                    vm.errorMessage = false;

                    return AuthService.getMemberInfo();
                })
                .then(function(memberInfo) {
                    // Go to home
                    $state.go('app.stock-selector');
                })
                .catch(function(error) {
                    vm.serverMessage = false;
                    vm.errorMessage = error;
                });
        };

        //////////
    }
})();
