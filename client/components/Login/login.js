Template.login.helpers({
  loggedIn: () => {
    if(Meteor.user())
      Router.go(Session.get('ir.loginRedirectRoute'));
  }
});