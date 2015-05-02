if (Meteor.isClient) {
  // famous globals for APP code
  Transform=null;
  cTrack = null;
  FView.ready(function(require) {
    Transform        = famous.core.Transform;

    // Famono: load famo.us shims and CSS
    famous.polyfills; // jshint ignore:line
    famous.core.famous; // jshint ignore:line
    FView.registerView('GridLayout', famous.views.GridLayout);
  })

  Template.trackLayout.helpers({
    getTransition: function() {
      var useForPages = Session.get('transitionPages');
      return useForPages ? Session.get('currentTransition') : 'opacity';
    }
  });

  Template.flipper_back.events = ({
	  'click .heartCount' : function(event) {
	    try {
	      if(event.target.classList[1] === 'hearted')
	        SC.delete('/me/favorites/' + event.target.parentNode.parentNode.parentNode.id);
	      else {
	        identityIsValid = false;
	        SC.put('/me/favorites/' + event.target.parentNode.parentNode.parentNode.id);
	      }
	    } catch (error) {
	      console.log('ioeno');
	    }

	    var tracks = Session.get('tracks');
	    var track = findTrackWithId(tracks,  event.target.parentNode.parentNode.parentNode.id);

	    track.user_favorite = !track.user_favorite;
	    tracks[track.index] = track;
	    Session.set('tracks', tracks);
	  },
	  'click .play' : function(event, tpl) {
	    var tracks = Session.get("tracks"), 
	        node   = getTargetTrack(event.target);

	    cTrack = FView.from(tpl);
	    if(event.altKey) 
	      addToPlaylistClick(tracks, node.index, node.id);
	    else if(node.classList[node.classList.length - 1] == 'playlist'){
	      Session.set("loaded", false);
	      SC.get('/playlists/' + node.id, function(playlist) {
	        Session.set("tracks", prepareTracks(playlist.tracks, true, playlist.artwork_url));
	        Session.set("loaded", true);
	      });
	    }
	    else if(event.target.localName === 'span' && event.target.index !== 'title')
	      return;
	    else if (event.shiftKey)
	      addToQueue(node);
	    else if(node.id === currentTrackId) {
	      currentTrack.togglePause();
	    } else {	
	    	Session.set("player_orientation", [1,1]);
	    	Session.set("playing", true);
	      stopLastTrack(tracks);
	      streamTrack(findTrackWithId(tracks, node.id), false, FView.from(tpl));
	      Session.set("tracks", setPlayingToCurrent(tracks));
	    }
	  }
	});

	findTrackWithId =  function(tracks, id) {
	  for (track in tracks) {
	    var data = tracks[track];
	    if(data.id == id) 
	      return data;
	  }
	}  

	var getTargetTrack = function(target) {
	  if(target.index === "trackItem")
	    return target;
	  else if(target.index === "title") 
	    return target.parentNode.parentNode.parentNode;
	  else if(target.classList[1] === "overlay") 
	    return target.parentNode;
	  else if(target.classList[0] === "play") 
	    return target.parentNode.parentNode.parentNode;
	  else 
	    return target.parentNode.parentNode;
	};

	var stopLastTrack = function(tracks) {
	  if(currentTrack) {
	    currentTrack.stop();
	    unmountWAV();
	  
	    if(queueOn && $("#" + currentTrackId + "-queue").length) {
	      var queue = Session.get("queue");
	      queueOn = false;
	      queue[$("#" + currentTrackId + "-queue")[0].index].qplaystatus = "notplaying";
	      Session.set("queue", queue);
	    }
	  }
	};

  flipSurface = function(event, fview) {
  	if(event.target.classList[0] != "heartCount" && event.target.classList[0] != "play") {
  		fview.parent.view.flip({ curve : 'easeOutBounce', duration : 500});
  	}  	
	}

	Template.flipper_front.famousEvents({ 'click': flipSurface });
	Template.flipper_back.famousEvents({ 'click': flipSurface });

	Template.flipper_back.helpers({
		toTime: function(ms) {
	    return msToTime(ms);
	  }
	})

	function msToTime(duration) {
	  var milliseconds = parseInt((duration%1000)/100), 
	      seconds = parseInt((duration/1000)%60),
	      minutes = parseInt((duration/(1000*60))%60),
	      hours = parseInt((duration/(1000*60*60))%24);

	  hours = (hours < 10) ? "0" + hours : hours;
	  minutes = (minutes < 10) ? "0" + minutes : minutes;
	  seconds = (seconds < 10) ? "0" + seconds : seconds;

	  return hours + ":" + minutes + ":" + seconds;
	}
}