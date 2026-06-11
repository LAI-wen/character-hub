import { Hono } from 'hono';
import { characters, FEATURES, projectCharacterLinks, projects, viewer } from './data';
import { errorResponse } from '../types';
import type { Env, Variables } from '../types';

type DemoProject = (typeof projects)[number];
type DemoCharacter = (typeof characters)[number];
type DemoProjectCharacterLink = (typeof projectCharacterLinks)[number];

export const demoRouter = new Hono<{ Bindings: Env; Variables: Variables }>();

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function projectForId(projectId: string) {
  return projects.find((project) => project.id === projectId) ?? null;
}

function linksForCharacter(characterId: string) {
  return projectCharacterLinks.filter((link) => link.characterId === characterId);
}

function withViewerRole(project: DemoProject) {
  return {
    ...clone(project),
    viewerRole: viewer.projectRoles[project.id as keyof typeof viewer.projectRoles] ?? 'viewer',
  };
}

function characterWithScope(character: DemoCharacter) {
  const links = linksForCharacter(character.id);
  return {
    ...clone(character),
    projectIds: links.map((link) => link.projectId),
    projectLinks: clone(links),
  };
}

function characterForLink(link: DemoProjectCharacterLink) {
  const character = characters.find((item) => item.id === link.characterId);
  if (!character) return null;
  return {
    ...clone(character),
    projectIds: [link.projectId],
    projectLink: clone(link),
  };
}

function hasFeature(project: DemoProject, feature: string) {
  return project.enabledFeatures.includes(feature as never);
}

function isCollaborative(project: DemoProject) {
  return project.collaborationMode === 'collaborative';
}

function canManageProject(project: DemoProject) {
  const role = viewer.projectRoles[project.id as keyof typeof viewer.projectRoles] ?? 'viewer';
  return ['owner', 'host', 'cohost'].includes(role);
}

function getProjectNavigation(projectId: string) {
  const project = projectForId(projectId);
  if (!project) return null;

  const nav = [
    { label: '企劃總覽', href: `#/app/projects/${project.id}`, group: 'project' },
  ];

  const contentItems: Array<[string, string, string]> = [
    [FEATURES.characters, '角色', `#/app/projects/${project.id}/characters`],
    [FEATURES.worldview, '世界觀', `#/app/projects/${project.id}/worldview`],
    [FEATURES.story, '故事', `#/app/projects/${project.id}/story`],
    [FEATURES.gallery, '圖庫', `#/app/projects/${project.id}/gallery`],
    [FEATURES.relationships, '關係圖', `#/app/projects/${project.id}/relationships`],
    [FEATURES.inbox, '靈感', `#/app/projects/${project.id}/inbox`],
  ];

  contentItems.forEach(([feature, label, href]) => {
    if (hasFeature(project, feature)) nav.push({ label, href, group: 'content' });
  });

  if (project.portalEnabled && hasFeature(project, FEATURES.publicPage)) {
    nav.push({ label: '公開頁', href: `#/app/projects/${project.id}/public-page`, group: 'public' });
  }

  if (isCollaborative(project) && canManageProject(project)) {
    if (hasFeature(project, FEATURES.roster)) {
      nav.push({ label: '角色名冊', href: `#/app/projects/${project.id}/roster`, group: 'manage' });
    }
    if (hasFeature(project, FEATURES.applications) || hasFeature(project, FEATURES.submissions)) {
      nav.push({ label: '審核中心', href: `#/app/projects/${project.id}/review`, group: 'manage' });
    }
    if (hasFeature(project, FEATURES.participants)) {
      nav.push({ label: '參與者', href: `#/app/projects/${project.id}/participants`, group: 'manage' });
    }
    if (hasFeature(project, FEATURES.template)) {
      nav.push({ label: '角色卡模板', href: `#/app/projects/${project.id}/template`, group: 'manage' });
    }
  }

  nav.push({ label: '企劃設定', href: `#/app/projects/${project.id}/settings`, group: 'settings' });
  return nav;
}

function getPublicProject(slug: string) {
  const project = projects.find((item) => item.slug === slug);
  if (!project || !project.portalEnabled || String(project.visibility) === 'private') return null;

  const linkedCharacters = projectCharacterLinks
    .filter((link) => link.projectId === project.id)
    .map(characterForLink)
    .filter((character): character is NonNullable<ReturnType<typeof characterForLink>> => Boolean(character))
    .filter((character) => character.projectLink.status !== 'pending')
    .map((character) => ({
      id: character.id,
      name: character.name,
      rom: character.rom,
      species: character.species,
      tagline: character.tagline,
      projectRole: character.projectLink.projectRole,
    }));

  return {
    slug: project.slug,
    name: project.name,
    color: project.color,
    visibility: project.visibility,
    description: project.description,
    joinPolicy: project.joinPolicy,
    submissionsEnabled: project.submissionsEnabled,
    characters: linkedCharacters,
    enabledPublicFeatures: project.enabledFeatures.filter((feature) => {
      const publicFeatures = new Set<string>([
        FEATURES.characters,
        FEATURES.worldview,
        FEATURES.story,
        FEATURES.gallery,
        FEATURES.relationships,
      ]);
      return publicFeatures.has(feature);
    }),
  };
}

demoRouter.use('*', async (c, next) => {
  c.header('Cache-Control', 'no-store');
  await next();
});

demoRouter.get('/bootstrap', (c) => c.json({
  viewer: clone(viewer),
  projects: clone(projects),
  characters: clone(characters),
  projectCharacterLinks: clone(projectCharacterLinks),
}));

demoRouter.get('/viewer', (c) => c.json(clone(viewer)));

demoRouter.get('/projects', (c) => c.json(
  projects
    .filter((project) => project.workspaceKind !== 'account_collection')
    .map(withViewerRole),
));

demoRouter.get('/projects/:id', (c) => {
  const project = projectForId(c.req.param('id'));
  if (!project) return errorResponse(c, 404, 'NOT_FOUND', 'Project not found');
  return c.json(withViewerRole(project));
});

demoRouter.get('/projects/:id/navigation', (c) => {
  const nav = getProjectNavigation(c.req.param('id'));
  if (!nav) return errorResponse(c, 404, 'NOT_FOUND', 'Project not found');
  return c.json(nav);
});

demoRouter.get('/characters', (c) => c.json(
  characters
    .filter((character) => character.ownerId === viewer.id)
    .map(characterWithScope),
));

demoRouter.get('/projects/:id/characters', (c) => {
  const project = projectForId(c.req.param('id'));
  if (!project) return errorResponse(c, 404, 'NOT_FOUND', 'Project not found');
  return c.json(
    projectCharacterLinks
      .filter((link) => link.projectId === project.id)
      .map(characterForLink)
      .filter(Boolean),
  );
});

demoRouter.get('/public-projects/:slug', (c) => {
  const project = getPublicProject(c.req.param('slug'));
  if (!project) return errorResponse(c, 404, 'NOT_FOUND', 'Public project not found');
  return c.json(project);
});
