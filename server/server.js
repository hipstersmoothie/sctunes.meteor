Meteor.startup(function () {
  // code to run on server at startup
       //console.log(ServiceConfiguration.configurations.remove({}));
});

Meteor.methods({
  getAccessToken : function() {
    try {
      return Meteor.user().services.soundcloud.accessToken;
    } catch(e) {
      return null;
    }
  },
  getMe : function(accessToken) {
    try {                                                                                            
      return Meteor.http.get("https://api.soundcloud.com/me", {                                      
        params: {                                                                                    
          oauth_token: accessToken,                                                                  
          format: "json"                                                                             
        }                                                                                            
      }).data;                                                                                       
    } catch (err) {                                                                                  
      throw new Error("Failed to fetch identity from Soundcloud. " + err.message);                   
    }
  },
  getFavorites : function(accessToken, offset) {
    try {                                                                                            
      return Meteor.http.get("https://api.soundcloud.com/me/favorites", {                                      
      params: {                                                                                    
          oauth_token: accessToken,                                                                  
          format: "json" ,
          limit: 200,
          offset: offset * 200                                                                            
        }                                                                                            
      }).data;                                                                                       
     } catch (err) {                                                                                  
       throw new Error("Failed to fetch identity from Soundcloud. " + err.message);                   
     }
  },
  getPlaylists : function(accessToken) {
    try {                                                                                            
      return Meteor.http.get("https://api.soundcloud.com/me/playlists", {                                      
      params: {                                                                                    
          oauth_token: accessToken,                                                                  
          format: "json"                                                                     
        }                                                                                            
      }).data;                                                                                       
    } catch (err) {                                                                                  
       throw new Error("Failed to fetch playlists from Soundcloud. " + err.message);                   
    }
  },
  getArtists : function(accessToken, index) {
    try {                                                                                            
      return Meteor.http.get("https://api.soundcloud.com/me/followings", {                                      
      params: {                                                                                    
          oauth_token: accessToken,                                                                  
          format: "json",
          limit: 200,
          offset: index * 200                                                                     
        }                                                                                            
      }).data;                                                                                       
    } catch (err) {                                                                                  
       throw new Error("Failed to fetch playlists from Soundcloud. " + err.message);                   
    }
  },
  getArtist : function(accessToken, id) {
    try {                                                                                            
      return Meteor.http.get("https://api.soundcloud.com/users/" + id, {                                      
      params: {                                                                                    
          oauth_token: accessToken,                                                                  
          format: "json"
        }                                                                                            
      }).data;                                                                                       
    } catch (err) {                                                                                  
       throw new Error("Failed to fetch playlists from Soundcloud. " + err.message);                   
    }
  },
  getArtistTracks : function(accessToken, id, index) {
    try {                                                                           
      return Meteor.http.get("https://api.soundcloud.com/e1/users/" + id + "/stream", {                     
      params: {                                                                                    
          oauth_token: accessToken,                                                                  
          format: "json",
          limit: 200,
          offset: index * 200 
        }                                                                                            
      }).data;                                                                                       
    } catch (err) {                                                                                  
       throw new Error("Failed to fetch playlists from Soundcloud. " + err.message);                   
    }
  },
  getArtistFavorites : function(accessToken, id, index) {
    try {                                                                                            
      return Meteor.http.get("https://api.soundcloud.com/users/" + id + "/favorites", {                                      
      params: {                                                                                    
          oauth_token: accessToken,                                                                  
          format: "json",
          limit: 200,
          offset: index * 200 
        }                                                                                            
      }).data;                                                                                       
    } catch (err) {                                                                                  
       throw new Error("Failed to fetch playlists from Soundcloud. " + err.message);                   
    }
  },
  getArtistPlaylists : function(accessToken, id) {
    try {                                                                                            
      return Meteor.http.get("https://api.soundcloud.com/users/" + id + "/playlists", {                                      
      params: {                                                                                    
          oauth_token: accessToken,                                                                  
          format: "json",
          limit: 200,
        }                                                                                            
      }).data;                                                                                       
    } catch (err) {                                                                                  
       throw new Error("Failed to fetch playlists from Soundcloud. " + err.message);                   
    }
  },
  newPlaylist : function(accessToken, playlist) {
    try {                                                                                            
      return Meteor.http.post("https://api.soundcloud.com/me/playlists", {                                      
      params: {   
          data: playlist,                                                                                 
          oauth_token: accessToken,                                                                  
          format: "json"                                                                     
        }                                                                                            
      }).data;                                                                                       
    } catch (err) {                                                                                  
       throw new Error("Failed to make playlist on Soundcloud. " + err.message);                   
    }
  }
});