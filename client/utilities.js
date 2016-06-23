import { Session } from 'meteor/session';
import { Meteor } from 'meteor/meteor';
import { Tracker } from 'meteor/tracker';
import _ from 'lodash';

currentSound = null;

Meteor.startup(() => {
  Session.set('me', null);
  Session.set('queue', []);
  Session.set('tracks', []);
  Session.set('origTracks', []);
  Session.set('artists', null);

  Session.set('currentTrack', {});
  Session.set('currentArtist', null);
  Session.set('artistTracks', null);
  Session.set('artistFavorites', null);

  Session.set('loaded', false);
  Session.set('loadingText', '');
  Session.set('artistLoaded', true);

  soundManager.setup({
    debugMode: false
  });
});

Tracker.autorun(() => {
  if (Meteor.user() && Meteor.user().services && Meteor.user().services.soundCloud) {
    SC.initialize({
      access_token: Meteor.user().services.soundCloud.accessToken,
      scope: 'non-expiring'
    });
  }
});

let tIndex = 0;
export function indexTracks(tracksToIndex, newIndex) {
  if (newIndex)
    tIndex = 0;

  return _.map(tracksToIndex, track => {
    track.index = tIndex++;
    return track;
  });
}

export function setArt(defaultArt, tracks) {
  return _.map(tracks, track => {
    track.big_artwork_url = (track.artwork_url || track.user.avatar_url).replace('large', 't300x300');
    return track;
  });
}

function getArtist(tracks) {
  return _.map(tracks, track => {
    const title = track.title;
    const beforeHyphen = title.substr(0, title.indexOf('-'));
    const afterHyphen = title.substr(title.indexOf('-') + 1, title.length);
    track.playstatus = 'notplaying';

    if (title.includes(track.user.username) && title.includes('-')) {
      const validId = parseInt(beforeHyphen, 10) || 0;

      if (validId) {
        track.artist = title.substr(title.indexOf('-') + 1, afterHyphen.indexOf('-'));
        if (track.artist === '')
          track.artist = beforeHyphen;
      } else {
        track.artist = beforeHyphen;
      }

      track.titleWithoutArtist = afterHyphen;
    } else {
      if (title.includes('-') &&
         track.user.username.localeCompare(title.substr(0, title.indexOf('-') - 1)) === 0)
        track.titleWithoutArtist = afterHyphen;
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

export function setPlayingToCurrent(tracks, currentTrack = Session.get('currentTrack')) {
  return _.map(tracks, track => {
    track.playstatus = track.id === currentTrack.id ? 'playing' : 'notplaying';
    return track;
  });
}

function stopLastTrack() {
  // soundManager.stopAll();
  Session.set('trackPosition', 0);
  if (currentSound)
    currentSound.stop();
}

export function streamTrack(track) {
  stopLastTrack();
  Session.set('currentTrack', track);

  currentSound = soundManager.createSound({
    id: track.id,
    url: `${track.stream_url}?client_id=628c0d8bc773cd70e1a32d0236cb79ce`,
    stream: true
  });

  currentSound.play({
    onload() {
      if (this.readyState === 2)
        playNextOrPrevTrack(true); // eslint-disable-line no-use-before-define
    },
    whileplaying() {
      Session.set('trackPosition', this.position);
    },
    onfinish: () => playNextOrPrevTrack(true) // eslint-disable-line no-use-before-define
  });
}

export function findTrackWithId(tracks, id) {
  return _.find(tracks, track => track.id === id);
}

function findCurrentTrackIndex(array) {
  const cid = Session.get('currentTrack').id;
  let current = -1;

  _.forEach(array, (item, index) => {
    if (item.id === cid) {
      current = index;
      return false;
    }
  });

  return current;
}

function getTracklistTrack(increment) {
  const tracks = Session.get('tracks');
  const currentIndex = findCurrentTrackIndex(tracks);
  let nextIndex = increment ? currentIndex + 1 : currentIndex - 1;

  if (nextIndex === tracks.length || nextIndex < 0)
    nextIndex = 0;

  return tracks[nextIndex];
}

function setTrackChangeInfoQueue(increment, queue) {
  const currentIndex = findCurrentTrackIndex(queue);
  const nextToPlay = increment ? currentIndex + 1 : currentIndex - 1;

  let nextTrack;

  if (nextToPlay === queue.length || nextToPlay < 0) {
    const indexOnPage = findCurrentTrackIndex(Session.get('tracks'));

    if (indexOnPage > -1)
      nextTrack = Session.get('tracks')[indexOnPage + 1];
    else
      nextTrack = Session.get('tracks')[0];

    queue = [];
    Session.set('queueAction', 'Show');
  } else {
    nextTrack = queue[nextToPlay];
  }

  Session.set('queue', setPlayingToCurrent(queue, nextTrack));
  return nextTrack;
}

export function playNextOrPrevTrack(increment) {
  let nextTrack;
  const queue = Session.get('queue');

  if (!queue.length)
    nextTrack = getTracklistTrack(increment);
  else
    nextTrack = setTrackChangeInfoQueue(increment, queue);

  streamTrack(nextTrack);
}
