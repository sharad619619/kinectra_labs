export class AgoraService {
  private statusCallback: ((status: string) => void) | null = null;

  constructor(appId: string, channelName: string, token: string, uid: number) {
    console.log("AgoraService initialized with:", { appId, channelName, token, uid });
  }

  registerStatusCallback(callback: (status: string) => void): void {
    this.statusCallback = callback;
    // Simulate connection flow
    setTimeout(() => {
      if (this.statusCallback) this.statusCallback("Connected (Local Fallback)");
    }, 100);
  }

  async joinChannel(): Promise<void> {
    console.log("AgoraService joinChannel called");
    return Promise.resolve();
  }

  async leaveChannel(): Promise<void> {
    if (this.statusCallback) {
      this.statusCallback("Disconnected");
    }
    return Promise.resolve();
  }

  async setMute(mute: boolean): Promise<void> {
    console.log("AgoraService mute toggled:", mute);
    return Promise.resolve();
  }
}
