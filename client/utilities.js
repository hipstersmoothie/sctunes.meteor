Meteor.startup(function() {
  Session.set('me', null); 
  Session.set('queue', []); 
  Session.set('tracks', []);
  Session.set('origTracks', []);
  Session.set('artists', null);

  Session.set('currentTrack', null);
  Session.set('player_orientation', [1,-1]);

  Session.set('currentArtist', null);
  Session.set('artistTracks', null);
  Session.set('artistFavorites', null);

  Session.set('loaded', false);
  Session.set('loadingText', '')
  Session.set('artistsLoaded', false);

  Session.set('sortType', 'Like Date');
});

currentTrack = null, 
currentTrackId = null,
queueOn = false;
var tIndex = 0;

/*
  Helper Functions
 */
//TODO REFACTOR
var getArtist = function(tracks) {
  return _.map(tracks, function(track) {
    var title = track.title;
    track.playstatus = 'notplaying';
    if(title.indexOf(track.user.username) === -1 && track.title.indexOf('-') > -1) {
      var checkValid = parseInt(title.substr(0, title.indexOf('-'))) || 0;
      if(checkValid > 0) {
        track.artist = title.substr(title.indexOf('-') + 1, 
                                    title.substr(title.indexOf('-') + 1, 
                                    title.length).indexOf('-'));
        if(track.artist === '')
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

prepareTracks = function(tracks, newIndexes, defaultArt) {
  return setArt(defaultArt, getArtist(indexTracks(tracks, newIndexes)));
};

setArt = function(defaultArt, tracks) {
  return _.map(tracks, function(track) {
    if(track.artwork_url)
      track.big_artwork_url = track.artwork_url.replace('large', 't300x300');
    else
      track.big_artwork_url = track.user.avatar_url.replace('large', 't300x300');
    return track;
  });
};

setPlayingToCurrent = function(tracks) {
  return _.map(tracks, function(track) {
    console.log(track.id == currentTrackId)
    track.playstatus = track.id == currentTrackId ? 'playing' : 'notplaying';
    return track;
  });
};

streamTrack = function(track, queue) {
  currentTrackId = track.id;
	Session.set('currentTrack', track);

	soundManager.stopAll();
	currentTrack = soundManager.createSound({
	    id: track.id,
	    url: track.stream_url + '?client_id=628c0d8bc773cd70e1a32d0236cb79ce',
	    stream: true
	});

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


findTrackWithId = function(tracks, id) {
  for (track in tracks) {
    var data = tracks[track];
    if(data.id == id) 
      return data;
  }
}

var setTrackChangeInfo = function(increment) {
  var tracks          = Session.get('tracks'),
      currentTrackRow = $('#' + currentTrackId)[0], 
      currentIndex    = 0, 
      nextToPlay      = 0;

  if(currentTrackRow) {
    currentIndex = parseInt(findTrackWithId(tracks, currentTrackRow.id).index);
    nextToPlay = increment ? currentIndex + 1 : currentIndex - 1;
  } 

  if(nextToPlay === tracks.length || nextToPlay < 0)
    nextToPlay = 0;
  
  currentTrackId = tracks[nextToPlay].id;
  Session.set('tracks', setPlayingToCurrent(tracks));
  return tracks[nextToPlay];
};

var setTrackChangeInfoQueue = function (increment) {
  var tracks = Session.get('queue'), nextTrack,
      currentIndex = parseInt($('#' + currentTrackId + '-queue')[0].index),
      nextToPlay = increment ? currentIndex + 1 : currentIndex - 1, stream;

  tracks[currentIndex].qplaystatus = 'notplaying';
  if(nextToPlay === tracks.length || nextToPlay < 0) {
    stream = Session.get('tracks');
    stream[0].playstatus = 'playing';
    nextTrack = stream[0];
    queueOn = false;
    Session.set('tracks', stream);
  } else {
    tracks[nextToPlay].qplaystatus = 'playing';
    nextTrack = tracks[nextToPlay];
  }
  Session.set('queue', tracks);
  return nextTrack;
};

playNextOrPrevTrack = function(increment) {
  var nextTrack;

  if(!queueOn)
    nextTrack = setTrackChangeInfo(increment);
  else
    nextTrack = setTrackChangeInfoQueue(increment);

  streamTrack(nextTrack, queueOn);
};

Template.trackLayout.helpers({
  loaded: function () {
    return Session.get('loaded');
  },
  currentTrack: function() {
    return Session.get('currentTrack');
  },
  getTransition: function() {
    var useForPages = Session.get('transitionPages');
    return useForPages ? Session.get('currentTransition') : 'opacity';
  }
});
