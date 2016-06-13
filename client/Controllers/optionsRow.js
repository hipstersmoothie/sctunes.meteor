var setTime = function() {
  var minTime        = $('#min-length').val() * 60000,
      maxTime        = $('#max-length').val() * 60000,
      tracks         = Session.get('tracks'),
      longTracks     = [];

  longTracks = _.filter(tracks, function(track) {
    return (minTime && maxTime && track.duration >= minTime && track.duration <= maxTime) || (minTime && !maxTime && track.duration >= minTime) || (maxTime && !minTime && track.duration <= maxTime); 
  });
  
  if(!minTime && !maxTime)
    Session.set('tracks', indexTracks(tracks, true));
  else
    Session.set('tracks', indexTracks(longTracks, true));
};

var sortAndSet = function(sort, comparator) {
  var tracks = Session.get("tracks");
  if(Session.get("sortType") === sort)
    Session.set("tracks", indexTracks(tracks.reverse(), true));
  else
    Session.set("tracks", indexTracks(tracks.sort(comparator), true));

  Session.set("sortType", sort);
};

var allTracks = null;
var search = function(term) {
  term = term.toLowerCase();
  if (term == "")
    Session.set('tracks', allTracks);

  Session.set('tracks',  indexTracks(_.filter(allTracks, function(track) {
    return track.title.toLowerCase().indexOf(term) > -1 || track.artist.toLowerCase().indexOf(term) > -1 || track.user.username.toLowerCase().indexOf(term) > -1;
  }), true));
};

var videos = function() {
  Session.set('tracks',  indexTracks(_.filter(allTracks, function(track) {
    console.log(track);
    return track.description.toLowerCase().indexOf('youtu') > -1;
  }), true));
};

var shuffle = function(array) {
  Session.set('loaded', false);
  for (var i = array.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var temp = array[i];
    array[i] = array[j];
    array[j] = temp;
  }
  Session.set('loaded', true);
  return indexTracks(array, true);
};

Template.optionsRow.helpers({
  sortType: function () {
    return Session.get('sortType');
  },
  otherSortTypes: function () {
    return [{type:"Like Date", className: "likedateSort"}, 
             {type:"Artist", className: "artistSort"}, 
             {type:"Uploader", className: "uploaderSort"},
             {type:"Play Count", className: "playcountSort"},
             {type:"Heart Count", className: "heartcountSort"},
             {type:"Creation Date", className: "creationSort"},
             {type:"Duration", className:"durationSort"},
             {type:"Search", className:"searchSort"},
             {type:"Videos", className:"videoSort"}];
  },
  duration: function () {
    return Session.get('sortType') === 'Duration';
  },
  search: function () {
    return Session.get('sortType') === 'Search';
  }
});

Template.optionsRow.events = ({
  'keydown #min-length, keydown #max-length' : function(event) {
    if(event.keyCode === 13)
      setTime();
  },
  'click #searchButton, keyup #searchInput' : function(event) {
    if (allTracks == null)
      allTracks = Session.get('tracks');

    search($('#searchInput').val());
  },
  'click .artistSort' : function() {
    sortAndSet('Artist', function(a, b){
      return (a.artist).localeCompare(b.artist);
    });
  },
  'click .uploaderSort' : function() {
    sortAndSet('Uploader', function(a, b){
      return (a.user.username).localeCompare(b.user.username);
    });
  },
  'click .playcountSort' : function() {
    sortAndSet('Play Count', function(a, b){
      return b.playback_count - a.playback_count;
    });
  },
  'click .heartcountSort' : function() {
    sortAndSet('Heart Count', function(a, b){
      return b.favoritings_count - a.favoritings_count;
    });
  },
  'click .creationSort' : function() {
    sortAndSet('Creation Date', function(a, b){
      return (a.created_at).localeCompare(b.created_at);
    });
  },
  'click .searchSort' : function() {
    Session.set('sortType', 'Search');
  },
  'click .videoSort' : function() {
    Session.set('tracks',  indexTracks(_.filter(Session.get('tracks'), function(track) {
      if(track.video_url) {
        console.log(track.video_url)
        return true;
      } else if (track.description && track.description.toLowerCase().indexOf('youtu') > -1) {
        console.log(track.description)
        return true;
      }
      // if(track.description && track.description.toLowerCase().indexOf('youtu') > -1)
      //   console.log(track.description);

      return false;
    }), true));

    Session.set('sortType', 'Videos');
  },
  'click .durationSort' : function() {
    sortAndSet('Duration', function(a, b){
      return b.duration - a.duration;
    });
  },
  'click #shuffle' : function() {
    Session.set('tracks', shuffle(Session.get('tracks')));
  },
  'click .likedateSort' : function() {
    if(Session.get('sortType') === 'Like Date')
      Session.set('tracks', Session.get('tracks').reverse());
    else {
      Session.set('tracks', Session.get('origTracks'));
      Session.set('sortType', 'Like Date');
    }
  },
  'click #log-out' : function() {
    Meteor.logout();
  },
  'click #playlists' : function() {
    allTracks = null;
    Router.go('myPlaylists');
  },
  'click #favorites' : function() {
    allTracks = null;
    Router.go('myFavorites');
  },
  'click #following' : function() {
    allTracks = null;
    Session.set('currentArtist', null)
    Router.go('following');
  }
});