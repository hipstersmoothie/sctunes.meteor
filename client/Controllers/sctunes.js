Meteor.startup(function() {
  Session.set("queue", []);
  Session.set("tracks", []);

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

madeTracks = false, currentTrack = null, addToPlaylistQueue = [];

var queueOn = false, 
    qIndex = 0, tIndex = 0, 
    currentTrackId, 
    access_token;

/*
 Sidebar
 */

Template.login.helpers({
  loggedIn: function() {
    if(Meteor.user())
      Router.go(Session.get('ir.loginRedirectRoute'));
  }
});

setPlayingToCurrent = function(tracks) {
  return _.map(tracks, function(track) {
    track.playstatus = track.id == currentTrackId ? "playing" : "notplaying";
    return track;
  });
};

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
    return Session.get("tracks");
  },
  toTime: function(ms) {
    return msToTime(ms);
  },
  loaded: function () {
    return Session.get("loaded");
  },
  currentTrack: function() {
    return Session.get('currentTrack');
  }
});

Template.trackList.events({
  'click [id*=artist-profile]' : function(event) {
    Router.go('artist', { _id : event.currentTarget.id.split('-')[0] })
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
  },
  'click .trackItem' : function(event) {
    var tracks = Session.get("tracks"), 
        node   = getTargetTrack(event.target);

    if(event.altKey) 
      addToPlaylistClick(tracks, node.classList[0], node.id);
    else if(node.classList[node.classList.length - 1] == 'playlist'){
      Session.set("loaded", false);
      SC.get('/playlists/' + node.id, function(playlist) {
        Session.set("tracks", prepareTracks(playlist.tracks, true, playlist.artwork_url));
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
      streamTrack(tracks[node.classList[0]], false);
      Session.set("tracks", setPlayingToCurrent(tracks));
    }
  },
  artist: function () {
    return Session.get("sortType") === "Artist";
  },
  uploader: function () {
    return Session.get("sortType") === "Uploader";
  },
  titleDoesNotContainUsername: function (title, username) {
    return title.indexOf(username) == -1;
  },
  squares: function() {
    return Session.get("squares");
  }
});

/*
  Helper Functions
 */

prepareTracks = function(tracks, newIndexes, defaultArt) {
  return setArt(defaultArt, getArtist(indexTracks(tracks, newIndexes)));
};

setArt = function(defaultArt, tracks) {
  return _.map(tracks, function(track) {
    if(track.artwork_url)
      track.big_artwork_url = (track.artwork_url).replace("large", "t300x300");
    else {
      track.big_artwork_url = defaultArt ? defaultArt.replace("large", "t300x300") : 'noTrack.jpg';
      track.artwork_url = defaultArt ? defaultArt : 'noTrack.jpg';
    }
    return track;
  })
};

//TODO REFACTOR
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

indexTracks = function(tracksToIndex, newIndex) {
  if(newIndex)
    tIndex = 0;
  
  return _.map(tracksToIndex, function(track) {
    track.index = tIndex++;
    return track;
  });
};

var setUpWav = function(track) {
  console.log(document.getElementById("currentTrackPlayer"));
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

streamTrack = function(track, queue) {
  currentTrackId = track.id;
  Session.set("currentTrack", track);
  setTimeout(function() {
    sound = SC.stream("/tracks/" + track.id, setUpWav(track), function(sound){
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
  });}, 1);
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

unmountWAV = function() {
  _.map(_.rest($("#currentTrackPlayer").children()), function(wav) { 
    wav.remove() 
  });
};

var stopLastTrack = function(tracks) {
  if(currentTrack) {
    currentTrack.stop();
    unmountWAV();
  
    if(queueOn && $("#" + currentTrackId + "-queue").length) {
      var queue = Session.get("queue");
      queueOn = false;
      queue[$("#" + currentTrackId + "-queue")[0].classList[0]].qplaystatus = "notplaying";
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

Template.trackLayout.helpers({
  currentTrack: function () {
    return Session.get("playing");
  },
  artistPage: function () {
    return Session.get('currentArtist') != null;
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

  return tracks[nextToPlay];
};

var setTrackChangeInfoQueue = function (increment) {
  var tracks = Session.get("queue"), nextTrack,
      currentIndex = parseInt($("#" + currentTrackId + "-queue")[0].classList[0]),
      nextToPlay = increment ? currentIndex + 1 : currentIndex - 1, stream;

  tracks[currentIndex].qplaystatus = "notplaying";
  if(nextToPlay === tracks.length || nextToPlay < 0) {
    stream = Session.get("tracks");
    stream[0].playstatus = "playing";
    nextTrack = stream[0];
    queueOn = false;
    Session.set("tracks", stream);
  } else {
    tracks[nextToPlay].qplaystatus = "playing";
    nextTrack = tracks[nextToPlay];
  }
  Session.set("queue", tracks);
  return nextTrack;
};

playNextOrPrevTrack = function(increment) {
  var nextTrack;

  unmountWAV();
  if(!queueOn)
    nextTrack = setTrackChangeInfo(increment);
  else
    nextTrack = setTrackChangeInfoQueue(increment);

  streamTrack(nextTrack, queueOn);
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
