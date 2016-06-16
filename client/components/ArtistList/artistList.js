import { Template } from 'meteor/templating';
import { Session } from 'meteor/session';
import { Router } from 'meteor/iron:router';
import { $ } from 'meteor/jquery';

Template.artistList.helpers({
  artists: () => Session.get('artists'),
  loaded: () => Session.get('loaded'),
  lots: () => Session.get('artists').length > 1000
});

Template.artist_front.helpers({
  big: (artwork_url)  => artwork_url.replace('large', 't300x300')
});

Template.artist_front.events({
  'click [id*=artist-profile]' : (event) => {
    $($('#following')[0].parentNode).addClass('orange').siblings().removeClass('orange');
    Router.go('artist', { _id : event.currentTarget.id.split('-')[0] });
  }
});
