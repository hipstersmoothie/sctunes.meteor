import { Template } from 'meteor/templating';
import { Session } from 'meteor/session';
import { Router } from 'meteor/iron:router';

Template.artistList.helpers({
  artists: () => Session.get('artists'),
  big: (artwork_url)  => artwork_url.replace('large', 't300x300')
});

Template.artistList.events({
  'click .square': function() { Router.go('artist', { _id : this.id } ) }
});
