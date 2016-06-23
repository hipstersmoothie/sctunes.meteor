import { Template } from 'meteor/templating';
import { Router } from 'meteor/iron:router';

Template.artistList.helpers({
  big: artworkUrl => artworkUrl.replace('large', 't300x300')
});

Template.artistList.events({
  'click .square'() {
    Router.go('artist', { _id: this.id });
  }
});
