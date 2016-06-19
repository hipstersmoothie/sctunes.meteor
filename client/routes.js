import { Session } from 'meteor/session';
import { Meteor } from 'meteor/meteor';
import { Router } from 'meteor/iron:router';
import _ from 'lodash';

import { setArt, setPlayingToCurrent, prepareTracks } from './utilities'

let newRoute = false;
let getRoute = function({user, route, experimental = false, sessionVar, length, prepFunction = arr => arr, callback}) {
  const loadingText = `Getting ${route}`;
  const startRoute = Router.current().route.getName();
  Session.set('loadingText', loadingText + '...');

  let collection = [];
  let resolve = (data) => {
    collection = collection.concat(prepFunction(data.collection));
    Session.set('loadingText', loadingText + ': ' + collection.length + (length ? ' of ' + length : ''));

    if(startRoute == Router.current().route.getName())
      if(data.next_href && !newRoute)
        SC.get(data.next_href, resolve);
      else {
        Session.set(sessionVar, collection);
        Session.set('loaded', true);
        if(callback) callback(collection);
      }
  }

  SC.get(`${experimental ? '/e1' : ''}/users/${user}/${route}`, { limit: 200, linked_partitioning: 1 }, resolve);
}

var getFollowedArtists = function(me) {
  getRoute({
    user: me.id,
    route: 'followings',
    sessionVar: 'artists',
    length: me.followings_count
  });
};

var getTracks = function (me) {
  getRoute({
    user: me.id,
    route: 'favorites',
    sessionVar: 'tracks',
    length: me.public_favorites_count,
    prepFunction: tracks => _.map(prepareTracks(tracks), track => {
      track.user_favorite = true;
      return track;
    })
  });
};

var extractSongsAndPlaylists = function(tracks) {
  return _.map(_.filter(tracks, track => track.track || track.playlist), track => track.track || track.playlist);
};

var likedPlaylists = null;
var getLikePlaylists = function(me) {
  getRoute({
    user: me.id,
    route: 'playlist_likes',
    experimental: true,
    sessionVar: 'tracks',
    prepFunction: playlists => setArt(playlists.artwork_url, extractSongsAndPlaylists(playlists)),
    callback: allPlaylist => likedPlaylists = allPlaylist
  });
};

var getResource = function(type, artist, resourceCount, processFunc) {
  var currentData = Session.get('artist' + type);

  if(currentData && currentData.data && currentData.id === artist.id) {
    Session.set('tracks', setPlayingToCurrent(currentData.data));
    return Session.set('artistLoaded', true);
  }

  getRoute({
    user: artist.id,
    route: type,
    experimental: type !== 'playlists',
    sessionVar: 'tracks',
    length: artist[resourceCount],
    prepFunction: data => setPlayingToCurrent(processFunc(data)),
    callback: data => {
      Session.set('artist' + type, {
        data,
        id: artist.id
      });
      Session.set('artistLoaded', true);
    }
  });

  if(artist[resourceCount] < 1) {
    // toastr.error('User has no' + type + '!');
    Session.set('artistLoaded', true);
  }
};

var getArtistPlaylists = function(artist) {
  getResource('playlists', artist, 'playlist_count', _.bind(setArt, this, artist));
};

var splitData = function(artist, data) {
  return prepareTracks(extractSongsAndPlaylists(data), true, artist.avatar_url);
};

var getFavorites = function(artist) {                
  getResource('likes', artist, 'public_favorites_count', _.bind(splitData, this, artist));
};

var getArtistTracks = function(artist) {
  getResource('stream', artist, 'track_count', _.bind(splitData, this, artist));
};

var loadArtist = function(id, resource) {
  var currentArtist = Session.get('currentArtist');
  Session.set('artistLoaded', false);
  Session.set('loadingText', 'Getting user\'s profile...');

  function chooseResource(resource, artist) {
    if(resource === 'favorites' || artist.track_count === 0) 
      return getFavorites(artist);
    else if(resource === 'playlists')
      return getArtistPlaylists(artist);
    else
      return getArtistTracks(artist);
  } 

  if(currentArtist && currentArtist.id == id) 
    chooseResource(resource, currentArtist);
  else
    Meteor.call('getArtist', id, function(error, info) {    
      info.big_avatar = info.avatar_url.replace('large', 't300x300');
      Session.set('artiststream', null);
      Session.set('artistlikes', null);
      Session.set('artistplaylists', null);
      Session.set('currentArtist', info);

      chooseResource(resource, info);
    });  
};

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

Router.configure({
  authenticate: 'login'
});

var initRoot = function() {
  Session.set('loaded', false);

  if(Session.get('origTracks').length) {
    Session.set('tracks', setPlayingToCurrent(Session.get('origTracks'), {}));
    Session.set('loaded', true);
  } else {
    Meteor.call('getMe', function(error, me) {
      Session.set('me', me);
      getTracks(me);
    });
  }

  Session.set('currentArtist', null);
  this.next();
};

Router.map(function() {
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
    onBeforeAction: function() {
      Session.set('loaded', false);

      if(!Session.get('artists')) {
        if(!Session.get('me'))
          Meteor.call('getMe', function(error, me) {
            Session.set('me', me);
            getFollowedArtists(me);
          });
        else
          getFollowedArtists(Session.get('me'));
      } else {
        Session.set('loaded', true);
      }

      this.next();
    }
  });

  this.route('myPlaylists', {
    path: '/likedPlaylists',
    layoutTemplate: 'trackLayout',
    template: 'trackList',
    onBeforeAction: function() {
      Session.set('loaded', false);
      Session.set('currentArtist', null);

      if(likedPlaylists) {
        Session.set('tracks', likedPlaylists); 
        Session.set('loaded', true);
      } else if(!Session.get('me'))
        Meteor.call('getMe', function(error, me) {
          Session.set('me', me);
          getLikePlaylists(me);
        });
      else
        getLikePlaylists(Session.get('me'));

      this.next();
    }
  });

  this.route('artist', {
    path: '/artist/:_id',
    layoutTemplate: 'trackLayout',
    template: 'trackList',
    onBeforeAction: function() {
      loadArtist(this.params._id);
      this.next();
    }
  });

  this.route('artistFavorites', {
    path: '/artist/:_id/favorites',
    layoutTemplate: 'trackLayout',
    template: 'trackList',
    onBeforeAction: function() {
      loadArtist(this.params._id, 'favorites');
      this.next();
    }
  });

  this.route('artistTracks', {
    path: '/artist/:_id/tracks',
    layoutTemplate: 'trackLayout',
    template: 'trackList',
    onBeforeAction: function() {
      loadArtist(this.params._id);
      this.next();
    }
  });

  this.route('artistPlaylists', {
    path: '/artist/:_id/playlists',
    layoutTemplate: 'trackLayout',
    template: 'trackList',
    onBeforeAction: function() {
      loadArtist(this.params._id, 'playlists');
      this.next();
    }
  });

  this.route('login', {
    path: '/login',
    redirectOnLogin: true,
    layoutTemplate: 'ApplicationLayout',
    onBeforeAction: function() {
      if(Meteor.user())
        Router.go('/');
      this.next();
    }
  });
});