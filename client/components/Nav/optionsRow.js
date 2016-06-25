import { Template } from 'meteor/templating';
import { Session } from 'meteor/session';
import { Meteor } from 'meteor/meteor';
import { Router } from 'meteor/iron:router';
import { ReactiveVar } from 'meteor/reactive-var';
import { $ } from 'meteor/jquery';
import _ from 'lodash';

import { indexTracks } from '../../utilities';
import { cache } from '../../routes';

const comparators = {
  Artist: (a, b) => a.artist.localeCompare(b.artist),
  Uploader: (a, b) => a.user.username.localeCompare(b.user.username),
  'Play Count': (a, b) => b.playback_count - a.playback_count,
  'Heart Count': (a, b) => b.favoritings_count - a.favoritings_count,
  'Creation Date': (a, b) => a.created_at.localeCompare(b.created_at),
  Duration: (a, b) => b.duration - a.duration
};

const sortType = new ReactiveVar('Like Date');
export const resetSort = () => sortType.set('Like Date');
export const sort = (tracks) => {
  if (sortType.get() === 'Like Date')
    return tracks;

  return indexTracks(tracks.slice().sort(comparators[sortType.get()]), true);
};

function setTime() {
  const minTime = $('#min-length').val() * 60000;
  const maxTime = $('#max-length').val() * 60000;
  const tracks = Session.get('tracks'); // eslint-disable-line meteor/no-session

  const longTracks = _.filter(tracks, track =>
    minTime && maxTime && track.duration >= minTime && track.duration <= maxTime
      || minTime && !maxTime && track.duration >= minTime
      || maxTime && !minTime && track.duration <= maxTime
  );

  if (!minTime && !maxTime)
    Session.set('tracks', indexTracks(tracks, true)); // eslint-disable-line meteor/no-session
  else
    Session.set('tracks', indexTracks(longTracks, true)); // eslint-disable-line meteor/no-session
}

function sortAndSet(sortName) {
  const tracks = Session.get('tracks'); // eslint-disable-line meteor/no-session

  if (sortType.get() === sort)
    Session.set('tracks', indexTracks(tracks.reverse(), true)); // eslint-disable-line meteor/no-session
  else
    Session.set('tracks', indexTracks(tracks.sort(comparators[sortName]), true));

  sortType.set(sortName);
}

let allTracks = null;
function search(term) {
  const procTerm = term.toLowerCase();

  if (procTerm === '')
    Session.set('tracks', allTracks); // eslint-disable-line meteor/no-session

  Session.set('tracks', indexTracks(_.filter(allTracks, track => // eslint-disable-line meteor/no-session
    track.title.toLowerCase().indexOf(procTerm) > -1 ||
      track.artist && track.artist.toLowerCase().indexOf(procTerm) > -1 ||
      track.user.username.toLowerCase().indexOf(procTerm) > -1
  ), true));
}

// var videos = function() {
//   Session.set('tracks',  indexTracks(_.filter(allTracks, track => {
//     console.log(track);
//     return track.description.toLowerCase().indexOf('youtu') > -1;
//   }), true));
// };

function shuffle(array) {
  const shuffledArray = array;

  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = array[i];

    shuffledArray[i] = array[j];
    shuffledArray[j] = temp;
  }

  return indexTracks(shuffledArray, true);
}

function handleRouteChange(route) {
  allTracks = null;
  if ($('.navbar-toggle:visible').length)
    $('.navbar-toggle').click();
  Router.go(route);
}

Template.optionsRow.helpers({
  sortType: () => sortType.get(),
  otherSortTypes: () => [
    { type: 'Like Date', className: 'likedateSort' },
    { type: 'Artist', className: 'artistSort' },
    { type: 'Uploader', className: 'uploaderSort' },
    { type: 'Play Count', className: 'playcountSort' },
    { type: 'Heart Count', className: 'heartcountSort' },
    { type: 'Creation Date', className: 'creationSort' },
    { type: 'Duration', className: 'durationSort' },
    { type: 'Search', className: 'searchSort' },
    { type: 'Videos', className: 'videoSort' }
  ],
  duration: () => sortType.get() === 'Duration',
  search: () => sortType.get() === 'Search',
  isActive: (name) => {
    if (name === Router.current().route.getName() ||
      name === 'myFavorites' && Router.current().route.getName() === 'app')
      return 'active';
  }
});

Template.optionsRow.events = {
  'keydown #min-length, keydown #max-length'(event) {
    if (event.keyCode === 13)
      setTime();
  },
  'keyup #searchInput'(event) {
    let to;

    if (!to) {
      to = Meteor.defer(() => {
        if (allTracks == null)
          allTracks = Session.get('tracks'); // eslint-disable-line meteor/no-session
        search(event.currentTarget.value);
        to = null;
      }, 250);
    }
  },
  'click .artistSort': () => sortAndSet('Artist'),
  'click .uploaderSort': () => sortAndSet('Uploader'),
  'click .playcountSort': () => sortAndSet('Play Count'),
  'click .heartcountSort': () => sortAndSet('Heart Count'),
  'click .creationSort': () => sortAndSet('Creation Date'),
  'click .durationSort': () => sortAndSet('Duration'),
  'click .searchSort': () => sortType.set('Search'),
  // eslint-disable-next-line meteor/no-session
  'click #shuffle': () => Session.set('tracks', shuffle(Session.get('tracks'))),
  'click .videoSort'() {
    // eslint-disable-next-line meteor/no-session
    Session.set('tracks', indexTracks(_.filter(Session.get('tracks'), track => {
      if (track.video_url)
        return true;
      else if (track.description && track.description.toLowerCase().indexOf('youtu') > -1)
        return true;

      return false;
    }), true));

    sortType.set('Videos');
  },
  'click .likedateSort'() {
    if (sortType.get() === 'Like Date')
      Session.set('tracks', Session.get('tracks').reverse()); // eslint-disable-line meteor/no-session
    else {
      Session.set('tracks', cache.favorites);  // eslint-disable-line meteor/no-session
      sortType.set('Like Date');
    }
  },
  'click #log-out': () => Meteor.logout(),
  'click #playlists': () => handleRouteChange('myPlaylists'),
  'click #favorites': () => handleRouteChange('myFavorites'),
  'click #following': () => handleRouteChange('following')
};
