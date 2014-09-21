Template.myInfo.events({
  'click #my-playlists': function(event) {
    Router.go('myPlaylists');
  },
  'click #my-tracks': function(event) {
    Router.go('myFavorites');
  }
});