Meteor.startup(function() {
  Session.set("queue", []);
  Session.set("tracks", []);
  Session.set("artists", null);

  Session.set("playlistMode", false);
  Session.set("queueMode", false);
  Session.set("artistMode", false);

  Session.set("currentTrack", null);
  Session.set("player_orientation", [1,-1]);

  Session.set('currentArtist', null);
  Session.set('artistTracks', null);
  Session.set('artistFavorites', null);

  Session.set("loaded", false);
  Session.set('loadingText', "")
  Session.set('artistsLoaded', false);
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

  Mousetrap.bind('q', function() { Session.set("queueMode", !Session.get("queueMode")); });
  Mousetrap.bind('p', function() { Session.set("playlistMode", !Session.get("playlistMode")); });
  Mousetrap.bind('v', function() { Session.set("squares", !Session.get("squares")); });
});

madeTracks = false, 
currentTrack = null, 
addToPlaylistQueue = [], 
identityIsValid = false, 
access_token = null, 
currentTrackId = null,
queueOn = false, 
qIndex = 0;

var tIndex = 0;

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
  var milliseconds = parseInt((duration%1000)/100), 
      seconds = parseInt((duration/1000)%60),
      minutes = parseInt((duration/(1000*60))%60),
      hours = parseInt((duration/(1000*60*60))%24);

  hours = (hours < 10) ? "0" + hours : hours;
  minutes = (minutes < 10) ? "0" + minutes : minutes;
  seconds = (seconds < 10) ? "0" + seconds : seconds;

  return hours + ":" + minutes + ":" + seconds;
}

Template.findNewArtistsList.helpers({
  loaded: function () {
    return Session.get("loaded");
  }
});

Template.trackList.helpers({
  squares: function () {
    return Session.get("squares");
  },
  tracks: function () {
    return Session.get("tracks");
  },
  lots: function() {
    console.log(Session.get("tracks").length);
    return Session.get("tracks").length > 1000;
  },
  toTime: function(ms) {
    return msToTime(ms);
  },
  loaded: function () {
    return Session.get("loaded");
  },
  currentTrack: function() {
    return Session.get('currentTrack');
  },
  playing: function() {
    return Session.get("playing");
  }
});

Template.trackList.events({
  'click [id*=artist-profile]' : function(event) {
    Router.go('artist', { _id : event.currentTarget.id.split('-')[0] });
  },
  'click .heartCount' : function(event) {
    try {
      if(event.target.classList[1] === 'hearted')
        SC.delete('/me/favorites/' + event.target.parentNode.parentNode.parentNode.id);
      else {
        identityIsValid = false;
        SC.put('/me/favorites/' + event.target.parentNode.parentNode.parentNode.id);
      }
    } catch (error) {
      console.log('ioeno');
    }

    var tracks = Session.get('tracks');
    var track = _.find(tracks, function(track) {
      return track.id == event.target.parentNode.parentNode.parentNode.id;
    });
    track.user_favorite = !track.user_favorite;
    tracks[track.index] = track;
    Session.set('tracks', tracks);
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
  });
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

var setUpWav = function(track, block) {
  var waveform = new Waveform({
    container: document.getElementById("currentTrackPlayer"),
    innerColor: "#333"
  });

  waveform.dataFromSoundCloudTrack(track);
  var streamOptions = waveform.optionsForSyncedStream();
  streamOptions.onfinish = function() {
    playNextOrPrevTrack(true, block);
  };
  return streamOptions;
};

streamTrack = function(track, queue, block) {
  console.log(block)
  currentTrackId = track.id;
  Session.set("currentTrack", track);
  setTimeout(function() { //why timeout?
    sound = SC.stream("/tracks/" + track.id, setUpWav(track, block), function(sound){
    soundManager.stopAll();
    currentTrack = sound;

    if(queue)
      queueOn = true;

    currentTrack.play({
      onload: function() {
        if(this.readyState == 2) 
          playNextOrPrevTrack(true, block);
      }
    });
  });}, 1);
};

var addToPlaylistClick = function(tracks, index, id) {
  if(tracks[index].playstatus === "selected") {
    tracks[index].playstatus = "notplaying";
    addToPlaylistQueue = _.filter(addToPlaylistQueue, function(track) { return track.id !== id; });
  }
  else {
    tracks[index].playstatus = "selected";
    addToPlaylistQueue.push({id: id});
  }
  Session.set("tracks", tracks);
  
};

var addToQueue = function(node) {
  var queue = Session.get("queue");
  var track = Session.get("tracks")[node.index];
  Session.set("queueMode", true);
  track.queueIndex = qIndex++;
  queue.push(track);
  Session.set("queue", queue);
};

unmountWAV = function() {
  _.map(_.rest($("#currentTrackPlayer").children()), function(wav) { 
    wav.remove();
  });
};

var sortAndSet = function(sort, comparator) {
  var tracks = Session.get("tracks");
  if(Session.get("sortType") === sort)
    Session.set("tracks", indexTracks(tracks.reverse(), true));
  else
    Session.set("tracks", indexTracks(tracks.sort(comparator), true));

  Session.set("sortType", sort);
};

Template.trackLayout.helpers({
  currentTrack: function () {
    return Session.get("playing");
  },
  artistPage: function () {
    return Session.get('currentArtist') != null ? "artistLoader" : "";
  }
});

var setTrackChangeInfo = function(increment, block  ) {
  var tracks          = Session.get("tracks"),
      currentTrackRow = $("#" + currentTrackId)[0], 
      currentIndex    = 0, 
      nextToPlay      = 0;

  if(currentTrackRow) {
    currentIndex = parseInt(findTrackWithId(tracks, currentTrackRow.id).index);
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
      currentIndex = parseInt($("#" + currentTrackId + "-queue")[0].index),
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

playNextOrPrevTrack = function(increment, block) {
  var nextTrack;

  unmountWAV();
  if(!queueOn)
    nextTrack = setTrackChangeInfo(increment, block);
  else
    nextTrack = setTrackChangeInfoQueue(increment);

  if (cTrack != null) {//[nextTrack.index].blazeView.fview.children[0].children[1]
    cTrack.parent.view.flip({ curve : 'easeOutBounce', duration : 350});
    cTrack = FView.byId('famous-track-list').children[0].children[nextTrack.index].blazeView.fview.children[0].children[0].children[1];
    setTimeout(function(){ cTrack.parent.view.flip({ curve : 'easeOutBounce', duration : 500}); }, 400);
    

    
  }

  streamTrack(nextTrack, queueOn, block);
};

Storage.prototype.setObject = function(key, value) {
    this.setItem(key, JSON.stringify(value));
};

Storage.prototype.getObject = function(key) {
    var value = this.getItem(key);
    return value && JSON.parse(value);
};
