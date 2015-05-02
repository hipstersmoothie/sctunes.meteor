Template.myInfo.events({
 	'click button' : function(event) {
 		if (event.currentTarget.id == "my-playlists")
 			Router.go('myPlaylists');
 		else if (event.currentTarget.id == "my-tracks")
 			Router.go('myFavorites');
 	}
});

Template.myInfo.helpers({
 	'active' : function() {
 		console.log(Router.current().route.getName());
 		// if (event.currentTarget.id == "my-playlists")
 		// 	Router.go('myPlaylists');
 		// else if (event.currentTarget.id == "my-tracks")
 		// 	Router.go('myFavorites');
 	}
});