Template.trackList.helpers({
  tracks: function () {
    return Session.get("tracks");
  },
  lots: function() {
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
});

Template.trackList.events({
  'click .trackItem' : function(event) {
    console.log(event)
    var tracks = Session.get("tracks");

    // if(event.altKey)
    //   addToPlaylistClick(tracks, this.index, this.id);
    if(this.kind == 'playlist'){
      Session.set("loaded", false);
      SC.get('/playlists/' + this.id, function(playlist) {
        Session.set("tracks", prepareTracks(playlist.tracks, true, playlist.artwork_url));
        Session.set("loaded", true);
      });
    } else if (event.shiftKey)
      addToQueue(this);
    else if(this.id == currentTrackId)
      currentTrack.togglePause();
    else { 
      Session.set("playing", true);
      stopLastTrack();
      streamTrack(findTrackWithId(tracks, this.id), false);
      Session.set("tracks", setPlayingToCurrent(tracks));
    }
  },
  'click [id*=artist-profile]' : function(event) {
    event.stopPropagation()
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
});  

var addToQueue = function(node) {
  var queue = Session.get("queue");
  var track = Session.get("tracks")[node.index];
  Session.set("queueMode", true);
  track.queueIndex = qIndex++;
  queue.push(track);
  Session.set("queue", queue);
};

var stopLastTrack = function() {
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