<?php

declare(strict_types=1);

$finder = PhpCsFixer\Finder::create()
    ->in([__DIR__ . '/src', __DIR__ . '/bin', __DIR__ . '/tests', __DIR__ . '/public']);

return (new PhpCsFixer\Config())
    ->setRiskyAllowed(true)
    ->setRules([
        '@PSR12' => true,
        'declare_strict_types' => true,
        'line_ending' => "\n",
        'array_syntax' => ['syntax' => 'short'],
        'no_unused_imports' => true,
        'ordered_imports' => ['imports_order' => ['class', 'function', 'const']],
        'single_quote' => true,
        'no_trailing_whitespace' => true,
    ])
    ->setFinder($finder);
