import { Template } from 'meteor/templating';
import { Session } from 'meteor/session';
import { Meteor } from 'meteor/meteor';
import { Router } from 'meteor/iron:router';

Template.login.helpers({
  loggedIn() {
    if (Meteor.user())
      Router.go(Session.get('ir.loginRedirectRoute'));
  }
});
