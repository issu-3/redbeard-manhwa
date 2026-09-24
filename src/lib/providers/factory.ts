import { FileResolver } from './base';
import { TeraBoxResolver } from './terabox';

export class ResolverManager {
  private resolvers: FileResolver[] = [];

  constructor() {
    this.resolvers.push(new TeraBoxResolver());
    // Future resolvers can be added here
  }

  getResolver(url: string): FileResolver | null {
    for (const resolver of this.resolvers) {
      if (resolver.canResolve(url)) {
        return resolver;
      }
    }
    return null;
  }
}

export const resolverManager = new ResolverManager();
