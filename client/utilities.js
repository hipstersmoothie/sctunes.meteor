import { Session } from 'meteor/session';
import { Meteor } from 'meteor/meteor';
import { $ } from 'meteor/jquery';
import _ from 'lodash';

currentSound = null;

Meteor.startup(() => {
  Session.set('me', null); 
  Session.set('queue', []); 
  Session.set('queuePlaying', false);
  Session.set('tracks', []);
  Session.set('origTracks', []);
  Session.set('artists', null);

  Session.set('currentTrack', {});
  Session.set('player_orientation', [1,-1]);

  Session.set('currentArtist', null);
  Session.set('artistTracks', null);
  Session.set('artistFavorites', null);

  Session.set('loaded', false);
  Session.set('loadingText', '')
  Session.set('artistsLoaded', false);

  Session.set('sortType', 'Like Date');
});

let tIndex = 0;
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

export function prepareTracks(tracks, newIndexes, defaultArt) {
  return setArt(defaultArt, getArtist(indexTracks(tracks, newIndexes)));
}

export function setPlayingToCurrent(tracks) {
  let currentTrack = Session.get('currentTrack');

  return _.map(tracks, track => {
    track.playstatus = track.id == currentTrack.id ? 'playing' : 'notplaying';
    return track;
  });
}

function stopLastTrack() {
  soundManager.stopAll();
  Session.set('trackPosition', 0);
  if(currentSound)
    currentSound.stop();
}

export function streamTrack(track) {
  stopLastTrack();
	Session.set('currentTrack', track);

	currentSound = soundManager.createSound({
	    id: track.id,
	    url: track.stream_url + '?client_id=628c0d8bc773cd70e1a32d0236cb79ce',
	    stream: true
	});

	if(Session.get('queuePlaying').length)
	  Session.set('queuePlaying', true);

	currentSound.play({
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
      currentTrackRow = $('#' + Session.get('currentTrack').id)[0], 
      currentIndex    = 0, 
      nextToPlay      = 0;

  if(currentTrackRow) {
    currentIndex = parseInt(findTrackWithId(tracks, currentTrackRow.id).index);
    nextToPlay = increment ? currentIndex + 1 : currentIndex - 1;
  } 

  if(nextToPlay === tracks.length || nextToPlay < 0)
    nextToPlay = 0;
  
  Session.set('tracks', setPlayingToCurrent(tracks));
  return tracks[nextToPlay];
}

function findCurrentTrackIndex(array) {
  let cid = Session.get('currentTrack').id;
  let current;

  _.forEach(array, (item, index) => {
    if(item.id == cid) {
      current = index;
      return false;
    }
  });

  return current;
}

function setTrackChangeInfoQueue(increment, queue) {
  var nextTrack, 
      currentIndex = findCurrentTrackIndex(queue), 
      nextToPlay = increment ? currentIndex + 1 : currentIndex - 1;

  if(nextToPlay === queue.length || nextToPlay < 0) {
    Session.set('queuePlaying', false);
    let indexOnPage = findCurrentTrackIndex(Session.get('tracks'))

    if(indexOnPage > -1)
      nextTrack = Session.get('tracks')[indexOnPage + 1];
    else
      nextTrack = Session.get('tracks')[0];
    
    queue = [];
  } else if(currentIndex > -1) {
    queue[currentIndex].playstatus = 'notplaying';
    queue[nextToPlay].playstatus = 'playing';
    nextTrack = queue[nextToPlay];
  } else {
    queue[0].playstatus = 'playing';
    nextTrack = queue[0];
  }

  Session.set('queue', queue);
  return nextTrack;
}

export function playNextOrPrevTrack(increment) {
  let nextTrack;
  let queue = Session.get('queue');

  if(!queue.length)
    nextTrack = setTrackChangeInfo(increment);
  else
    nextTrack = setTrackChangeInfoQueue(increment, queue);

  streamTrack(nextTrack);
}
