class MainProcessTimer {
   constructor() {
      this.interval = null;
      this.endTime = null;
      this.isRunning = false;
   }

   start(minutes, broadcastCallback) {
      this.stop();
      
      this.isRunning = true;
      this.endTime = Date.now() + (minutes * 60 * 1000);
      this.broadcastCallback = broadcastCallback;

      const tick = () => {
         const remainingMs = this.endTime - Date.now();
         const seconds = Math.max(0, Math.floor(remainingMs / 1000));

         const timeString = this.getFormattedTime(seconds);
         
         if (this.broadcastCallback) {
            this.broadcastCallback(timeString);
         }

         if (seconds <= 0) {
            this.complete();
         }
      };

      tick();
      this.interval = setInterval(tick, 1000);
   }

   stop() {
      if (this.interval) {
         clearInterval(this.interval);
         this.interval = null;
      }
      this.endTime = null;
      this.isRunning = false;
   }

   complete() {
      if (this.broadcastCallback) {
         this.broadcastCallback(null);
      }
      this.stop();
   }

   adjust(minutes) {
      if (!this.isRunning || !this.endTime) return;

      this.endTime += minutes * 60 * 1000;

      const remainingMs = this.endTime - Date.now();
      const seconds = Math.max(0, Math.floor(remainingMs / 1000));

      if (seconds <= 0) {
         this.complete();
      } else {
         const timeString = this.getFormattedTime(seconds);
         if (this.broadcastCallback) {
            this.broadcastCallback(timeString);
         }
      }
   }

   getFormattedTime(seconds) {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      const secs = seconds % 60;

      if (hours > 0) {
         return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
      } else {
         return `${minutes}:${secs.toString().padStart(2, "0")}`;
      }
   }
}

module.exports = MainProcessTimer;
