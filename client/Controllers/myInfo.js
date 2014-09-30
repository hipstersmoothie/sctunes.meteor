Template.myInfo.events({
  'click #my-playlists': function() {
    Router.go('myPlaylists');
  },
  'click #my-tracks': function() {
    Router.go('myFavorites');
  }
});