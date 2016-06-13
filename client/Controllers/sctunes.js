Meteor.startup(function() {
  Session.set("queue", []); 
  Session.set("tracks", []);
  Session.set("artists", null);

  Session.set("currentTrack", null);
  Session.set("player_orientation", [1,-1]);

  Session.set('currentArtist', null);
  Session.set('artistTracks', null);
  Session.set('artistFavorites', null);

  Session.set("loaded", false);
  Session.set('loadingText', "")
  Session.set('artistsLoaded', false);

  Session.set("sortType", "Like Date");
});

madeTracks = false, 
currentTrack = null, 
addToPlaylistQueue = [], 
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

Template.artistList.helpers({
  artists: function () {
    return Session.get("artists");
  },
  loaded: function () {
    return Session.get("loaded");
  },
  lots: function () {
    return Session.get("artists").length > 1000;
  }
});

Template.artist_front.helpers({
  big : function (artwork_url) {
    return (artwork_url).replace('large', 't300x300');
  }
});

Template.artist_front.events = ({
  'click [id*=artist-profile]' : function(event) {
    $($('#following')[0].parentNode).addClass('orange').siblings().removeClass('orange');
    Router.go('artist', { _id : event.currentTarget.id.split('-')[0] });
  }
});

var listHelpers = {
  tracks: function () {
    console.log(Session.get("tracks"));
    return Session.get("tracks");
  },
  lots: function() {
    console.log(Session.get('me').public_favorites_count > 1000);
    return Session.get('me').public_favorites_count > 1000;
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
  artist: function() {
    return Session.get('currentArtist') != null;
  }
};

var listEvents = {
    'click .trackItem' : function(event) {
      var tracks = Session.get("tracks"), 
          node   = getTargetTrack(event.target);
          console.log(node)
      if(event.altKey)
        addToPlaylistClick(tracks, node.index, node.id);
      else if(node.classList[node.classList.length - 1] == 'playlist'){
        Session.set("loaded", false);
        SC.get('/playlists/' + node.id, function(playlist) {
          Session.set("tracks", prepareTracks(playlist.tracks, true, playlist.artwork_url));
          Session.set("loaded", true);
        });
      } else if(event.target.localName === 'span' && event.target.index !== 'title') 
        return;
      else if (event.shiftKey)
        addToQueue(node);
      else if(node.id == currentTrackId)
        currentTrack.togglePause();
      else { 
        Session.set("playing", true);
        stopLastTrack(tracks);
        streamTrack(findTrackWithId(tracks, node.id), false);
        Session.set("tracks", setPlayingToCurrent(tracks));
      }
    },
  'click [id*=artist-profile]' : function(event) {
    Router.go('artist', { _id : event.currentTarget.id.split('-')[0] });
  },
  'click .heartCount' : function(event) {
    try {
      if(event.target.classList[1] === 'hearted')
        SC.delete('/me/favorites/' + event.target.parentNode.parentNode.parentNode.id);
      else {
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
  }
};

Template.trackList.helpers(listHelpers);
Template.likeList.helpers(listHelpers);

Template.trackList.rendered = function() {
  //getMoreTracks();
}

Template.trackList.events(listEvents);  
Template.likeList.helpers(listEvents);
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
    else
      track.big_artwork_url = (track.user.avatar_url).replace("large", "t300x300");
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

streamTrack = function(track, queue) {
  	currentTrackId = track.id;
	Session.set("currentTrack", track);

	soundManager.stopAll();
	sound = soundManager.createSound({
	    id: track.id,
	    url: track.stream_url + "?client_id=628c0d8bc773cd70e1a32d0236cb79ce",
	    stream: true
	});
	currentTrack = sound;

	if(queue)
	  queueOn = true;

	currentTrack.play({
	  onload: function() {
	    if(this.readyState == 2) 
	      playNextOrPrevTrack(true);
	  }, 
	  whileplaying: function() {
	  	Session.set('trackPosition', this.position);
	  },
	  onfinish: function() {
	    playNextOrPrevTrack(true);
	  }
	});
};

var addToQueue = function(node) {
  console.log(node)
  var queue = Session.get("queue");
  var track = Session.get("tracks")[node.index];
  Session.set("queueMode", true);
  track.queueIndex = qIndex++;
  queue.push(track);
  Session.set("queue", queue);
};

Template.trackLayout.helpers({
  loaded: function () {
    return Session.get("loaded");
  },
  currentTrack: function() {
    return Session.get('currentTrack');
  },
  getTransition: function() {
    var useForPages = Session.get('transitionPages');
    return useForPages ? Session.get('currentTransition') : 'opacity';
  }
});

var setTrackChangeInfo = function(increment) {
  console.log('foo')
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
console.log(nextToPlay)
  return tracks[nextToPlay];
};

var setTrackChangeInfoQueue = function (increment) {
  console.log('foo2')
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

playNextOrPrevTrack = function(increment) {
  var nextTrack;

  // unmountWAV();
  if(!queueOn)
    nextTrack = setTrackChangeInfo(increment);
  else
    nextTrack = setTrackChangeInfoQueue(increment);

  streamTrack(nextTrack, queueOn);
};

function findTrackWithId(tracks, id) {
	for (track in tracks) {
	  var data = tracks[track];
	  if(data.id == id) 
	    return data;
	}
}


var getTargetTrack = function(target) {
  console.log(target.classList)
	if(target.index === "trackItem")
	  return target;
	else if(target.index === "title") 
	  return target.parentNode.parentNode.parentNode;
	else if(target.classList.value.indexOf("overlay") > -1 ) 
	  return target.parentNode;
	else if(target.classList.value.indexOf("play") > -1 ) 
	  return target.parentNode.parentNode.parentNode;
	else 
	  return target.parentNode.parentNode;
};

var stopLastTrack = function(tracks) {
	if(currentTrack) {
	  Session.set('trackPosition', 0);
	  currentTrack.stop();

	  if(queueOn && $("#" + currentTrackId + "-queue").length) {
	    var queue = Session.get("queue");
	    queueOn = false;
	    queue[$("#" + currentTrackId + "-queue")[0].index].qplaystatus = "notplaying";
	    Session.set("queue", queue);
	  }
	}
};