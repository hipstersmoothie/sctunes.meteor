Template.loader.helpers({
  artistPage: function() {
    return Session.get('currentArtist') != null;
  },
  loadingText: function() {
  	return Session.get('loadingText');
  }
});