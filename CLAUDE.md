# CLAUDE.md - LFC.se Mobile App

This document provides guidance for AI assistants working with the LFC.se mobile application codebase.

## Project Overview

**LFC.se** is a React Native mobile application for Liverpool FC Supporters Club Sweden (Liverpoolsupportrarna i Sverige). The app provides:

- **Newsfeed**: Latest news and updates from Liverpool FC
- **Fixtures**: Match schedules, results, statistics, and live game events
- Native iOS and Android support via Expo

## Quick Reference

| Item | Value |
|------|-------|
| Package Manager | pnpm |
| Framework | React Native + Expo |
| Language | TypeScript (strict mode) |
| State Management | React Query (@tanstack/react-query) |
| Navigation | React Navigation (static config) |
| Bundle ID | com.nanberg.lfc |
| Primary Language | Swedish |

## Essential Commands

```bash
pnpm install          # Install dependencies
pnpm dev              # Start Expo development server
pnpm ios              # Build and run on iOS
pnpm android          # Build and run on Android
pnpm lint             # Run ESLint
```

## Project Structure

```
lfc-app/
├── src/
│   ├── screens/              # Main UI screens
│   │   ├── newsfeed.tsx      # News list (infinite scroll)
│   │   ├── newsfeed-post.tsx # Individual post detail
│   │   ├── fixtures.tsx      # Match list with season tabs
│   │   └── fixtures-game.tsx # Match detail with stats/events
│   ├── components/           # Reusable UI components
│   │   ├── theme-context.tsx # Light/dark theme provider
│   │   ├── text.tsx          # Typed text component
│   │   ├── animated-header-background.tsx
│   │   ├── scroll-context.tsx
│   │   ├── twitter-embed.tsx
│   │   ├── instagram-embed.tsx
│   │   └── ...
│   ├── lib/                  # Custom hooks and utilities
│   │   ├── queries.ts        # React Query options
│   │   ├── query-client.ts   # Query client config
│   │   ├── use-interval.ts
│   │   └── use-*-formatter.ts # Internationalized formatters
│   ├── app.tsx               # Root component with providers
│   ├── navigation.tsx        # Navigation structure
│   ├── api.ts                # API client and data parsers
│   ├── theme.ts              # Colors, typography, spacing
│   ├── config.ts             # App configuration
│   └── utils.ts              # Shared utilities
├── assets/                   # App icons and splash screens
├── app.config.ts             # Expo configuration
├── eas.json                  # EAS build profiles
└── package.json
```

## Architecture & Patterns

### Data Fetching with React Query

All API data is fetched using React Query with Suspense integration:

```typescript
// Define query options in src/lib/queries.ts
export const postsQuery = infiniteQueryOptions({
  queryKey: ['posts'],
  queryFn: ({ pageParam }) => listPosts(10, (pageParam - 1) * 10),
  staleTime: 5 * 60 * 1000,  // 5 minutes
  initialPageParam: 1,
  getNextPageParam: (lastPage, pages) => pages.length + 1,
})

// Use in components with Suspense
function Newsfeed() {
  const { data } = useSuspenseInfiniteQuery(postsQuery)
  // ...
}
```

### Screen Pattern

Screens follow this structure:

```typescript
export function MyScreen() {
  return (
    <ScrollProvider>
      <AnimatedHeaderBackground title="Screen Title" />
      <Suspense fallback={<ScreenActivityIndicator />}>
        <Content />
      </Suspense>
    </ScrollProvider>
  )
}
```

### API Layer

The API layer in `src/api.ts`:
- Base URL: `https://www.lfc.se/webapi`
- Uses typed fetch wrapper with URL parameter building
- Data parsers/normalizers convert raw API responses to typed interfaces
- HTML sanitization for post content
- Custom embed extraction (Twitter, Instagram)

### Context Providers

Global state via React Context (in `src/app.tsx`):
- `ThemeProvider` - Light/dark mode theming
- `ScrollProvider` - Per-screen scroll position for animated headers
- `QueryClientProvider` - React Query cache

### Navigation

Static navigation configuration in `src/navigation.tsx`:
- Bottom tabs: Newsfeed, Fixtures
- Stack navigators for each tab
- Type-safe params via `StaticParamList`

## Code Conventions

### TypeScript

- **Strict mode enabled** with `noUncheckedIndexedAccess`
- Use path alias `~/*` for imports from `src/`
- No `any` types - use proper typing or `unknown`
- Zod for runtime validation of API responses

### Styling

- Inline styles with `StyleSheet.create()`
- Theme values from `src/theme.ts` (colors, typography, spacing)
- Use `useTheme()` hook for dynamic theme access

### Component Props

```typescript
// Use specific typed props
interface Props {
  variant?: 'title' | 'body' | 'caption'
  color?: 'primary' | 'secondary'
}

// Avoid loose typing
// BAD: color?: string
// GOOD: color?: 'primary' | 'secondary'
```

### Formatting

- Single quotes (no double quotes)
- No semicolons
- Prettier handles all formatting

### Naming

- `camelCase` for variables and functions
- `PascalCase` for components and types
- Files use kebab-case: `my-component.tsx`

## Key Technologies

| Technology | Purpose |
|------------|---------|
| Expo 54 | React Native framework |
| React 19 | UI library |
| React Native 0.81 | Mobile framework |
| @tanstack/react-query | Server state + caching |
| @react-navigation | Navigation |
| react-native-reanimated | Smooth animations |
| expo-image | Optimized images |
| date-fns | Date formatting |
| zod | Schema validation |

## Development Notes

### No Test Suite

This project does not currently have a testing framework configured. When adding tests, consider:
- Jest or Vitest for unit tests
- React Native Testing Library for component tests

### Building for Production

EAS Build profiles in `eas.json`:
- `development` - Internal distribution
- `development-simulator` - iOS simulator builds
- `preview` - Preview builds
- `production` - App store builds with auto-increment

### Image Optimization

Post images use Cloudinary URL parameters for resizing:
```typescript
// Images are resized via URL params in api.ts
image.replace('/upload/', `/upload/c_fill,w_${width},h_${height}/`)
```

### Prefetching

Queries are prefetched on press-in for better perceived performance:
```typescript
onPressIn={() => queryClient.prefetchQuery(postQuery(id))}
```

## API Endpoints

Base: `https://www.lfc.se/webapi`

| Endpoint | Purpose |
|----------|---------|
| GetNewsList | Paginated news feed |
| GetNewsById | Single post with comments |
| GetCommentList | Post comments |
| GetSeasonList | Available seasons |
| GetFixture | Season fixtures |
| GetFixtureById | Match details |
| GetFixtureTeamStats | Match statistics |
| GetFixtureEvents | Goals, cards, substitutions |

## Common Tasks

### Adding a New Screen

1. Create screen in `src/screens/`
2. Add to navigation in `src/navigation.tsx`
3. Use `ScrollProvider` + `AnimatedHeaderBackground` pattern
4. Define query options in `src/lib/queries.ts`

### Adding API Endpoint

1. Add fetch function in `src/api.ts`
2. Create parser/normalizer for response data
3. Define query options in `src/lib/queries.ts`
4. Use Zod schema for validation if needed

### Creating Reusable Component

1. Create file in `src/components/`
2. Export component with typed props
3. Use theme values from `useTheme()`
4. Follow existing component patterns

## Troubleshooting

### Metro Bundler Issues
```bash
pnpm dev --clear  # Clear Metro cache
```

### Dependency Issues
```bash
rm -rf node_modules
pnpm install
```

### iOS Build Issues
```bash
cd ios && pod install && cd ..
pnpm ios
```
