Template.sidebar.helpers({
  playlistMode: function () {
    return Session.get('playlistMode');
  },
  artistMode: function () {
    return Session.get('artistMode');
  },
  artists: function () {
    return Session.get('artists');
  },
  queueTracks: function () {
    return Session.get('queueMode');
  },
  playlists: function () {
    return Session.get('playlists');
  },
  queue: function () {
    return Session.get('queue');
  }
});

var getIds = function(tracks) {
  return _.map(tracks, function(track) {
    return {id: track.id};
  });
};

me = null;

var getFollowedArtists = function(me) {
  getAll('getArtists', Math.ceil(me.followings_count / 200), function(artists) {
     Session.set('artists', artists);
  }, null);
};

var getPlaylists = function() {
  Meteor.call('getPlaylists', function(error, playlists) {
    Session.set('playlists', playlists);
  });
};

Template.sidebar.events = ({
  'click #compile-artists' : function() {
      Router.go('findNewArtists');
  },
  'click #playlist-mode' : function() {
    if(Session.get('artists') === null) 
      getPlaylists();
    
    Session.set('playlistMode', !Session.get('playlistMode'));
  },
  'click #log-out' : function() {
    Meteor.logout();
  },
  'click #queue-mode' : function() {
    Session.set('queueMode', !Session.get('queueMode'));
  },
  'click #artist-mode' : function() {
    if(Session.get('artists') === null) 
      getFollowedArtists(Session.get('me'));

    Session.set('artistMode', !Session.get('artistMode'));
  },
  'click [id*=artist-profile]' : function(event) {
    Router.go('artist', { _id : event.currentTarget.id.split('-')[0] });
  },
  'click .playlistRow' : function(event) {
    Session.set('sortType', 'Like Date');
    Session.set('currentArtist', null);
    Session.set('artistFavorites', null);
    Session.set('artistTracks', null);
    if(addToPlaylistQueue < 1) {
      Session.set('loaded', false);
      if(event.target.id.localeCompare('favorites') === 0) 
        Router.go('myFavorites');
      else 
        SC.get('/playlists/' + event.target.id, function(playlist) {
          Session.set('tracks', setPlayingToCurrent(prepareTracks(playlist.tracks, true)));
          Session.set('loaded', true);
        });
    } else 
      SC.get('/me/playlists/' + event.target.id, function(playlist) {
        var oldTracks = getIds(playlist.tracks), tracks = Session.get('tracks');
        oldTracks.push.apply(oldTracks, addToPlaylistQueue);
        addToPlaylistQueue = [];
        Session.set('tracks', setPlayingToCurrent(tracks));
        SC.put('/me/playlists/' + event.target.id, { playlist: { tracks: oldTracks } }, function() {});    
      });
  },
   'click .queueRow' : function(event) {
      var queue = Session.get('queue');
      var tracks = Session.get('tracks');
      var track;
      var id = event.target.id.substr(0, event.target.id.indexOf('-'));
      Session.set('playing', true);
      console.log('cid',currentTrackId);
      if(currentTrackId === id) 
        return currentTrack.togglePause();
      
      if(currentTrack && currentTrackId > -1) {
        currentTrack.stop();
        unmountWAV();
        if(!queueOn) {
          var row = $('#' + currentTrackId)[0];
          if(row) 
            tracks[row.classList[0]].playstatus = 'notplaying';
        } else
          queue[$('#' + currentTrackId + '-queue')[0].classList[0]].qplaystatus = 'notplaying';
      }
      track = queue[event.target.classList[0]];
      track.qplaystatus = 'playing';
      Session.set('queue', queue);
      Session.set('tracks', tracks);
      streamTrack(track, true);
   },
   'click #main_icon' : function() {
      $('#wrapper').toggleClass('active');
   }
});