<?php

declare(strict_types=1);

namespace CareerCampus\Tests;

use CareerCampus\Domain\NodeFacts;
use CareerCampus\Domain\NodeState;
use CareerCampus\Domain\NodeStateResolver;
use PHPUnit\Framework\TestCase;

/**
 * NodeStateResolver (spec §4, §8.3): all four states, unlock chains,
 * diamonds, in_progress boundaries, cycle safety and large-graph behaviour.
 * Pure domain — no database.
 */
final class NodeStateResolverTest extends TestCase
{
    /**
     * @param list<string> $prerequisites
     */
    private function node(string $id, array $prerequisites = [], int $required = 0, int $completed = 0): NodeFacts
    {
        return new NodeFacts($id, $prerequisites, $required, $completed);
    }

    public function testAllFourStates(): void
    {
        $states = NodeStateResolver::resolve([
            $this->node('a', [], 2, 0),          // nothing done, no prereqs
            $this->node('b', ['a'], 1, 0),       // prereq not completed
            $this->node('c', ['b'], 1, 0),       // locked cascade
            $this->node('d', [], 3, 3),          // all required tasks done
            $this->node('e', ['d'], 2, 1),       // some tasks done, prereq completed
        ]);

        self::assertSame(NodeState::Available, $states['a']);
        self::assertSame(NodeState::Locked, $states['b']);
        self::assertSame(NodeState::Locked, $states['c']);
        self::assertSame(NodeState::Completed, $states['d']);
        self::assertSame(NodeState::InProgress, $states['e']);
    }

    public function testUnlockChainFlipsWhenPrerequisiteCompletes(): void
    {
        $build = fn (int $aDone, int $bDone): array => [
            $this->node('a', [], 1, $aDone),
            $this->node('b', ['a'], 1, $bDone),
            $this->node('c', ['b'], 1, 0),
        ];

        $states = NodeStateResolver::resolve($build(0, 0));
        self::assertSame(NodeState::Available, $states['a']);
        self::assertSame(NodeState::Locked, $states['b']);
        self::assertSame(NodeState::Locked, $states['c']);

        // Complete a → b unlocks.
        $states = NodeStateResolver::resolve($build(1, 0));
        self::assertSame(NodeState::Completed, $states['a']);
        self::assertSame(NodeState::Available, $states['b']);
        self::assertSame(NodeState::Locked, $states['c']);

        // Complete b → c unlocks.
        $states = NodeStateResolver::resolve($build(1, 1));
        self::assertSame(NodeState::Completed, $states['b']);
        self::assertSame(NodeState::Available, $states['c']);
    }

    public function testDiamondRequiresAllBranchesCompleted(): void
    {
        //        a (completed)
        //       / \
        //     b (completed)  c (not done)
        //       \ /
        //        d
        $build = fn (int $cDone): array => [
            $this->node('a', [], 1, 1),
            $this->node('b', ['a'], 2, 2),
            $this->node('c', ['a'], 2, $cDone),
            $this->node('d', ['b', 'c'], 1, 0),
        ];

        $states = NodeStateResolver::resolve($build(0));
        self::assertSame(NodeState::Available, $states['c']);
        self::assertSame(NodeState::Locked, $states['d'], 'd stays locked until BOTH branches complete');

        $states = NodeStateResolver::resolve($build(2));
        self::assertSame(NodeState::Completed, $states['c']);
        self::assertSame(NodeState::Available, $states['d']);
    }

    public function testInProgressBoundary(): void
    {
        $build = fn (int $done): NodeFacts => $this->node('a', [], 2, $done);

        $states = NodeStateResolver::resolve([$build(0)]);
        self::assertSame(NodeState::Available, $states['a']);
        $states = NodeStateResolver::resolve([$build(1)]);
        self::assertSame(NodeState::InProgress, $states['a']);
        $states = NodeStateResolver::resolve([$build(2)]);
        self::assertSame(NodeState::Completed, $states['a']);
    }

    public function testNodeWithoutRequiredTasksIsVacuouslyCompleted(): void
    {
        $states = NodeStateResolver::resolve([$this->node('a', [], 0, 0)]);
        self::assertSame(NodeState::Completed, $states['a']);
    }

    public function testLockedCascadeThroughChain(): void
    {
        $states = NodeStateResolver::resolve([
            $this->node('a', [], 1, 0),
            $this->node('b', ['a'], 1, 0),
            $this->node('c', ['b'], 1, 0),
            $this->node('d', ['a', 'c'], 1, 0),
        ]);

        self::assertSame(NodeState::Available, $states['a']);
        foreach (['b', 'c', 'd'] as $id) {
            self::assertSame(NodeState::Locked, $states[$id], "{$id} must be locked");
        }
    }

    public function testCycleIsSafeAndReportsLocked(): void
    {
        $states = NodeStateResolver::resolve([
            $this->node('a', ['b'], 1, 0),
            $this->node('b', ['a'], 1, 0),
            $this->node('c', ['a'], 1, 0),
        ]);

        self::assertSame(NodeState::Locked, $states['a']);
        self::assertSame(NodeState::Locked, $states['b']);
        self::assertSame(NodeState::Locked, $states['c']);
    }

    public function testStressWith300NodeChain(): void
    {
        $nodes = [];
        for ($i = 0; $i < 300; $i++) {
            $prerequisites = $i === 0 ? [] : ['node-' . ($i - 1)];
            // Complete the first 50 nodes of the chain.
            $nodes[] = $this->node('node-' . $i, $prerequisites, 1, $i < 50 ? 1 : 0);
        }

        $states = NodeStateResolver::resolve($nodes);

        self::assertCount(300, $states);
        for ($i = 0; $i < 300; $i++) {
            $expected = $i < 50
                ? NodeState::Completed
                : ($i === 50 ? NodeState::Available : NodeState::Locked);
            self::assertSame($expected, $states['node-' . $i], 'node-' . $i);
        }
    }
}
