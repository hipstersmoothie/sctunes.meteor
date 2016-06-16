Template.artistInfo.helpers({
  artistData: function () {
    return Session.get('currentArtist');
  },
  description: function() {
    let text = Session.get('currentArtist').description;
    console.log(Session.get('currentArtist'))
    if(text)
      return text.trim();

    return text;
  }
});

Template.artistInfo.events({
  'click #artist-tracks': function () {
    Router.go('artistTracks', { _id : Session.get('currentArtist').id });
  },
  'click #artist-favorites': function () {
    Router.go('artistFavorites', { _id : Session.get('currentArtist').id });
  },
  'click #artist-playlists': function () {
    Router.go('artistPlaylists', { _id : Session.get('currentArtist').id });
  }
});