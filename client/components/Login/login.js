Template.login.helpers({
  loggedIn: function() {
    if(Meteor.user())
      Router.go(Session.get('ir.loginRedirectRoute'));
  }
});