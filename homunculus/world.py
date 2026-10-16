"""One small room. Coordinates are X/right, Z/toward the glass, metres."""
import heapq
import math

BOUNDS = (-3.1, 3.1, -1.9, 2.4)
# Furniture rectangles include clearance for feet. Shared with renderer via bootstrap.
OBSTACLES = [(-2.95, -1.65, -.8, 1.35), (1.25, 2.95, -1.95, -.65),
             (-2.9, -1.9, -1.95, -1.1), (1.5, 2.4, -.65, .1)]
PLACES = {'rest': [-1.35, .6], 'read': [1.25, -.15], 'inspect': [1.95, .35],
          'watch': [0, 2.05], 'escape': [0, -1.65], 'eat': [-1.5, -1.0]}
ACTIONS = ('wander', 'rest', 'read', 'inspect', 'watch', 'escape', 'eat')


def walkable(x, z):
    return (math.isfinite(x) and math.isfinite(z) and BOUNDS[0] <= x <= BOUNDS[1]
            and BOUNDS[2] <= z <= BOUNDS[3]
            and not any(a <= x <= b and c <= z <= d for a, b, c, d in OBSTACLES))


# Small grid generated once; no physics engine or navmesh dependency.
NODES = [(round(-3 + x * .25, 2), round(-1.75 + z * .25, 2))
         for x in range(25) for z in range(17) if walkable(-3 + x * .25, -1.75 + z * .25)]
NODE_SET = set(NODES)


def nearest(x, z):
    return min(NODES, key=lambda p: (p[0] - x) ** 2 + (p[1] - z) ** 2)


def route(start, end):
    origin, goal = nearest(*start), nearest(*end)
    frontier, cost, previous = [(0, origin)], {origin: 0}, {}
    while frontier:
        _, current = heapq.heappop(frontier)
        if current == goal:
            path = [goal]
            while path[-1] != origin:
                path.append(previous[path[-1]])
            return [list(p) for p in reversed(path)]
        for dx, dz in ((.25, 0), (-.25, 0), (0, .25), (0, -.25)):
            p = (current[0] + dx, current[1] + dz)
            new_cost = cost[current] + 1
            if p in NODE_SET and new_cost < cost.get(p, math.inf):
                cost[p], previous[p] = new_cost, current
                heapq.heappush(frontier, (new_cost + 4 * (abs(p[0] - goal[0]) + abs(p[1] - goal[1])), p))
    return [list(origin)]
