Template.loader.helpers({
  artistPage: () => Session.get('currentArtist') != null,
  loadingText: () => Session.get('loadingText')
});