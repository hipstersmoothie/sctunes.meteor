Template.newPlayListModal.events = ({
  'click #newPlaylistSubmit' : function() {
    //var tracks = getIds([22448500, 21928809]);
    SC.put('/me/playlists', {
      playlist: { 
      	title: 'My Playlist', 
      	sharing: "private"
      }
    });
  },
});