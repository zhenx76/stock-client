(function ()
{
    'use strict';

    angular
        .module('app.users.register')
        .controller('RegisterController', RegisterController);

    /** @ngInject */
    function RegisterController(AuthService, $state, $log)
    {
        var vm = this;

        // Data
        vm.form = {
            'username': '',
            'email': '',
            'password': '',
            'passwordConfirm': '',
            'firstname': '',
            'lastname': ''
        };
        vm.serverMessage = false;
        vm.errorMessage = false;

        // Methods
        vm.submitForm = function() {
            AuthService.register(vm.form)
                .then(function(result) {
                    vm.serverMessage = result;
                    vm.errorMessage = false;

                    $state.go('app.users_login');
                })
                .catch(function(error) {
                    vm.serverMessage = false;
                    vm.errorMessage = error;
                });
        };

        //////////
    }
})();
