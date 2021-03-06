<template>
  <div :class="['scrolly', { isScrolling, isActive }]"
       @mouseenter="refreshScrollLayout()"
       @mousedown="onMouseDown"
       @mouseleave="onMouseLeave"
       @mousemove="activateScrollBars($event, true)"
       @touchstart="onTouchStart"
       @touchmove.passive="onTouchMove"
       @touchend="hideScrollBars"
       @wheel.passive="onWheel"
       @keydown="onKeyDown"
       tabindex="1"
  >
    <div :class="['scrolly-viewport', vclass]" ref="viewport"><slot /></div>
    <div class="scrolly-bar-wrap axis-x"><div class="scrolly-bar" ref="barX"></div></div>
    <div class="scrolly-bar-wrap axis-y"><div class="scrolly-bar" ref="barY"></div></div>
  </div>
</template>

<script>
  const timers = {};

  function debounce(fn) {
    return function(...args) {
      const id = this._uid;
      clearTimeout(timers[id]);

      timers[id] = setTimeout(() => {
        fn.apply(this, args);
        timers[id] = null;
      }, 500);
    }
  }

  function normalize(num, max) {
    return Math.max(0, Math.min(num, max));
  }

  function toPercent(n) {
    return `${normalize(n, 1) * 100}%`;
  }

  function isNodesEqual(a, b) {
    let i = a.length;

    if(i != b.length) return false;

    while(i--) {
      if(!a[i].isEqualNode(b[i])) return false;
    }

    return true;
  }

  export default {
    props: ['vclass', 'lock'],

    data: () => ({
      isScrolling: false,
      isActive: false
    }),

    mounted() {
      this.observer = new MutationObserver((records) => {
        if(!records.every(({ target, addedNodes: a, removedNodes: r }) => {
          // 1) Если вызов произошел из-за ripple-анимации
          // 2) Если вызов произошел от перерендера элементов
          // Возможно будет исправлено в новых версиях Vue
          return target.matches && target.matches('.ripples') || isNodesEqual(a, r);
        })) this.refreshScrollLayout();
      });

      this.observer.observe(this.$refs.viewport, {
        childList: true,
        characterData: true,
        subtree: true
      });
    },

    beforeDestroy() {
      this.observer.disconnect();
    },

    methods: {
      onTouchStart({ touches: [touch] }) {
        this.touchX = touch.pageX;
        this.touchY = touch.pageY;

        this.activateScrollBars(0, 0, 1);
      },

      onTouchMove({ touches: [touch] }) {
        const dx = this.touchX - touch.pageX;
        const dy = this.touchY - touch.pageY;

        this.touchX = touch.pageX;
        this.touchY = touch.pageY;

        this.refreshScrollLayout(dx, dy);
      },

      onMouseDown({ target, pageX: initialPageX, pageY: initialPageY }) {
        if(!target.closest('.scrolly-bar-wrap')) return;
        this.isScrolling = true;

        const { viewport } = this.$refs;
        const bar = target.matches('.scrolly-bar') ? target : target.firstChild;
        const initialBarTop = bar.offsetTop;
        const initialBarLeft = bar.offsetLeft;

        const moveScrollBar = ({ target, pageX, pageY, offsetX, offsetY }, isMouseUp) => {
          if(this.lock) return;

          const isMoveToPoint = isMouseUp && target.matches('.scrolly-bar-wrap');
          const { scrollWidth, scrollHeight, offsetWidth, offsetHeight } = viewport;
          let dx = 0, dy = 0;

          if(bar.parentElement.matches('.axis-x')) {
            const maxBarLeft = offsetWidth - bar.offsetWidth;
            let barLeft;

            if(isMoveToPoint) barLeft = normalize(offsetX - bar.offsetWidth/2, maxBarLeft);
            else barLeft = normalize(initialBarLeft + (pageX - initialPageX), maxBarLeft);

            const scrollLeft = barLeft / maxBarLeft * (scrollWidth - offsetWidth);
            dx = scrollLeft - viewport.scrollLeft;

            bar.style.left = toPercent(barLeft / offsetWidth);
            viewport.scrollLeft = scrollLeft;
          } else {
            const maxBarTop = offsetHeight - bar.offsetHeight;
            let barTop;

            if(isMoveToPoint) barTop = normalize(offsetY - bar.offsetHeight/2, maxBarTop);
            else barTop = normalize(initialBarTop + (pageY - initialPageY), maxBarTop);

            const scrollTop = barTop / maxBarTop * (scrollHeight - offsetHeight);
            dy = scrollTop - viewport.scrollTop;

            bar.style.top = toPercent(barTop / offsetHeight);
            viewport.scrollTop = scrollTop;
          }

          this.refreshScrollLayout(dx, dy, true);
          clearTimeout(timers[this._uid]);
          timers[this._uid] = null;
        }

        const onMouseUp = (e) => {
          this.isScrolling = false;
          this.hideScrollBars();

          removeEventListener('mousemove', moveScrollBar);
          removeEventListener('mouseup', onMouseUp);

          if(initialPageX == e.pageX && initialPageY == e.pageY) moveScrollBar(e, true);
        }

        addEventListener('mousemove', moveScrollBar);
        addEventListener('mouseup', onMouseUp);
      },

      onMouseLeave() {
        if(!timers[this._uid]) this.hideScrollBars();
      },

      onWheel({ altKey, deltaX, deltaY }) {
        if(altKey) { // Возможность скролла по горизонтали при нажатой клавише Alt
          deltaX = deltaY > 0 ? 100 : -100;
          deltaY = 0;
        }

        this.refreshScrollLayout(deltaX, deltaY);
        this.activateScrollBars();
      },

      onKeyDown(e) {
        const { clientHeight } = this.$el;

        const data = {
          33: [0, 10 - clientHeight], // Page Up
          34: [0, clientHeight - 10], // Page Down
          37: [-20, 0], // Left Arrow
          38: [0, -20], // Up Arrow
          39: [20, 0], // Right Arrow
          40: [0, 20] // Down Arrow
        }[e.which];

        if(data) {
          // Отмена page up/down на всем сайте
          e.preventDefault();

          this.activateScrollBars();
          this.refreshScrollLayout(...data);
        }
      },

      activateScrollBars(e, isMouseMove, clear) {
        if(clear || isMouseMove && e.target.closest('.scrolly-bar-wrap')) {
          // При перемещении мыши по полосе скроллбара или при событии touchstart
          this.isActive = true;
          clearTimeout(timers[this._uid]);
          timers[this._uid] = null;
        } else if(!timers[this._uid] && this.isActive && !this.isScrolling) {
          // При перемещении мыши по контенту с активным скроллбаром,
          // но в данный момент не происходящим скроллом
          this.hideScrollBars();
        } else if(!isMouseMove) {
          // При скролле колеиском (возможно с зажатым alt)
          this.isActive = true;
          this.hideScrollBars();
        }
      },

      hideScrollBars: debounce(function() {
        this.isActive = false;
      }),

      refreshScrollLayout(dx = 0, dy = 0, mousemove) {
        const { viewport, barX, barY } = this.$refs;
        if(!viewport) return;

        if(mousemove) {
          return this.$emit('scroll', Object.assign(viewport, { dx, dy }));
        }

        if(!this.lock) {
          const {
            scrollTop: prevScrollTop,
            scrollLeft: prevScrollLeft
          } = viewport;

          viewport.scrollLeft += dx;
          viewport.scrollTop += dy;

          if(
            dy && prevScrollTop == viewport.scrollTop ||
            dx && prevScrollLeft == viewport.scrollLeft
          ) return;
        }

        const {
          scrollLeft, scrollWidth, offsetWidth,
          scrollTop, scrollHeight, offsetHeight
        } = viewport;

        const width = toPercent(offsetWidth / scrollWidth);
        const maxBarLeft = offsetWidth - barX.offsetWidth;
        const barLeft = normalize(scrollLeft / (scrollWidth - offsetWidth) * maxBarLeft, maxBarLeft);

        barX.style.left = toPercent(barLeft / offsetWidth);
        barX.parentElement.style.display = width == '100%' ? 'none' : 'block';
        barX.style.width = width;

        const height = toPercent(offsetHeight / scrollHeight);
        const maxBarTop = offsetHeight - barY.offsetHeight;
        const barTop = normalize(scrollTop / (scrollHeight - offsetHeight) * maxBarTop, maxBarTop);

        barY.style.top = toPercent(barTop / offsetHeight);
        barY.parentElement.style.display = height == '100%' ? 'none' : 'block';
        barY.style.height = height;

        if(dx || dy) this.$emit('scroll', Object.assign(viewport, { dx, dy }));
      }
    }
  }
</script>

<style>
  .scrolly {
    position: relative;
  }

  .scrolly.isScrolling {
    -webkit-user-drag: none;
    user-select: none;
  }

  .scrolly-viewport {
    overflow: hidden;
    height: 100%;
  }

  .scrolly-bar-wrap {
    position: absolute;
    z-index: 1;
  }

  .scrolly-bar-wrap.axis-x {
    bottom: 0;
    left: 0;
    width: 100%;
    height: 15px;
  }

  .scrolly-bar-wrap.axis-y {
    top: 0;
    right: 0;
    width: 15px;
    height: 100%;
  }

  .scrolly-bar {
    box-sizing: content-box;
    position: absolute;
    border: 4px solid transparent;
    cursor: pointer;
    opacity: 0;
    transition: opacity .3s ease;
  }

  .scrolly.isScrolling > .scrolly-bar-wrap .scrolly-bar,
  .scrolly.isActive > .scrolly-bar-wrap .scrolly-bar {
    opacity: 1;
  }

  .scrolly-bar:before {
    position: absolute;
    width: 100%;
    height: 100%;
    content: '';
    background: rgba(0, 0, 0, .3);
    border-radius: 7px;
    transition: background-color .3s ease;
  }

  .scrolly-bar:hover:before,
  .scrolly.isScrolling > .scrolly-bar-wrap .scrolly-bar:before {
    background: rgba(0, 0, 0, .4);
  }

  .scrolly-bar-wrap.axis-x .scrolly-bar {
    bottom: 0;
    height: 7px;
    min-width: 20%;
  }

  .scrolly-bar-wrap.axis-y .scrolly-bar {
    right: 0;
    width: 7px;
    min-height: 20%;
  }
</style>
