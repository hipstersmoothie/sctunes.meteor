import { Template } from 'meteor/templating';
import { Session } from 'meteor/session';
import { setPlayingToCurrent } from '../../utilities';
import { ReactiveVar } from 'meteor/reactive-var';
import _ from 'lodash';

import Queue from '../Queue/queue';

const pauseIcon = new ReactiveVar(true);
export const trackPosition = new ReactiveVar(0);

export const currentTrack = new ReactiveVar({});
Template.registerHelper('currentTrack', () => currentTrack.get() || { duration: 100 });

let currentSound = null;

export function toggleState() {
  if (currentSound)
    currentSound.togglePause();
}

function stopLastTrack() {
  trackPosition.set(0);
  if (currentSound)
    currentSound.stop();
}

export function streamTrack(track) {
  stopLastTrack();
  currentTrack.set(track);

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
      trackPosition.set(this.position);
    },
    onfinish: () => playNextOrPrevTrack(true) // eslint-disable-line no-use-before-define
  });
}

function findCurrentTrackIndex(array) {
  const cid = currentTrack.get().id;
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
  const tracks = Session.get('tracks'); // eslint-disable-line meteor/no-session
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
    const tracks = Session.get('tracks'); // eslint-disable-line meteor/no-session
    const indexOnPage = findCurrentTrackIndex(tracks);

    if (indexOnPage > -1)
      nextTrack = tracks[indexOnPage + 1];
    else
      nextTrack = tracks[0];

    queue = [];
    Queue.queueAction.set('Show');
  } else {
    nextTrack = queue[nextToPlay];
  }

  Queue.queue.set(setPlayingToCurrent(queue, nextTrack));
  return nextTrack;
}

function playNextOrPrevTrack(increment) {
  let nextTrack;
  const queue = Queue.queue.get('queue');

  if (!queue.length)
    nextTrack = getTracklistTrack(increment);
  else
    nextTrack = setTrackChangeInfoQueue(increment, queue);

  Session.set('tracks', setPlayingToCurrent(Session.get('tracks'), nextTrack));
  streamTrack(nextTrack);
}


Template.player.helpers({
  trackPosition: () => trackPosition.get(),
  trackPercent: () => {
    let v = (trackPosition.get() / currentTrack.get().duration) * 100;
    console.log(v)
    return `${v}%`;
  },
  queueShowing: () => Queue.queueAction.get() === 'Hide',
  pauseIcon: () => pauseIcon.get()
});

Template.player.events({
  'click #time-slider': event => currentSound.setPosition(event.currentTarget.value),
  'click #playpause'() {
    pauseIcon.set(!pauseIcon.get());
    currentSound.togglePause();
  },
  'click #nextButton': () => playNextOrPrevTrack(true),
  'click #prevButton': () => playNextOrPrevTrack(false)
});
