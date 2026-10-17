<?php

declare(strict_types=1);

namespace CareerCampus\Domain;

/**
 * Computes node states (spec §4) for ALL nodes of a roadmap in
 * O(nodes + edges): a memoized DFS where each node is resolved exactly
 * once and every prerequisite edge is visited at most twice.
 *
 * Rules, evaluated in this order:
 *   completed   — all required tasks completed (vacuously true for a node
 *                 with zero required tasks)
 *   locked      — at least one prerequisite is not `completed`
 *   in_progress — ≥1 required task completed, node not completed
 *   available   — otherwise
 *
 * On valid data (admin writes reject cycles, spec §7) every node gets a
 * definite state. The visiting-set below is belt-and-braces: if a cycle
 * ever reaches the resolver, the nodes inside it report `locked` instead
 * of recursing forever.
 *
 * Static and pure — Phase 3's ProgressService reuses the same rules.
 */
final class NodeStateResolver
{
    /**
     * @param list<NodeFacts> $nodes all nodes of one roadmap
     * @return array<string, NodeState> node id => state
     */
    public static function resolve(array $nodes): array
    {
        $byId = [];
        foreach ($nodes as $node) {
            $byId[$node->id] = $node;
        }

        $memo = [];
        $visiting = [];

        $resolve = function (string $id) use (&$resolve, $byId, &$memo, &$visiting): NodeState {
            if (isset($memo[$id])) {
                return $memo[$id];
            }
            if (isset($visiting[$id])) {
                // Cycle guard (see class docblock).
                return NodeState::Locked;
            }
            $visiting[$id] = true;

            $node = $byId[$id];
            $state = self::stateFor($node, static function (string $prerequisiteId) use ($resolve, $byId): bool {
                return isset($byId[$prerequisiteId]) && $resolve($prerequisiteId) === NodeState::Completed;
            });

            unset($visiting[$id]);
            $memo[$id] = $state;

            return $state;
        };

        foreach ($byId as $id => $_node) {
            $resolve($id);
        }

        return $memo;
    }

    /**
     * State rules for a single node.
     *
     * @param callable(string): bool $prerequisiteCompleted
     */
    private static function stateFor(NodeFacts $node, callable $prerequisiteCompleted): NodeState
    {
        if ($node->completedRequiredTasks >= $node->requiredTaskCount) {
            return NodeState::Completed;
        }

        foreach ($node->prerequisiteIds as $prerequisiteId) {
            if (!$prerequisiteCompleted($prerequisiteId)) {
                return NodeState::Locked;
            }
        }

        return $node->completedRequiredTasks > 0 ? NodeState::InProgress : NodeState::Available;
    }
}
