export interface Plugin {
  id: string;
  displayName: string;
  initialize(): Promise<void>;
  shutdown(): Promise<void>;
}

export class PluginRegistry {
  private plugins = new Map<string, Plugin>();

  register(plugin: Plugin): void {
    this.plugins.set(plugin.id, plugin);
  }

  get<T extends Plugin = Plugin>(id: string): T | undefined {
    return this.plugins.get(id) as T | undefined;
  }

  async initializeAll(): Promise<void> {
    for (const plugin of this.plugins.values()) {
      await plugin.initialize();
    }
  }

  async shutdownAll(): Promise<void> {
    for (const plugin of this.plugins.values()) {
      await plugin.shutdown();
    }
  }
}
