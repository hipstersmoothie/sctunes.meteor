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
  if(Session.get('origTracks').length)
    Session.set('tracks', Session.get('origTracks'));
  else if(!madeTracks) {
    madeTracks = true;
    Meteor.call('getMe', function(error, me) {
      Session.set('me', me);
      getTracks(me);
    });
  }
  // $($('#favorites')[0].parentNode).addClass('orange').siblings().removeClass('orange');
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
      } else
        getLikePlaylists();

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

var compilingArtist = false, mii = null;

var getFollowedArtists = function(me) {
  getAll('getArtists', Math.ceil(me.followings_count / 200), function(artists) {
    console.log(artists);
    Session.set('artists', artists);
    Session.set('loaded', true);
    $($('#following')[0].parentNode).addClass('orange').siblings().removeClass('orange');
  }, null);
};

var setTracks = function(that) {
  var tracks = Session.get('origTracks');
  Session.set('loaded', false);
  Session.set('tracks', null);

  var node = $('#favorites')[0];
  if (node)
    $(node.parentNode).addClass('orange').siblings().removeClass('orange');

  if (mii == null)
    Meteor.call('getMe', function(error, me) {
      Session.set('me', me);
      mii = me;
      console.log(tracks);
      if(tracks)
        Session.set('tracks', tracks);
      else
        getTracks(me);
    });
  else {
    Session.set('tracks', tracks);
    Session.set('loaded', true);
  }

  that.next();
};


var extractSongsAndPlaylists = function(tracks) {
  return _.map(_.filter(tracks, function(track) {
    return track.track || track.playlist;
  }), function(track) {
    if(track.track)
      return track.track;
    if(track.playlist)
      return track.playlist;
  });
};

var getResource = function(type, artist, resourceCount, processFunc) {
  var currentData = Session.get('artist' + type);

  $('#artist-' + type.toLowerCase()).addClass('active').siblings().removeClass('active');

  if(currentData) {
    Session.set('tracks', setPlayingToCurrent(currentData));
    return Session.set('loaded', true);
  }

  Session.set('loaded', false);
  for(var i = 0; i < Math.ceil(artist[resourceCount] / 200); i++) {
    Meteor.call('getArtist' + type, artist.id, function(error, data) {
      data  = setPlayingToCurrent(processFunc(data));
      Session.set('tracks', data);
      Session.set('artist' + type, data);
      if(i === Math.ceil(artist[resourceCount] / 200)) 
        Session.set('loaded', true);
    });
  }
  if(artist[resourceCount] < 1) {
    toastr.error('User has no' + type + '!');
    Session.set('loaded', true);
  }
};

getAll = function(path, calls, callback, prepFunction, updateFunction, loaderText) {
  var args = Array.prototype.slice.apply(arguments);
  var collection = [];

  console.log(path, calls, callback, prepFunction, updateFunction, loaderText)
  for(var i = 0; i < calls; i++) {
    Meteor.call(path, i, function(error, data){
      var index = data["index"];
      data = data['data'].collection || data['data'];

      console.log(collection, data)
      if(prepFunction)
        collection = collection.concat(prepFunction(data, args[args.length]));
      else
        collection = collection.concat(data);

      if (loaderText) 
        loaderText(collection)

      if (index === calls - 1) {
        Session.set('loaded', updateFunction);
        return callback(collection);
      }
    });
  }
};

var offset = 0;
var allTracks = []
getMoreTracks = function(count) {
  console.log('here');
  Meteor.call('getFavorites', offset++, function(error, result){
    if (!error && typeof result !== 'undefined') {
      newTracks = $.merge(allTracks, prepareTracks(result.data));
      Session.set('tracks', newTracks);
      Session.set('origTracks', newTracks); 
    }

    Session.set('loaded', true);
    Session.set('isLoading', false);
  });
}

var updateTrackCount = function(tracks) {
  Session.set('loadingText', "Got " + tracks.length + " tracks of " + Session.get("me").public_favorites_count);
};

var likedPlaylists = null;
var getLikePlaylists = function() {
  Meteor.call('getLikedPlaylists', function(err, playlist) {
    var playlists = setArt(playlist.artwork_url, extractSongsAndPlaylists(playlist));
    likedPlaylists = playlists;
    Session.set('tracks', playlists); 
    Session.set('loaded', true);
  });
};

var getTracks = function (me) {
  getAll('getFavorites',  1, function(tracks) {
    console.log(tracks)
    Session.set('tracks', tracks);
    Session.set('origTracks', tracks);    
  }, prepareTracks, true, updateTrackCount);
};

var splitData = function(artist, data) {
  return prepareTracks(extractSongsAndPlaylists(data), true, artist.avatar_url);
};

var getArtistPlaylists = function(artist) {
  getResource('Playlists', artist, 'playlist_count', _.bind(setArt, this, artist));
};

var getFavorites = function(artist) {                
  getResource('Favorites', artist, 'public_favorites_count', _.bind(splitData, this, artist));
};

var getArtistTracks = function(artist) {
  getResource('Tracks', artist, 'track_count', _.bind(splitData, this, artist));
};

var loadArtist = function(id, resource) {
  var currentArtist = Session.get('currentArtist');
  Session.set('loaded', false);

  if(currentArtist && currentArtist.id == id) {
    if(resource === 'favorites') 
      return getFavorites(currentArtist);
    else if(resource === 'playlists')
      return getArtistPlaylists(currentArtist);
    else
      return getArtistTracks(currentArtist);
  }

  Meteor.call('getArtist', id, function(error, info) {    
    info.big_avatar = (info.avatar_url).replace('large', 't300x300');
    Session.set('currentArtist', info);
    Session.set('artistFavorites', null);
    Session.set('artistTracks', null);

    if(resource === 'favorites' || info.track_count === 0)
      getFavorites(info);
    else if(resource === 'playlists')
      getArtistPlaylists(info);
    else
      getArtistTracks(info);
  });  
};