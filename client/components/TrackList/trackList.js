import { Template } from 'meteor/templating';
import { Session } from 'meteor/session';
import { Router } from 'meteor/iron:router';
import { $ } from 'meteor/jquery';
import _ from 'lodash';
import { TimelineLite } from 'gsap';

import { setPlayingToCurrent, prepareTracks, findTrackWithId } from '../../utilities';
import Queue from '../Queue/queue';
import Player from '../Player/player';
import Loader from '../Loader/loader';

function addToQueue(node) {
  const orange = '#ee7600';
  const origColor = $(`#${node.id} .overlay`).css('backgroundColor');
  const duration = 0.4;
  const queueMessage = $(`#${node.id} .queueMessage`);

  new TimelineLite()
    .to(queueMessage, duration, { backgroundColor: orange, opacity: 1, zIndex: 10 })
    .to(queueMessage, duration, { backgroundColor: origColor })
    .to(queueMessage, duration, { backgroundColor: orange })
    .to(queueMessage, duration, { backgroundColor: origColor, clearProps: 'all' });

  Queue.add(node);
}

function msToTime(duration) {
  let seconds = parseInt(duration / 1000 % 60, 10);
  let minutes = parseInt(duration / (1000 * 60) % 60, 10);
  let hours = parseInt(duration / (1000 * 60 * 60) % 24, 10);

  hours = hours < 10 ? `0 ${hours}` : hours;
  minutes = minutes < 10 ? `0 ${minutes}` : minutes;
  seconds = seconds < 10 ? `0 ${seconds}` : seconds;

  return `${hours}:${minutes}:${seconds}`;
}

Template.trackList.helpers({
  tracks: () => Session.get('tracks'), // eslint-disable-line meteor/no-session
  toTime: (ms) => msToTime(ms)
});

Template.trackList.events({
  'click .trackItem'(event) {
    const tracks = Session.get('tracks'); // eslint-disable-line meteor/no-session

    // if(event.altKey)
    //   addToPlaylistClick(tracks, this.index, this.id);
    if (this.kind === 'playlist') {
      Loader.on();
      SC.get(`/playlists/${this.id}`, playlist => {
        // eslint-disable-next-line meteor/no-session
        Session.set('tracks', prepareTracks(playlist.tracks, true, playlist.artwork_url));
        Loader.off();
      });
    } else if (event.shiftKey)
      addToQueue(this);
    else if (this.id === Player.currentTrack.get().id) // eslint-disable-line meteor/no-session
      currentSound.togglePause();
    else {
      Player.streamTrack(findTrackWithId(tracks, this.id));
      Session.set('tracks', setPlayingToCurrent(tracks)); // eslint-disable-line meteor/no-session
    }
  },
  'click [id*=artist-profile]'(event) {
    event.stopPropagation();
    Router.go('artist', { _id: event.currentTarget.id.split('-')[0] });
  },
  'click .heartCount'(event) {
    try {
      if (event.target.classList[1] === 'hearted')
        SC.delete(`/me/favorites/${event.target.parentNode.parentNode.parentNode.id}`);
      else {
        SC.put(`/me/favorites/${event.target.parentNode.parentNode.parentNode.id}`);
      }
    } catch (error) {
      console.log('ioeno');
    }

    const tracks = Session.get('tracks'); // eslint-disable-line meteor/no-session
    const track = _.find(tracks, node => node.id === event.target.parentNode.parentNode.parentNode.id);

    track.user_favorite = !track.user_favorite;
    tracks[track.index] = track;
    Session.set('tracks', tracks); // eslint-disable-line meteor/no-session
  }
});
