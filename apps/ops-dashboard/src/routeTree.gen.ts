/* eslint-disable */

// @ts-nocheck

// no-op route tree placeholder for initial build/typing
import { Route as rootRoute } from './routes/__root'
import { Route as indexRoute } from './routes/index'
import { Route as mappingRoute } from './routes/mapping'
import { Route as usageRoute } from './routes/usage'


const indexRouteWithParent = indexRoute.update({
    path: '/',
    getParentRoute: () => rootRoute,
} as any)

const mappingRouteWithParent = mappingRoute.update({
    path: '/mapping',
    getParentRoute: () => rootRoute,
} as any)

const usageRouteWithParent = usageRoute.update({
    path: '/usage',
    getParentRoute: () => rootRoute,
} as any)

export const routeTree = rootRoute.addChildren([
    indexRouteWithParent,
    mappingRouteWithParent,
    usageRouteWithParent
])
