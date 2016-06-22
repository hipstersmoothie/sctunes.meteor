import { Template } from 'meteor/templating';
import { Session } from 'meteor/session';
import { TimelineLite } from 'gsap';
import { $ } from 'meteor/jquery';

import { streamTrack, setPlayingToCurrent, findTrackWithId } from '../../utilities';

Session.set('queueAction', 'Show');

Template.queue.helpers({
  queue: () => Session.get('queue'),
  action: () => Session.get('queueAction')
});

Template.queue.events({
  'click .showQueue'() {
    const duration = 1.2;

    if (Session.get('queueAction') === 'Show') {
      Session.set('queueAction', 'Hide');
      new TimelineLite()
        .fromTo($('.footer'), duration, { bottom: 0 }, { bottom: 99 })
        .fromTo($('.queueContainer'), duration, { bottom: 0 }, { bottom: 99 }, 0);
    } else {
      Session.set('queueAction', 'Show');
      new TimelineLite()
        .fromTo($('.footer'), duration, { bottom: 99 }, { bottom: 0 })
        .fromTo($('.queueContainer'), duration, { bottom: 99 }, { bottom: 0 }, 0);
    }
  },
  'click .queueItem'() {
    const queue = Session.get('queue');
    streamTrack(findTrackWithId(queue, this.id));
    Session.set('queue', setPlayingToCurrent(queue));
  }
});
