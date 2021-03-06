<template>
  <Ripple color="#e6ebf2" class="im_peer" @click="openChat">
    <div :class="['im_peer_photo', online]">
      <img :src="photo" loading="lazy" width="50" height="50">
    </div>
    <div class="im_peer_content">
      <div class="im_peer_title">
        <div class="im_peer_name_wrap">
          <div :class="['im_peer_name', { greenName }]" v-emoji="chatName"></div>
          <div v-if="owner && owner.verified" class="verified"></div>
          <div v-if="peer.muted" class="im_peer_muted"></div>
        </div>
        <div class="im_peer_time">{{ time }}</div>
      </div>
      <div class="im_peer_message_wrap">
        <Typing v-if="hasTyping" :peer_id="peer.id" />
        <div v-else class="im_peer_message">
          <div class="im_peer_author">{{ authorName }}</div>
          <div v-if="msg.isContentDeleted" class="im_peer_text isContentDeleted">{{ l('im_content_deleted') }}</div>
          <div v-else :class="['im_peer_text', { isAttachment }]" v-emoji.push="message"></div>
        </div>
        <div v-if="peer.mentions.length" class="im_peer_mentioned">
          <Icon name="mention" width="20" height="18" />
        </div>
        <div :class="['im_peer_unread', { outread, muted: peer.muted }]"
             :title="peer.unread || ''"
        >{{ convertCount(peer.unread || '') }}</div>
      </div>
    </div>
  </Ripple>
</template>

<script>
  import { mapState } from 'vuex';
  import { getMessagePreview, loadConversationMembers } from 'js/messages';
  import { getShortDate } from 'js/date';
  import { getPhoto, eventBus, convertCount } from 'js/utils';

  import Ripple from '../UI/Ripple.vue';
  import Icon from '../UI/Icon.vue';
  import Typing from './Typing.vue';

  export default {
    props: ['peer', 'msg', 'activeChat'],

    components: {
      Ripple,
      Icon,
      Typing
    },

    data() {
      return {
        isChat: this.peer.id > 2e9
      }
    },

    computed: {
      ...mapState(['profiles']),
      owner() {
        return this.profiles[this.peer.owner];
      },
      author() {
        return this.profiles[this.msg.from];
      },
      online() {
        if(this.isChat || this.peer.id < 0 || !this.owner || !this.owner.online) return '';
        else return this.owner.online_mobile ? 'mobile' : 'desktop';
      },
      photo() {
        if(this.isChat) {
          return !this.peer.left && this.peer.photo || 'assets/im_chat_photo.png';
        } else {
          return getPhoto(this.owner) || 'assets/blank.gif';
        }
      },
      chatName() {
        if(this.isChat) return this.peer.title || '...';
        else if(this.owner) return this.owner.name || `${this.owner.first_name} ${this.owner.last_name}`;
        else return '...';
      },
      greenName() {
        return [100, 101, 333].includes(Number(this.peer.id));
      },
      time() {
        return getShortDate(new Date(this.msg.date * 1000));
      },
      authorName() {
        const user = this.$store.getters['users/user'];

        if(this.msg.action || this.peer.channel) return '';
        else if(this.msg.out) return `${this.l('you')}:`;
        else if(!this.isChat) return '';
        else if(this.author) return `${this.author.name || this.author.first_name}:`;
        else return loadConversationMembers(this.peer.id), '...:';
      },
      message() {
        return getMessagePreview(this.msg, this.peer.id, this.author);
      },
      hasTyping() {
        const typing = this.$store.state.messages.typing[this.peer.id] || {};

        return Object.keys(typing).length;
      },
      isAttachment() {
        return !this.msg.text && !this.msg.action && this.msg.hasAttachment;
      },
      outread() {
        return this.peer.out_read != this.peer.last_msg_id;
      }
    },

    methods: {
      convertCount,

      openChat() {
        if(this.activeChat == this.peer.id) return;

        if(this.activeChat) {
          eventBus.emit('messages:event', 'close_chat', {
            peer_id: this.activeChat
          });
        }

        this.$router.replace(`/messages/${this.peer.id}`);
      }
    }
  }
</script>

<style>
  .im_peer {
    display: flex;
    position: relative;
    user-select: none;
    transition: background-color .3s;
  }

  .im_peer:hover {
    background: #f5f7fa;
    cursor: pointer;
  }

  .im_peer_photo {
    position: relative;
    width: 50px;
    height: 50px;
    margin: 10px 10px 10px 16px;
  }

  .im_peer_photo.mobile::after,
  .im_peer_photo.desktop::after {
    content: '';
    position: absolute;
    box-sizing: content-box;
    width: 8px;
    bottom: 2px;
    right: -1px;
    border: 2px solid #fff;
  }

  .im_peer_photo.mobile::after {
    height: 11px;
    border-radius: 3px;
    background: url('~assets/online_mobile.svg') no-repeat #fff;
  }

  .im_peer_photo.desktop::after {
    height: 8px;
    border-radius: 50%;
    background: #8ac176;
  }

  .im_peer_photo img {
    border-radius: 50%;
  }

  .im_peer_content {
    width: calc(100% - 76px);
    padding: 10px 16px 10px 0;
  }

  .im_peer:not(:last-child) .im_peer_content {
    border-bottom: 1px solid #e7e8ec;
  }

  .im_peer_title {
    display: flex;
    margin-top: 5px;
  }

  .im_peer_name_wrap {
    display: flex;
    flex-grow: 1;
    overflow: hidden;
    font-weight: 500;
  }

  .im_peer_name {
    height: 20px;
    line-height: 18px;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  .im_peer_name.greenName {
    color: #265b96;
  }

  .im_peer_name_wrap .verified {
    flex: none;
    margin: 1px 0 0 4px;
  }

  .im_peer_muted {
    flex: none;
    width: 13px;
    height: 13px;
    margin: 3px 0 0 4px;
    background: url('~assets/muted.svg') 0 / 13px;
  }

  .im_peer_time {
    flex: none;
    margin-left: 5px;
    color: #848a96;
    font-size: 13px;
    margin-top: 2px;
  }

  .im_peer_message_wrap {
    display: flex;
    height: 20px;
    margin-top: 2px
  }

  .im_peer_message_wrap > div:first-child {
    flex-grow: 1;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
    margin-top: 2px;
  }

  .im_peer_message {
    color: #4c4d50;
  }

  .im_peer_author:not(:empty) {
    display: inline;
    color: #777a7d;
  }

  .im_peer_text { display: inline }
  .im_peer_text b { font-weight: 500 }
  .im_peer_text.isAttachment { color: #254f79 }
  .im_peer_text.isContentDeleted { color: #696969 }

  .im_peer_unread {
    padding: 0 6px;
    margin: 2px 0 0 3px;
    border-radius: 10px;
    background: #5181b8;
    color: #fff;
    font-size: 11px;
    font-weight: 500;
    line-height: 20px;
  }

  .im_peer_unread:not(.outread):empty { display: none }
  .im_peer_unread:not(.outread).muted { background: #b2b7c2 }

  .im_peer_unread.outread {
    flex: none;
    padding: 0;
    margin: 7px 4px 0 4px;
    width: 8px;
    height: 8px;
    background: #93adc8;
  }

  .im_peer_mentioned {
    position: relative;
    bottom: -1px;
    margin: 0 2px;
    border-radius: 10px;
    background: #5181b8;
  }
</style>
