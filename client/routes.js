import { Session } from 'meteor/session';
import { Meteor } from 'meteor/meteor';
import { Router } from 'meteor/iron:router';
import { Template } from 'meteor/templating';
import { ReactiveDict } from 'meteor/reactive-dict';
import { ReactiveVar } from 'meteor/reactive-var';

import _ from 'lodash';
import { sort, resetSort } from './components/Nav/optionsRow.js';
import loader from './components/Loader/loader.js';

import { setArt, setPlayingToCurrent, prepareTracks } from './utilities';

export const cache = {
  favorites: null,
  likedPlaylists: null,
  followedArtists: null,

  artistplaylists: null,
  artistlikes: null,
  artiststream: null
};

const dataStore = new ReactiveDict();
Template.registerHelper('artists', () => dataStore.get('artists'));

const artistLoaded = new ReactiveVar(true);
Template.registerHelper('artistLoaded', () => artistLoaded.get());

function getRoute({ user, route, experimental = false, sessionVar, length,
    source = Session, prepFunction = arr => arr, callback }) {
  const text = `Getting ${route}`;
  const startRoute = Router.current().route.getName();
  loader.text(`${text}...`);

  let collection = [];
  function resolve(items) {
    if (startRoute === Router.current().route.getName()) {
      collection = collection.concat(prepFunction(items.collection));
      loader.text(`${text}: ${collection.length}${length ? ` of ${length}` : ''}`);

      if (items.next_href)
        SC.get(items.next_href, resolve);
      else {
        source.set(sessionVar, sort(collection));
        loader.off();
        if (callback) callback(collection);
      }
    }
  }

  SC.get(`https://api.soundcloud.com${experimental ? '/e1' : ''}/users/${user}/${route}`, {
    limit: 200,
    linked_partitioning: 1
  }, resolve);
}

function getFollowedArtists(me) {
  getRoute({
    user: me.id,
    route: 'followings',
    source: dataStore,
    sessionVar: 'artists',
    length: me.followings_count,
    callback: artists => { cache.followedArtists = artists; }
  });
}

function getTracks(me) {
  getRoute({
    user: me.id,
    route: 'favorites',
    sessionVar: 'tracks',
    length: me.public_favorites_count,
    prepFunction: tracks => _.map(prepareTracks(tracks), track => {
      track.user_favorite = true;
      return track;
    }),
    callback: artists => { cache.favorites = artists; }
  });
}

function extractSongsAndPlaylists(tracks) {
  return _.map(_.filter(tracks, track => track.track || track.playlist), track => track.track || track.playlist);
}

function getLikePlaylists(me) {
  getRoute({
    user: me.id,
    route: 'playlist_likes',
    experimental: true,
    sessionVar: 'tracks',
    prepFunction: playlists => setArt(playlists.artwork_url, extractSongsAndPlaylists(playlists)),
    callback: allPlaylist => { cache.likedPlaylists = allPlaylist; }
  });
}

function getResource(type, artist, resourceCount, processFunc) {
  const currentData = cache[`artist${type}`];

  if (currentData && currentData.data && currentData.id === artist.id) {
    Session.set('tracks', setPlayingToCurrent(currentData.data)); // eslint-disable-line meteor/no-session
    return artistLoaded.set(true);
  }

  getRoute({
    user: artist.id,
    route: type,
    experimental: type !== 'playlists',
    sessionVar: 'tracks',
    length: artist[resourceCount],
    prepFunction: data => setPlayingToCurrent(processFunc(data)),
    callback: data => {
      cache[`artist${type}`] = {
        data,
        id: artist.id
      };
      artistLoaded.set(true);
    }
  });

  if (artist[resourceCount] < 1) {
    // toastr.error('User has no' + type + '!');
    artistLoaded.set(true);
  }
}

function getArtistPlaylists(artist) {
  getResource('playlists', artist, 'playlist_count', _.bind(setArt, this, artist));
}

function splitData(artist, data) {
  return prepareTracks(extractSongsAndPlaylists(data), true, artist.avatar_url);
}

function getFavorites(artist) {
  getResource('likes', artist, 'public_favorites_count', _.bind(splitData, this, artist));
}

function collapseTracksInPlaylist(data) {
  const tracksInPlaylist = _.chain(data)
    .filter(node => node.track_count)
    .map(playlist => _.map(playlist.tracks, track => track.id))
    .flatten()
    .value();

  return _.filter(data, node => tracksInPlaylist.indexOf(node.id) === -1);
}

function getArtistTracks(artist) {
  getResource('stream', artist, 'track_count', (data) => collapseTracksInPlaylist(splitData(artist, data)));
}

function loadArtist(id, resource) {
  const currentArtist = Session.get('currentArtist'); // eslint-disable-line meteor/no-session
  artistLoaded.set(false);
  loader.text('Getting user\'s profile...');

  function chooseResource(resourceName, artist) {
    if (resourceName === 'favorites' || artist.track_count === 0)
      return getFavorites(artist);
    else if (resource === 'playlists')
      return getArtistPlaylists(artist);

    return getArtistTracks(artist);
  }

  if (currentArtist && currentArtist.id === id)
    chooseResource(resource, currentArtist);
  else
    Meteor.call('getArtist', id, (error, info) => {
      info.big_avatar = info.avatar_url.replace('large', 't300x300');
      cache.artiststream = null;
      cache.artistlikes = null;
      cache.artistplaylists = null;
      Session.set('currentArtist', info); // eslint-disable-line meteor/no-session

      chooseResource(resource, info);
    });
}

Router.configure({
  layoutTemplate: 'trackLayout',
  templateNameConverter: 'upperCamelCase'
});

Router.plugin('auth', {
  authenticate: {
    route: 'login'
  }
});

// With options on use
Router.onBeforeAction('authenticate', {
  authenticate: {
    layout: 'ApplicationLayout',
    template: 'login'
  },
  except: ['login']
});

Router.onBeforeAction(function onBeforeAction() {
  resetSort();
  this.next();
});

Router.configure({
  authenticate: 'login'
});

let identity;
function initRoot() {
  loader.on();

  if (cache.favorites) {
    Session.set('tracks', setPlayingToCurrent(cache.favorites, {})); // eslint-disable-line meteor/no-session
    loader.off();
  } else {
    Meteor.call('getMe', (error, me) => {
      identity = me;
      getTracks(me);
    });
  }

  this.next();
}

Router.map(function() {// eslint-disable-line
  this.route('app', {
    path: '/',
    layoutTemplate: 'trackLayout',
    template: 'trackList',
    onBeforeAction: initRoot
  });

  this.route('myFavorites', {
    path: '/favorites',
    layoutTemplate: 'trackLayout',
    template: 'trackList',
    onBeforeAction: initRoot
  });

  this.route('following', {
    path: '/following',
    layoutTemplate: 'trackLayout',
    template: 'artistList',
    onBeforeAction() {
      loader.on();

      if (!cache.followedArtists) {
        if (!identity)
          Meteor.call('getMe', (error, me) => {
            identity = me;
            getFollowedArtists(identity);
          });
        else
          getFollowedArtists(identity);
      } else {
        loader.off();
      }

      this.next();
    }
  });

  this.route('myPlaylists', {
    path: '/likedPlaylists',
    layoutTemplate: 'trackLayout',
    template: 'trackList',
    onBeforeAction() {
      loader.on();

      if (cache.likedPlaylists) {
        Session.set('tracks', cache.likedPlaylists); // eslint-disable-line meteor/no-session
        loader.off();
      } else if (!identity)
        Meteor.call('getMe', (error, me) => {
          identity = me;
          getLikePlaylists(identity);
        });
      else
        getLikePlaylists(identity);

      this.next();
    }
  });

  this.route('artist', {
    path: '/artist/:_id',
    layoutTemplate: 'artistLayout',
    template: 'trackList',
    onBeforeAction() {
      loadArtist(this.params._id);
      this.next();
    }
  });

  this.route('artistFavorites', {
    path: '/artist/:_id/favorites',
    layoutTemplate: 'artistLayout',
    template: 'trackList',
    onBeforeAction() {
      loadArtist(this.params._id, 'favorites');
      this.next();
    }
  });

  this.route('artistTracks', {
    path: '/artist/:_id/tracks',
    layoutTemplate: 'artistLayout',
    template: 'trackList',
    onBeforeAction() {
      loadArtist(this.params._id);
      this.next();
    }
  });

  this.route('artistPlaylists', {
    path: '/artist/:_id/playlists',
    layoutTemplate: 'artistLayout',
    template: 'trackList',
    onBeforeAction() {
      loadArtist(this.params._id, 'playlists');
      this.next();
    }
  });

  this.route('login', {
    path: '/login',
    redirectOnLogin: true,
    layoutTemplate: 'ApplicationLayout',
    onBeforeAction() {
      if (Meteor.user())
        Router.go('/');
      this.next();
    }
  });
});
