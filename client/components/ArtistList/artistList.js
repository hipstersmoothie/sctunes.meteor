import { Template } from 'meteor/templating';
import { Session } from 'meteor/session';
import { Router } from 'meteor/iron:router';

Template.artistList.helpers({
  artists: () => Session.get('artists'),
  big: artworkUrl => artworkUrl.replace('large', 't300x300')
});

Template.artistList.events({
  'click .square'() {
    Router.go('artist', { _id: this.id });
  }
});
