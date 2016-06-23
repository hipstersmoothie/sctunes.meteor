import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';

const loaded = new ReactiveVar(false);
Template.registerHelper('loaded', () => loaded.get());

export function on() {
  loaded.set(false);
}

export function off() {
  loaded.set(true);
}

const loadingText = new ReactiveVar();
Template.registerHelper('loadingText', () => loadingText.get());

export function text(newText) {
  loadingText.set(newText);
}

Template.loader.helpers({
  loadingText: () => loadingText.get()
});
