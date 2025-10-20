// Solution channel for real-time updates
export class SolutionChannel {
  private listeners: Array<(data: unknown) => void> = []

  subscribe(callback: (data: unknown) => void): () => void {
    this.listeners.push(callback)
    
    return () => {
      const index = this.listeners.indexOf(callback)
      if (index > -1) {
        this.listeners.splice(index, 1)
      }
    }
  }

  broadcast(data: unknown): void {
    this.listeners.forEach(listener => listener(data))
  }

  static getInstance(): SolutionChannel {
    if (!SolutionChannel.instance) {
      SolutionChannel.instance = new SolutionChannel()
    }
    return SolutionChannel.instance
  }

  private static instance: SolutionChannel
}

export default SolutionChannel