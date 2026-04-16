<?php

declare(strict_types=1);

use BetoCampoy\Champs\Frontend\LegacyBootstrap;

require dirname(__DIR__, 2) . '/vendor/autoload.php';

$renderer = LegacyBootstrap::createRenderer(
    projectTemplatesPath: __DIR__ . '/templates',
    routes: [
        'home' => '/index.php',
        'users_list' => '/users/list.php',
    ],
    cachePath: __DIR__ . '/var/cache/twig',
    debug: true,
    basePath: '',
    assetsBase: '/vendor/champs-frontend',
    globals: [
        'app_name' => 'Minha Encomenda',
    ]
);

echo $renderer->render('pages/teste.html.twig', [
    'title' => 'Exemplo',
]);
