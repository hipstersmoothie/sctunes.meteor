Router.configure({
  layoutTemplate: 'ApplicationLayout',
  templateNameConverter: 'upperCamelCase'
});

Router.onBeforeAction(function() {  
  if (!Meteor.userId()) 
    this.setLayout("login");  
}, {except: ['login']});

Router.map(function() {
  this.route('app', {
    path: '/'
  });

  this.route('login', {
    path: '/login'
  });
});

Meteor.startup(function() {
  Session.set("queue", []);

  Session.set("playlistMode", false);
  Session.set("queueMode", true);
  Session.set("artistMode", false);

  Session.set("currentTrack", null);

  Session.set('currentArtist', null);
  Session.set('artistTracks', null);
  Session.set('artistFavorites', null);

  Session.set("loaded", false);
  Session.set("playing", false);
  Session.set("squares", true);

  Session.set("sortType", "Like Date");
  Session.set("otherSortTypes", [{type:"Like Date", className: "likedateSort"}, 
                                 {type:"Artist", className: "artistSort"}, 
                                 {type:"Uploader", className: "uploaderSort"},
                                 {type:"Play Count", className: "playcountSort"},
                                 {type:"Heart Count", className: "heartcountSort"},
                                 {type:"Creation Date", className: "creationSort"},
                                 {type:"Duration", className:"durationSort"},
                                 {type:"Search", className:"searchSort"}]);

  Mousetrap.bind('q', function() { Session.set("queueMode", !Session.get("queueMode")) });
  Mousetrap.bind('p', function() { Session.set("playlistMode", !Session.get("playlistMode")) });
  Mousetrap.bind('v', function() { Session.set("squares", !Session.get("squares")) });
});

var queueOn = false, 
    addToPlaylistQueue = [], 
    currentTrack = null, 
    qIndex = 0, tIndex = 0, 
    currentTrackId, 
    madeTracks = false,
    access_token;

// Template.app.create = function() {
//   Meteor.loginWithSoundcloud({
//     loginStyle :  "redirect"
//   }, function (err) {
//     if (err)
//       Session.set('errorMessage', err.reason || 'Unknown error');
//   });
// };

/*
 Sidebar
 */

var setPlayingToCurrent = function(tracks) {
  return _.map(tracks, function(track) {
    track.playstatus = track.id == currentTrackId ? "playing" : "notplaying";
    return track;
  });
};

Template.sidebar.helpers({
  playlistMode: function () {
    return Session.get("playlistMode");
  },
  artistMode: function () {
    return Session.get("artistMode");
  },
  artists: function () {
    return Session.get("artists");
  },
  queueTracks: function () {
    return Session.get("queueMode");
  },
  playlists: function () {
    if(Session.get("playlistChange"))
      Session.set("playlistChange", false);

    return Session.get("playlists");
  },
  queue: function () {
    return Session.get("queue");
  }
});

var extractSongsAndPlaylists = function(tracks) {
  return _.map(_.filter(tracks, function(track) {
    return track.track || track.playlist;
  }), function(track) {
    if(track.track)
      return track.track;
    if(track.playlist)
      return track.playlist;
  });
};

var loadArtist = function(id) {
  Session.set("loaded", false);
  Meteor.call("getArtist", id.split('-')[0], function(error, info) {
    var allTracks = [];

    info.big_avatar = (info.avatar_url).replace("large", "t300x300");
    Session.set('currentArtist', info);
    Session.set('artistFavorites', null);
    Session.set('artistTracks', null);

    for(var i = 0; i < Math.ceil(info.track_count / 200); i++) {
      Meteor.call("getArtistTracks", info.id, i, function(error, tracks) {
        allTracks = allTracks.concat(prepareTracks(extractSongsAndPlaylists(tracks), true));
        Session.set('tracks', allTracks);
        Session.set('artistTracks', allTracks);
        if(i === Math.ceil(info.track_count / 200)) {
          $('#artist-tracks').addClass('active').siblings().removeClass('active');
          Session.set("loaded", true);
        }
      });
    }

    if(info.track_count === 0) {
      getFavorites(info);
      $('#artist-favorites').addClass('active').siblings().removeClass('active');
    }
  });  
}

Template.sidebar.events = ({
  'click #playlist-mode' : function() {
    Session.set('playlistMode', !Session.get('playlistMode'));
  },
  'click #queue-mode' : function() {
    Session.set('queueMode', !Session.get('queueMode'));
  },
  'click #artist-mode' : function() {
    Session.set('artistMode', !Session.get('artistMode'));
  },
  'click [id*=artist-profile]' : function(event) {
    loadArtist(event.currentTarget.id);
  },
  'click .playlistRow' : function(event) {
    Session.set('sortType', 'Like Date');
    Session.set('currentArtist', null);
    Session.set('artistFavorites', null);
    Session.set('artistTracks', null);
    if(addToPlaylistQueue < 1) {
      Session.set("loaded", false);
      if(event.target.id.localeCompare("favorites") === 0) {
        Session.set("tracks", setPlayingToCurrent(Session.get("origTracks")));
        Session.set("loaded", true);
      } else {
        SC.get('/playlists/' + event.target.id, function(playlist) {
          Session.set("tracks", setPlayingToCurrent(prepareTracks(playlist.tracks, true)));
          Session.set("loaded", true);
        });
      }
    } else {
      SC.get('/me/playlists/' + event.target.id, function(playlist) {
        var oldTracks = getIds(playlist.tracks), tracks = Session.get("tracks");
        oldTracks.push.apply(oldTracks, addToPlaylistQueue);
        addToPlaylistQueue = [];
        Session.set("tracks", setPlayingToCurrent(tracks));
        SC.put('/me/playlists/' + event.target.id, { playlist: { tracks: oldTracks } }, function(playlist) {});    
      });
    }
  },
   'click .queueRow' : function(event) {
      var queue = Session.get("queue");
      var tracks = Session.get("tracks");
      var id = event.target.id.substr(0, event.target.id.indexOf("-"));
      Session.set("playing", true);

      if(currentTrackId === id) 
        return currentTrack.togglePause();
      
      if(currentTrackId > -1) {
        currentTrack.stop();
        unmountWAV();
        if(!queueOn) {
          var row = $("#" + currentTrackId)[0];
          if(row)
            tracks[row.classList[0]].playstatus = "notplaying";
        } else
          queue[$("#" + currentTrackId + "-queue")[0].classList[0]].qplaystatus = "notplaying";
      }
      queue[event.target.classList[0]].qplaystatus = "playing";
      Session.set("queue", queue);
      Session.set("tracks", tracks);
      streamTrack(id, true);
   },
   'click .brand-title' : function() {
      Session.set("playlistMode", !Session.get("playlistMode"));
   },
   'click #main_icon' : function() {
      $("#wrapper").toggleClass("active");
   }
});

/*
  New Playlist Modal
 */

Template.newPlayListModal.events = ({
  'click #newPlaylistSubmit' : function() {
    var tracks = getIds([22448500, 21928809]);
    SC.post('/playlists', {
      playlist: { title: 'My Playlist', tracks: tracks }
    });
  },
});
/*
  artist data pane
 */

Template.artistInfo.helpers({
  artistData: function () {
    return Session.get('currentArtist');
  }
});

var prepareTracks = function(tracks, newIndexes) {
  return setArt(getArtist(indexTracks(tracks, newIndexes)));
};

var getFavorites = function(artist) {
  var allTracks = [], currentFavorites = Session.get('artistFavorites');

  $('#artist-favorites').addClass('active').siblings().removeClass('active');

  if(currentFavorites)
    return Session.set('tracks', currentFavorites);

  Session.set("loaded", false);
  for(var i = 0; i < Math.ceil(artist.public_favorites_count / 200); i++) {
    Meteor.call("getArtistFavorites", artist.id, i, function(error, tracks) {
      allTracks = allTracks.concat(prepareTracks(extractSongsAndPlaylists(tracks), true));
      Session.set('tracks', allTracks);
      Session.set('artistFavorites', allTracks);
      Session.set("loaded", true);
    });
  }
  if(!artist.public_favorites_count){
    toastr.error('User has no favorites!');
    Session.set("loaded", true);
  }
};

var setArt = function(tracks) {
  return _.map(tracks, function(track) {
    if(track.artwork_url)
      track.big_artwork_url = (track.artwork_url).replace("large", "t300x300");
    else
      track.big_artwork_url = 'noTrack.jpg';
    return track;
  })
};

Template.artistInfo.events({
  'click #artist-tracks': function (event) {
    if(Session.get('currentArtist').track_count > 0) {
      $('#artist-tracks').addClass('active').siblings().removeClass('active');
      Session.set('tracks', Session.get('artistTracks'));
    } else 
      toastr.error('User has no tracks!');
  },
  'click #artist-favorites': function () {
    getFavorites(Session.get('currentArtist'));
  },
  'click #artist-playlists': function () {
    $('#artist-playlists').addClass('active').siblings().removeClass('active');;
    var artist = Session.get('currentArtist');
    Session.set('loaded', false);
    if(artist.playlist_count > 0) {
      Meteor.call("getArtistPlaylists", artist.id, function(error, playlists) {
        Session.set('tracks', setArt(playlists));
        Session.set('loaded', true);
      });
    } else {
      toastr.error('User has no Playlists!');
      Session.set('loaded', true);
    }
  }
});

/*
  PLayer 
 */

Template.player.helpers({
  currentTrack: function() {
    return Session.get("currentTrack");
  }
});

var togglePauseIcon = function() {
  var playPause = $('#playPauseIcon');
  if(playPause.hasClass('glyphicon-play')) {
    playPause.removeClass('glyphicon-play');
    playPause.addClass('glyphicon-pause');
  } else {
    playPause.removeClass('glyphicon-pause');
    playPause.addClass('glyphicon-play');
  }
};

Template.player.events = ({
  'click #playpause' : function() {
    togglePauseIcon();
    currentTrack.togglePause();
  },
  'click #nextButton' : function() {
    playNextOrPrevTrack(true);
  },
  'click #prevButton' : function() {
    playNextOrPrevTrack(false);
  }
});

/*
  track list
 */

function msToTime(duration) {
  var milliseconds = parseInt((duration%1000)/100)
    , seconds = parseInt((duration/1000)%60)
    , minutes = parseInt((duration/(1000*60))%60)
    , hours = parseInt((duration/(1000*60*60))%24);

  hours = (hours < 10) ? "0" + hours : hours;
  minutes = (minutes < 10) ? "0" + minutes : minutes;
  seconds = (seconds < 10) ? "0" + seconds : seconds;

  return hours + ":" + minutes + ":" + seconds;
}

Template.trackList.helpers({
  squares: function () {
    return Session.get("squares");
  },
  tracks: function () {
    SC.initialize({
      client_id: 'fc6924c8838d01597bab5ab42807c4ae',
      redirect_uri: 'http://localhost:3000/_oauth/soundcloud?close',
      access_token: access_token
    });
    var tracks = Session.get("tracks");
    return tracks ? Object.keys(tracks).map(function(v) { return tracks[v]; }) : [];
  },
  toTime: function(ms) {
    return msToTime(ms);
  }
});

Template.trackList.events({
  'click [id*=artist-profile]' : function(event) {
    loadArtist(event.currentTarget.id);
  },
  'click .heartCount' : function(event) {
    if(event.target.classList[1] === 'hearted')
      SC.delete('/me/favorites/' + event.target.parentNode.parentNode.parentNode.id);
    else
      SC.put('/me/favorites/' + event.target.parentNode.parentNode.parentNode.id);
    var tracks = Session.get('tracks');
    var track = _.find(tracks, function(track) {
      return track.id == event.target.parentNode.parentNode.parentNode.id;
    })
    track.user_favorite = !track.user_favorite;
    tracks[track.index] = track;
    Session.set('tracks', tracks);
  }
});

Template.app.squares = function() {
  return Session.get("squares");
};

/*
 Options
 */

Template.optionsRow.helpers({
  sortType: function () {
    return Session.get("sortType");
  },
  otherSortTypes: function () {
    return Session.get("otherSortTypes");
  },
  duration: function () {
    return Session.get("sortType") === "Duration";
  },
  search: function () {
    return Session.get("sortType") === "Search";
  }
});

var setTime = function() {
  var minTime        = $('#min-length').val() * 60000,
      maxTime        = $('#max-length').val() * 60000,
      tracks         = Session.get("tracks"),
      longTracks     = [];

  longTracks = _.filter(tracks, function(track) {
    return (minTime && maxTime && track.duration >= minTime && track.duration <= maxTime) || (minTime && !maxTime && track.duration >= minTime) || (maxTime && !minTime && track.duration <= maxTime); 
  });
  
  if(!minTime && !maxTime)
    Session.set('tracks', indexTracks(tracks, true));
  else
    Session.set('tracks', indexTracks(longTracks, true));
};

var search = function(term) {
  term = term.toLowerCase();
  Session.set('tracks',  indexTracks(_.filter(Session.get('tracks'), function(track) {
    return track.title.toLowerCase().indexOf(term) > -1 || track.artist.toLowerCase().indexOf(term) > -1 || track.user.username.toLowerCase().indexOf(term) > -1
  }), true));
};

Template.optionsRow.events = ({
  'keydown #min-length, keydown #max-length' : function(event) {
    if(event.keyCode === 13)
      setTime();
  },
  'click #searchButton, keydown #searchInput' : function(event) {
    if((event.target.id == 'searchInput' && event.keyCode === 13) || event.target.id == 'searchButton')
      search($('#searchInput').val());
  }
});

/*
  Loader
 */

Template.loader.helpers({
  artistPage: function() {
    return Session.get('currentArtist') != null;
  }
})
/*
  App Functions
 */

var getArtist = function(tracks) {
  return _.map(tracks, function(track) {
    var title = track.title;
    track.playstatus = "notplaying";
    if(title.indexOf(track.user.username) === -1 && track.title.indexOf('-') > -1) {
      var checkValid = parseInt(title.substr(0, title.indexOf('-'))) || 0;
      if(checkValid > 0) {
        track.artist = title.substr(title.indexOf('-') + 1, 
                                    title.substr(title.indexOf('-') + 1, 
                                    title.length).indexOf('-'));
        if(track.artist === "")
          track.artist = title.substr(0, title.indexOf('-'));
      } else
        track.artist = title.substr(0, title.indexOf('-'));
      track.titleWithoutArtist = title.substr(title.indexOf('-') + 1, title.length);
    } else {
      if(title.indexOf('-') > -1 && 
         track.user.username.localeCompare(title.substr(0, title.indexOf('-') - 1)) === 0)
        track.titleWithoutArtist = title.substr(title.indexOf('-') + 1, title.length);
      else
        track.titleWithoutArtist = title;
      track.artist = track.user.username;
    }

    return track;
  });
};    

var getTracks = function () {
  // update user's profile description
  var tracks = [], offset = 0;
  if(!madeTracks) {
    Meteor.call("getAccessToken", function(err, res) { access_token = res });
    Meteor.call("getMe", function(error, me) {
      console.log(me.public_favorites_count);
      for(var i = 0; i < Math.ceil(me.public_favorites_count / 200); i++) {
        console.log(i);
        Meteor.call("getFavorites", i, function(error, favorites) {
          console.log(favorites);
          tracks = tracks.concat(prepareTracks(favorites, false));
          Session.set("tracks", tracks);
          Session.set("origTracks", tracks);
        });
      }
       Meteor.call("getPlaylists", function(error, playlists) {
         Session.set("loaded", true);
         Session.set("playlists", playlists);
         Session.set("playlistChange", false);
       });
       
      var allArtists = [];
      for(var i = 0; i < Math.ceil(me.followings_count / 200); i++) {
        Meteor.call("getArtists", i, function(error, artists) {
          allArtists = allArtists.concat(artists);
          Session.set("artists", allArtists);
        });
      }
    });
  }
};

var indexTracks = function(tracksToIndex, newIndex) {
  if(newIndex)
    tIndex = 0;
  
  return _.map(tracksToIndex, function(track) {
    track.index = tIndex++;
    return track;
  });
};

var shuffle = function(array) {
  Session.set('loaded', false);
  for (var i = array.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var temp = array[i];
    array[i] = array[j];
    array[j] = temp;
  }
  Session.set('loaded', true);
  return indexTracks(array, true);
};

var getIds = function(tracks) {
  return _.map(tracks, function(track) {
    return {id: track.id};
  });
};

var setUpWav = function(track) {
  var waveform = new Waveform({
    container: document.getElementById("currentTrackPlayer"),
    innerColor: "#333"
  });
  waveform.dataFromSoundCloudTrack(track);
  var streamOptions = waveform.optionsForSyncedStream();
  streamOptions.onfinish = function() {
    playNextOrPrevTrack(true);
  };
  return streamOptions;
};

var streamTrack = function(id, queue) {
  currentTrackId = id;
  SC.get("/tracks/" + id, function(track){
    Session.set("currentTrack", track);
    togglePauseIcon();
    
    sound = SC.stream("/tracks/" + id, setUpWav(track), function(sound){
      soundManager.stopAll();
      currentTrack = sound;

      if(queue)
        queueOn = true;

      currentTrack.play({
        onload: function() {
          if(this.readyState == 2) 
            playNextOrPrevTrack(true);
        }
      });
    });
  });
};

var addToPlaylistClick = function(tracks, index, id) {
  if(tracks[index].playstatus === "selected") {
    tracks[index].playstatus = "notplaying";
    addToPlaylistQueue = _.filter(addToPlaylistQueue, function(track) { return track.id !== id });
  }
  else {
    tracks[index].playstatus = "selected";
    addToPlaylistQueue.push({id: id});
  }
  Session.set("tracks", tracks);
  
};

var addToQueue = function(node) {
  var queue = Session.get("queue");
  var track = Session.get("tracks")[node.classList[0]];
  track.queueIndex = qIndex++;
  queue.push(track);
  Session.set("queue", queue);
};

var unmountWAV = function() {
  $("#currentTrackPlayer").empty();
};

var stopLastTrack = function(tracks) {
  if(currentTrack) {
    currentTrack.stop();
    unmountWAV();
  
    if(queueOn && $("#" + currentTrackId + "-queue").length) {
      var queue = Session.get("queue");
      queueOn = false;
      queue[$("#" + currentTrackId + "-queue")[0].classList[1]].qplaystatus = "notplaying";
      Session.set("queue", queue);
    }
  }
};

var sortAndSet = function(sort, comparator) {
  var tracks = Session.get("tracks");
  if(Session.get("sortType") === sort)
    Session.set("tracks", indexTracks(tracks.reverse(), true));
  else
    Session.set("tracks", indexTracks(tracks.sort(comparator), true));

  Session.set("sortType", sort);
};

var getTargetTrack = function(target) {
  if(target.classList[0] === "trackItem")
    return target;
  else if(target.classList[0] === "title") 
    return target.parentNode.parentNode.parentNode;
  else if(target.classList[1] === "overlay") 
    return target.parentNode;
  else
    return target.parentNode.parentNode;
};

Template.app.helpers({
  currentTrack: function () {
    return Session.get("playing");
  },
  loaded: function () {
    return Session.get("loaded");
  },
  artistPage: function () {
    return Session.get('currentArtist') != null;
  },
  loggedIn: function () {
    if(Meteor.user()) {
      getTracks();
      $('body').css("background", "none");
      madeTracks = true;
      return true;
    }
    else
      return false;
  },
  artist: function () {
    return Session.get("sortType") === "Artist";
  },
  uploader: function () {
    return Session.get("sortType") === "Uploader";
  },
  titleDoesNotContainUsername: function (title, username) {
    return title.indexOf(username) == -1;
  }
});

 
Template.app.events = ({
  // update user's profile description
  'click .trackItem' : function(event) {
    var tracks = Session.get("tracks"), 
        node = getTargetTrack(event.target);

    if(event.altKey) 
      addToPlaylistClick(tracks, node.classList[0], node.id);
    else if(node.classList[node.classList.length - 1] == 'playlist'){
      Session.set("loaded", false);
      SC.get('/playlists/' + node.id, function(playlist) {
        Session.set("tracks", prepareTracks(playlist.tracks, true));
        Session.set("loaded", true);
      });
    }
    else if(event.target.localName === 'span' && event.target.classList[0] !== 'title')
      return;
    else if (event.shiftKey)
      addToQueue(node);
    else if(tracks[node.classList[0]].id === currentTrackId) {
      currentTrack.togglePause();
    } else {
      Session.set("playing", true);
      stopLastTrack(tracks);
      streamTrack(tracks[node.classList[0]].id, false);
      Session.set("tracks", setPlayingToCurrent(tracks));
    }
  },
  'click .artistSort' : function() {
    sortAndSet("Artist", function(a, b){
      return (a.artist).localeCompare(b.artist);
    });
  },
  'click .uploaderSort' : function() {
    sortAndSet("Uploader", function(a, b){
      return (a.user.username).localeCompare(b.user.username);
    });
  },
  'click .playcountSort' : function() {
    sortAndSet("Play Count", function(a, b){
      return b.playback_count - a.playback_count;
    });
  },
  'click .heartcountSort' : function() {
    sortAndSet("Heart Count", function(a, b){
      return b.favoritings_count - a.favoritings_count;
    });
  },
  'click .creationSort' : function() {
    sortAndSet("Creation Date", function(a, b){
      return (a.created_at).localeCompare(b.created_at);
    });
  },
  'click .searchSort' : function() {
    Session.set("sortType", "Search");
  },
  'click .durationSort' : function() {
    sortAndSet("Duration", function(a, b){
      return b.duration - a.duration;
    });
  },
  'click #shuffle' : function() {
    Session.set("tracks", shuffle(Session.get("tracks")));
  },
  'click .likedateSort' : function() {
    if(Session.get("sortType") === "Like Date")
      Session.set("tracks", Session.get("tracks").reverse());
    else {
      Session.set("tracks", Session.get("origTracks"));
      Session.set("sortType", "Like Date");
    }
  }
});

var setTrackChangeInfo = function(increment) {
  var tracks          = Session.get("tracks"),
      currentTrackRow = $("#" + currentTrackId)[0], 
      currentIndex    = 0, 
      nextToPlay      = 0;

  if(currentTrackRow) {
    currentIndex = parseInt(currentTrackRow.classList[0]);
    nextToPlay = increment ? currentIndex + 1 : currentIndex - 1;
  } 

  if(nextToPlay === tracks.length || nextToPlay < 0)
    nextToPlay = 0;
  
  currentTrackId = tracks[nextToPlay].id;
  Session.set("tracks", setPlayingToCurrent(tracks));

  return tracks[nextToPlay].id;
};

var setTrackChangeInfoQueue = function (increment) {
  var tracks = Session.get("queue"),
      currentIndex = parseInt($("#" + currentTrackId + "-queue")[0].classList[0]),
      nextToPlay = increment ? currentIndex + 1 : currentIndex - 1, stream;

  tracks[currentIndex].qplaystatus = "notplaying";
  if(nextToPlay === tracks.length || nextToPlay < 0) {
    stream = Session.get("tracks");
    stream[0].playstatus = "playing";
    nextId = stream[0].id;
    queueOn = false;
    Session.set("tracks", stream);
  } else {
    tracks[nextToPlay].qplaystatus = "playing";
    nextId = tracks[nextToPlay].id;
  }
  Session.set("queue", tracks);
  return nextId;
};

var playNextOrPrevTrack = function(increment) {
  var nextId;

  unmountWAV();
  if(!queueOn)
    nextId = setTrackChangeInfo(increment);
  else
    nextId = setTrackChangeInfoQueue(increment);

  streamTrack(nextId, queueOn);
};

// ServiceConfiguration.configurations.remove({
//   service: "soundcloud"
// });
// ServiceConfiguration.configurations.insert({
//   service: "soundcloud",
//   clientId: "fc6924c8838d01597bab5ab42807c4ae",
//   secret: "34e89f6e6c855ca21c7b6b881b9e8215"
// });

// Accounts.ui.config({
//   requestPermissions: {
//     soundcloud: []
//   },
//   loginStyle :  "redirect",
//   passwordSignupFields: 'USERNAME_AND_OPTIONAL_EMAIL'
// });
