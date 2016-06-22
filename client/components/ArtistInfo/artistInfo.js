import { Template } from 'meteor/templating';
import { Session } from 'meteor/session';
import { Router } from 'meteor/iron:router';

Template.artistInfo.helpers({
  artistData: () => Session.get('currentArtist'),
  description() {
    const text = Session.get('currentArtist').description;

    if (text)
      return text.trim();

    return text;
  },
  isActive(name) {
    if (name === Router.current().route.getName() ||
      name === 'artistTracks' && Router.current().route.getName() === 'artist')
      return 'active';
  }
});

Template.artistInfo.events({
  'click #artist-tracks'() {
    Router.go('artistTracks', { _id: Session.get('currentArtist').id });
  },
  'click #artist-favorites'() {
    Router.go('artistFavorites', { _id: Session.get('currentArtist').id });
  },
  'click #artist-playlists'() {
    Router.go('artistPlaylists', { _id: Session.get('currentArtist').id });
  }
});
