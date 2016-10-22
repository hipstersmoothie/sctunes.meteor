import { Template } from 'meteor/templating';
import { Session } from 'meteor/session';
import { TimelineLite } from 'gsap';
import { $ } from 'meteor/jquery';
import { ReactiveVar } from 'meteor/reactive-var';

import { setPlayingToCurrent, findTrackWithId } from '../../utilities';
import Player from '../Player/player';

export const queueAction = new ReactiveVar('Show');
export const queue = new ReactiveVar([]);

let qIndex = 0;
export function add(node) {
  const newQueue = queue.get();
  // eslint-disable-next-line meteor/no-session
  const track = Session.get('tracks')[node.index]; // could go away look at this
  track.queueIndex = qIndex++;
  newQueue.push(track);

  queue.set(newQueue);
}

Template.queue.helpers({
  queue: () => queue.get(),
  action: () => queueAction.get()
});

Template.queue.events({
  'click .showQueue'() {
    const duration = 0.5;

    if (queueAction.get() === 'Show') {
      queueAction.set('Hide');
      new TimelineLite()
        .fromTo($('.footer'), duration, { bottom: 0 }, { bottom: 99 })
        .fromTo($('.queueContainer'), duration, { bottom: 0 }, { bottom: 99 }, 0);
    } else {
      queueAction.set('Show');
      new TimelineLite()
        .fromTo($('.footer'), duration, { bottom: 99 }, { bottom: 0 })
        .fromTo($('.queueContainer'), duration, { bottom: 99 }, { bottom: 0 }, 0);
    }
  },
  'click .queueItem'() {
    const tracks = queue.get();
    Player.streamTrack(findTrackWithId(tracks, this.id));
    queue.set(setPlayingToCurrent(tracks));
  }
});
