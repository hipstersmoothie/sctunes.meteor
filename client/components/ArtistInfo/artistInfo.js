import { Template } from 'meteor/templating';
import { Session } from 'meteor/session';
import { Router } from 'meteor/iron:router';

Template.artistInfo.helpers({
  artistData:() => Session.get('currentArtist'),
  description() {
    let text = Session.get('currentArtist').description;

    if(text)
      return text.trim();

    return text;
  }
});

Template.artistInfo.events({
  'click #artist-tracks':() => Router.go('artistTracks', { _id : Session.get('currentArtist').id }),
  'click #artist-favorites':() => Router.go('artistFavorites', { _id : Session.get('currentArtist').id }),
  'click #artist-playlists':() => Router.go('artistPlaylists', { _id : Session.get('currentArtist').id })
});