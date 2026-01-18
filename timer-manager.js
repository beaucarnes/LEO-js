const { TIMER_CONFIG } = require("./constants");

class TimerManager {
   constructor() {
      this.interval = null;
      this.seconds = 0;
      this.isRunning = false;
      this.onTickCallback = null;
      this.onCompleteCallback = null;
   }

   start(minutes = TIMER_CONFIG.DEFAULT_MINUTES) {
      if (this.isRunning) {
         this.stop();
      }

      this.seconds = minutes * 60;
      this.isRunning = true;

      this.interval = setInterval(() => {
         this.seconds--;
         
         if (this.onTickCallback) {
            this.onTickCallback(this.getFormattedTime());
         }

         if (this.seconds <= 0) {
            this.complete();
         }
      }, 1000);

      // trigger initial display update
      if (this.onTickCallback) {
         this.onTickCallback(this.getFormattedTime());
      }
   }

   stop() {
      if (this.interval) {
         clearInterval(this.interval);
         this.interval = null;
      }
      this.seconds = 0;
      this.isRunning = false;
   }

   complete() {
      this.stop();
      if (this.onCompleteCallback) {
         this.onCompleteCallback();
      }
   }

   adjust(minutes) {
      this.seconds += minutes * 60;

      if (this.seconds <= 0) {
         this.complete();
      } else if (this.onTickCallback) {
         this.onTickCallback(this.getFormattedTime());
      }
   }

   getFormattedTime() {
      const hours = Math.floor(this.seconds / 3600);
      const minutes = Math.floor((this.seconds % 3600) / 60);
      const seconds = this.seconds % 60;

      if (hours > 0) {
         return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      } else {
         return `${minutes}:${seconds.toString().padStart(2, '0')}`;
      }
   }

   getRemainingSeconds() {
      return this.seconds;
   }

   onTick(callback) {
      this.onTickCallback = callback;
   }

   onComplete(callback) {
      this.onCompleteCallback = callback;
   }

   reset() {
      this.stop();
   }
}

module.exports = TimerManager;