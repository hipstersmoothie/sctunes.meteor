Template.artistList.helpers({
  artists: function () {
    return Session.get("artists");
  },
  loaded: function () {
    return Session.get("loaded");
  },
  lots: function () {
    return Session.get("artists").length > 1000;
  }
});

Template.artist_front.helpers({
  big : function (artwork_url) {
    return (artwork_url).replace('large', 't300x300');
  }
});

Template.artist_front.events = ({
  'click [id*=artist-profile]' : function(event) {
    $($('#following')[0].parentNode).addClass('orange').siblings().removeClass('orange');
    Router.go('artist', { _id : event.currentTarget.id.split('-')[0] });
  }
});
