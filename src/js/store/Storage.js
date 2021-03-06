import electron from 'electron';

const win = electron.remote.getCurrentWindow();

class Storage {
  constructor(name, defaults) {
    const storageData = JSON.parse(localStorage.getItem(name) || '{}');

    this.data = Object.assign(defaults, storageData);
    this.name = name;
    this.save();
  }

  update(data) {
    this.data = data;
    this.save();
  }

  save() {
    localStorage.setItem(this.name, JSON.stringify(this.data));
  }
}

export const users = new Storage('users', {
  activeUser: null,
  trustedHashes: {},
  users: {}
});

export const settings = new Storage('settings', {
  window: win.getBounds(),
  langName: 'ru',
  userSettings: {}
});

export const messagesDefaultSettings = {
  typing: true,
  notRead: true,
  hiddenPinnedMessages: {}
};
