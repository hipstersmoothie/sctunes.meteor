import { Template } from 'meteor/templating';
import { Session } from 'meteor/session';

Template.loader.helpers({
  artistPage: () => Session.get('currentArtist') != null
});
