<?php

declare(strict_types=1);

use CareerCampus\Config\Container;
use Slim\App;

$projectRoot = dirname(__DIR__);

require $projectRoot . '/vendor/autoload.php';

$container = Container::create($projectRoot);
$app = $container->get(App::class);

$app->run();
