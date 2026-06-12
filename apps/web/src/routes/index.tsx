import { createBrowserRouter, redirect } from "react-router-dom"
import { AuthGuard } from "./guards/AuthGuard"
import { AppLayout } from "./layouts/AppLayout"
import { PublicLayout } from "./layouts/PublicLayout"
import { ProjectLayout } from "./layouts/ProjectLayout"

// Auth
import { LoginPage } from "@/features/auth/LoginPage"
import { OAuthCallbackPage } from "@/features/auth/OAuthCallbackPage"

// Account
import { WorkspacePage } from "@/features/account/WorkspacePage"
import { MyCharactersPage } from "@/features/account/MyCharactersPage"
import { MyProjectsPage } from "@/features/account/MyProjectsPage"
import { AccountSettingsPage } from "@/features/account/AccountSettingsPage"
import { HeightComparePage } from "@/features/account/HeightComparePage"
import { CommissionsPage } from "@/features/account/CommissionsPage"
import { PublicPagesPage } from "@/features/account/PublicPagesPage"
import { GlobalGalleryPage } from "@/features/account/GlobalGalleryPage"
import { CharacterNewPage as AccountCharacterNewPage } from "@/features/account/CharacterNewPage"
import { CharacterDetailPage as AccountCharacterDetailPage } from "@/features/account/CharacterDetailPage"
import { CharacterEditPage as AccountCharacterEditPage } from "@/features/account/CharacterEditPage"

// Project
import { OverviewPage } from "@/features/project/OverviewPage"
import { RosterPage } from "@/features/project/RosterPage"
import { CharacterDetailPage } from "@/features/project/CharacterDetailPage"
import { CharacterEditPage } from "@/features/project/CharacterEditPage"
import { CharacterNewPage } from "@/features/project/CharacterNewPage"
import { WorldviewPage } from "@/features/project/WorldviewPage"
import { WorldEntryDetailPage } from "@/features/project/WorldEntryDetailPage"
import { WorldEntryNewPage } from "@/features/project/WorldEntryNewPage"
import { WorldEntryEditPage } from "@/features/project/WorldEntryEditPage"
import { RelationshipsPage } from "@/features/project/RelationshipsPage"
import { StoryPage } from "@/features/project/StoryPage"
import { GalleryPage } from "@/features/project/GalleryPage"
import { TimelinePage } from "@/features/project/TimelinePage"
import { SettingsPage } from "@/features/project/SettingsPage"
import { ParticipantsPage } from "@/features/project/ParticipantsPage"
import { InspirationPage } from "@/features/project/InspirationPage"
import { ApplicationsPage } from "@/features/project/ApplicationsPage"
import { ContentSubmissionsPage } from "@/features/project/ContentSubmissionsPage"
import { PublicPagePage } from "@/features/project/PublicPagePage"
import { TemplateBuilderPage } from "@/features/project/TemplateBuilderPage"

// Public
import { PublicProjectPage } from "@/features/public/PublicProjectPage"
import { PublicCharacterPage } from "@/features/public/PublicCharacterPage"


export const router = createBrowserRouter([
  {
    path: "/login",
    element: <PublicLayout />,
    children: [{ index: true, element: <LoginPage /> }],
  },
  {
    path: "/auth/callback",
    element: <PublicLayout />,
    children: [{ index: true, element: <OAuthCallbackPage /> }],
  },
  {
    path: "/",
    element: (
      <AuthGuard>
        <AppLayout />
      </AuthGuard>
    ),
    children: [
      { index: true, loader: () => redirect("/workspace") },

      // Account-level
      { path: "workspace", element: <WorkspacePage /> },
      { path: "characters", element: <MyCharactersPage /> },
      { path: "projects", element: <MyProjectsPage /> },
      { path: "settings", element: <AccountSettingsPage /> },
      { path: "public-pages",   element: <PublicPagesPage /> },
      { path: "gallery",         element: <GlobalGalleryPage /> },
      { path: "commissions",    element: <CommissionsPage /> },
      { path: "height-compare", element: <HeightComparePage /> },
      { path: "characters/new",        element: <AccountCharacterNewPage /> },
      { path: "characters/:charId",     element: <AccountCharacterDetailPage /> },
      { path: "characters/:charId/edit", element: <AccountCharacterEditPage /> },

      // Project-scoped
      {
        path: "p/:projectId",
        element: <ProjectLayout />,
        children: [
          { index: true, loader: ({ params }) => redirect(`/p/${params.projectId}/overview`) },
          { path: "overview", element: <OverviewPage /> },
          { path: "roster", element: <RosterPage /> },
          { path: "roster/new", element: <CharacterNewPage /> },
          { path: "roster/:linkId", element: <CharacterDetailPage /> },
          { path: "roster/:linkId/edit", element: <CharacterEditPage /> },
          { path: "worldview", element: <WorldviewPage /> },
          { path: "worldview/new", element: <WorldEntryNewPage /> },
          { path: "worldview/:entryId", element: <WorldEntryDetailPage /> },
          { path: "worldview/:entryId/edit", element: <WorldEntryEditPage /> },
          { path: "relationships", element: <RelationshipsPage /> },
          { path: "story", element: <StoryPage /> },
          { path: "timeline", element: <TimelinePage /> },
          { path: "gallery",      element: <GalleryPage /> },
          { path: "inspiration",  element: <InspirationPage /> },
          { path: "applications", element: <ApplicationsPage /> },
          { path: "submissions",  element: <ContentSubmissionsPage /> },
          { path: "public-page",  element: <PublicPagePage /> },
          { path: "template",     element: <TemplateBuilderPage /> },
          { path: "participants", element: <ParticipantsPage /> },
          { path: "settings",     element: <SettingsPage /> },
        ],
      },
    ],
  },
  {
    path: "/page/:slug",
    element: <PublicLayout />,
    children: [{ index: true, element: <PublicProjectPage /> }],
  },
  {
    path: "/c/:slug",
    element: <PublicLayout />,
    children: [{ index: true, element: <PublicCharacterPage /> }],
  },
  {
    path: "*",
    element: <div style={{ padding: "2rem" }}>404 — 找不到頁面</div>,
  },
])
