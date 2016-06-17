import { Template } from 'meteor/templating';
import { Session } from 'meteor/session';
import { Router } from 'meteor/iron:router';
import { $ } from 'meteor/jquery';

Template.artistList.helpers({
  artists: () => Session.get('artists'),
  big: (artwork_url)  => artwork_url.replace('large', 't300x300')
});

Template.artistList.events({
  'click [id*=artist-profile]' : (event) => {
    $($('#following')[0].parentNode).addClass('orange').siblings().removeClass('orange');
    Router.go('artist', { _id : event.currentTarget.id.split('-')[0] });
  }
});
