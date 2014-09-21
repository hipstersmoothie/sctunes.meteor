Template.loader.helpers({
  artistPage: function() {
    return Session.get('currentArtist') != null;
  }
})