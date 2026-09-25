import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ProjectRepository } from '@guidify-ai/vapi-studio';
import { loadProjectIdentity, LOCAL_PROJECT_ID } from './project.config';

@Injectable()
export class ProjectSeedService implements OnModuleInit {
  private readonly logger = new Logger(ProjectSeedService.name);

  constructor(private readonly projects: ProjectRepository) {}

  async onModuleInit(): Promise<void> {
    const identity = loadProjectIdentity();
    const row = await this.projects.upsert({
      id: LOCAL_PROJECT_ID,
      slug: identity.slug,
      name: identity.name,
    });
    this.logger.log(
      `Project seeded slug=${row.slug} name=${row.name} (Vapi: /vapi/... on this host)`,
    );
  }
}
