import { Template } from 'meteor/templating';
import { Session } from 'meteor/session';
import { Meteor } from 'meteor/meteor';
import { Router } from 'meteor/iron:router';
import { $ } from 'meteor/jquery';
import _ from 'lodash';

import { indexTracks } from '../../utilities';

function setTime() {
  const minTime = $('#min-length').val() * 60000;
  const maxTime = $('#max-length').val() * 60000;
  const tracks = Session.get('tracks');

  const longTracks = _.filter(tracks, track =>
    minTime && maxTime && track.duration >= minTime && track.duration <= maxTime
      || minTime && !maxTime && track.duration >= minTime
      || maxTime && !minTime && track.duration <= maxTime
  );

  if (!minTime && !maxTime)
    Session.set('tracks', indexTracks(tracks, true));
  else
    Session.set('tracks', indexTracks(longTracks, true));
}

function sortAndSet(sort, comparator) {
  const tracks = Session.get('tracks');

  if (Session.get('sortType') === sort)
    Session.set('tracks', indexTracks(tracks.reverse(), true));
  else
    Session.set('tracks', indexTracks(tracks.sort(comparator), true));

  Session.set('sortType', sort);
}

let allTracks = null;
function search(term) {
  const procTerm = term.toLowerCase();

  if (procTerm === '')
    Session.set('tracks', allTracks);

  Session.set('tracks', indexTracks(_.filter(allTracks, track =>
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
  Session.set('loaded', false);
  const shuffledArray = array;

  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = array[i];

    shuffledArray[i] = array[j];
    shuffledArray[j] = temp;
  }

  Session.set('loaded', true);
  return indexTracks(shuffledArray, true);
}

function handleRouteChange(route) {
  allTracks = null;
  if ($('.navbar-toggle:visible').length)
    $('.navbar-toggle').click();
  Router.go(route);
}

Template.optionsRow.helpers({
  sortType: () => Session.get('sortType'),
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
  duration: () => Session.get('sortType') === 'Duration',
  search: () => Session.get('sortType') === 'Search',
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
      to = setTimeout(() => {
        if (allTracks == null)
          allTracks = Session.get('tracks');
        search(event.currentTarget.value);
        to = null;
      }, 250);
    }
  },
  'click .artistSort': () => sortAndSet('Artist', (a, b) => a.artist.localeCompare(b.artist)),
  'click .uploaderSort': () => sortAndSet('Uploader', (a, b) => a.user.username.localeCompare(b.user.username)),
  'click .playcountSort': () => sortAndSet('Play Count', (a, b) => b.playback_count - a.playback_count),
  'click .heartcountSort': () => sortAndSet('Heart Count', (a, b) => b.favoritings_count - a.favoritings_count),
  'click .creationSort': () => sortAndSet('Creation Date', (a, b) => a.created_at.localeCompare(b.created_at)),
  'click .durationSort': () => sortAndSet('Duration', (a, b) => b.duration - a.duration),
  'click .searchSort': () => Session.set('sortType', 'Search'),
  'click #shuffle': () => Session.set('tracks', shuffle(Session.get('tracks'))),
  'click .videoSort'() {
    Session.set('tracks', indexTracks(_.filter(Session.get('tracks'), track => {
      if (track.video_url)
        return true;
      else if (track.description && track.description.toLowerCase().indexOf('youtu') > -1)
        return true;

      return false;
    }), true));

    Session.set('sortType', 'Videos');
  },
  'click .likedateSort'() {
    if (Session.get('sortType') === 'Like Date')
      Session.set('tracks', Session.get('tracks').reverse());
    else {
      Session.set('tracks', Session.get('origTracks'));
      Session.set('sortType', 'Like Date');
    }
  },
  'click #log-out': () => Meteor.logout(),
  'click #playlists': () => handleRouteChange('myPlaylists'),
  'click #favorites': () => handleRouteChange('myFavorites'),
  'click #following': () => handleRouteChange('following')
};
