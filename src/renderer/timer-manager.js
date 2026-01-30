const { ipcRenderer } = require("electron");
const { TIMER_CONFIG } = require("../shared/constants");

class TimerManager {
   constructor() {
      this.onTickCallback = null;
      this.onCompleteCallback = null;
      
      ipcRenderer.on("timer-tick", (event, timeString) => {
         if (timeString === null) {
            if (this.onCompleteCallback) {
               this.onCompleteCallback();
            }
         } else {
            if (this.onTickCallback) {
               this.onTickCallback(timeString);
            }
         }
      });
   }

   start(minutes = TIMER_CONFIG.DEFAULT_MINUTES) {
      ipcRenderer.send("timer-start", minutes);
   }

   adjust(minutes) {
      ipcRenderer.send("timer-adjust", minutes);
   }

   stop() {
      ipcRenderer.send("timer-stop");
   }

   reset() {
      this.stop();
   }

   onTick(callback) {
      this.onTickCallback = callback;
   }

   onComplete(callback) {
      this.onCompleteCallback = callback;
   }
}

module.exports = TimerManager;
