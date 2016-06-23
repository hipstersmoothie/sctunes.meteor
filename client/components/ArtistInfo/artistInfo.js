import { Template } from 'meteor/templating';
import { Session } from 'meteor/session';
import { Router } from 'meteor/iron:router';

Template.artistInfo.helpers({
  artistData: () => Session.get('currentArtist'), // eslint-disable-line meteor/no-session
  trim: text => text.trim(),
  isActive(name) {
    if (name === Router.current().route.getName() ||
      name === 'artistTracks' && Router.current().route.getName() === 'artist')
      return 'active';
  }
});

Template.artistInfo.events({
  'click #artist-tracks'() {
    Router.go('artistTracks', { _id: Session.get('currentArtist').id }); // eslint-disable-line meteor/no-session
  },
  'click #artist-favorites'() {
    Router.go('artistFavorites', { _id: Session.get('currentArtist').id }); // eslint-disable-line meteor/no-session
  },
  'click #artist-playlists'() {
    Router.go('artistPlaylists', { _id: Session.get('currentArtist').id }); // eslint-disable-line meteor/no-session
  }
});
