Template.artistInfo.helpers({
  artistData: function () {
    return Session.get('currentArtist');
  }
});

Template.artistInfo.events({
  'click #artist-tracks': function (event) {
    Router.go('artistTracks', { _id : Session.get('currentArtist').id });
  },
  'click #artist-favorites': function () {
    Router.go('artistFavorites', { _id : Session.get('currentArtist').id });
  },
  'click #artist-playlists': function () {
    Router.go('artistPlaylists', { _id : Session.get('currentArtist').id });
  }
});