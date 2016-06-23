import { Session } from 'meteor/session';
import { Meteor } from 'meteor/meteor';
import { Tracker } from 'meteor/tracker';
import { Template } from 'meteor/templating';
import _ from 'lodash';

Meteor.startup(() => {
  Session.set('tracks', []); // eslint-disable-line meteor/no-session
  Session.set('currentTrack', {}); // eslint-disable-line meteor/no-session
  Session.set('currentArtist', null); // eslint-disable-line meteor/no-session

  soundManager.setup({
    debugMode: false
  });
});

// eslint-disable-next-line meteor/no-session
Template.registerHelper('currentTrack', () => Session.get('currentTrack') || { duration: 100 });

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

// eslint-disable-next-line meteor/no-session
export function setPlayingToCurrent(tracks, currentTrack = Session.get('currentTrack')) {
  return _.map(tracks, track => {
    track.playstatus = track.id === currentTrack.id ? 'playing' : 'notplaying';
    return track;
  });
}

export function findTrackWithId(tracks, id) {
  return _.find(tracks, track => track.id === id);
}

