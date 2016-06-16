Meteor.startup(() => {
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
function getArtist(tracks) {
  return _.map(tracks, track => {
    let title = track.title;
    track.playstatus = 'notplaying';

    if(title.indexOf(track.user.username) === -1 && track.title.indexOf('-') > -1) {
      let checkValid = parseInt(title.substr(0, title.indexOf('-'))) || 0;
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
}

export function indexTracks(tracksToIndex, newIndex) {
  if(newIndex)
    tIndex = 0;
  
  return _.map(tracksToIndex, track => {
    track.index = tIndex++;
    return track;
  });
}

export function setArt(defaultArt, tracks) {
  return _.map(tracks, track => {
    if(track.artwork_url)
      track.big_artwork_url = track.artwork_url.replace('large', 't300x300');
    else
      track.big_artwork_url = track.user.avatar_url.replace('large', 't300x300');
    return track;
  });
}

export function prepareTracks(tracks, newIndexes, defaultArt) {
  return setArt(defaultArt, getArtist(indexTracks(tracks, newIndexes)));
}

export function setPlayingToCurrent(tracks) {
  return _.map(tracks, track => {
    track.playstatus = track.id == currentTrackId ? 'playing' : 'notplaying';
    return track;
  });
}

export function streamTrack(track, queue) {
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
	      playNextOrPrevTrack(true); // eslint-disable-line no-use-before-define
	  }, 
	  whileplaying: function() { 
      Session.set('trackPosition', this.position) 
    },
	  onfinish:() => playNextOrPrevTrack(true) // eslint-disable-line no-use-before-define
	});
}


export function findTrackWithId(tracks, id) {
  return _.find(tracks, track => track.id == id)
}

function setTrackChangeInfo(increment) {
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
}

function setTrackChangeInfoQueue(increment) {
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
}

/** global playNextOrPrevTrack */
export function playNextOrPrevTrack(increment) {
  var nextTrack;

  if(!queueOn)
    nextTrack = setTrackChangeInfo(increment);
  else
    nextTrack = setTrackChangeInfoQueue(increment);

  streamTrack(nextTrack, queueOn);
}

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
