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

if (Meteor.isClient) {
  Meteor.startup(function() {
    Session.set("queue", []);
    Session.set("mode", false);
    Session.set("ctTitle", null);
    Session.set("ctUploader", null);
    Session.set("ctArt", null);
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
    Mousetrap.bind('q', function() { Session.set("playlistMode", false);});
    Mousetrap.bind('p', function() {
      Session.set("playlistMode", true);
    });
    Mousetrap.bind('v', function() {
      Session.set("squares", !Session.get("squares"));
    });
  });

  var queueOn = false, 
      addToPlaylistQueue = [], 
      accessTokenS, 
      currentTrack = null, 
      qIndex = 0, tIndex = 0, 
      currentTrackId, 
      madeTracks = false;

  Template.app.create = function() {
    Meteor.loginWithSoundcloud({}, function (err) {
      if (err)
        Session.set('errorMessage', err.reason || 'Unknown error');
    });
  };

  /*
    Playlist Mode Functions
   */

  Template.sidebar.playlistMode = function () {
    // update user's profile description
    return Session.get("mode") === "playlist";
  };

  Template.sidebar.queueTracks = function () {
    // update user's profile description
    return Session.get("queue").length > 0;
  };

  Template.sidebar.playlists = function () {
    // update user's profile description
    if(Session.get("playlistChange"))
      Session.set("playlistChange", false);

    return Session.get("playlists");
  };  

  var setPlayingToCurrent = function(tracks) {
    return _.map(tracks, function(track) {
      track.playstatus = track.id === parseInt(currentTrackId) ? "playing" : "notplaying";
      return track;
    });
  };

  var blinkRow = function(id, blinkClass) {
    $("#" + id).addClass(blinkClass);
    setTimeout(function(){
      $("#" + id).removeClass(blinkClass);
      setTimeout(function(){
        $("#" + id).addClass(blinkClass);
        setTimeout(function(){
          $("#" + id).removeClass(blinkClass);
        }, 300);
      }, 300);
    }, 300);
  };

  Template.sidebar.events = ({
    'click #playlist-mode' : function() {
      if(Session.get('mode') == 'playlist')
        Session.set('mode', 'none');
      else
        Session.set('mode', 'playlist');
    },
    'click .playlistRow' : function(event) {
      Session.set('sortType', 'Like Date');
      if(addToPlaylistQueue < 1) {
        Session.set("loaded", false);
        if(event.target.id.localeCompare("favorites") === 0) {
          Session.set("tracks", setPlayingToCurrent(Session.get("origTracks")));
          Session.set("loaded", true);
        } else {
          SC.get('/playlists/' + event.target.id, function(playlist) {
            Session.set("tracks", setPlayingToCurrent(getArtist(indexTracks(playlist.tracks, true))));
            Session.set("loaded", true);
          });
        }
      } else {
        blinkRow(event.target.id, "selected");
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
        if(currentTrackId === id) {
          currentTrack.togglePause();
          return;
        }
        if(currentTrackId > -1) {
          currentTrack.stop();
          $("#currentTrackPlayer")[0].children[0].remove();
          if(!queueOn) {
            var row = $("#" + currentTrackId)[0];
            if(row)
              tracks[row.classList[0]].playstatus = "notplaying";
          } else
            queue[$("#" + currentTrackId + "-queue")[0].classList[1]].qplaystatus = "notplaying";
        }
        queue[event.target.classList[1]].qplaystatus = "playing";
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
    Queue Mode Functions
   */
  
  Template.sidebar.queue = function () {
    // update user's profile description
    return Session.get("queue");
  };

  /*
    PLayer 
   */
  Template.player.ctTitle = function () {
    return Session.get("ctTitle");
  };

  Template.player.ctUploader = function () {
   return Session.get("ctUploader");
  };

  Template.player.ctArt = function () {
   return Session.get("ctArt");
  };

  Template.player.events = ({
    'click #playpause' : function() {
      var playPause = $('#playPauseIcon');
      if(playPause.hasClass('glyphicon-play')) {
        playPause.removeClass('glyphicon-play');
        playPause.addClass('glyphicon-pause');
      } else {
        playPause.removeClass('glyphicon-pause');
        playPause.addClass('glyphicon-play');
      }
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
  
  Template.trackList.squares = function() {
    return Session.get("squares");
  };

  Template.app.squares = function() {
    return Session.get("squares");
  };

  /*
   Options
   */

  Template.optionsRow.sortType = function () {
    return Session.get("sortType");
  };

  Template.optionsRow.otherSortTypes = function () {
    return Session.get("otherSortTypes");
  };

  Template.optionsRow.duration = function () {
    return Session.get("sortType") === "Duration";
  };

  Template.optionsRow.search = function () {
    return Session.get("sortType") === "Search";
  };

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
      console.log(track.title.toLowerCase().indexOf(term) > -1 || track.artist.toLowerCase().indexOf(term) > -1 || track.user.username.toLowerCase().indexOf(term) > -1, 
        track.user.username.toLowerCase(),
        track.title.toLowerCase(),
        track.artist.toLowerCase());
      return track.title.toLowerCase().indexOf(term) > -1 || track.artist.toLowerCase().indexOf(term) > -1 || track.user.username.toLowerCase().indexOf(term) > -1
    }), true));
  };

  Template.optionsRow.events = ({
    'keydown #min-length' : function(event) {
      if(event.keyCode === 13)
        setTime();
    },
    'keydown #max-length' : function(event) {
      if(event.keyCode === 13)
        setTime();
    },
    'click #searchButton' : function() {
      search($('#searchInput').val());
    }
  });

  /*
    App Functions
   */

  Template.app.currentTrack = function () {
    return Session.get("playing");
  };

  Template.app.loaded = function () {
    return Session.get("loaded");
  };

  Template.app.loggedIn = function () {
    if(Meteor.user()) {
      getTracks();
      $('body').css("background", "none");
      madeTracks = true;
      Session.set("favoritesView", true);
      return true;
    }
    else
      return false;
  };

  Template.app.artist = function () {
    return Session.get("sortType") === "Artist";
  };
   
  Template.app.uploader = function () {
    return Session.get("sortType") === "Uploader";
  };

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
      if(track.artwork_url)
        track.big_artwork_url = (track.artwork_url).replace("large", "t300x300");
      return track;
    });
  };

  var getTracks = function () {
    // update user's profile description
    var tracks = [], offset = 0;
    if(!madeTracks)
      Meteor.call("getAccessToken", function(error, accessToken){
        accessTokenS = accessToken;
        Meteor.call("getMe", accessToken, function(error, me) {
          for(var i = 0; i < Math.ceil(me.public_favorites_count / 200); i++) {
            Meteor.call("getFavorites", accessToken, i, function(error, favorites) {
              var moreTracks     = getArtist(indexTracks(favorites, false)),
                  initializeKeys = tracks ? Object.keys(tracks) : 0;

              i += favorites.length;
              _.forEach(moreTracks, function(track, index) {
                tracks[index + initializeKeys.length] = track;
              });                
              
              Session.set("tracks", tracks);
              Session.set("origTracks", tracks);
            });
          }
           Meteor.call("getPlaylists", accessToken, function(error, playlists) {
             Session.set("loaded", true);
             Session.set("playlists", playlists);
             Session.set("playlistChange", false);
           });
          });
      });
  };

  var indexTracks = function(tracksToIndex, newIndex) {
    if(newIndex)
      tIndex = 0;
    
    return _.map(tracksToIndex, function(track) {
      track.index = tIndex++;
      return track;
    });
  };

  Template.trackList.tracks = function () {
    SC.initialize({
      client_id: 'fc6924c8838d01597bab5ab42807c4ae',
      redirect_uri: 'http://localhost:3000/_oauth/soundcloud?close',
      access_token: accessTokenS
    });
    var tracks = Session.get("tracks");
    return tracks ? Object.keys(tracks).map(function(v) { return tracks[v]; }) : [];
  };

  Template.app.favorites = function () {
    // update user's profile description
    return Session.get("favoritesView");
  };

  Template.app.titleDoesNotContainUsername = function (title, username) {
    // update user's profile description
    return title.indexOf(username) == -1;
  };

  var shuffle = function(array) {
    for (var i = array.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var temp = array[i];
      array[i] = array[j];
      array[j] = temp;
    }
    return indexTracks(array, true);
  };

  var getIds = function(tracks) {
    return _.map(tracks, function(track) {
      return {id: track.id};
    });
  };

  var streamTrack = function(id, queue) {
    SC.get("/tracks/" + id, function(track){
      Session.set("ctTitle", track.title);
      Session.set("ctUploader", track.user.username);
      Session.set("ctArt", track.artwork_url);
      var playPause = $('#playPauseIcon');
        if(playPause.hasClass('glyphicon-play')) {
          playPause.removeClass('glyphicon-play');
          playPause.addClass('glyphicon-pause');
        }
      var waveform = new Waveform({
        container: document.getElementById("currentTrackPlayer"),
        innerColor: "#333"
      });
      waveform.dataFromSoundCloudTrack(track);
      var streamOptions = waveform.optionsForSyncedStream();
      streamOptions.onfinish = function() {
        playNextOrPrevTrack(true);
      };
      sound = SC.stream("/tracks/" + id, streamOptions, function(sound){
        soundManager.stopAll();
        currentTrack = sound;
        currentTrackId = id;
        if(queue)
           queueOn = true;
        currentTrack.play({onload: function() {
          if(this.readyState == 2) 
            playNextOrPrevTrack(true);
        }});
      });
    });
  };

  var addToPlaylistClick = function(tracks, index, id) {
    if(tracks[index].playstatus === "selected")
      tracks[index].playstatus = "notplaying";
    else
      tracks[index].playstatus = "selected";
    Session.set("tracks", tracks);
    addToPlaylistQueue.push({id: id});
  };

  var addToQueue = function(node) {
    blinkRow(node.id, "selectedForQueue");
    var queue = Session.get("queue");
    var track = Session.get("tracks")[node.classList[0]];
    track.queueIndex = qIndex++;
    queue.push(track);
    Session.set("queue", queue);
  };

  var stopLastTrack = function(tracks) {
    if(currentTrack) {
      var currentRow = $("#" + currentTrackId);
      currentTrack.stop();
      $("#currentTrackPlayer")[0].children[0].remove();
      if(currentRow.length)
        tracks[currentRow[0].classList[0]].playstatus = "notplaying";
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
    else if(target.classList[0] === "table")
      return target.parentNode.parentNode;
    else if(target.parentNode.classList[0] === "table")
      return target.parentNode.parentNode.parentNode;
    else
      return target.parentNode;
  };
   
  Template.app.events = ({
    // update user's profile description
    'click .youtube' : function(event) {
      var track = Session.get('tracks')[event.target.id.split('-')[1]];

      console.log(event);
      console.log(event.target.id);
      console.log(track);
    },
    'click .trackItem' : function(event) {
      var tracks = Session.get("tracks"), 
          node = getTargetTrack(event.target);

      if(event.altKey) 
        addToPlaylistClick(tracks, node.classList[0], node.id);
      else if(event.target.localName === 'span')
        return;
      else if (event.shiftKey)
        addToQueue(node);
      else if(tracks[node.classList[0]].id === currentTrackId) {
        currentTrack.togglePause();
      } else {
        Session.set("playing", true);
        stopLastTrack(tracks);
        tracks[node.classList[0]].playstatus = "playing";
        Session.set("tracks", tracks);
        $('#currentTrackRow').modal('show');
        streamTrack(tracks[node.classList[0]].id, false);
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

    tracks[currentIndex].playstatus = "notplaying";
    tracks[nextToPlay].playstatus = "playing";
    Session.set("tracks", tracks);

    return tracks[nextToPlay].id;
  };

  var setTrackChangeInfoQueue = function (increment) {
    var tracks = Session.get("queue"),
        currentIndex = parseInt($("#" + currentTrackId + "-queue")[0].classList[1]),
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

    $("#currentTrackPlayer")[0].children[0].remove();
    if(!queueOn)
      nextId = setTrackChangeInfo(increment);
    else
      nextId = setTrackChangeInfoQueue(increment);

    streamTrack(nextId, queueOn);
  };

  ServiceConfiguration.configurations.remove({
    service: "soundcloud"
  });
  ServiceConfiguration.configurations.insert({
    service: "soundcloud",
    clientId: "fc6924c8838d01597bab5ab42807c4ae",
    secret: "34e89f6e6c855ca21c7b6b881b9e8215"
  });

  Accounts.ui.config({
    requestPermissions: {
      soundcloud: []
    },
    passwordSignupFields: 'USERNAME_AND_OPTIONAL_EMAIL'
  });
}

if (Meteor.isServer) {
  Meteor.startup(function () {
    // code to run on server at startup
         //console.log(ServiceConfiguration.configurations.remove({}));
  });

  Meteor.methods({
    getAccessToken : function() {
      try {
        return Meteor.user().services.soundcloud.accessToken;
      } catch(e) {
        return null;
      }
    },
    getMe : function(accessToken) {
      try {                                                                                            
        return Meteor.http.get("https://api.soundcloud.com/me", {                                      
          params: {                                                                                    
            oauth_token: accessToken,                                                                  
            format: "json"                                                                             
          }                                                                                            
        }).data;                                                                                       
      } catch (err) {                                                                                  
        throw new Error("Failed to fetch identity from Soundcloud. " + err.message);                   
      }
    },
    getFavorites : function(accessToken, offset) {
      try {                                                                                            
        return Meteor.http.get("https://api.soundcloud.com/me/favorites", {                                      
        params: {                                                                                    
            oauth_token: accessToken,                                                                  
            format: "json" ,
            limit: 200,
            offset: offset * 200                                                                            
          }                                                                                            
        }).data;                                                                                       
       } catch (err) {                                                                                  
         throw new Error("Failed to fetch identity from Soundcloud. " + err.message);                   
       }
    },
    getPlaylists : function(accessToken) {
      try {                                                                                            
        return Meteor.http.get("https://api.soundcloud.com/me/playlists", {                                      
        params: {                                                                                    
            oauth_token: accessToken,                                                                  
            format: "json"                                                                     
          }                                                                                            
        }).data;                                                                                       
      } catch (err) {                                                                                  
         throw new Error("Failed to fetch playlists from Soundcloud. " + err.message);                   
      }
    },
    newPlaylist : function(accessToken, playlist) {
      try {                                                                                            
        return Meteor.http.post("https://api.soundcloud.com/me/playlists", {                                      
        params: {   
            data: playlist,                                                                                 
            oauth_token: accessToken,                                                                  
            format: "json"                                                                     
          }                                                                                            
        }).data;                                                                                       
      } catch (err) {                                                                                  
         throw new Error("Failed to make playlist on Soundcloud. " + err.message);                   
      }
    }
  });
}

