import { Template } from 'meteor/templating';
import { Session } from 'meteor/session';

Template.trackLayout.helpers({
  loaded:() => Session.get('loaded'),
  currentTrack:() => Session.get('currentTrack'),
  getTransition:() => Session.get('transitionPages') ? Session.get('currentTransition') : 'opacity'
});