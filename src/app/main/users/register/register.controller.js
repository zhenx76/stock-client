(function ()
{
    'use strict';

    angular
        .module('app.users.register')
        .controller('RegisterController', RegisterController);

    /** @ngInject */
    function RegisterController(msApi, $log)
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

        // Methods
        vm.submitForm = function() {
            msApi.resolve('signup@save', vm.form)
                .then(function() {

                })
                .catch(function(error) {

                });
        };

        //////////
    }
})();
