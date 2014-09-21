var setTime = function() {
  var minTime        = $('#min-length').val() * 60000,
      maxTime        = $('#max-length').val() * 60000,
      tracks         = Session.get("tracks"),
      longTracks     = [];

  longTracks = _.filter(tracks, function(track) {
    return (minTime && maxTime && track.duration >= minTime && track.duration <= maxTime) || (minTime && !maxTime && track.duration >= minTime) || (maxTime && !minTime && track.duration <= maxTime); 
  });
  
  if(!minTime && !maxTime)
    Session.set('tracks', indexTracks(tracks, true));
  else
    Session.set('tracks', indexTracks(longTracks, true));
};

var search = function(term) {
  term = term.toLowerCase();
  Session.set('tracks',  indexTracks(_.filter(Session.get('tracks'), function(track) {
    return track.title.toLowerCase().indexOf(term) > -1 || track.artist.toLowerCase().indexOf(term) > -1 || track.user.username.toLowerCase().indexOf(term) > -1
  }), true));
};


Template.optionsRow.helpers({
  sortType: function () {
    return Session.get("sortType");
  },
  otherSortTypes: function () {
    return Session.get("otherSortTypes");
  },
  duration: function () {
    return Session.get("sortType") === "Duration";
  },
  search: function () {
    return Session.get("sortType") === "Search";
  }
});

Template.optionsRow.events = ({
  'keydown #min-length, keydown #max-length' : function(event) {
    if(event.keyCode === 13)
      setTime();
  },
  'click #searchButton, keydown #searchInput' : function(event) {
    if((event.target.id == 'searchInput' && event.keyCode === 13) || event.target.id == 'searchButton')
      search($('#searchInput').val());
  },
  'click .artistSort' : function() {
    sortAndSet("Artist", function(a, b){
      return (a.artist).localeCompare(b.artist);
    });
  },
  'click .uploaderSort' : function() {
    sortAndSet("Uploader", function(a, b){
      return (a.user.username).localeCompare(b.user.username);
    });
  },
  'click .playcountSort' : function() {
    sortAndSet("Play Count", function(a, b){
      return b.playback_count - a.playback_count;
    });
  },
  'click .heartcountSort' : function() {
    sortAndSet("Heart Count", function(a, b){
      return b.favoritings_count - a.favoritings_count;
    });
  },
  'click .creationSort' : function() {
    sortAndSet("Creation Date", function(a, b){
      return (a.created_at).localeCompare(b.created_at);
    });
  },
  'click .searchSort' : function() {
    Session.set("sortType", "Search");
  },
  'click .durationSort' : function() {
    sortAndSet("Duration", function(a, b){
      return b.duration - a.duration;
    });
  },
  'click #shuffle' : function() {
    Session.set("tracks", shuffle(Session.get("tracks")));
  },
  'click .likedateSort' : function() {
    if(Session.get("sortType") === "Like Date")
      Session.set("tracks", Session.get("tracks").reverse());
    else {
      Session.set("tracks", Session.get("origTracks"));
      Session.set("sortType", "Like Date");
    }
  }
});